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
    </div>
    <div class="notes-panel">
      <h3>Sobre as colunas</h3>
      <dl class="notes-dl">
        <dt>2026 - 2024</dt>
        <dd>Diferença entre o orçamento previsto para 2026 e o de 2024. Valores definidos pelo governo federal: desde 2025 a distribuição orçamentária da Rede Federal usa a Matriz de Distribuição Orçamentária da SETEC/MEC — metodologia já vigente desde a Portaria MEC nº 646/2022, atualizada pela Portaria MEC nº 243, de 10/03/2026.</dd>
        <dt>DIST. EM JANEIRO</dt>
        <dd>Recursos distribuídos de forma extraorçamentária, a partir de recursos recebidos via índices de qualidade. <em>Terminologia a confirmar</em> — não localizei o texto da Portaria nº 243/2026 para validar esse termo; busquei na web e não encontrei a portaria com esse número/data.</dd>
        <dt>UNIDADES DE RECOMP. (Proposta)</dt>
        <dd>Proposta em análise pela Reitoria, da ordem de R$ 1.000.000,00, para as unidades que tiveram redução orçamentária em relação a 2024 — baseada na matriz orçamentária, cujo principal parâmetro é a quantidade de matrículas da unidade.</dd>
        <dt>TODAS AS UNIDADES (Proposta)</dt>
        <dd>Proposta em análise pela Reitoria, no valor total de R$ 800.000,00, distribuída a todas as unidades (não só as com déficit orçamentário).</dd>
      </dl>
    </div>`;
  document.getElementById('contentExtra').innerHTML = html;
}

