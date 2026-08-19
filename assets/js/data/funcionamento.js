/* ================= Dados estáticos: Simulador Bloco Funcionamento ================= */
// Fonte: planilha "5ª Fase - MATRIZ CONIF 2026.xlsx", recalculada (as fórmulas originais não
// vinham com valor em cache — precisei recalcular com o LibreOffice para obter os números reais).
// "custeio" é o valor OFICIAL de 2026 por campus (aba RESUMO PROPOSTA, coluna "Matriz Custeio"),
// já confirmado contra os valores informados (Areia = R$ 733.819,07 bate exatamente).
// "mt" é a Matrícula Total equalizada (aba COMPLETO PROPOSTA). "ano" é o ano de criação do campus —
// usado para saber se o piso de R$ 700.000 (Art. 8º) se aplica (só campi criados a partir de 2018).
// "fEfetivo" é o fator R$/matrícula-equalizada calibrado a partir do PRÓPRIO valor oficial de cada
// campus (custeio × MT_total_rede ÷ mt_campus) — garante que "sem alteração" reproduz o valor real
// exatamente. Para os 2 campi no piso (Areia, Pedras de Fogo) isso não é possível (o valor oficial já
// vem "grudado" no piso, não reflete o valor bruto da fórmula), então eles usam o fator médio da rede
// como aproximação — mas isso não afeta a exibição do valor atual, que já é o oficial. A variação de
// fEfetivo entre campi (a maioria ~R$ 3,62-3,69 bi, com Cabedelo Centro e Picuí como exceções) reflete
// provavelmente o Art. 7º/9º (manutenção do valor do ano anterior corrigido pelo IPCA), que não temos
// como reproduzir sem o orçamento histórico por campus.
const IFPB_FUNC_REAL = {
  "Areia": {mt:367.9216, custeio:733819.07, ano:2020, fEfetivo:3627867707.52},
  "João Pessoa ZS": {mt:143.1674, custeio:172354.58, ano:2016, fEfetivo:3639331054.67},
  "Soledade": {mt:122.6441, custeio:149558.95, ano:2016, fEfetivo:3686452307.93},
  "Cabedelo": {mt:3642.7136, custeio:4363766.63, ano:2009, fEfetivo:3621423892.86},
  "Cabedelo Centro": {mt:645.5344, custeio:674243.88, ano:2015, fEfetivo:3157479180.16},
  "Cajazeiras": {mt:4028.8459, custeio:4911776.39, ano:2009, fEfetivo:3685537239.54},
  "Campina Grande": {mt:8005.7317, custeio:9557438.61, ano:2009, fEfetivo:3608970720.82},
  "Catolé do Rocha": {mt:1365.9663, custeio:1665734.29, ano:2015, fEfetivo:3686452258.72},
  "Esperança": {mt:938.1774, custeio:1144065.02, ano:2016, fEfetivo:3686452251.75},
  "Guarabira": {mt:1106.1344, custeio:1348880.94, ano:2013, fEfetivo:3686452073.29},
  "Itabaiana": {mt:1072.2269, custeio:1307532.28, ano:2016, fEfetivo:3686452086.68},
  "Itaporanga": {mt:1127.5209, custeio:1374960.82, ano:2016, fEfetivo:3686452098.0},
  "João Pessoa": {mt:12488.9677, custeio:14978636.29, ano:2009, fEfetivo:3625672778.19},
  "Monteiro": {mt:1780.6359, custeio:2171405.16, ano:2009, fEfetivo:3686452253.21},
  "Patos": {mt:2976.7648, custeio:3593114.57, ano:2009, fEfetivo:3648962638.36},
  "Pedras de Fogo": {mt:390.6525, custeio:733819.07, ano:2020, fEfetivo:3627867707.52},
  "Picuí": {mt:2370.4473, custeio:2741893.78, ano:2009, fEfetivo:3496738817.96},
  "Princesa Isabel": {mt:1399.2875, custeio:1705636.31, ano:2009, fEfetivo:3684871529.96},
  "Santa Luzia": {mt:521.3777, custeio:635796.65, ano:2017, fEfetivo:3686452617.91},
  "Santa Rita": {mt:908.2319, custeio:1107547.77, ano:2016, fEfetivo:3686452040.29},
  "Sousa": {mt:4221.1405, custeio:5002239.14, ano:2009, fEfetivo:3582428366.4},
};
const FUNC_NETWORK_MT_TOTAL = 3023032.894379999;
const FUNC_FLOOR = 733819.072;
const FUNC_F_CALIBRADO = 3627867707.52; // fallback p/ campi no piso (não dá pra back-solve o F real deles)

