function buildFormacaoOrcamento(){
  const el = document.getElementById('contentFormacao');
  if(!el) return;

  if(formacaoLastError){
    el.innerHTML = `
      <div class="state-box">
        <h3>Não foi possível carregar os dados</h3>
        <p>${formacaoLastError}</p>
        <p style="margin-top:14px;">Confirme se a planilha está compartilhada como "Qualquer pessoa com o link pode visualizar" (ou publicada na web) e clique em Atualizar.</p>
      </div>`;
    return;
  }

  const dados = FORMACAO_DATA.slice().sort((a,b) => {
    if(a.unidade === 'Reitoria') return -1;
    if(b.unidade === 'Reitoria') return 1;
    return a.unidade.localeCompare(b.unidade, 'pt-BR');
  });

  const totais = dados.reduce((acc, u) => ({
    loa: acc.loa + u.loa,
    efQualidade: acc.efQualidade + u.efQualidade,
    reforcos: acc.reforcos + u.reforcos,
    total: acc.total + u.total,
  }), {loa:0, efQualidade:0, reforcos:0, total:0});

  const rows = dados.map(u => `
    <tr${u.unidade==='Reitoria' ? ' style="background:#F3EDFA; font-weight:600;"' : ''}>
      <td>${u.unidade}</td>
      <td class="num">${fmtBRLCell(u.loa)}</td>
      <td class="num">${fmtBRLCell(u.efQualidade)}</td>
      <td class="num">${fmtBRLCell(u.reforcos)}</td>
      <td class="num" style="font-weight:600;">${fmtBRLCell(u.total)}</td>
    </tr>`).join('');

  el.innerHTML = `
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">Total LOA</div>
        <div class="kpi-value">${fmtBRL(totais.loa)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Eficiência e Qualidade</div>
        <div class="kpi-value">${fmtBRL(totais.efQualidade)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Reforços do Ano</div>
        <div class="kpi-value">${fmtBRL(totais.reforcos)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Geral</div>
        <div class="kpi-value">${fmtBRL(totais.total)}</div>
      </div>
    </div>
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th style="top:0">Unidade</th>
            <th class="num th-center" style="top:0">LOA</th>
            <th class="num th-center" style="top:0">Eficiência e Qualidade</th>
            <th class="num th-center" style="top:0">Reforços do Ano</th>
            <th class="num th-center" style="top:0">Total do Ano</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="5" class="muted" style="padding:20px 26px;">Nenhuma unidade com base lançada ainda.</td></tr>`}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td class="num">${fmtBRLCell(totais.loa)}</td>
            <td class="num">${fmtBRLCell(totais.efQualidade)}</td>
            <td class="num">${fmtBRLCell(totais.reforcos)}</td>
            <td class="num">${fmtBRLCell(totais.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}
