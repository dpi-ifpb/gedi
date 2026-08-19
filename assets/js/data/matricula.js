/* ================= Dados estáticos: Matrícula 2024 (para comparação de pares) ================= */
// Fonte: planilha "Dados_PNP_IFPB.xlsx", aba Matrículas, coluna 2024 — mesma base de referência
// usada para os indicadores (RAP/IEA/Técnico/Formação/EJA) já existentes no painel.
// "Avançado JP Mangabeira" — nome antigo de "João Pessoa ZS" na planilha de matrículas; unificado abaixo.
const MATRICULA_2024 = {
  'Areia': 536, 'Soledade': 366, 'Cabedelo': 3753, 'Cabedelo Centro': 1101,
  'Cajazeiras': 2539, 'Campina Grande': 4115, 'Catolé do Rocha': 651, 'Esperança': 497,
  'Guarabira': 1123, 'Itabaiana': 443, 'Itaporanga': 454, 'João Pessoa': 9844,
  'João Pessoa ZS': 459, // planilha ainda usa o nome antigo "Avançado JP Mangabeira" — mesma unidade
  'Monteiro': 1092, 'Patos': 1551, 'Pedras de Fogo': 359, 'Picuí': 1315,
  'Princesa Isabel': 888, 'Santa Luzia': 322, 'Santa Rita': 729, 'Sousa': 1727,
};

// Orçamento recebido para execução em 2026 (resultado da Matriz de Distribuição sobre os
// dados de 2024) — fonte: valores informados diretamente pelo usuário.
const ORCAMENTO_2026 = {
  'Areia': 733819.07, 'João Pessoa ZS': 172481.51, 'Soledade': 149669.12,
  'Cabedelo': 4366979.32, 'Cabedelo Centro': 674740.44, 'Cajazeiras': 4915392.37,
  'Campina Grande': 9564475.08, 'Catolé do Rocha': 1666960.91, 'Esperança': 1144907.16,
  'Guarabira': 1349873.47, 'Itabaiana': 1308494.17, 'Itaporanga': 1375973.27,
  'João Pessoa': 14989661.89, 'Monteiro': 2173003.62, 'Patos': 3595759.31,
  'Pedras de Fogo': 733819.07, 'Picuí': 2743913.10, 'Princesa Isabel': 1706892.16,
  'Santa Luzia': 636264.85, 'Santa Rita': 1108363.19, 'Sousa': 5005920.90,
};

let EXTRA_ORC_DATA = [];
let extraLastError = null;

