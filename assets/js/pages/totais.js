/* ================= Módulo Despesas · Totais ================= */
/*
 * Somente despesas DEFERIDAS e ativas do ano selecionado.
 * Tabela pivô: Unidade nas linhas; Origem > Natureza nas colunas (dois níveis de
 * cabeçalho). Toda origem cadastrada aparece, mesmo sem despesa ("—").
 */
let totaisFilters = { origem:'', natureza:'' };

function applyTotaisFilters(itens){
  return itens.filter(it => {
    if(totaisFilters.origem && it.origem !== totaisFilters.origem) return false;
    if(totaisFilters.natureza && it.natureza !== totaisFilters.natureza) return false;
    return true;
  });
}

// Origens da tabela de apoio (cadastradas pelo administrador), em ordem alfabética,
// mais qualquer origem que apareça nas despesas e não esteja cadastrada.
function origensDoPainel(){
  const cadastradas = origensOrdenadas(false).map(o => o.sigla);
  const base = cadastradas.length ? cadastradas : ORIGENS_VALIDAS.slice();
  const extras = [...new Set(ITENS.map(i => i.origem).filter(o => o && !base.includes(o)))];
  return [...base, ...extras].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function renderPivotTable(itens){
  const origens = totaisFilters.origem ? [totaisFilters.origem] : origensDoPainel();
  const naturezas = totaisFilters.natureza ? [totaisFilters.natureza] : NATUREZAS.slice();
  const leafCols = [];
  origens.forEach(origem => naturezas.forEach(natureza => leafCols.push({ origem, natureza })));
  const unidades = sortUnidadesList(uniqueSorted(itens, i=>i.unidade));

  if(leafCols.length === 0 || unidades.length === 0){
    return `<div class="panel"><div class="state-box"><h3>Nenhuma despesa deferida para os filtros selecionados</h3></div></div>`;
  }

  const somar = (lista, col) => lista
    .filter(i => i.origem === col.origem && i.natureza === col.natureza)
    .reduce((s,i)=>s+i.valor,0);

  const row1 = origens.map(o =>
    `<th colspan="${naturezas.length}" class="pivot-th group-origem" style="top:0">${o}</th>`).join('');
  const row2 = leafCols.map(c =>
    `<th class="pivot-th leaf num pivot-val" style="top:${PIVOT_HEAD_ROW_H}px">${c.natureza}</th>`).join('');

  const bodyRows = unidades.map(unidade => {
    const itensUnidade = itens.filter(i => i.unidade === unidade);
    let rowTotal = 0;
    const cells = leafCols.map(col => {
      const val = somar(itensUnidade, col);
      rowTotal += val;
      return `<td class="num pivot-val">${val ? fmtBRLCell(val) : '—'}</td>`;
    }).join('');
    return `<tr><td class="pivot-unit-col" title="${escapeAttr(unidade)}">${unidade}</td><td class="num pivot-total-col">${fmtBRLCell(rowTotal)}</td>${cells}</tr>`;
  }).join('');

  let grandTotal = 0;
  const footCells = leafCols.map(col => {
    const val = somar(itens, col);
    grandTotal += val;
    return `<td class="num pivot-val">${val ? fmtBRLCell(val) : '—'}</td>`;
  }).join('');

  return `
    <div class="panel pivot-wrap">
      <table class="pivot-table">
        <thead>
          <tr><th rowspan="2" class="pivot-th pivot-unit-col" style="top:0">Unidade</th><th rowspan="2" class="pivot-th pivot-total-col num" style="top:0">Total</th>${row1}</tr>
          <tr>${row2}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>
          <tr><td class="pivot-unit-col">Total</td><td class="num pivot-total-col">${fmtBRLCell(grandTotal)}</td>${footCells}</tr>
        </tfoot>
      </table>
    </div>`;
}

function buildTotaisFilterBar(){
  const opts = (arr) => arr.map(v => `<option value="${v}">${v}</option>`).join('');
  return `
    <div class="filter-bar">${renderAnoPainelField()}
      <div class="filter-field">
        <label>Origem</label>
        <select id="tfOrigem" onchange="onTotaisFilterChange()"><option value="">Todas</option>${opts(origensDoPainel())}</select>
      </div>
      <div class="filter-field">
        <label>Natureza</label>
        <select id="tfNatureza" onchange="onTotaisFilterChange()"><option value="">Todas</option>${opts(NATUREZAS)}</select>
      </div>
      <button class="filter-clear" onclick="clearTotaisFilters()">Ver tudo</button>
    </div>
    <div id="totaisPivotArea"></div>`;
}

function updateTotaisView(){
  const filtrados = applyTotaisFilters(ITENS);

  const totalCusteio = filtrados.filter(i=>i.natureza==='Custeio').reduce((s,i)=>s+i.valor,0);
  const totalInvestimento = filtrados.filter(i=>i.natureza==='Investimento').reduce((s,i)=>s+i.valor,0);
  const totalGeral = totalCusteio + totalInvestimento;

  const kpiHtml = `
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">Total de Custeio</div>
        <div class="kpi-value">${fmtBRL(totalCusteio)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total de Investimento</div>
        <div class="kpi-value">${fmtBRL(totalInvestimento)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Geral</div>
        <div class="kpi-value">${fmtBRL(totalGeral)}</div>
      </div>
    </div>`;

  document.getElementById('totaisPivotArea').innerHTML = kpiHtml + renderPivotTable(filtrados);
}

function onTotaisFilterChange(){
  totaisFilters.origem = document.getElementById('tfOrigem').value;
  totaisFilters.natureza = document.getElementById('tfNatureza').value;
  updateTotaisView();
}

function clearTotaisFilters(){
  totaisFilters = { origem:'', natureza:'' };
  buildTotais();
}

function buildTotais(){
  document.getElementById('contentTotais').innerHTML = buildTotaisFilterBar();
  document.getElementById('tfOrigem').value = totaisFilters.origem;
  document.getElementById('tfNatureza').value = totaisFilters.natureza;
  updateTotaisView();
}

