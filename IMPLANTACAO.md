# Atualização v5.5 · fim dos problemas de cache entre atualizações (03/11/2026)

## O que fazer (desta vez, com cuidado especial)
1. **GitHub (dpi-ifpb/gedi):** em Add file → Upload files, arraste o CONTEÚDO da pasta `gedi` deste zip e faça o Commit.
   Arquivos novos: `versao.json` (na raiz) e `ferramentas/nova-versao.py`.
2. **Uma única vez, em cada navegador que estava com problema,** faça uma limpeza manual, porque a versão antiga ainda não tinha a proteção:
   - Chrome/Edge: Ctrl+Shift+Delete → "Imagens e arquivos armazenados em cache" → Limpar. Ou, com o site aberto, F12 → botão direito no ícone de recarregar → "Esvaziar cache e recarregar".
   - Celular: abra o site numa aba anônima ou limpe os dados do navegador para o site.
3. **Firebase:** não é preciso mexer em nada.

## Como fica a partir de agora
- Cada publicação tem um número de versão (agora, 5.5). Todos os arquivos do site são pedidos com esse número (`app.js?v=5.5`). Quando o número muda, o navegador é obrigado a baixar tudo de novo.
- Ao abrir o GEDI, a página consulta o `versao.json` sem cache. Se ele indicar uma versão mais nova do que a carregada, a página recarrega sozinha uma vez.
- A versão aparece ao passar o mouse sobre o seu nome, no rodapé do menu.
- Se você mesmo alterar algum arquivo, rode antes de enviar: `python3 ferramentas/nova-versao.py 5.6` (com o número novo). Os zips que eu enviar já vêm com a versão marcada.
- O GitHub Pages guarda os arquivos por até cerca de 10 minutos. Logo depois do Commit, aguarde alguns minutos antes de testar.

## Correção incluída
- Com arquivos antigos e novos misturados, a tela Início aparecia junto de outra tela. A navegação agora ignora telas que não existem, em vez de parar no meio.
- Abrir direto o endereço terminado em `#auditoria` (antes do login) agora leva ao histórico depois de entrar.
