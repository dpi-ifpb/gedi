/* ================= Configuração da fonte de dados ================= */
const SHEET_ID = '1kWa9nu__ZMcGHEsvW0SjCSqIx67lVmSma8IbRqt3J3g';
const GID = '0';
const EXTRA_SHEET_ID = '1glxot4hifQGyDytwTmxaN1_vdZNEUdEynS0Gkok2FPo'; // "Distribuição de recursos"
const EXTRA_GID = '0';
const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutos
const PIVOT_HEAD_ROW_H = 36; // px — altura fixa de cada linha do cabeçalho da tabela pivô (ver .pivot-th no CSS)
const EXTRA_HEAD_ROW_H = 40; // px — altura fixa de cada linha do cabeçalho da tabela de Extraorçamentário
const RFEPCT_HEAD_ROW_H = 38; // px — altura fixa de cada linha do cabeçalho da tabela de Indicadores
// Origens de recurso válidas, na ordem da validação da planilha — usado na tela de Totais
// para mostrar toda Origem possível (mesmo sem nenhuma despesa lançada ainda).
const ORIGENS_VALIDAS = ['EFQ', 'LOA', 'PAC', 'RP2', 'RP6', 'RP7', 'RTC']; // EFQ adicionada em ordem alfabética — confirmar posição real na validação, se diferente

