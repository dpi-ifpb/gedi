/* ================= Dados ao vivo do Firestore (assinaturas) =================
 * Depois do login, o painel "assina" as coleções que o perfil do usuário pode
 * ler. Qualquer gravação (de qualquer usuário) chega aqui em segundos e as telas
 * são redesenhadas — não é mais preciso esperar o ciclo de 5 minutos.
 */
const TABELAS = { unidades: [], origens: [], financiadores: [], despesas: [], usuarios: [] };
const TABELAS_CARREGADAS = {};
const TABELAS_ERRO = {};
let PERFIS_ATUAIS = [];
let UNIDADES_ATUAIS = []; // unidades do registrador (vazio para os demais perfis)
let assinaturasAtivas = [];

// registrador "puro" (sem perfil que veja todas as unidades)
function soRegistrador(){
  return temPerfil(['registrador_despesas']) && !temPerfil(P_ORC);
}
// unidades em que o usuário pode registrar despesas (null = todas)
function unidadesPermitidasRegistro(){
  return temPerfil(P_GESTAO) ? null : UNIDADES_ATUAIS;
}

function temPerfil(lista){
  if(lista === null || lista === undefined) return true;
  return PERFIS_ATUAIS.some(p => lista.includes(p));
}
function podeVerPagina(page){
  return temPerfil(PAGINAS_PERFIS.hasOwnProperty(page) ? PAGINAS_PERFIS[page] : null);
}

function iniciarAssinaturas(){
  pararAssinaturas();
  const assinar = (nome, fn) => {
    TABELAS_CARREGADAS[nome] = false;
    assinaturasAtivas.push(fn(
      dados => { TABELAS[nome] = dados; TABELAS_CARREGADAS[nome] = true; TABELAS_ERRO[nome] = null; aoMudarDados(nome); },
      err => { TABELAS_ERRO[nome] = err.message || String(err); aoMudarDados(nome); }
    ));
  };
  assinar('unidades', (a, b) => Repo.unidades.observar(a, b));
  assinar('origens', (a, b) => Repo.origens.observar(a, b));
  if(temPerfil(P_ORC)){
    assinar('financiadores', (a, b) => Repo.financiadores.observar(a, b));
    assinar('despesas', (a, b) => Repo.despesas.observar(a, b, null));
  } else if(temPerfil(['registrador_despesas'])){
    // registrador sem perfil de leitura: só as despesas das suas unidades
    TABELAS_CARREGADAS.financiadores = true;
    assinar('despesas', (a, b) => Repo.despesas.observar(a, b, UNIDADES_ATUAIS));
  }
  if(temPerfil(P_ADMIN)){
    assinar('usuarios', (a, b) => Repo.usuarios.observar(a, b));
  }
}

function pararAssinaturas(){
  assinaturasAtivas.forEach(unsub => { try{ unsub(); } catch(e){} });
  assinaturasAtivas = [];
}

/* Cada tela registra aqui o que deve ser redesenhado quando um conjunto de dados muda. */
const OUVINTES_DADOS = [];
function aoMudarDadosRegistrar(nomes, fn){ OUVINTES_DADOS.push({ nomes, fn }); }
function aoMudarDados(nome){
  OUVINTES_DADOS.forEach(o => {
    if(o.nomes.includes(nome)){
      try{ o.fn(nome); } catch(e){ console.error('Erro ao redesenhar tela:', e); }
    }
  });
}

/* ---------- consultas às tabelas de apoio ---------- */
function unidadesOrdenadas(somenteAtivas){
  const lista = TABELAS.unidades.filter(u => !somenteAtivas || u.ativo);
  return lista.sort((a, b) => {
    if(a.nome === UNIDADE_INSTITUCIONAL) return -1;
    if(b.nome === UNIDADE_INSTITUCIONAL) return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}
function origensOrdenadas(somenteAtivas){
  return TABELAS.origens.filter(o => !somenteAtivas || o.ativo)
    .sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'));
}
function financiadoresOrdenados(somenteAtivos){
  return TABELAS.financiadores.filter(f => !somenteAtivos || f.ativo)
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}
function nomeUnidade(codigo){
  const u = TABELAS.unidades.find(x => x.codigo === codigo);
  return u ? u.nome : codigo;
}
function codigoOrigem(sigla){
  const o = TABELAS.origens.find(x => x.sigla === sigla);
  return o ? o.codigo : null;
}
function despesasPendentes(){
  return TABELAS.despesas.filter(d => d.ativo && d.status === 'pendente');
}
function descricaoFinanciador(codigo){
  if(!codigo || codigo === FINANCIADOR_NENHUM) return 'Sem financiador';
  const f = TABELAS.financiadores.find(x => x.codigo === codigo);
  return f ? f.descricao : `Financiador ${codigo}`;
}
