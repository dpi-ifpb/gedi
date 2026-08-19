/* ================= Tela 1 · Totais ================= */
/*
 * Tabela pivô: Unidade nas linhas; Origem > Situação > Natureza nas colunas,
 * em três níveis de cabeçalho aninhado. Só aparecem colunas para combinações
 * que de fato existem nos dados filtrados (nada de Origem/Situação/Natureza
 * "vazia" ocupando espaço).
 */
let totaisFilters = { origem:'', situacao:'', natureza:'' };

function applyTotaisFilters(itens){
  return itens.filter(it => {
    if(totaisFilters.origem && it.origem !== totaisFilters.origem) return false;
    if(totaisFilters.situacao && it.situacao !== totaisFilters.situacao) return false;
    if(totaisFilters.natureza && it.natureza !== totaisFilters.natureza) return false;
    return true;
  });
}

function buildPivotStructure(itens){
  // universo de Situação/Natureza: o que aparece nos dados já filtrados
  const situacoesGlobais = [...new Set(itens.map(it => it.situacao || 'Não informado'))]
    .sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const naturezasGlobais = [...new Set(itens.map(it => it.natureza || 'Não informado'))]
    .sort((a,b)=>a.localeCompare(b,'pt-BR'));

  // Origem: lista fixa (ordem da validação da planilha), não só as que já têm despesa —
  // assim uma Origem sem nenhum lançamento ainda aparece na tabela, toda em "—".
  // Se houver filtro de Origem específico, mostra só ela.
  const origens = totaisFilters.origem ? [totaisFilters.origem] : ORIGENS_VALIDAS.slice();

  // cada Origem recebe a mesma grade completa de Situação x Natureza — combinações
  // sem despesa aparecem como "—" (calculado depois, na montagem das células)
  return origens.map(origem => ({
    origem,
    situacoes: situacoesGlobais.map(situacao => ({situacao, naturezas: naturezasGlobais})),
  }));
}

function flattenLeafCols(structure){
  const leaves = [];
  structure.forEach(o => o.situacoes.forEach(s => s.naturezas.forEach(n => {
    leaves.push({origem:o.origem, situacao:s.situacao, natureza:n});
  })));
  return leaves;
}

function renderPivotTable(itens){
  const structure = buildPivotStructure(itens);
  const leafCols = flattenLeafCols(structure);
  const unidades = uniqueSorted(itens, i=>i.unidade);

  if(leafCols.length === 0 || unidades.length === 0){
    return `<div class="panel"><div class="state-box"><h3>Sem dados para os filtros selecionados</h3></div></div>`;
  }

  // linha 1: Origem (colspan = qtd de colunas-folha sob ela) — top:0 (linha do topo)
  const row1 = structure.map(o => {
    const span = o.situacoes.reduce((s,sit)=>s+sit.naturezas.length,0);
    return `<th colspan="${span}" class="pivot-th group-origem" style="top:0">${o.origem}</th>`;
  }).join('');

  // linha 2: Situação (colspan = qtd de naturezas sob ela) — top:1 linha de cabeçalho abaixo
  const row2 = structure.map(o => o.situacoes.map(s =>
    `<th colspan="${s.naturezas.length}" class="pivot-th group-situacao" style="top:${PIVOT_HEAD_ROW_H}px">${s.situacao}</th>`
  ).join('')).join('');

  // linha 3: Natureza (folha) — top:2 linhas de cabeçalho abaixo
  const row3 = leafCols.map(c => `<th class="pivot-th leaf num pivot-val" style="top:${PIVOT_HEAD_ROW_H*2}px">${c.natureza}</th>`).join('');

  // linhas de dados por unidade
  const bodyRows = unidades.map(unidade => {
    const itensUnidade = itens.filter(i => i.unidade === unidade);
    let rowTotal = 0;
    const cells = leafCols.map(col => {
      const val = itensUnidade
        .filter(i => (i.origem||'Não informado')===col.origem && (i.situacao||'Não informado')===col.situacao && (i.natureza||'Não informado')===col.natureza)
        .reduce((s,i)=>s+i.valor,0);
      rowTotal += val;
      return `<td class="num pivot-val">${val ? fmtBRLCell(val) : '—'}</td>`;
    }).join('');
    return `<tr><td class="pivot-unit-col" title="${escapeAttr(unidade)}">${unidade}</td><td class="num pivot-total-col">${fmtBRLCell(rowTotal)}</td>${cells}</tr>`;
  }).join('');

  // rodapé: total geral por coluna
  let grandTotal = 0;
  const footCells = leafCols.map(col => {
    const val = itens
      .filter(i => (i.origem||'Não informado')===col.origem && (i.situacao||'Não informado')===col.situacao && (i.natureza||'Não informado')===col.natureza)
      .reduce((s,i)=>s+i.valor,0);
    grandTotal += val;
    return `<td class="num pivot-val">${val ? fmtBRLCell(val) : '—'}</td>`;
  }).join('');

  return `
    <div class="panel pivot-wrap">
      <table class="pivot-table">
        <thead>
          <tr><th rowspan="3" class="pivot-th pivot-unit-col" style="top:0">Unidade</th><th rowspan="3" class="pivot-th pivot-total-col num" style="top:0">Total</th>${row1}</tr>
          <tr>${row2}</tr>
          <tr>${row3}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>
          <tr><td class="pivot-unit-col">Total geral</td><td class="num pivot-total-col">${fmtBRLCell(grandTotal)}</td>${footCells}</tr>
        </tfoot>
      </table>
    </div>`;
}

function buildTotaisFilterBar(){
  const origens = ORIGENS_VALIDAS; // lista fixa (validação da planilha), não só as usadas
  const situacoes = uniqueSorted(ITENS, i=>i.situacao);
  const naturezas = uniqueSorted(ITENS, i=>i.natureza);
  const opts = (arr) => arr.map(v => `<option value="${v}">${v}</option>`).join('');
  return `
    <div class="filter-bar">
      <div class="filter-field">
        <label>Origem</label>
        <select id="tfOrigem" onchange="onTotaisFilterChange()"><option value="">Todas</option>${opts(origens)}</select>
      </div>
      <div class="filter-field">
        <label>Situação</label>
        <select id="tfSituacao" onchange="onTotaisFilterChange()"><option value="">Todas</option>${opts(situacoes)}</select>
      </div>
      <div class="filter-field">
        <label>Natureza</label>
        <select id="tfNatureza" onchange="onTotaisFilterChange()"><option value="">Todas</option>${opts(naturezas)}</select>
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
  totaisFilters.situacao = document.getElementById('tfSituacao').value;
  totaisFilters.natureza = document.getElementById('tfNatureza').value;
  updateTotaisView();
}

function clearTotaisFilters(){
  totaisFilters = { origem:'', situacao:'', natureza:'' };
  buildTotais();
}

function buildTotais(){
  document.getElementById('contentTotais').innerHTML = buildTotaisFilterBar();
  document.getElementById('tfOrigem').value = totaisFilters.origem;
  document.getElementById('tfSituacao').value = totaisFilters.situacao;
  document.getElementById('tfNatureza').value = totaisFilters.natureza;
  updateTotaisView();
}

