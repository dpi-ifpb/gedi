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

/* ================= Inicialização ================= */
refreshData(false);
refreshExtraData();
setInterval(() => { refreshData(false); refreshExtraData(); }, AUTO_REFRESH_MS);
renderIndicadoresTable();
buildParesScreen();buildSimuladorScreen();
buildSimuladorFScreen();
switchPage('sobre');
