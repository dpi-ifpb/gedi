function buildParesData(){
  return Object.keys(MATRICULA_2024).map(nome => {
    const ind = RFEPCT_DATA.find(u => u.unidade === nome);
    const matricula = MATRICULA_2024[nome];
    const orcamento = ORCAMENTO_2026[nome] !== undefined ? ORCAMENTO_2026[nome] : null;
    return {
      unidade: nome,
      matricula,
      orcamento,
      rPorAluno: orcamento !== null ? orcamento / matricula : null,
      rap: ind && ind.rap ? parseIndicatorValue(ind.rap.v) : null,
      iea: ind && ind.iea ? parseIndicatorValue(ind.iea.v) : null,
      tecnico: ind && ind.tecnico ? parseIndicatorValue(ind.tecnico.v) : null,
      formacao: ind && ind.formacao ? parseIndicatorValue(ind.formacao.v) : null,
      eja: ind && ind.eja ? parseIndicatorValue(ind.eja.v) : null,
    };
  });
}

let paresFilters = { ref: '', tolerancia: 25, criterio: 'matricula' };

function paresDeltaCell(peerVal, refVal, isPercent){
  if(peerVal === null || refVal === null) return `<td class="num pares-center">—</td>`;
  const diff = peerVal - refVal;
  const cls = diff > 0.005 ? 'rfepct-green' : (diff < -0.005 ? 'rfepct-red' : '');
  const valTxt = isPercent ? (peerVal.toFixed(2).replace('.',',')+'%') : String(peerVal).replace('.',',');
  const diffTxt = (diff >= 0 ? '+' : '') + diff.toFixed(2).replace('.',',') + (isPercent ? 'pp' : '');
  return `<td class="num pares-center rfepct-cell ${cls}">${valTxt}<br><span style="font-size:10px;opacity:.75;">${diffTxt}</span></td>`;
}

// Célula neutra (sem verde/vermelho) — usada para Matrícula/Orçamento/R$ por aluno, onde
// "maior" não é claramente melhor ou pior. `center` controla o alinhamento (Orçamento fica à direita).
function paresNeutralCell(peerVal, refVal, fmt, center){
  const cls = center === false ? 'num' : 'num pares-center';
  if(peerVal === null || refVal === null) return `<td class="${cls}">—</td>`;
  const diff = peerVal - refVal;
  const diffTxt = (diff >= 0 ? '+' : '') + fmt(diff);
  return `<td class="${cls}">${fmt(peerVal)}<br><span style="font-size:10px;color:var(--ink-soft);">${diffTxt}</span></td>`;
}

function renderParesTable(){
  const data = buildParesData();
  const ref = data.find(u => u.unidade === paresFilters.ref);
  const area = document.getElementById('paresArea');
  if(!ref){ area.innerHTML = ''; return; }

  const campo = paresFilters.criterio; // 'matricula' ou 'orcamento'
  const refVal = ref[campo];
  const tol = paresFilters.tolerancia / 100;
  const min = refVal * (1 - tol), max = refVal * (1 + tol);
  const peers = data
    .filter(u => u.unidade !== ref.unidade && u[campo] !== null && u[campo] >= min && u[campo] <= max)
    .sort((a,b) => Math.abs(a[campo] - refVal) - Math.abs(b[campo] - refVal));

  const fmtVal = (v, isPercent) => v === null ? '—' : (isPercent ? v.toFixed(2).replace('.',',')+'%' : String(v).replace('.',','));
  const star = '<span style="color:#E74C3C;">★</span>';
  const matriculaTh = campo === 'matricula' ? `Matrícula 2024 ${star}` : 'Matrícula 2024';
  const orcamentoTh = campo === 'orcamento' ? `Orçamento 2026 ${star}` : 'Orçamento 2026';

  const refRow = `
    <tr style="background:#E4D6F0; font-weight:600;">
      <td>${ref.unidade} (referência)</td>
      <td class="num pares-center">${fmtInt(ref.matricula)}</td>
      <td class="num">${ref.orcamento !== null ? fmtMoneyShort(ref.orcamento) : '—'}</td>
      <td class="num pares-center">${ref.rPorAluno !== null ? fmtMoneyShort(ref.rPorAluno) : '—'}</td>
      <td class="num pares-center">${fmtVal(ref.rap,false)}</td>
      <td class="num pares-center">${fmtVal(ref.iea,true)}</td>
      <td class="num pares-center">${fmtVal(ref.tecnico,true)}</td>
      <td class="num pares-center">${fmtVal(ref.formacao,true)}</td>
      <td class="num pares-center">${fmtVal(ref.eja,true)}</td>
    </tr>`;

  const peerRows = peers.map(p => `
    <tr>
      <td>${p.unidade}</td>
      ${paresNeutralCell(p.matricula, ref.matricula, fmtInt)}
      ${paresNeutralCell(p.orcamento, ref.orcamento, fmtMoneyShort, false)}
      ${paresNeutralCell(p.rPorAluno, ref.rPorAluno, fmtMoneyShort)}
      ${paresDeltaCell(p.rap, ref.rap, false)}
      ${paresDeltaCell(p.iea, ref.iea, true)}
      ${paresDeltaCell(p.tecnico, ref.tecnico, true)}
      ${paresDeltaCell(p.formacao, ref.formacao, true)}
      ${paresDeltaCell(p.eja, ref.eja, true)}
    </tr>`).join('');

  area.innerHTML = `
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th>Unidade</th>
            <th class="num pares-center">${matriculaTh}</th>
            <th class="num">${orcamentoTh}</th>
            <th class="num pares-center">R$ / aluno</th>
            <th class="num pares-center">RAP</th>
            <th class="num pares-center">IEA</th>
            <th class="num pares-center">Técnico</th>
            <th class="num pares-center">Formação</th>
            <th class="num pares-center">EJA</th>
          </tr>
        </thead>
        <tbody>${refRow}${peerRows || `<tr><td colspan="9" class="muted" style="padding:20px 26px;">Nenhuma unidade dentro da tolerância selecionada.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function onParesFilterChange(){
  paresFilters.ref = document.getElementById('paresRef').value;
  paresFilters.tolerancia = parseFloat(document.getElementById('paresTol').value) || 25;
  paresFilters.criterio = document.getElementById('paresCriterio').value;
  renderParesTable();
}

function buildParesScreen(){
  const data = buildParesData().sort((a,b) => a.unidade.localeCompare(b.unidade,'pt-BR'));
  if(!paresFilters.ref) paresFilters.ref = data[0].unidade;
  const opts = data.map(u => `<option value="${escapeAttr(u.unidade)}">${u.unidade}</option>`).join('');

  document.getElementById('contentPares').innerHTML = `
    <div class="filter-bar">
      <div class="filter-field">
        <label>Unidade de referência</label>
        <select id="paresRef" onchange="onParesFilterChange()">${opts}</select>
      </div>
      <div class="filter-field">
        <label>Analisar por</label>
        <select id="paresCriterio" onchange="onParesFilterChange()">
          <option value="matricula" ${paresFilters.criterio==='matricula'?'selected':''}>Matrícula</option>
          <option value="orcamento" ${paresFilters.criterio==='orcamento'?'selected':''}>Orçamento</option>
        </select>
      </div>
      <div class="filter-field">
        <label>Tolerância (%)</label>
        <input type="number" id="paresTol" value="${paresFilters.tolerancia}" min="5" max="200" step="5" oninput="onParesFilterChange()">
      </div>
    </div>
    <div id="paresArea"></div>
    <div class="notes-panel">
      <p>Base 2024 para os indicadores (mesmo ano da PNP que formou o orçamento hoje em execução) e Orçamento 2026 como o valor efetivamente recebido. A coluna marcada com ★ é o critério usado para selecionar os pares. Nas colunas de indicador, verde/vermelho indicam par melhor/pior que a referência; em Matrícula, Orçamento e R$/aluno o delta é só informativo (mais ou menos não é necessariamente melhor).</p>
    </div>`;
  document.getElementById('paresRef').value = paresFilters.ref;
  renderParesTable();
}

