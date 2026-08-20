/* ================= Navegação ================= */
const PAGES = ['totais', 'detalhe', 'extra', 'indicadores', 'pares', 'simulador', 'simuladorF', 'sobre'];
function switchPage(page){
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
  indicadores: `
    <h3>Sobre estes indicadores</h3>
    <p>Percentuais que orientaram a composição orçamentária das unidades, tanto na projeção da PLOA quanto na identificação dos valores das propostas em análise pela Reitoria. A linha "RFEPCT (referência)" é o valor médio/base da rede, usado como comparação para as unidades abaixo. Clique no nome de uma unidade para comparar seu perfil de indicadores com a Rede e o IFPB.</p>
  `,
  extra: `
    <h3>Sobre as colunas</h3>
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
  `,
};
function openNotesModal(key){
  document.getElementById('notesModalBody').innerHTML = NOTES_CONTENT[key] || '';
  document.getElementById('notesModal').classList.remove('hidden');
}
function closeNotesModal(){
  document.getElementById('notesModal').classList.add('hidden');
}

/* ================= Inicialização ================= */
refreshData(false);
refreshExtraData();
setInterval(() => { refreshData(false); refreshExtraData(); }, AUTO_REFRESH_MS);
renderIndicadoresTable();
buildParesScreen();buildSimuladorScreen();
buildSimuladorFScreen();
switchPage('sobre');
