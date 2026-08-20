/* ================= Tela 4 · Indicadores RFEPCT / PNP ================= */
function rfepctCell(cell){
  if(!cell) return `<td class="num rfepct-cell rfepct-red">0,00%</td>`;
  return `<td class="num rfepct-cell rfepct-${cell.c}">${cell.v}</td>`;
}

function renderIndicadoresTable(){
  const rows = RFEPCT_DATA.map(u => `
    <tr>
      <td><span class="desc-link" data-unit="${escapeAttr(u.unidade)}">${u.unidade}</span></td>
      ${rfepctCell(u.rap)}
      ${rfepctCell(u.iea)}
      ${rfepctCell(u.tecnico)}
      ${rfepctCell(u.formacao)}
      ${rfepctCell(u.eja)}
    </tr>`).join('');

  const html = `
    <div class="panel">
      <table class="rfepct-table">
        <thead>
          <tr>
            <th rowspan="2" style="top:0">RFEPCT</th>
            <th colspan="5" class="pnp-group" style="top:0">PNP</th>
          </tr>
          <tr>
            <th class="num th-center" style="top:${RFEPCT_HEAD_ROW_H}px">RAP</th>
            <th class="num th-center" style="top:${RFEPCT_HEAD_ROW_H}px">IEA</th>
            <th class="num th-center" style="top:${RFEPCT_HEAD_ROW_H}px">Técnico</th>
            <th class="num th-center" style="top:${RFEPCT_HEAD_ROW_H}px">Formação</th>
            <th class="num th-center" style="top:${RFEPCT_HEAD_ROW_H}px">EJA</th>
          </tr>
        </thead>
        <tbody>
          <tr class="rfepct-baseline">
            <td>RFEPCT (referência)</td>
            <td class="num">${RFEPCT_BASELINE.rap}</td>
            <td class="num">${RFEPCT_BASELINE.iea}</td>
            <td class="num">${RFEPCT_BASELINE.tecnico}</td>
            <td class="num">${RFEPCT_BASELINE.formacao}</td>
            <td class="num">${RFEPCT_BASELINE.eja}</td>
          </tr>
          ${rows}
        </tbody>
      </table>
    </div>`;
  document.getElementById('contentIndicadores').innerHTML = html;
  document.getElementById('contentIndicadores').addEventListener('click', (e) => {
    const link = e.target.closest('.desc-link');
    if(link) openIndicatorChart(link.dataset.unit);
  });
}

/* ---- Gráfico comparativo Rede x IFPB x Campus (SVG, sem dependência externa) ---- */
function getBaselineSeries(){
  return INDICATOR_KEYS.map(k => parseIndicatorValue(RFEPCT_BASELINE[k]));
}

function getUnitSeries(unitRow){
  return INDICATOR_KEYS.map(k => unitRow[k] ? parseIndicatorValue(unitRow[k].v) : 0);
}

function buildIndicatorChartSVG(campusNome){
  const ifpb = RFEPCT_DATA.find(u => u.unidade === '- Institucional -');
  const isIfpb = campusNome === '- Institucional -';
  const campus = isIfpb ? null : RFEPCT_DATA.find(u => u.unidade === campusNome);

  const series = [
    {nome: 'Rede (referência)', valores: getBaselineSeries(), cor: '#8E1774'},
    {nome: '- Institucional -', valores: ifpb ? getUnitSeries(ifpb) : [0,0,0,0,0], cor: '#1E8E5A'},
  ];
  if(!isIfpb){
    series.push({nome: campusNome, valores: campus ? getUnitSeries(campus) : [0,0,0,0,0], cor: '#E88A3A'});
  }

  const n = INDICATOR_KEYS.length;
  const W = 460, H = 380, cx = W/2, cy = 200, maxR = 148;
  const angleFor = i => -Math.PI/2 + i * (2*Math.PI/n);
  const pointFor = (i, v) => {
    const r = (Math.max(0, Math.min(100, v)) / 100) * maxR;
    const a = angleFor(i);
    return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
  };

  // grade: pentágonos concêntricos + raios
  const rings = [25,50,75,100].map(level => {
    const pts = Array.from({length:n}, (_,i) => pointFor(i, level).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="#EDE3DC" stroke-width="1"/>`;
  }).join('');
  const spokes = Array.from({length:n}, (_,i) => {
    const [x,y] = pointFor(i, 100);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#EDE3DC" stroke-width="1"/>`;
  }).join('');

  // rótulos dos eixos, ancorados conforme o lado do pentágono
  const axisLabels = INDICATOR_LABELS.map((lbl,i) => {
    const a = angleFor(i);
    const lx = cx + (maxR+26) * Math.cos(a);
    const ly = cy + (maxR+26) * Math.sin(a);
    const cos = Math.cos(a), sin = Math.sin(a);
    const anchor = cos > 0.3 ? 'start' : (cos < -0.3 ? 'end' : 'middle');
    const dy = sin < -0.3 ? -2 : (sin > 0.3 ? 10 : 4);
    return `<text x="${lx}" y="${ly+dy}" font-size="12" font-weight="600" fill="#2A2130" text-anchor="${anchor}">${lbl}</text>`;
  }).join('');

  // polígonos de cada série + pontos com valor exato via tooltip (passar o mouse) —
  // evita rótulos sempre visíveis se sobrepondo quando duas séries têm valores próximos
  const seriesSVG = series.map((s) => {
    const pts = s.valores.map((v,i) => pointFor(i,v).join(',')).join(' ');
    const marks = s.valores.map((v,i) => {
      const [x,y] = pointFor(i,v);
      const txt = INDICATOR_KEYS[i]==='rap' ? String(v).replace('.',',') : v.toFixed(1).replace('.',',')+'%';
      return `<circle cx="${x}" cy="${y}" r="5" fill="${s.cor}" stroke="#fff" stroke-width="1.5" style="cursor:pointer;"><title>${s.nome} — ${INDICATOR_LABELS[i]}: ${txt}</title></circle>`;
    }).join('');
    return `<polygon points="${pts}" fill="${s.cor}" fill-opacity="0.1" stroke="${s.cor}" stroke-width="2"/>${marks}`;
  }).join('');

  const legend = series.map(s => `
    <span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;">
      <span style="width:10px;height:10px;border-radius:50%;background:${s.cor};display:inline-block;"></span>
      <span style="font-size:12px;color:var(--ink);">${s.nome}</span>
    </span>`).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" class="indicator-radar-svg" style="max-width:${W}px; display:block; margin:0 auto;">
      ${rings}
      ${spokes}
      ${axisLabels}
      ${seriesSVG}
    </svg>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;margin-top:12px;">${legend}</div>
    <p style="font-size:11.5px;color:var(--ink-soft);margin-top:12px;">Escala de 0 a 100 em todos os eixos. RAP não é percentual — está na mesma escala apenas para comparação visual. Passe o mouse sobre um ponto para ver o valor exato.</p>`;
}

function openIndicatorChart(unidade){
  document.getElementById('chartModalTitle').textContent = `Indicadores da Unidade: ${unidade}`;
  document.getElementById('chartModalBody').innerHTML = buildIndicatorChartSVG(unidade);
  document.getElementById('chartModalCard').classList.remove('zoomed');
  document.getElementById('chartZoomBtn').textContent = 'Ampliar';
  document.getElementById('chartModal').classList.remove('hidden');
}

function closeChartModal(){
  document.getElementById('chartModal').classList.add('hidden');
}

function toggleChartZoom(){
  const card = document.getElementById('chartModalCard');
  const zoomed = card.classList.toggle('zoomed');
  document.getElementById('chartZoomBtn').textContent = zoomed ? 'Reduzir' : 'Ampliar';
}

