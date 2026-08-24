let historicoView = 'tabela';
let historicoIndicadoresFiltro = ['matriculas']; // array — múltiplos só quando exatamente 1 unidade selecionada
let historicoUnidadesFiltro = [];
let historicoChartInstance = null;

function historicoListaUnidades(){
  const uos = SETORES_DATA.filter(s => s.eh_uo)
    .sort((a,b) => {
      if(a.sigla === 'REITORIA') return -1;
      if(b.sigla === 'REITORIA') return 1;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
  const todas = [{ sigla: 'INSTITUCIONAL', nome: 'Total (Institucional)' }, ...uos];
  // uma unidade aparece se tiver dado em pelo menos um dos indicadores selecionados
  return todas.filter(u => historicoIndicadoresFiltro.some(chave => INDICADORES_HISTORICO_DATA.indicadores[chave].valores[u.sigla]));
}

function historicoNomeUnidade(sigla){
  if(sigla === 'INSTITUCIONAL') return 'Total (Institucional)';
  const s = SETORES_DATA.find(x => x.sigla === sigla);
  return s ? nomeUnidadeCurto(s.nome) : sigla;
}

function historicoFormatarValor(valor, formato){
  if(valor === null || valor === undefined) return '—';
  if(formato === 'percentual') return (valor * 100).toLocaleString('pt-BR', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
  return valor.toLocaleString('pt-BR', {maximumFractionDigits:2});
}

function historicoUOOptions(){
  return historicoListaUnidades().map(u => ({ value: u.sigla, label: historicoNomeUnidade(u.sigla) }));
}

function historicoIndicadorOptions(){
  return Object.entries(INDICADORES_HISTORICO_DATA.indicadores).map(([chave, ind]) => ({ value: chave, label: ind.label }));
}

/* O campo "Indicador" muda de comportamento conforme a quantidade de unidades:
   - 1 unidade selecionada -> multiseleção (permite comparar várias curvas da MESMA unidade)
   - 0 ou 2+ unidades -> seleção única (o padrão, comparando unidades num só indicador) */
function historicoIndicadorFieldHTML(){
  const modoMultiplo = historicoUnidadesFiltro.length === 1;
  if(!modoMultiplo){
    const opcoes = historicoIndicadorOptions()
      .map(o => `<option value="${o.value}" ${o.value===historicoIndicadoresFiltro[0]?'selected':''}>${o.label}</option>`).join('');
    return `<label>Indicador</label><select id="fHistoricoIndicador" onchange="onHistoricoIndicadorChange()">${opcoes}</select>`;
  }
  return `<label>Indicador (${historicoIndicadoresFiltro.length} selecionado${historicoIndicadoresFiltro.length===1?'':'s'})</label>${renderMultiSelect('fHistoricoIndicador', historicoIndicadorOptions(), historicoIndicadoresFiltro, 'onHistoricoIndicadorCheck')}`;
}

function buildHistoricoFiltros(){
  return `
    <div class="filter-bar" style="align-items:flex-end;">
      <div class="filter-field">
        <label>Unidade</label>
        ${renderMultiSelect('fHistoricoUO', historicoUOOptions(), historicoUnidadesFiltro, 'onHistoricoUOCheck')}
      </div>
      <div class="filter-field" style="min-width:260px;" id="fHistoricoIndicadorWrap">${historicoIndicadorFieldHTML()}</div>
      <button class="filter-clear" onclick="clearHistoricoFiltros()">Limpar filtros</button>
    </div>`;
}

function onHistoricoUOCheck(checkbox){
  const valor = checkbox.value;
  const eraUmaUnidade = historicoUnidadesFiltro.length === 1;
  if(checkbox.checked){
    if(!historicoUnidadesFiltro.includes(valor)) historicoUnidadesFiltro.push(valor);
  } else {
    historicoUnidadesFiltro = historicoUnidadesFiltro.filter(v => v !== valor);
  }
  atualizarTriggerMultiselect('fHistoricoUO', historicoUOOptions(), historicoUnidadesFiltro);

  const agoraUmaUnidade = historicoUnidadesFiltro.length === 1;
  if(eraUmaUnidade !== agoraUmaUnidade){
    // saindo do modo "1 unidade": não faz sentido manter vários indicadores marcados
    if(!agoraUmaUnidade && historicoIndicadoresFiltro.length > 1){
      historicoIndicadoresFiltro = [historicoIndicadoresFiltro[0]];
    }
    // troca o campo Indicador entre seleção única/múltipla sem fechar o painel de Unidade que está aberto
    document.getElementById('fHistoricoIndicadorWrap').innerHTML = historicoIndicadorFieldHTML();
  }
  renderHistoricoConteudo();
}

function onHistoricoIndicadorCheck(checkbox){
  const valor = checkbox.value;
  if(checkbox.checked){
    if(!historicoIndicadoresFiltro.includes(valor)) historicoIndicadoresFiltro.push(valor);
  } else {
    if(historicoIndicadoresFiltro.length === 1){ checkbox.checked = true; return; } // mantém ao menos 1 marcado
    historicoIndicadoresFiltro = historicoIndicadoresFiltro.filter(v => v !== valor);
  }
  atualizarTriggerMultiselect('fHistoricoIndicador', historicoIndicadorOptions(), historicoIndicadoresFiltro);
  const lbl = document.querySelector('#fHistoricoIndicadorWrap > label');
  if(lbl) lbl.textContent = `Indicador (${historicoIndicadoresFiltro.length} selecionado${historicoIndicadoresFiltro.length===1?'':'s'})`;
  renderHistoricoConteudo();
}

function onHistoricoIndicadorChange(){
  historicoIndicadoresFiltro = [document.getElementById('fHistoricoIndicador').value];
  historicoUnidadesFiltro = []; // a disponibilidade de unidades pode mudar entre indicadores
  renderHistoricoIndicadores();
}

function clearHistoricoFiltros(){
  historicoIndicadoresFiltro = ['matriculas'];
  historicoUnidadesFiltro = [];
  renderHistoricoIndicadores();
}

function setHistoricoView(view){
  historicoView = view;
  document.querySelectorAll('#historicoViewToggle .view-toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  renderHistoricoConteudo();
}

function renderHistoricoIndicadores(){
  const el = document.getElementById('contentHistorico');
  if(!el) return;
  el.innerHTML = buildHistoricoFiltros() + `<div id="historicoConteudo"></div>`;
  renderHistoricoConteudo();
}

function renderHistoricoConteudo(){
  const el = document.getElementById('historicoConteudo');
  if(!el) return;
  if(historicoView === 'grafico'){
    renderHistoricoGrafico(el);
  } else {
    renderHistoricoTabela(el);
  }
}

function historicoModoComparacaoIndicadores(){
  return historicoUnidadesFiltro.length === 1 && historicoIndicadoresFiltro.length > 1;
}

function renderHistoricoTabela(el){
  const anos = INDICADORES_HISTORICO_DATA.anos;

  if(historicoModoComparacaoIndicadores()){
    const unidadeSigla = historicoUnidadesFiltro[0];
    const rows = historicoIndicadoresFiltro.map(chave => {
      const ind = INDICADORES_HISTORICO_DATA.indicadores[chave];
      const serie = ind.valores[unidadeSigla] || [];
      const celulas = anos.map((ano, i) => {
        const destaque = ano === 2024 ? ' style="background:#F3EDFA; font-weight:600;"' : '';
        return `<td class="num"${destaque}>${historicoFormatarValor(serie[i], ind.formato)}</td>`;
      }).join('');
      return `<tr><td>${ind.label}</td>${celulas}</tr>`;
    }).join('');

    el.innerHTML = `
      <p style="margin-bottom:10px; font-size:12px; color:var(--ink-soft);">Comparando indicadores para <strong>${historicoNomeUnidade(unidadeSigla)}</strong>.</p>
      <div class="panel">
        <table>
          <thead><tr>
            <th style="top:0;">Indicador</th>
            ${anos.map(a => `<th class="num th-center" style="top:0; ${a===2024?'background:#3A1E72;':''}">${a}${a===2024?' ★':''}</th>`).join('')}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="margin-top:10px; font-size:12px; color:var(--ink-soft);">★ 2024 é a base que influencia os números de orçamento e despesas usados atualmente no painel.</p>`;
    return;
  }

  const ind = INDICADORES_HISTORICO_DATA.indicadores[historicoIndicadoresFiltro[0]];
  let unidades = historicoListaUnidades();
  if(historicoUnidadesFiltro.length){
    unidades = unidades.filter(u => historicoUnidadesFiltro.includes(u.sigla));
  }

  const rows = unidades.map(u => {
    const serie = ind.valores[u.sigla] || [];
    const celulas = anos.map((ano, i) => {
      const destaque = ano === 2024 ? ' style="background:#F3EDFA; font-weight:600;"' : '';
      return `<td class="num"${destaque}>${historicoFormatarValor(serie[i], ind.formato)}</td>`;
    }).join('');
    const rowStyle = u.sigla === 'INSTITUCIONAL' || u.sigla === 'REITORIA' ? ' style="font-weight:600;"' : '';
    return `<tr${rowStyle}><td>${historicoNomeUnidade(u.sigla)}</td>${celulas}</tr>`;
  }).join('');

  el.innerHTML = `
    <div class="panel">
      <table>
        <thead><tr>
          <th style="top:0;">Unidade</th>
          ${anos.map(a => `<th class="num th-center" style="top:0; ${a===2024?'background:#3A1E72;':''}">${a}${a===2024?' ★':''}</th>`).join('')}
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="${anos.length+1}" class="muted" style="padding:20px 26px;">Nenhuma unidade com dado para os filtros selecionados.</td></tr>`}</tbody>
      </table>
    </div>
    <p style="margin-top:10px; font-size:12px; color:var(--ink-soft);">★ 2024 é a base que influencia os números de orçamento e despesas usados atualmente no painel.</p>`;
}

const HISTORICO_CORES = ['#2A1458','#8E1774','#1E8E5A','#1B5E82','#E8863A','#C2453D','#7FB443','#B5A0C9','#F2B705','#1E9B9B','#3A1E72','#D9714E'];

function renderHistoricoGrafico(el){
  el.innerHTML = `<canvas id="historicoChart" height="120"></canvas>`;
  const ctx = document.getElementById('historicoChart').getContext('2d');
  if(historicoChartInstance){ historicoChartInstance.destroy(); historicoChartInstance = null; }

  const anos = INDICADORES_HISTORICO_DATA.anos;
  let aviso = null;

  if(historicoModoComparacaoIndicadores()){
    const unidadeSigla = historicoUnidadesFiltro[0];
    const formatosUsados = new Set(historicoIndicadoresFiltro.map(c => INDICADORES_HISTORICO_DATA.indicadores[c].formato));

    const datasets = historicoIndicadoresFiltro.map((chave, i) => {
      const ind = INDICADORES_HISTORICO_DATA.indicadores[chave];
      return {
        label: ind.label,
        data: (ind.valores[unidadeSigla] || []).map(v => ind.formato === 'percentual' && v != null ? v * 100 : v),
        borderColor: HISTORICO_CORES[i % HISTORICO_CORES.length],
        backgroundColor: HISTORICO_CORES[i % HISTORICO_CORES.length],
        tension: 0.25,
        spanGaps: true,
      };
    });

    historicoChartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels: anos, datasets },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      }
    });

    if(formatosUsados.size > 1){
      aviso = 'Atenção: os indicadores selecionados usam escalas diferentes (percentual e número) — compare as curvas com cuidado, não só a altura absoluta.';
    }
  } else {
    const ind = INDICADORES_HISTORICO_DATA.indicadores[historicoIndicadoresFiltro[0]];
    let unidades = historicoListaUnidades();
    if(historicoUnidadesFiltro.length){
      unidades = unidades.filter(u => historicoUnidadesFiltro.includes(u.sigla));
    } else {
      unidades = unidades.filter(u => u.sigla === 'INSTITUCIONAL');
    }

    const datasets = unidades.map((u, i) => ({
      label: historicoNomeUnidade(u.sigla),
      data: (ind.valores[u.sigla] || []).map(v => ind.formato === 'percentual' && v != null ? v * 100 : v),
      borderColor: HISTORICO_CORES[i % HISTORICO_CORES.length],
      backgroundColor: HISTORICO_CORES[i % HISTORICO_CORES.length],
      tension: 0.25,
      spanGaps: true,
    }));

    historicoChartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels: anos, datasets },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, ticks: { callback: v => ind.formato === 'percentual' ? v + '%' : v } } },
      }
    });

    if(!historicoUnidadesFiltro.length){
      aviso = 'Mostrando só o total institucional por padrão — selecione unidades no filtro para comparar campi.';
    }
  }

  if(aviso){
    const p = document.createElement('p');
    p.style.cssText = 'margin-top:10px; font-size:12px; color:var(--ink-soft);';
    p.textContent = aviso;
    el.appendChild(p);
  }
}
