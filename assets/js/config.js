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
  painelOrc: P_ORC,
  receitas: P_ORC,
  transferencias: P_ORC,
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
  tabelas: P_ADMIN,
  auditoria: P_GESTAO,
  usuarios: P_ADMIN,
};

// Listas fixas do registro de despesas (momento de planejamento).
const NATUREZAS = ['Custeio', 'Investimento'];
const RESULTADOS_ANALISE = { deferida: 'Deferida', indeferida: 'Indeferida', pendente: 'Não analisada' };
const FINANCIADOR_NENHUM = '000';

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
// [sigla, código no ID]
const ORIGENS_INICIAIS = [
  ['EFQ', 'Q'], ['LOA', 'L'], ['PAC', 'P'], ['RP2', '2'], ['RP6', '6'], ['RP7', '7'], ['RTC', 'R'],
];

// [código, descrição] — ações orçamentárias do IFPB (UO 26417), lista de 2026
const ACOES_INICIAIS = [
  ["00PW", "CONTRIBUICOES REGULARES A ENTIDADES OU ORGANISMOS NACIONAIS SEM EXIGENCIA DE PROGRAMACAO ESPECIFICA"],
  ["00S6", "BENEFICIO ESPECIAL - LEI N. 12.618, DE 2012"],
  ["00UU", "CONTRIBUICOES REGULARES A ORGANISMOS INTERNACIONAIS DE DIREITO PRIVADO SEM EXIGENCIA DE PROGRAMACAO ESPECIFICA"],
  ["0181", "APOSENTADORIAS E PENSOES CIVIS DA UNIAO"],
  ["0536", "BENEFICIOS DE LEGISLACAO ESPECIAL"],
  ["09HB", "CONTRIBUICAO DA UNIAO, DE SUAS AUTARQUIAS E FUNDACOES PARA O CUSTEIO DO REGIME DE PREVIDENCIA DOS SERVIDORES PUBLICOS FEDERAIS"],
  ["2004", "ASSISTENCIA MEDICA E ODONTOLOGICA AOS SERVIDORES CIVIS, EMPREGADOS, MILITARES E SEUS DEPENDENTES"],
  ["20RG", "REESTRUTURACAO E MODERNIZACAO DAS INSTITUICOES DA REDE FEDERAL DE EDUCACAO PROFISSIONAL, CIENTIFICA E TECNOLOGICA"],
  ["20RL", "FUNCIONAMENTO DAS INSTITUICOES DA REDE FEDERAL DE EDUCACAO PROFISSIONAL, CIENTIFICA E TECNOLOGICA"],
  ["20TP", "ATIVOS CIVIS DA UNIAO"],
  ["212B", "BENEFICIOS OBRIGATORIOS AOS SERVIDORES CIVIS, EMPREGADOS, MILITARES E SEUS DEPENDENTES"],
  ["216H", "AJUDA DE CUSTO PARA MORADIA OU AUXILIO-MORADIA A AGENTES PUBLICOS"],
  ["21B3", "FOMENTO AS ACOES DE ENSINO, PESQUISA, EXTENSAO, INOVACAO E SUSTENTABILIDADE NA EDUCACAO PROFISSIONAL E TECNOLOGICA"],
  ["21IH", "ASSISTENCIA PARA ATENDIMENTO A PESSOAS COM DEFICIENCIA"],
  ["21IV", "APOIO A ALIMENTACAO DO ESTUDANTE DA REDE FEDERAL DE EDUCACAO PROFISSIONAL, CIENTIFICA E TECNOLOGICA -RFEPCT"],
  ["2994", "ASSISTENCIA AOS ESTUDANTES DA REDE FEDERAL DE EDUCACAO PROFISSIONAL, CIENTIFICA E TECNOLOGICA"],
  ["4572", "CAPACITACAO DE SERVIDORES PUBLICOS FEDERAIS EM PROCESSO DE QUALIFICACAO E REQUALIFICACAO"],
];

const ROTULO_STATUS_TRANSF = { prevista: 'Prevista', parcial: 'Parcial', realizada: 'Realizada', cancelada: 'Cancelada' };
const ROTULO_TIPO_TRANSF = { despesa: 'Automática (despesa)', repasse: 'Repasse', troca: 'Troca orçamentária' };
