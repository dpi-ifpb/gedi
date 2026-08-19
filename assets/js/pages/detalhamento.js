/* ================= Tela 2 · Detalhamento ================= */
function buildDetalheFilters(){
  const unidades = sortUnidadesList(uniqueSorted(ITENS, i=>i.unidade));
  const origens = uniqueSorted(ITENS, i=>i.origem);
  const naturezas = uniqueSorted(ITENS, i=>i.natureza);
  const situacoes = uniqueSorted(ITENS, i=>i.situacao);

  const opts = (arr) => arr.map(v => `<option value="${v}">${v}</option>`).join('');

  const html = `
    <div class="filter-bar">
      <div class="filter-field" style="min-width:220px;">
        <label>Buscar</label>
        <input type="text" id="fBusca" placeholder="Buscar por descrição…" value="${currentFilters.busca}" oninput="onFilterChange()">
      </div>
      <div class="filter-field">
        <label>Unidade</label>
        <select id="fUnidade" onchange="onFilterChange()">
          <option value="">Todas</option>${opts(unidades)}
        </select>
      </div>
      <div class="filter-field">
        <label>Origem</label>
        <select id="fOrigem" onchange="onFilterChange()">
          <option value="">Todas</option>${opts(origens)}
        </select>
      </div>
      <div class="filter-field">
        <label>Natureza</label>
        <select id="fNatureza" onchange="onFilterChange()">
          <option value="">Todas</option>${opts(naturezas)}
        </select>
      </div>
      <div class="filter-field">
        <label>Situação</label>
        <select id="fSituacao" onchange="onFilterChange()">
          <option value="">Todas</option>${opts(situacoes)}
        </select>
      </div>
      <button class="filter-clear" onclick="clearFilters()">Limpar filtros</button>
    </div>
    <div class="result-count" id="resultCount"></div>
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th>Unidade</th>
            <th>Descrição</th>
            <th class="th-center">Origem</th>
            <th class="th-center">Natureza</th>
            <th class="th-center">Situação</th>
            <th class="num th-center">Valor</th>
          </tr>
        </thead>
        <tbody id="detalheBody"></tbody>
        <tfoot id="detalheFoot"></tfoot>
      </table>
    </div>`;

  document.getElementById('contentDetalhe').innerHTML = html;

  // restaura valores de filtro já selecionados (após refresh, por ex.)
  if(document.getElementById('fUnidade')) document.getElementById('fUnidade').value = currentFilters.unidade;
  if(document.getElementById('fOrigem')) document.getElementById('fOrigem').value = currentFilters.origem;
  if(document.getElementById('fNatureza')) document.getElementById('fNatureza').value = currentFilters.natureza;
  if(document.getElementById('fSituacao')) document.getElementById('fSituacao').value = currentFilters.situacao;

  // delegação de clique: abrir popup de detalhe ao clicar na descrição
  document.getElementById('detalheBody').addEventListener('click', (e) => {
    const link = e.target.closest('.desc-link');
    if(link) openDetail(link.dataset.id);
  });
}

function origemBadgeClass(origem){
  if(origem === 'RP2') return 'origem-rp2';
  if(origem === 'RTC') return 'origem-rtc';
  return 'origem-outra';
}
function situacaoTagClass(sit){
  if(sit === 'Atendida') return 'sit-atendida';
  if(sit === 'Comprometida') return 'sit-comprometida';
  if(sit === 'Prevista') return 'sit-prevista';
  return 'sit-outra';
}
function naturezaTagClass(nat){
  return nat === 'Investimento' ? 'tipo-investimento' : 'tipo-custeio';
}

function applyFilters(){
  return ITENS.filter(it => {
    if(currentFilters.busca && !it.descricao.toLowerCase().includes(currentFilters.busca.toLowerCase())) return false;
    if(currentFilters.unidade && it.unidade !== currentFilters.unidade) return false;
    if(currentFilters.origem && it.origem !== currentFilters.origem) return false;
    if(currentFilters.natureza && it.natureza !== currentFilters.natureza) return false;
    if(currentFilters.situacao && it.situacao !== currentFilters.situacao) return false;
    return true;
  });
}

function buildDetalheTable(){
  const body = document.getElementById('detalheBody');
  const foot = document.getElementById('detalheFoot');
  const countEl = document.getElementById('resultCount');
  if(!body) return;

  const filtrados = applyFilters();
  countEl.textContent = `${filtrados.length} de ${ITENS.length} registros`;

  const rows = filtrados.map(it => `
    <tr>
      <td>${it.unidade}</td>
      <td class="desc-cell"><span class="desc-link" data-id="${escapeAttr(it.id)}">${it.descricao}</span></td>
      <td><span class="badge ${origemBadgeClass(it.origem)}">${it.origem || '—'}</span></td>
      <td><span class="tipo-tag ${naturezaTagClass(it.natureza)}">${it.natureza || '—'}</span></td>
      <td><span class="sit-tag ${situacaoTagClass(it.situacao)}">${it.situacao || '—'}</span></td>
      <td class="num">${fmtBRLCell(it.valor)}</td>
    </tr>`).join('');

  body.innerHTML = rows || `<tr><td colspan="6" class="muted" style="padding:24px 26px;">Nenhum registro para os filtros selecionados.</td></tr>`;

  const totalFiltrado = filtrados.reduce((s,i)=>s+i.valor,0);
  foot.innerHTML = `<tr><td colspan="5">Total filtrado</td><td class="num">${fmtBRLCell(totalFiltrado)}</td></tr>`;
}

function onFilterChange(){
  currentFilters.busca = document.getElementById('fBusca').value;
  currentFilters.unidade = document.getElementById('fUnidade').value;
  currentFilters.origem = document.getElementById('fOrigem').value;
  currentFilters.natureza = document.getElementById('fNatureza').value;
  currentFilters.situacao = document.getElementById('fSituacao').value;
  buildDetalheTable();
}

function clearFilters(){
  currentFilters = { busca:'', unidade:'', origem:'', natureza:'', situacao:'' };
  buildDetalheFilters();
  buildDetalheTable();
}

/* ---- Popup de detalhe (Identificador, Ação do Orçamento, Doc. e Data) ---- */
function openDetail(id){
  const it = ITENS.find(i => i.id === id);
  if(!it) return;
  const dl = document.getElementById('modalDl');
  dl.innerHTML = `
    <dt>Identificador</dt><dd>${escapeHtml(it.id)}</dd>
    <dt>Descrição</dt><dd>${escapeHtml(it.descricao)}</dd>
    <dt>Unidade</dt><dd>${escapeHtml(it.unidade)}</dd>
    <dt>Origem</dt><dd>${escapeHtml(it.origem) || '—'}</dd>
    <dt>Natureza</dt><dd>${escapeHtml(it.natureza) || '—'}</dd>
    <dt>Situação</dt><dd>${escapeHtml(it.situacao) || '—'}</dd>
    <dt>Valor</dt><dd>${fmtBRL(it.valor)}</dd>
    <dt>Ação do Orçamento</dt><dd>${escapeHtml(it.acao) || '—'}</dd>
    <dt>Doc. de Referência</dt><dd>${escapeHtml(it.doc) || '—'}</dd>
    <dt>Data do Doc.</dt><dd>${escapeHtml(it.dataDoc) || '—'}</dd>
  `;
  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetail(){
  document.getElementById('detailModal').classList.add('hidden');
}

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){ closeDetail(); closeChartModal(); }
});

