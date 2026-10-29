/* ================= Configuração da fonte de dados ================= */
const SHEET_ID = '1kWa9nu__ZMcGHEsvW0SjCSqIx67lVmSma8IbRqt3J3g';
const GID = '0';
const EXTRA_SHEET_ID = '1glxot4hifQGyDytwTmxaN1_vdZNEUdEynS0Gkok2FPo'; // "Distribuição de recursos"
const EXTRA_GID = '0';
const FORMACAO_SHEET_ID = '1N9FVrxMAOvcjGSCgzPiyi6-DNMRPudBZK091gX8XQvQ'; // "Bases e reforços orçamentários"
const FORMACAO_GID = '814128660';
const FORMACAO_HEAD_ROW_H = 36; // px — altura fixa do cabeçalho da tabela de Formação do Orçamento
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutos
const PIVOT_HEAD_ROW_H = 36; // px — altura fixa de cada linha do cabeçalho da tabela pivô (ver .pivot-th no CSS)
const EXTRA_HEAD_ROW_H = 40; // px — altura fixa de cada linha do cabeçalho da tabela de Extraorçamentário
const RFEPCT_HEAD_ROW_H = 38; // px — altura fixa de cada linha do cabeçalho da tabela de Indicadores
// Origens de recurso válidas, na ordem da validação da planilha — usado na tela de Totais
// para mostrar toda Origem possível (mesmo sem nenhuma despesa lançada ainda).
const ORIGENS_VALIDAS = ['EFQ', 'LOA', 'PAC', 'RP2', 'RP6', 'RP7', 'RTC']; // EFQ adicionada em ordem alfabética — confirmar posição real na validação, se diferente


/* ================= Perfis de acesso e cadastros =================
 * Perfis são acumuláveis: um usuário pode ter vários (ex.: gestor_planejamento
 * + leitor_recursos_humanos). O cadastro de usuários fica na coleção "usuarios"
 * do Firestore (id do documento = e-mail em minúsculas, campo "perfis").
 */
const PERFIS = {
  administrador: 'Administrador',
  gestor_planejamento: 'Gestor de Planejamento (analisa despesas)',
  registrador_despesas: 'Registrador de Despesas',
  leitor_orcamentario_financeiro: 'Leitor Orçamentário-Financeiro',
  leitor_recursos_humanos: 'Leitor de Recursos Humanos',
};

// Compatibilidade com o cadastro antigo (campo "grupo"), até cada usuário ser
// salvo de novo pela tela de Usuários — mesma regra aplicada em firestore.rules.
const PERFIS_LEGADO = {
  completo: ['leitor_orcamentario_financeiro', 'leitor_recursos_humanos'],
  limitado: ['leitor_orcamentario_financeiro'],
};

const P_ORC = ['administrador', 'gestor_planejamento', 'leitor_orcamentario_financeiro'];
const P_RH = ['administrador', 'leitor_recursos_humanos'];
const P_GESTAO = ['administrador', 'gestor_planejamento'];          // analisam despesas
const P_REGISTRO = ['administrador', 'gestor_planejamento', 'registrador_despesas']; // registram despesas
const P_ADMIN = ['administrador'];

// Quem vê cada tela (ids usados em switchPage). null = qualquer usuário cadastrado.
const PAGINAS_PERFIS = {
  sobre: null,
  formacao: P_ORC,
  totais: P_ORC,
  detalhe: P_ORC,
  extra: P_ORC,
  lista: [...P_ORC, 'registrador_despesas'],
  estrutura: P_RH,
  funcoes: P_RH,
  indicadores: null,
  historico: null,
  pares: P_ORC,
  simulador: P_ORC,
  simuladorF: P_ORC,
  financiadores: P_ADMIN,
  tabelas: P_ADMIN,
  usuarios: P_ADMIN,
};

// Listas fixas do registro de despesas (momento de planejamento).
const NATUREZAS = ['Custeio', 'Investimento'];
const RESULTADOS_ANALISE = { deferida: 'Deferida', indeferida: 'Indeferida', pendente: 'Não analisada' };
const FINANCIADOR_NENHUM = '0000';

// Valores iniciais das tabelas de Unidades e Origens — usados só pelo botão
// "Carregar valores iniciais" quando as tabelas ainda estão vazias. Extraídos
// dos IDs já existentes. Cajazeiras e LOA ficam de fora porque ainda não têm
// código definido: cadastre-os pela tela antes de gerar IDs para eles.
const UNIDADES_INICIAIS = [
  ['IF', '- Institucional -'], ['AR', 'Areia'], ['CB', 'Cabedelo'], ['CC', 'Cabedelo Centro'],
  ['CG', 'Campina Grande'], ['CR', 'Catolé do Rocha'], ['ES', 'Esperança'], ['GB', 'Guarabira'],
  ['IB', 'Itabaiana'], ['IP', 'Itaporanga'], ['JP', 'João Pessoa'], ['ZS', 'João Pessoa ZS'],
  ['MM', 'Mamanguape'], ['MT', 'Monteiro'], ['PT', 'Patos'], ['PF', 'Pedras de Fogo'],
  ['PC', 'Picuí'], ['PI', 'Princesa Isabel'], ['QM', 'Queimadas'], ['RE', 'Reitoria'],
  ['SL', 'Santa Luzia'], ['SR', 'Santa Rita'], ['SP', 'Sapé'], ['SD', 'Soledade'], ['SS', 'Sousa'],
];
const ORIGENS_INICIAIS = [
  ['EFQ', 'L'], ['PAC', 'P'], ['RP2', '2'], ['RP6', '6'], ['RP7', '7'], ['RTC', 'R'],
];
