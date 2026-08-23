let funcoesFiltros = { uos: [], tipos: [], compararTipologia: true, quadroResumo: false };
let funcoesView = 'tabela';
let funcoesChartInstance = null;

function uoRaizDoSetor(sigla){
  const bySigla = {};
  SETORES_DATA.forEach(s => { if(s.sigla) bySigla[s.sigla] = s; });
  let atual = bySigla[sigla];
  let guarda = 0;
  while(atual && !atual.eh_uo && atual.superior_sigla && guarda < 20){
    atual = bySigla[atual.superior_sigla];
    guarda++;
  }
  return atual || null;
}

function listaUOsComTipologia(){
  return SETORES_DATA
    .filter(s => s.eh_uo)
    .sort((a,b) => {
      if(a.sigla === 'REITORIA') return -1;
      if(b.sigla === 'REITORIA') return 1;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
}

/* ================= Componente: dropdown de múltipla seleção =================
   Fica fechado como um <select> comum; ao clicar, abre um painel com
   checkboxes permitindo marcar vários itens ao mesmo tempo. */
function renderMultiSelect(idPrefix, options, selecionados, onChangeFnName){
  const labelsSelecionados = options.filter(o => selecionados.includes(o.value)).map(o => o.label);
  const textoTrigger = selecionados.length === 0
    ? 'Todas'
    : (selecionados.length === 1 ? labelsSelecionados[0] : `${selecionados.length} selecionadas`);
  const itens = options.map(o => {
    const checked = selecionados.includes(o.value) ? 'checked' : '';
    return `<label class="checkbox-item"><input type="checkbox" value="${String(o.value).replace(/"/g,'&quot;')}" ${checked} onchange="${onChangeFnName}(this)"> ${o.label}</label>`;
  }).join('');
  return `
    <div class="multiselect" id="${idPrefix}Wrap">
      <button type="button" class="multiselect-trigger" onclick="toggleMultiselect('${idPrefix}Wrap', event)">
        <span id="${idPrefix}TriggerText">${textoTrigger}</span><span class="multiselect-arrow">▾</span>
      </button>
      <div class="multiselect-panel" onclick="event.stopPropagation()">${itens}</div>
    </div>`;
}

function toggleMultiselect(wrapId, evt){
  if(evt) evt.stopPropagation();
  document.querySelectorAll('.multiselect.open').forEach(w => { if(w.id !== wrapId) w.classList.remove('open'); });
  document.getElementById(wrapId).classList.toggle('open');
}
if(typeof window !== 'undefined'){
  document.addEventListener('click', () => {
    document.querySelectorAll('.multiselect.open').forEach(w => w.classList.remove('open'));
  });
}

function atualizarTriggerMultiselect(idPrefix, options, selecionados){
  const labelsSelecionados = options.filter(o => selecionados.includes(o.value)).map(o => o.label);
  const texto = selecionados.length === 0
    ? 'Todas'
    : (selecionados.length === 1 ? labelsSelecionados[0] : `${selecionados.length} selecionadas`);
  const el = document.getElementById(idPrefix + 'TriggerText');
  if(el) el.textContent = texto;
}

function funcoesUOOptions(){
  return listaUOsComTipologia().map(u => ({ value: u.sigla || u.nome, label: u.nome }));
}
function funcoesTipoOptions(){
  return [['FG','FG'], ['CD','CD'], ['FUC','FUC (Coord. de Curso)']].map(([value,label]) => ({ value, label }));
}

function funcoesToggleHTML(){
  return `
    <div class="view-toggle" id="funcoesViewToggle" style="margin-left:auto;">
      <button type="button" class="view-toggle-btn${funcoesView==='tabela'?' active':''}" data-view="tabela" onclick="setFuncoesView('tabela')">Tabela</button>
      <button type="button" class="view-toggle-btn${funcoesView==='grafico'?' active':''}" data-view="grafico" onclick="setFuncoesView('grafico')">Gráfico</button>
      <button type="button" class="view-toggle-btn${funcoesView==='ranking'?' active':''}" data-view="ranking" onclick="setFuncoesView('ranking')">Ranking</button>
    </div>`;
}

function buildFuncoesFilters(){
  return `
    <div class="filter-bar" style="align-items:flex-end;">
      <div class="filter-field">
        <label>Unidade</label>
        ${renderMultiSelect('fFuncoesUO', funcoesUOOptions(), funcoesFiltros.uos, 'onFuncoesUOCheck')}
      </div>
      <div class="filter-field">
        <label>Tipo</label>
        ${renderMultiSelect('fFuncoesTipo', funcoesTipoOptions(), funcoesFiltros.tipos, 'onFuncoesTipoCheck')}
      </div>
      ${funcoesView === 'tabela' ? `
      <div class="filter-field" style="justify-content:flex-end;">
        <label class="checkbox-item" style="margin-bottom:9px;">
          <input type="checkbox" id="fFuncoesResumo" ${funcoesFiltros.quadroResumo?'checked':''} onchange="onFuncoesResumoCheck(this)">
          Quadro resumo
        </label>
      </div>` : ''}
      ${(funcoesView === 'grafico' || funcoesView === 'ranking') ? `
      <div class="filter-field" style="justify-content:flex-end;">
        <label class="checkbox-item" style="margin-bottom:9px;">
          <input type="checkbox" id="fFuncoesComparar" ${funcoesFiltros.compararTipologia?'checked':''} onchange="onFuncoesCompararCheck(this)">
          Comparar com Tipologia
        </label>
      </div>` : ''}
      <button class="filter-clear" onclick="clearFuncoesFilters()">Limpar filtros</button>
      ${funcoesToggleHTML()}
    </div>`;
}

function onFuncoesUOCheck(checkbox){
  const valor = checkbox.value;
  if(checkbox.checked){
    if(!funcoesFiltros.uos.includes(valor)) funcoesFiltros.uos.push(valor);
  } else {
    funcoesFiltros.uos = funcoesFiltros.uos.filter(v => v !== valor);
  }
  atualizarTriggerMultiselect('fFuncoesUO', funcoesUOOptions(), funcoesFiltros.uos);
  renderFuncoesConteudo();
}

function onFuncoesTipoCheck(checkbox){
  const valor = checkbox.value;
  if(checkbox.checked){
    if(!funcoesFiltros.tipos.includes(valor)) funcoesFiltros.tipos.push(valor);
  } else {
    funcoesFiltros.tipos = funcoesFiltros.tipos.filter(v => v !== valor);
  }
  atualizarTriggerMultiselect('fFuncoesTipo', funcoesTipoOptions(), funcoesFiltros.tipos);
  renderFuncoesConteudo();
}

function onFuncoesResumoCheck(checkbox){
  funcoesFiltros.quadroResumo = checkbox.checked;
  renderFuncoesConteudo();
}

function onFuncoesCompararCheck(checkbox){
  funcoesFiltros.compararTipologia = checkbox.checked;
  renderFuncoesConteudo();
}

function clearFuncoesFilters(){
  funcoesFiltros = { uos: [], tipos: [], compararTipologia: true, quadroResumo: false };
  renderFuncoesGratificadas();
}

function setFuncoesView(view){
  funcoesView = view;
  renderFuncoesGratificadas(); // a barra de filtro muda (checkbox de resumo/comparar depende da view)
}

function funcoesTipoBate(funcao){
  if(!funcoesFiltros.tipos.length) return true;
  const up = funcao.toUpperCase();
  return funcoesFiltros.tipos.some(t => up.startsWith(t));
}

function funcoesUoBate(sigla){
  if(!funcoesFiltros.uos.length) return true;
  const uo = uoRaizDoSetor(sigla);
  const chave = uo ? (uo.sigla || uo.nome) : null;
  return chave && funcoesFiltros.uos.includes(chave);
}

function funcoesServidoresFiltrados(){
  return SERVIDORES_DATA.filter(sv => {
    if(!sv.funcao) return false;
    if(!funcoesTipoBate(sv.funcao)) return false;
    if(!funcoesUoBate(sv.exercicio_suap_sigla)) return false;
    return true;
  });
}

function renderFuncoesGratificadas(){
  const el = document.getElementById('contentFuncoes');
  if(!el) return;
  el.innerHTML = buildFuncoesFilters() + `<div id="funcoesConteudo"></div>`;
  renderFuncoesConteudo();
}

function renderFuncoesConteudo(){
  const el = document.getElementById('funcoesConteudo');
  if(!el) return;
  if(funcoesView === 'grafico'){
    renderFuncoesGrafico(el);
  } else if(funcoesView === 'ranking'){
    renderFuncoesRanking(el);
  } else if(funcoesFiltros.quadroResumo){
    renderFuncoesQuadroResumo(el);
  } else {
    renderFuncoesTabela(el);
  }
}

function renderFuncoesTabela(el){
  const lista = funcoesServidoresFiltrados()
    .map(sv => ({ ...sv, uo: uoRaizDoSetor(sv.exercicio_suap_sigla) }))
    .sort((a,b) => (a.uo?.nome || '').localeCompare(b.uo?.nome || '', 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));

  const setorPorSigla = {};
  SETORES_DATA.forEach(s => { if(s.sigla) setorPorSigla[s.sigla] = s; });

  const rows = lista.map(sv => {
    const setor = setorPorSigla[sv.exercicio_suap_sigla];
    const setorLabel = setor ? (setor.eh_uo ? setor.nome : `${setor.sigla} - ${setor.nome}`) : sv.exercicio_suap_sigla;
    return `<tr>
      <td style="text-align:center;">${sv.nome}</td>
      <td>${sv.uo ? sv.uo.nome : '—'}</td>
      <td style="text-align:center;">${setorLabel}</td>
      <td style="text-align:center;">${sv.funcao}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="panel">
      <table>
        <thead><tr>
          <th style="top:0; text-align:center;">Nome</th>
          <th style="top:0;">Unidade</th>
          <th style="top:0; text-align:center;">Setor</th>
          <th style="top:0; text-align:center;">Função</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="muted" style="padding:20px 26px; text-align:center;">Nenhum servidor encontrado para os filtros selecionados.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function contagemFuncoesPorUO(){
  const porUo = {};
  SERVIDORES_DATA.forEach(sv => {
    if(!sv.funcao) return;
    const tipo = sv.funcao.toUpperCase();
    if(!funcoesTipoBate(sv.funcao)) return;
    const uo = uoRaizDoSetor(sv.exercicio_suap_sigla);
    if(!uo) return;
    const chave = uo.sigla || uo.nome;
    porUo[chave] = porUo[chave] || { nome: uo.nome, sigla: chave, contagem: {} };
    porUo[chave].contagem[tipo] = (porUo[chave].contagem[tipo] || 0) + 1;
  });
  return porUo;
}

function tipologiaPorChaveUO(chave){
  const nomeTip = TIPOLOGIA_DATA.uo_tipologia[chave];
  if(!nomeTip) return null;
  return TIPOLOGIA_DATA.tipologias.find(t => t.tipologia === nomeTip) || null;
}

const CATEGORIAS_FUNCAO = ['CD1','CD2','CD3','CD4','FG1','FG2','FG3','FG4','FG5','FUC1'];
const ORDEM_HIERARQUICA = ['CD1','CD2','CD3','CD4','FG1','FG2','FG3','FG4','FG5','FUC1'];
const PESO_HIERARQUICO = { CD1:10, CD2:9, CD3:8, CD4:7, FG1:6, FG2:5, FG3:4, FG4:3, FG5:2, FUC1:1 };
const CORES_FUNCAO = {
  CD1:'#3B2F6B', CD2:'#1B5E82', CD3:'#1E9B9B', CD4:'#1E8E5A',
  FG1:'#7FB443', FG2:'#F2B705', FG3:'#E8863A', FG4:'#C2453D', FG5:'#8E1774', FUC1:'#B5A0C9',
};

function funcoesCategoriasAtivas(){
  return funcoesFiltros.tipos.length
    ? CATEGORIAS_FUNCAO.filter(c => funcoesFiltros.tipos.some(t => c.startsWith(t)))
    : CATEGORIAS_FUNCAO;
}

function funcoesUnidadesAlvo(){
  const todas = listaUOsComTipologia();
  return funcoesFiltros.uos.length ? todas.filter(u => funcoesFiltros.uos.includes(u.sigla || u.nome)) : todas;
}

function renderFuncoesQuadroResumo(el){
  const categorias = funcoesCategoriasAtivas();
  const porUo = contagemFuncoesPorUO();
  const unidades = funcoesUnidadesAlvo();

  const rows = unidades.map(u => {
    const chave = u.sigla || u.nome;
    const dados = porUo[chave];
    const tip = tipologiaPorChaveUO(chave);
    if(!dados && !tip) return '';
    const celulas = categorias.map(c => {
      const ocupado = dados ? (dados.contagem[c]||0) : 0;
      const permitido = tip ? (tip[c.toLowerCase()]||0) : 0;
      if(ocupado===0 && permitido===0) return `<td class="muted" style="text-align:center;">—</td>`;
      return `<td style="text-align:center;">${ocupado} / ${permitido}</td>`;
    }).join('');
    return `<tr><td>${u.nome}</td>${celulas}</tr>`;
  }).filter(Boolean).join('');

  el.innerHTML = `
    <div class="panel">
      <table>
        <thead><tr>
          <th style="top:0;">Unidade</th>
          ${categorias.map(c => `<th style="top:0; text-align:center;">${c}</th>`).join('')}
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="${categorias.length+1}" class="muted" style="padding:20px 26px; text-align:center;">Nenhuma unidade com dado para os filtros selecionados.</td></tr>`}</tbody>
      </table>
      <p style="padding:12px 20px; font-size:12px; color:var(--ink-soft);">Cada célula mostra <strong>ocupado / tipologia</strong>.</p>
    </div>`;
}

function escopoSetoresFuncoes(){
  if(funcoesFiltros.uos.length === 1){
    return SETORES_DATA.filter(s => s.superior_sigla === funcoesFiltros.uos[0]);
  }
  return funcoesUnidadesAlvo();
}

function escopoRaizDoSetorGenerico(sigla, escopoSiglas){
  const bySigla = {};
  SETORES_DATA.forEach(s => { if(s.sigla) bySigla[s.sigla] = s; });
  let atual = bySigla[sigla];
  let guarda = 0;
  while(atual && !escopoSiglas.has(atual.sigla) && atual.superior_sigla && guarda < 20){
    atual = bySigla[atual.superior_sigla];
    guarda++;
  }
  return (atual && escopoSiglas.has(atual.sigla)) ? atual : null;
}

function renderFuncoesRanking(el){
  el.innerHTML = `<canvas id="funcoesRankingChart" height="120"></canvas>`;
  const ctx = document.getElementById('funcoesRankingChart').getContext('2d');
  if(funcoesChartInstance){ funcoesChartInstance.destroy(); funcoesChartInstance = null; }

  const escopo = escopoSetoresFuncoes();
  const escopoSiglas = new Set(escopo.map(s => s.sigla).filter(Boolean));
  const categorias = funcoesCategoriasAtivas();

  const porSetor = {};
  SERVIDORES_DATA.forEach(sv => {
    if(!sv.funcao) return;
    const tipo = sv.funcao.toUpperCase();
    if(!ORDEM_HIERARQUICA.includes(tipo)) return;
    if(!funcoesTipoBate(sv.funcao)) return;
    const raiz = escopoRaizDoSetorGenerico(sv.exercicio_suap_sigla, escopoSiglas);
    if(!raiz) return;
    porSetor[raiz.sigla] = porSetor[raiz.sigla] || { setor: raiz, contagem: {} };
    porSetor[raiz.sigla].contagem[tipo] = (porSetor[raiz.sigla].contagem[tipo] || 0) + 1;
  });

  const linhas = Object.values(porSetor).map(l => {
    const peso = categorias.reduce((s,c) => s + (l.contagem[c]||0) * (PESO_HIERARQUICO[c]||0), 0);
    return { ...l, peso };
  }).filter(l => l.peso > 0).sort((a,b) => b.peso - a.peso);

  const labels = linhas.map(l => l.setor.eh_uo ? l.setor.nome.replace('Campus ', '') : l.setor.sigla);
  const datasets = categorias.map(c => ({
    label: c,
    data: linhas.map(l => l.contagem[c] || 0),
    backgroundColor: CORES_FUNCAO[c],
    stack: 'ocupado',
  }));

  if(funcoesFiltros.compararTipologia){
    // mesma paleta de cores por categoria das barras "Ocupadas", só que na
    // pilha "tipologia" — permite comparar segmento a segmento, categoria a categoria
    categorias.forEach(c => {
      datasets.push({
        label: c + ' (tipologia)',
        data: linhas.map(l => {
          const chave = l.setor.sigla || l.setor.nome;
          const tip = tipologiaPorChaveUO(chave);
          return tip ? (tip[c.toLowerCase()] || 0) : 0;
        }),
        backgroundColor: CORES_FUNCAO[c],
        stack: 'tipologia',
        // esconde da legenda pra não duplicar a mesma cor já explicada pela pilha "ocupado"
        hidden: false,
      });
    });
  }

  funcoesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          title: { display: true, text: 'Função' },
          labels: {
            filter(item){ return !item.text.endsWith('(tipologia)'); },
          },
        },
      },
      scales: {
        x: { stacked: true, ticks: { autoSkip: false, maxRotation: 60, minRotation: 40 } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Quantidade de funções' } },
      }
    }
  });
}

function renderFuncoesGrafico(el){
  el.innerHTML = `<canvas id="funcoesChart" height="110"></canvas>`;
  const ctx = document.getElementById('funcoesChart').getContext('2d');
  if(funcoesChartInstance){ funcoesChartInstance.destroy(); funcoesChartInstance = null; }

  const categorias = funcoesCategoriasAtivas();
  const legendaSemToggle = { onClick(){} };

  if(funcoesFiltros.uos.length === 1){
    const chave = funcoesFiltros.uos[0];
    const porUo = contagemFuncoesPorUO();
    const dadosUo = porUo[chave] || { contagem: {} };
    const tip = tipologiaPorChaveUO(chave);
    const ocupadas = categorias.map(c => dadosUo.contagem[c] || 0);

    const datasets = [{ label: 'Ocupadas', data: ocupadas, backgroundColor: '#2A1458' }];
    if(funcoesFiltros.compararTipologia){
      datasets.push({ label: 'Tipologia', data: categorias.map(c => tip ? (tip[c.toLowerCase()] || 0) : 0), backgroundColor: '#DCC9EC' });
    }

    funcoesChartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels: categorias, datasets },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', ...legendaSemToggle } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  } else {
    const porUo = contagemFuncoesPorUO();
    const uos = funcoesUnidadesAlvo();
    const labels = [];
    const ocupadas = [];
    const permitidas = [];
    uos.forEach(u => {
      const chave = u.sigla || u.nome;
      const dados = porUo[chave];
      const tip = tipologiaPorChaveUO(chave);
      const totalOcupado = dados ? categorias.reduce((s,c) => s + (dados.contagem[c]||0), 0) : 0;
      const totalPermitido = tip ? categorias.reduce((s,c) => s + (tip[c.toLowerCase()]||0), 0) : null;
      if(!dados && totalPermitido === null) return;
      labels.push(u.nome.replace('Campus ', ''));
      ocupadas.push(totalOcupado);
      permitidas.push(totalPermitido || 0);
    });

    const datasets = [{ label: 'Ocupadas', data: ocupadas, backgroundColor: '#2A1458' }];
    if(funcoesFiltros.compararTipologia){
      datasets.push({ label: 'Tipologia', data: permitidas, backgroundColor: '#DCC9EC' });
    }

    funcoesChartInstance = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', ...legendaSemToggle } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 40 } } }
      }
    });
  }
}
