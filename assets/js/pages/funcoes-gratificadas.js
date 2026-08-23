let funcoesFiltros = { uos: [], tipos: [] };
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
  const uoChecks = uos.map(u => {
    const valor = u.sigla || u.nome;
    const checked = funcoesFiltros.uos.includes(valor) ? 'checked' : '';
    return `<label class="checkbox-item"><input type="checkbox" value="${valor.replace(/"/g,'&quot;')}" onchange="onFuncoesUOCheck(this)" ${checked}> ${u.nome}</label>`;
  }).join('');

  const TIPOS = [['FG','FG'], ['CD','CD'], ['FUC','FUC (Coord. de Curso)']];
  const tipoChecks = TIPOS.map(([valor,label]) => {
    const checked = funcoesFiltros.tipos.includes(valor) ? 'checked' : '';
    return `<label class="checkbox-item"><input type="checkbox" value="${valor}" onchange="onFuncoesTipoCheck(this)" ${checked}> ${label}</label>`;
  }).join('');

  return `
    <div class="filter-bar" style="align-items:flex-start;">
      <div class="filter-field">
        <label id="funcoesUOCountLabel">Unidade (${funcoesFiltros.uos.length || 'todas'})</label>
        <div class="checkbox-group checkbox-group-scroll">${uoChecks}</div>
      </div>
      <div class="filter-field">
        <label>Tipo</label>
        <div class="checkbox-group">${tipoChecks}</div>
      </div>
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
  document.getElementById('funcoesUOCountLabel').textContent = `Unidade (${funcoesFiltros.uos.length || 'todas'})`;
  renderFuncoesConteudo();
}

function onFuncoesTipoCheck(checkbox){
  const valor = checkbox.value;
  if(checkbox.checked){
    if(!funcoesFiltros.tipos.includes(valor)) funcoesFiltros.tipos.push(valor);
  } else {
    funcoesFiltros.tipos = funcoesFiltros.tipos.filter(v => v !== valor);
  }
  renderFuncoesConteudo();
}

function clearFuncoesFilters(){
  funcoesFiltros = { uos: [], tipos: [] };
  renderFuncoesGratificadas();
}

function setFuncoesView(view){
  funcoesView = view;
  document.querySelectorAll('#funcoesViewToggle .view-toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  renderFuncoesConteudo();
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

  el.innerHTML = renderConformidadePainel() + `
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

/* ================= Conformidade por categoria =================
   Compara, categoria a categoria (não em total agregado), quantas
   funções a unidade OCUPA de fato contra quantas a tipologia PERMITE.
   Um total agregado igual pode esconder um desvio real (ex.: tipologia
   prevê 1×CD3 + 1×CD4, mas a unidade tem 2×CD4 e 0×CD3) — por isso a
   checagem é sempre por categoria individual, nunca pela soma. */
function conformidadeDaUnidade(chave){
  const porUo = contagemFuncoesPorUO();
  const dados = porUo[chave];
  const tip = tipologiaPorChaveUO(chave);
  if(!tip) return null; // sem tipologia definida (ex.: Soledade, aguardando números)

  const categorias = funcoesFiltros.tipos.length
    ? CATEGORIAS_FUNCAO.filter(c => funcoesFiltros.tipos.some(t => c.startsWith(t)))
    : CATEGORIAS_FUNCAO;

  const linhas = categorias.map(c => {
    const ocupado = dados ? (dados.contagem[c] || 0) : 0;
    const permitido = tip[c.toLowerCase()] || 0;
    const diferenca = ocupado - permitido;
    let status = 'conforme';
    if(diferenca > 0) status = 'excedente';
    else if(diferenca < 0) status = 'faltante';
    return { categoria: c, ocupado, permitido, diferenca, status };
  }).filter(l => l.ocupado > 0 || l.permitido > 0);

  const divergente = linhas.some(l => l.status !== 'conforme');
  return { linhas, divergente };
}

function renderConformidadePainel(){
  const chavesAlvo = funcoesFiltros.uos.length ? funcoesFiltros.uos : listaUOsComTipologia().map(u => u.sigla || u.nome);

  if(funcoesFiltros.uos.length === 1){
    const chave = funcoesFiltros.uos[0];
    const conf = conformidadeDaUnidade(chave);
    const unidade = SETORES_DATA.find(s => (s.sigla||s.nome) === chave);
    if(!conf){
      return `<div class="notes-panel"><p>Esta unidade ainda não tem tipologia definida pela Portaria — sem base de comparação disponível.</p></div>`;
    }
    const rows = conf.linhas.map(l => `
      <tr>
        <td>${l.categoria}</td>
        <td class="num">${l.permitido}</td>
        <td class="num">${l.ocupado}</td>
        <td class="num" style="font-weight:600; color:${l.status==='conforme'?'#1E8E5A':(l.status==='excedente'?'#C2453D':'#8A6D00')};">
          ${l.diferenca > 0 ? '+'+l.diferenca : l.diferenca}
        </td>
        <td>${l.status==='conforme' ? '✓ Conforme' : (l.status==='excedente' ? '⚠ Excedente' : '⚠ Faltante')}</td>
      </tr>`).join('');
    return `
      <div class="panel" style="margin-bottom:14px;">
        <table>
          <thead><tr>
            <th style="top:0">Categoria</th>
            <th class="num th-center" style="top:0">Permitido</th>
            <th class="num th-center" style="top:0">Ocupado</th>
            <th class="num th-center" style="top:0">Diferença</th>
            <th style="top:0">Situação</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="muted" style="padding:16px;">Nenhuma categoria com dado para esta unidade.</td></tr>`}</tbody>
        </table>
      </div>`;
  }

  // várias unidades (ou nenhuma selecionada): um resumo de situação por unidade
  const linhasResumo = chavesAlvo.map(chave => {
    const conf = conformidadeDaUnidade(chave);
    const unidade = SETORES_DATA.find(s => (s.sigla||s.nome) === chave);
    if(!unidade) return null;
    if(!conf) return { nome: unidade.nome, situacao: 'sem tipologia', detalhe: '—' };
    const divergentes = conf.linhas.filter(l => l.status !== 'conforme');
    const detalhe = divergentes.map(l => `${l.categoria}: ${l.status==='excedente' ? 'excedente de '+l.diferenca : 'falta '+Math.abs(l.diferenca)}`).join('; ');
    return { nome: unidade.nome, situacao: conf.divergente ? 'divergente' : 'conforme', detalhe: detalhe || '—' };
  }).filter(Boolean);

  const rows = linhasResumo.map(l => `
    <tr>
      <td>${l.nome}</td>
      <td>${l.situacao==='conforme' ? '✓ Conforme' : (l.situacao==='sem tipologia' ? '— Sem tipologia' : '⚠ Divergente')}</td>
      <td style="color:#8A6D00;">${l.situacao==='divergente' ? l.detalhe : '—'}</td>
    </tr>`).join('');

  return `
    <div class="panel" style="margin-bottom:14px;">
      <table>
        <thead><tr>
          <th style="top:0">Unidade</th>
          <th style="top:0">Situação (por categoria, não por total)</th>
          <th style="top:0">Detalhe</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function escopoSetoresFuncoes(){
  if(funcoesFiltros.uos.length === 1){
    return SETORES_DATA.filter(s => s.superior_sigla === funcoesFiltros.uos[0]);
  }
  const todas = listaUOsComTipologia();
  return funcoesFiltros.uos.length
    ? todas.filter(u => funcoesFiltros.uos.includes(u.sigla || u.nome))
    : todas;
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
  const categorias = funcoesFiltros.tipos.length
    ? ORDEM_HIERARQUICA.filter(c => funcoesFiltros.tipos.some(t => c.startsWith(t)))
    : ORDEM_HIERARQUICA;

  const porSetor = {};
  SERVIDORES_DATA.forEach(sv => {
    if(!sv.funcao) return;
    const tipo = sv.funcao.toUpperCase();
    if(!ORDEM_HIERARQUICA.includes(tipo)) return; // fora do modelo da Portaria (ex.: FUC1 é tratado à parte)
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

  const categorias = funcoesFiltros.tipos.length
    ? CATEGORIAS_FUNCAO.filter(c => funcoesFiltros.tipos.some(t => c.startsWith(t)))
    : CATEGORIAS_FUNCAO;

  if(funcoesFiltros.uos.length === 1){
    // uma UO específica: comparar cada categoria (CD1..FG2) ocupada x permitida
    const chave = funcoesFiltros.uos[0];
    const porUo = contagemFuncoesPorUO();
    const dadosUo = porUo[chave] || { contagem: {} };
    const tip = tipologiaPorChaveUO(chave);
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
    // nenhuma ou várias UOs selecionadas: total ocupado x total permitido, por unidade
    // (atenção: total agregado — para saber se a distribuição por categoria bate, veja o painel de Conformidade na Tabela)
    const porUo = contagemFuncoesPorUO();
    const uos = funcoesFiltros.uos.length
      ? listaUOsComTipologia().filter(u => funcoesFiltros.uos.includes(u.sigla || u.nome))
      : listaUOsComTipologia();
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
