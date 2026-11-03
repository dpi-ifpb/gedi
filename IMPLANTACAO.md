# Atualização v5.2 · ação no lugar do PTRES, histórico por URL, cadastros em abas e novo menu (02/11/2026)

## 1 · Firebase: regras
Em Firestore Database → Regras, cole `firebase/firestore.rules` e clique em Publicar.
Agora as transferências exigem a ação do orçamento nas duas pontas.
Os dados atuais podem ficar: o campo `ptres` já gravado é ignorado, e a coleção `ptres` pode ser apagada quando quiser.

## 2 · GitHub (dpi-ifpb/gedi)
Em Add file → Upload files, arraste o CONTEÚDO da pasta `gedi` deste zip e faça o Commit. Depois abra o site com Ctrl+Shift+R.
O arquivo novo é `assets/js/pages/auditoria.js`.

## 3 · No GEDI (administrador)
1. Em Administração → Cadastros → Ações do orçamento → Importar lista, cole o conteúdo do CSV das ações, com o cabeçalho.
2. O histórico de alterações fica em `https://dpi-ifpb.github.io/gedi/#auditoria` (gestor e administrador).

## O que mudou
- Receitas, análise, transferências, importação e Painel usam a **ação**; o PTRES saiu.
- **Orçamento** reúne Painel, Receitas, Despesas, Transferências e Formação. A tela Totais saiu (o Painel cobre).
- **Administração → Cadastros**: abas Unidades, Origens, Ações do orçamento, Financiadores e Posições no ID.
- As telas não mostram mais quem cadastrou ou alterou. Essas informações ficam na página de histórico (#auditoria).
- Painel lateral: 50% mais largo, barra de título mais baixa e na cor do cabeçalho das tabelas. No celular, continua ocupando a tela inteira.
- Caixas de seleção com a seta afastada da borda direita.
