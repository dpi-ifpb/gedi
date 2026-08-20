/* ================= Tela 3 · Extraorçamentário ================= */
function renderExtraTable(){
  const cols = ['v2624','distJan','p4Recomp','p4Todos'];
  const rows = EXTRA_ORC_DATA.map(u => `
    <tr>
      <td>${u.unidade}</td>
      ${cols.map(c => `<td class="num">${u[c] ? fmtBRLCell(u[c]) : '—'}</td>`).join('')}
    </tr>`).join('');
  const totals = cols.map(c => EXTRA_ORC_DATA.reduce((s,u)=>s+u[c],0));

  const html = `
    <div class="panel">
      <table class="extra-table">
        <thead>
          <tr>
            <th rowspan="2" style="top:0">UNIDADE / VALOR</th>
            <th rowspan="2" class="num th-center" style="top:0">2026 - 2024</th>
            <th rowspan="2" class="num th-center" style="top:0">DIST. EM JANEIRO</th>
            <th colspan="2" class="th-center proposta-group" style="top:0">REFORÇO ORÇAMENTÁRIO</th>
          </tr>
          <tr>
            <th class="num th-center" style="top:${EXTRA_HEAD_ROW_H}px">UNIDADES DE RECOMP.</th>
            <th class="num th-center" style="top:${EXTRA_HEAD_ROW_H}px">TODAS AS UNIDADES</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            ${totals.map(t => `<td class="num">${fmtBRLCell(t)}</td>`).join('')}
          </tr>
        </tfoot>
      </table>
    </div>`;
  document.getElementById('contentExtra').innerHTML = html;
}

