# Atualização · fluxo de registro e análise de despesas (29/10/2026)

Para quem já instalou a versão anterior. O passo a passo comentado está no documento
"GEDI · Guia de uso do Firebase".

## 1 · Firebase
1. Firestore Database → Dados: apague as despesas de teste da versão anterior (coleção `despesas`)
   e os documentos de `contadores`. Elas usam o formato antigo e ocupariam números de ID.
2. Firestore Database → Regras: cole `firebase/firestore.rules` (versão nova) e Publicar.

## 2 · GitHub (dpi-ifpb/gedi)
1. Apague `assets/js/pages/registro-despesas.js` (substituído por `lista-despesas.js`).
2. Add file → Upload files → arraste o CONTEÚDO da pasta `gedi` deste zip → Commit.
3. Abra o site com Ctrl+Shift+R.

## 3 · No GEDI (administrador)
1. Administração → Usuários: dê o perfil **Registrador de Despesas** a quem só lança despesas e marque
   as unidades de cada um. Quem analisa recebe **Gestor de Planejamento**.
2. Teste o fluxo no ano 2099 (registrar → analisar → deferir/indeferir) e depois apague os testes pelo
   Console: `despesas` (os de ano 2099), `ids` e `contadores` que começam com `2099_`.
