# Atualização v5 · UG, PTRES, resultado primário e três tipos de transferência (02/11/2026)

O roteiro de teste completo está no documento "GEDI · Guia de uso do Firebase". Os conceitos estão no README.

## 1 · Firebase: limpar os dados de teste
Em Firestore Database → Dados, apague as coleções `transferencias`, `contadores`, `despesas` e `ids` (menu ⋮ da coleção → Excluir coleção).
As transferências mudaram de formato: agora têm tipo, código e lançamentos de NC.
Usuários, unidades, origens, ações, posições, financiadores e receitas podem ficar.

## 2 · Firebase: regras
Em Firestore Database → Regras, cole `firebase/firestore.rules` (versão v5) e clique em Publicar.

## 3 · GitHub (dpi-ifpb/gedi)
Em Add file → Upload files, arraste o CONTEÚDO da pasta `gedi` deste zip e faça o Commit. Depois abra o site com Ctrl+Shift+R.

## 4 · No GEDI (administrador)
1. Administração → Unidades, Origens e Ações:
   - informe a **UG** (6 dígitos) de cada unidade;
   - confira o **RP** de cada origem (LOA/EFQ/RTC = 2, RP6 = 6, RP7 = 7);
   - cadastre os **PTRES**, cada um vinculado à sua ação.
2. Confira se existe a tabela de posições do ano.
3. Siga o roteiro de teste v5 do guia.
