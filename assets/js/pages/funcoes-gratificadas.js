let funcoesFiltros = { uo: '', tipo: '' };
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

function funcoesToggleHTML(){
  return `
    <div class="view-toggle" id="funcoesViewToggle" style="margin-left:auto;">
      <button type="button" class="view-toggle-btn${funcoesView==='tabela'?' active':''}" data-view="tabela" onclick="setFuncoesView('tabela')">Tabela</button>
      <button type="button" class="view-toggle-btn${funcoesView==='grafico'?' active':''}" data-view="grafico" onclick="setFuncoesView('grafico')">Gráfico</button>
      <button type="button" class="view-toggle-btn${funcoesView==='ranking'?' active':''}" data-view="ranking" onclick="setFuncoesView('ranking')">Ranking</button>
    </div>`;
}

function buildFuncoesFilters(){
  const uos = listaUOsComTipologia();
  const opts = uos.map(u => `<option value="${u.sigla || u.nome}">${u.nome}</option>`).join('');
  return `
    <div class="filter-bar">
      <div class="filter-field">
        <label>Unidade</label>
        <select id="fFuncoesUO" onchange="onFuncoesFilterChange()">
          <option value="">Todas</option>${opts}
        </select>
      </div>
      <div class="filter-field">
        <label>Tipo</label>
        <select id="fFuncoesTipo" onchange="onFuncoesFilterChange()">
          <option value="">Todos os tipos</option>
          <option value="FG">Apenas FG</option>
          <option value="CD">Apenas CD</option>
          <option value="FUC">Apenas FUC (Coord. de Curso)</option>
        </select>
      </div>
      <button class="filter-clear" onclick="clearFuncoesFilters()">Limpar filtros</button>
      ${funcoesToggleHTML()}
    </div>`;
}

function onFuncoesFilterChange(){
  funcoesFiltros.uo = document.getElementById('fFuncoesUO').value;
  funcoesFiltros.tipo = document.getElementById('fFuncoesTipo').value;
  renderFuncoesConteudo();
}

function clearFuncoesFilters(){
  funcoesFiltros = { uo: '', tipo: '' };
  renderFuncoesGratificadas();
}

function setFuncoesView(view){
  funcoesView = view;
  document.querySelectorAll('#funcoesViewToggle .view-toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  renderFuncoesConteudo();
}

function funcoesServidoresFiltrados(){
  return SERVIDORES_DATA.filter(sv => {
    if(!sv.funcao) return false;
    if(funcoesFiltros.tipo && !sv.funcao.toUpperCase().startsWith(funcoesFiltros.tipo)) return false;
    if(funcoesFiltros.uo){
      const uo = uoRaizDoSetor(sv.exercicio_suap_sigla);
      const chaveUo = uo ? (uo.sigla || uo.nome) : null;
      if(chaveUo !== funcoesFiltros.uo) return false;
    }
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
      <td>${sv.nome}</td>
      <td>${sv.uo ? sv.uo.nome : '—'}</td>
      <td>${setorLabel}</td>
      <td class="num th-center">${sv.funcao}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="panel">
      <table>
        <thead><tr>
          <th style="top:0">Nome</th>
          <th style="top:0">Unidade</th>
          <th style="top:0">Setor</th>
          <th class="num th-center" style="top:0">Função</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="muted" style="padding:20px 26px;">Nenhum servidor encontrado para os filtros selecionados.</td></tr>`}</tbody>
      </table>
    </div>`;
}

function contagemFuncoesPorUO(){
  const porUo = {};
  SERVIDORES_DATA.forEach(sv => {
    if(!sv.funcao) return;
    const tipo = sv.funcao.toUpperCase();
    if(funcoesFiltros.tipo && !tipo.startsWith(funcoesFiltros.tipo)) return;
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

function escopoSetoresFuncoes(){
  if(funcoesFiltros.uo){
    return SETORES_DATA.filter(s => s.superior_sigla === funcoesFiltros.uo);
  }
  return listaUOsComTipologia();
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
  const categorias = funcoesFiltros.tipo
    ? ORDEM_HIERARQUICA.filter(c => c.startsWith(funcoesFiltros.tipo))
    : ORDEM_HIERARQUICA;

  const porSetor = {};
  SERVIDORES_DATA.forEach(sv => {
    if(!sv.funcao) return;
    const tipo = sv.funcao.toUpperCase();
    if(!ORDEM_HIERARQUICA.includes(tipo)) return; // fora do modelo da Portaria (ex.: FUC1)
    if(funcoesFiltros.tipo && !tipo.startsWith(funcoesFiltros.tipo)) return;
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
  }));

  funcoesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', title: { display: true, text: 'Função' } },
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

  const categorias = funcoesFiltros.tipo
    ? CATEGORIAS_FUNCAO.filter(c => c.startsWith(funcoesFiltros.tipo))
    : CATEGORIAS_FUNCAO;

  if(funcoesFiltros.uo){
    // uma UO específica: comparar cada categoria (CD1..FG2) ocupada x permitida
    const porUo = contagemFuncoesPorUO();
    const dadosUo = porUo[funcoesFiltros.uo] || { contagem: {} };
    const tip = tipologiaPorChaveUO(funcoesFiltros.uo);
    const ocupadas = categorias.map(c => dadosUo.contagem[c] || 0);
    const permitidas = categorias.map(c => tip ? (tip[c.toLowerCase()] || 0) : 0);

    funcoesChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categorias,
        datasets: [
          { label: 'Ocupadas', data: ocupadas, backgroundColor: '#2A1458' },
          { label: 'Permitidas (tipologia)', data: permitidas, backgroundColor: '#DCC9EC' },
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  } else {
    // todas as UOs: total ocupado x total permitido, por unidade
    const porUo = contagemFuncoesPorUO();
    const uos = listaUOsComTipologia();
    const labels = [];
    const ocupadas = [];
    const permitidas = [];
    uos.forEach(u => {
      const chave = u.sigla || u.nome;
      const dados = porUo[chave];
      const tip = tipologiaPorChaveUO(chave);
      const totalOcupado = dados ? categorias.reduce((s,c) => s + (dados.contagem[c]||0), 0) : 0;
      const totalPermitido = tip ? categorias.reduce((s,c) => s + (tip[c.toLowerCase()]||0), 0) : null;
      if(!dados && totalPermitido === null) return; // unidade sem nenhum dado (ex: Novo PAC)
      labels.push(u.nome.replace('Campus ', ''));
      ocupadas.push(totalOcupado);
      permitidas.push(totalPermitido || 0);
    });

    funcoesChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Ocupadas', data: ocupadas, backgroundColor: '#2A1458' },
          { label: 'Permitidas (tipologia)', data: permitidas, backgroundColor: '#DCC9EC' },
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 40 } } }
      }
    });
  }
}
