# Roteiro de instalação do zero · GEDI com Registro de Despesas

Cenário: nenhum usuário cadastrado e nenhuma despesa no Firestore. O roteiro completo e comentado
está no documento "GEDI · Guia de uso do Firebase"; aqui fica o resumo.

## A · Firebase (console.firebase.google.com, projeto gedi-351e0)
1. Authentication → Método de login: Google ativado. Configurações → Domínios autorizados: `dpi-ifpb.github.io`.
2. Firestore Database → Dados → coleção `usuarios` (crie com "+ Iniciar coleção" se não existir) →
   documento com ID = seu e-mail em minúsculas → campo `perfis` (array) com o item string `administrador`.
3. Firestore Database → Regras: copie as regras atuais para um arquivo, cole `firebase/firestore.rules`, Publicar.
4. Confira se a coleção `dados_estaticos` existe (8 documentos). Se não existir, o painel abre do mesmo
   jeito; só Indicadores, Estrutura e Funções ficam vazios.

## B · GitHub (dpi-ifpb/gedi)
1. Apague do repositório os arquivos antigos que o painel não usa mais (alguns têm dados de servidores
   e ficam públicos no site): em `assets/js/data/` → `servidores.js`, `setores.js`, `tipologia.js`,
   `indicadores.js`, `indicadores-historico.js`, `network.js`, `funcionamento.js`, `matricula.js`, `coordenadas-uo.js`.
   Guarde uma cópia local antes (estão no zip antigo).
2. Add file → Upload files → arraste o CONTEÚDO desta pasta (index.html, README.md, IMPLANTACAO.md,
   assets/, firebase/) → Commit. Arquivos com o mesmo nome são substituídos.
3. Aguarde ~1 minuto e abra https://dpi-ifpb.github.io/gedi/ com Ctrl+Shift+R (recarregar sem cache).

## C · Primeiro acesso (no GEDI, como administrador)
1. Administração → Unidades e Origens → Carregar valores iniciais. Cadastre as unidades sem código
   (Cajazeiras, Alagoa Grande…) e a origem LOA. Códigos não mudam depois.
2. Administração → Financiadores: cadastre um de teste (código 9999, "TESTE").
3. Administração → Usuários: cadastre os colegas com os perfis.

## D · Testes com despesas
Use o ano **2099** em todas as despesas de teste, para não ocupar números de 2026.
1. Registro de Despesas → + Nova despesa (ex.: Areia/RP2 → `#AR.0001.2.0000`; Sousa/RP6/financiador 9999 → `#SS.0001.6.9999`).
2. Confira Totais e Detalhamento com o filtro Ano = 2099; edite (o ID não muda); inative e reative.
3. Ao terminar, apague os testes pelo Console: em `despesas`, os documentos que começam com `2099_`;
   em `contadores`, os que começam com `2099_`; em `financiadores`, o `9999`.
