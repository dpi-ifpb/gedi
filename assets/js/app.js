/* ================= Navegação ================= */
const PAGES = ['totais', 'detalhe', 'extra', 'formacao', 'estrutura', 'funcoes', 'indicadores', 'pares', 'simulador', 'simuladorF', 'sobre'];
function switchPage(page){
  const restrita = typeof PAGINAS_BLOQUEADAS_LIMITADO !== 'undefined' && PAGINAS_BLOQUEADAS_LIMITADO.includes(page);
  const grupo = sessionStorage.getItem('gedi_auth_grupo') || 'limitado';
  if(restrita && grupo !== 'completo') page = 'sobre';
  PAGES.forEach(p => {
    document.getElementById('page-' + p).style.display = (p === page) ? 'block' : 'none';
    document.getElementById('nav' + p.charAt(0).toUpperCase() + p.slice(1)).classList.toggle('active', p === page);
  });
  window.scrollTo(0,0);
}

document.getElementById('collapseBtn').addEventListener('click', ()=>{
  document.getElementById('sidebar').classList.toggle('collapsed');
});

/* Ícones de recolher/expandir a barra lateral (estilo "painel", como no Claude) */
const ICON_SIDEBAR_COLLAPSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="10" y1="4" x2="10" y2="20"/><path d="M7 9l-2 3 2 3"/></svg>';
const ICON_SIDEBAR_EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="10" y1="4" x2="10" y2="20"/><path d="M6.5 9l2 3-2 3"/></svg>';
function updateCollapseIcon(){
  const collapsed = document.getElementById('sidebar').classList.contains('collapsed');
  document.getElementById('collapseBtn').innerHTML = collapsed ? ICON_SIDEBAR_EXPAND : ICON_SIDEBAR_COLLAPSE;
}
document.getElementById('collapseBtn').addEventListener('click', updateCollapseIcon);
updateCollapseIcon();

/* ================= Modal reutilizável de notas explicativas ================= */
const NOTES_CONTENT = {
  indicadores: {
    titulo: 'Sobre estes indicadores',
    corpo: `
    <p>Percentuais que orientaram a composição orçamentária das unidades, tanto na projeção da PLOA quanto na identificação dos valores das propostas em análise pela Reitoria. A linha "RFEPCT (referência)" é o valor médio/base da rede, usado como comparação para as unidades abaixo. Clique no nome de uma unidade para comparar seu perfil de indicadores com a Rede e o IFPB.</p>
  `},
  extra: {
    titulo: 'Sobre as colunas',
    corpo: `
    <dl class="notes-dl">
      <dt>2026 - 2024</dt>
      <dd>Diferença entre o orçamento previsto para 2026 e o de 2024. Valores definidos pelo governo federal: desde 2025 a distribuição orçamentária da Rede Federal usa a Matriz de Distribuição Orçamentária da SETEC/MEC — metodologia já vigente desde a Portaria MEC nº 646/2022, atualizada pela Portaria MEC nº 243, de 10/03/2026.</dd>
      <dt>DIST. EM JANEIRO</dt>
      <dd>Recursos distribuídos de forma extraorçamentária, a partir de recursos recebidos via índices de qualidade.</dd>
      <dt>UNIDADES DE RECOMP.</dt>
      <dd>Reforço Orçamentário em análise pela Reitoria, da ordem de R$ 1.000.000,00, para as unidades que tiveram redução orçamentária em relação a 2024 — baseada na matriz orçamentária, cujo principal parâmetro é a quantidade de matrículas da unidade.</dd>
      <dt>TODAS AS UNIDADES</dt>
      <dd>Reforço Orçamentário em análise pela Reitoria, no valor total de R$ 800.000,00, distribuída a todas as unidades (não só as com déficit orçamentário).</dd>
    </dl>
  `},
  formacao: {
    titulo: 'Sobre esta tela',
    corpo: `
    <p>O orçamento do ano de uma unidade é a soma de todas as colunas da planilha de origem, com exceção da PLOA (que é só uma referência interna de projeção, não compõe o valor final e por isso não aparece nesta tela).</p>
    <dl class="notes-dl">
      <dt>LOA</dt>
      <dd>Recursos destinados com base na Matriz de Distribuição Orçamentária — correspondem ao Bloco de Funcionamento (80%) e ao Bloco de Reitorias (10%) do orçamento distribuído pela Matriz.</dd>
      <dt>Eficiência e Qualidade</dt>
      <dd>Recursos destinados às unidades a partir dos critérios de distribuição definidos institucionalmente de forma colegiada — correspondem ao Bloco Qualidade e Eficiência (10%) do orçamento distribuído pela Matriz.</dd>
      <dt>Reforços do Ano</dt>
      <dd>Recursos adicionais destinados às unidades ao longo do exercício, resultantes de decisões institucionais específicas, conforme necessidades e prioridades identificadas. O valor apresentado corresponde à soma dos reforços realizados de janeiro a dezembro e não decorre de fórmula fixa da Matriz de Distribuição Orçamentária.</dd>
    </dl>
  `},
  funcoes: {
    titulo: 'Tipologia de referência',
    corpo: `
    <p>Cada unidade tem uma tipologia associada, definida pela Portaria MEC nº 327, de 15 de abril de 2026 (Anexos I e II), que estabelece quantos cargos de direção (CD) e funções gratificadas (FG) a unidade pode ter.</p>
    <div class="panel" style="margin-top:14px; overflow-x:auto;">
      <table>
        <thead><tr>
          <th style="top:0">Tipologia</th>
          <th class="num th-center" style="top:0">CD1</th>
          <th class="num th-center" style="top:0">CD2</th>
          <th class="num th-center" style="top:0">CD3</th>
          <th class="num th-center" style="top:0">CD4</th>
          <th class="num th-center" style="top:0">FG1</th>
          <th class="num th-center" style="top:0">FG2</th>
        </tr></thead>
        <tbody>
          ${TIPOLOGIA_DATA.tipologias.map(t => `<tr>
            <td>${t.tipologia}</td>
            <td class="num">${t.cd1}</td><td class="num">${t.cd2}</td><td class="num">${t.cd3}</td><td class="num">${t.cd4}</td>
            <td class="num">${t.fg1}</td><td class="num">${t.fg2}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `},
};
function openNotesModal(key){
  const item = NOTES_CONTENT[key];
  document.getElementById('notesModalTitle').textContent = item ? item.titulo : '';
  document.getElementById('notesModalBody').innerHTML = item ? item.corpo : '';
  document.getElementById('notesModal').classList.remove('hidden');
}
function closeNotesModal(){
  document.getElementById('notesModal').classList.add('hidden');
}

/* ================= Inicialização ================= */
refreshData(false);
refreshExtraData();
refreshFormacaoData();
setInterval(() => { refreshData(false); refreshExtraData(); refreshFormacaoData(); }, AUTO_REFRESH_MS);
renderIndicadoresTable();
buildParesScreen();buildSimuladorScreen();
buildSimuladorFScreen();
renderEstruturaOrganizacional();
renderFuncoesGratificadas();
switchPage('sobre');
