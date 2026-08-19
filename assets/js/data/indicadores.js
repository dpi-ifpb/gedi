/* ================= Dados estáticos: Indicadores RFEPCT / PNP ================= */
// Transcrito de uma imagem enviada pelo usuário (valores e cores lidos visualmente) — vale
// conferência: não veio de leitura automática de planilha nem de fonte em texto.
const RFEPCT_BASELINE = {rap:"20,42", iea:"73,30%", tecnico:"50,60%", formacao:"13,90%", eja:"2,11%"};
const RFEPCT_DATA = [
  {unidade:"IFPB", rap:{v:"23,74",c:"green"}, iea:{v:"45,10%",c:"red"}, tecnico:{v:"50,90%",c:"blue"}, formacao:{v:"14,30%",c:"red"}, eja:{v:"1,31%",c:"red"}},
  {unidade:"Areia", rap:{v:"31,29",c:"green"}, iea:{v:"46,43%",c:"red"}, tecnico:{v:"85,90%",c:"green"}, formacao:{v:"3,60%",c:"red"}, eja:{v:"11,23%",c:"green"}},
  {unidade:"Cabedelo", rap:{v:"32,86",c:"green"}, iea:{v:"72,46%",c:"orange"}, tecnico:{v:"40,70%",c:"red"}, formacao:{v:"27,10%",c:"green"}, eja:{v:"3,31%",c:"yellow"}},
  {unidade:"Cabedelo Centro", rap:{v:"13,33",c:"red"}, iea:{v:"40,66%",c:"red"}, tecnico:{v:"62,70%",c:"green"}, formacao:{v:"3,20%",c:"red"}, eja:{v:"6,44%",c:"blue"}},
  {unidade:"Cajazeiras", rap:{v:"29,50",c:"green"}, iea:{v:"53,31%",c:"red"}, tecnico:{v:"40,80%",c:"red"}, formacao:{v:"15,20%",c:"blue"}, eja:{v:"1,82%",c:"red"}},
  {unidade:"Campina Grande", rap:{v:"25,47",c:"green"}, iea:{v:"34,94%",c:"red"}, tecnico:{v:"47,10%",c:"red"}, formacao:{v:"26,20%",c:"green"}, eja:{v:"0,37%",c:"red"}},
  {unidade:"Catolé do Rocha", rap:{v:"23,08",c:"green"}, iea:{v:"89,31%",c:"green"}, tecnico:{v:"95,30%",c:"green"}, formacao:null, eja:null},
  {unidade:"Esperança", rap:{v:"15,46",c:"red"}, iea:{v:"60,00%",c:"red"}, tecnico:{v:"65,70%",c:"green"}, formacao:null, eja:null},
  {unidade:"Guarabira", rap:{v:"27,64",c:"green"}, iea:{v:"57,14%",c:"red"}, tecnico:{v:"36,00%",c:"red"}, formacao:null, eja:null},
  {unidade:"Itabaiana", rap:{v:"18,16",c:"blue"}, iea:{v:"74,45%",c:"yellow"}, tecnico:{v:"100,00%",c:"green"}, formacao:null, eja:null},
  {unidade:"Itaporanga", rap:{v:"16,80",c:"red"}, iea:{v:"70,42%",c:"orange"}, tecnico:{v:"91,90%",c:"green"}, formacao:null, eja:null},
  {unidade:"João Pessoa", rap:{v:"25,39",c:"green"}, iea:{v:"43,41%",c:"red"}, tecnico:{v:"42,70%",c:"red"}, formacao:{v:"11,00%",c:"red"}, eja:{v:"0,77%",c:"red"}},
  {unidade:"João Pessoa ZS", rap:{v:"17,09",c:"red"}, iea:{v:"38,89%",c:"red"}, tecnico:{v:"80,60%",c:"green"}, formacao:null, eja:null},
  {unidade:"Monteiro", rap:{v:"24,69",c:"green"}, iea:{v:"54,63%",c:"red"}, tecnico:{v:"50,90%",c:"blue"}, formacao:{v:"0,60%",c:"red"}, eja:null},
  {unidade:"Patos", rap:{v:"24,70",c:"green"}, iea:{v:"23,86%",c:"red"}, tecnico:{v:"60,20%",c:"green"}, formacao:{v:"0,70%",c:"red"}, eja:null},
  {unidade:"Pedras de Fogo", rap:{v:"22,97",c:"green"}, iea:{v:"35,83%",c:"red"}, tecnico:{v:"89,10%",c:"green"}, formacao:null, eja:{v:"6,23%",c:"blue"}},
  {unidade:"Picuí", rap:{v:"15,22",c:"red"}, iea:{v:"55,77%",c:"red"}, tecnico:{v:"56,70%",c:"blue"}, formacao:{v:"27,10%",c:"green"}, eja:null},
  {unidade:"Princesa Isabel", rap:{v:"22,54",c:"green"}, iea:{v:"42,77%",c:"red"}, tecnico:{v:"57,10%",c:"blue"}, formacao:{v:"28,10%",c:"green"}, eja:null},
  {unidade:"Santa Luzia", rap:{v:"15,94",c:"red"}, iea:{v:"38,85%",c:"red"}, tecnico:{v:"100,00%",c:"green"}, formacao:null, eja:null},
  {unidade:"Santa Rita", rap:{v:"18,36",c:"blue"}, iea:{v:"78,72%",c:"yellow"}, tecnico:{v:"87,40%",c:"green"}, formacao:{v:"1,20%",c:"red"}, eja:null},
  {unidade:"Soledade", rap:{v:"22,56",c:"green"}, iea:{v:"25,32%",c:"red"}, tecnico:{v:"85,40%",c:"green"}, formacao:null, eja:null},
  {unidade:"Sousa", rap:{v:"16,35",c:"red"}, iea:{v:"32,72%",c:"red"}, tecnico:{v:"41,90%",c:"red"}, formacao:{v:"34,40%",c:"green"}, eja:{v:"3,59%",c:"yellow"}},
];

