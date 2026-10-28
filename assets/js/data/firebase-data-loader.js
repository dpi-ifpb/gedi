/* ================= Carregamento de dados via Firestore =================
 * Substitui os antigos arquivos estáticos (setores.js, servidores.js, etc.)
 * por uma leitura assíncrona do Firestore, feita depois do login.
 *
 * As variáveis abaixo são declaradas aqui vazias/undefined e só ganham valor
 * de verdade depois que carregarDadosEstaticos() roda com sucesso — todo o
 * resto do painel (Estrutura, Funções, Base, Série Histórica, simuladores)
 * continua lendo essas mesmas variáveis globais, sem precisar saber que a
 * fonte mudou de arquivo estático para Firestore.
 */
let SETORES_DATA = [];
let SERVIDORES_DATA = [];
let TIPOLOGIA_DATA = null;
let RFEPCT_BASELINE = null;
let RFEPCT_DATA = [];
let INDICADORES_HISTORICO_DATA = null;
let MATRIZ_OT, MATRIZ_AE, MATRIZ_IEA_REDE, MATRIZ_PCT_IEA, MATRIZ_PCT_RAP, MATRIZ_PCT_IAML, NETWORK_INDICADORES;
let MATRICULA_2024 = {}, ORCAMENTO_2026 = {};
let IFPB_FUNC_REAL, FUNC_NETWORK_MT_TOTAL, FUNC_FLOOR, FUNC_F_CALIBRADO;

// true assim que os dois documentos sensíveis (setores/servidores) tiverem sido
// lidos com sucesso — usado pra saber se o usuário sem perfil de RH ficou de fora deles
// por falta de permissão (esperado) e não por erro de verdade.
let dadosSensiveisDisponiveis = false;

const FIRESTORE_DOCUMENTOS = [
  { doc: 'setores', aplicar: d => { SETORES_DATA = d.SETORES_DATA || []; } },
  { doc: 'servidores', aplicar: d => { SERVIDORES_DATA = d.SERVIDORES_DATA || []; } },
  { doc: 'tipologia', aplicar: d => { TIPOLOGIA_DATA = d.TIPOLOGIA_DATA; } },
  { doc: 'indicadores_base', aplicar: d => { RFEPCT_BASELINE = d.RFEPCT_BASELINE; RFEPCT_DATA = d.RFEPCT_DATA || []; } },
  { doc: 'indicadores_historico', aplicar: d => { INDICADORES_HISTORICO_DATA = d.INDICADORES_HISTORICO_DATA; } },
  { doc: 'rede_referencia', aplicar: d => {
      MATRIZ_OT = d.MATRIZ_OT; MATRIZ_AE = d.MATRIZ_AE; MATRIZ_IEA_REDE = d.MATRIZ_IEA_REDE;
      MATRIZ_PCT_IEA = d.MATRIZ_PCT_IEA; MATRIZ_PCT_RAP = d.MATRIZ_PCT_RAP; MATRIZ_PCT_IAML = d.MATRIZ_PCT_IAML;
      NETWORK_INDICADORES = d.NETWORK_INDICADORES;
  }},
  { doc: 'matricula_pares', aplicar: d => { MATRICULA_2024 = d.MATRICULA_2024 || {}; ORCAMENTO_2026 = d.ORCAMENTO_2026 || {}; } },
  { doc: 'funcionamento_simulador', aplicar: d => {
      IFPB_FUNC_REAL = d.IFPB_FUNC_REAL; FUNC_NETWORK_MT_TOTAL = d.FUNC_NETWORK_MT_TOTAL;
      FUNC_FLOOR = d.FUNC_FLOOR; FUNC_F_CALIBRADO = d.FUNC_F_CALIBRADO;
  }},
];

/* Busca todos os documentos em paralelo. Se o usuário não tiver perfil de RH,
 * os documentos "setores" e "servidores" vêm negados pelas regras do Firestore
 * (permission-denied) — isso é ESPERADO, não um erro: só ficam de fora as duas
 * telas que já são escondidas da interface para esse perfil. Documento
 * inexistente também não bloqueia o login (só gera aviso no console). Erros de
 * rede ou permissão inesperada são reportados de verdade. */
async function carregarDadosEstaticos(){
  const db = firebase.firestore();
  const resultados = await Promise.allSettled(
    FIRESTORE_DOCUMENTOS.map(({ doc }) => db.collection('dados_estaticos').doc(doc).get())
  );

  const errosReais = [];
  resultados.forEach((resultado, i) => {
    const { doc, aplicar } = FIRESTORE_DOCUMENTOS[i];
    if(resultado.status === 'fulfilled'){
      if(resultado.value.exists){
        aplicar(resultado.value.data());
      } else {
        // base ainda não carregada no Firestore: o painel abre mesmo assim e só
        // as telas que dependem dela ficam sem dados (Indicadores, Estrutura etc.)
        console.warn(`dados_estaticos/${doc} não existe — a tela correspondente ficará vazia até a base ser carregada.`);
      }
    } else {
      const permissaoNegada = resultado.reason && resultado.reason.code === 'permission-denied';
      if(permissaoNegada && (doc === 'setores' || doc === 'servidores')){
        // esperado para quem não tem perfil de RH — não é erro
      } else {
        errosReais.push(`dados_estaticos/${doc}: ${resultado.reason}`);
      }
    }
  });

  dadosSensiveisDisponiveis = SETORES_DATA.length > 0 && SERVIDORES_DATA.length > 0;

  if(errosReais.length){
    console.error('Falha ao carregar dados do Firestore:', errosReais);
    throw new Error('Não foi possível carregar todos os dados do painel. Veja o console para detalhes.');
  }
}
