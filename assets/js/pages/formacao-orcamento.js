let formacaoUnidadesFiltro = [];

function formacaoUOOptions(){
  const nomes = [...new Set(FORMACAO_DATA.map(u => u.unidade))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  return nomes.map(nome => ({ value: nome, label: nome }));
}

function buildFormacaoFiltros(){
  return `
    <div class="filter-bar" style="align-items:flex-end;">
      <div class="filter-field">
        <label>Unidade</label>
        ${renderMultiSelect('fFormacaoUO', formacaoUOOptions(), formacaoUnidadesFiltro, 'onFormacaoUOCheck')}
      </div>
      <button class="filter-clear" onclick="clearFormacaoFiltros()">Limpar filtros</button>
    </div>`;
}

function onFormacaoUOCheck(checkbox){
  const valor = checkbox.value;
  if(checkbox.checked){
    if(!formacaoUnidadesFiltro.includes(valor)) formacaoUnidadesFiltro.push(valor);
  } else {
    formacaoUnidadesFiltro = formacaoUnidadesFiltro.filter(v => v !== valor);
  }
  atualizarTriggerMultiselect('fFormacaoUO', formacaoUOOptions(), formacaoUnidadesFiltro);
  renderFormacaoTabela();
}

function clearFormacaoFiltros(){
  formacaoUnidadesFiltro = [];
  buildFormacaoOrcamento();
}

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

  el.innerHTML = buildFormacaoFiltros() + `<div id="formacaoTabelaWrap"></div>`;
  renderFormacaoTabela();
}

function renderFormacaoTabela(){
  const el = document.getElementById('formacaoTabelaWrap');
  if(!el) return;

  let dados = FORMACAO_DATA.slice().sort((a,b) => a.unidade.localeCompare(b.unidade, 'pt-BR'));
  if(formacaoUnidadesFiltro.length){
    dados = dados.filter(u => formacaoUnidadesFiltro.includes(u.unidade));
  }

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
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th style="top:0">Unidade</th>
            <th class="num th-center" style="top:0">LOA</th>
            <th class="num th-center" style="top:0">Eficiência e Qualidade</th>
            <th class="num th-center" style="top:0">Reforços do Ano</th>
            <th class="num th-center" style="top:0">Total</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="5" class="muted" style="padding:20px 26px;">Nenhuma unidade encontrada para os filtros selecionados.</td></tr>`}</tbody>
        <tfoot>
          <tr>
            <td>Total${formacaoUnidadesFiltro.length ? ' (filtrado)' : ''}</td>
            <td class="num">${fmtBRLCell(totais.loa)}</td>
            <td class="num">${fmtBRLCell(totais.efQualidade)}</td>
            <td class="num">${fmtBRLCell(totais.reforcos)}</td>
            <td class="num">${fmtBRLCell(totais.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}
