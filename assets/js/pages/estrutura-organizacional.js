let ESTRUTURA_EXPANDED = new Set(['REITORIA']);
let estruturaFiltros = { busca: '', uo: '' };
let estruturaView = 'tabela';
let estruturaMapaInstance = null;

function buildEstruturaTree(){
  const bySigla = {};
  SETORES_DATA.forEach(s => { if(s.sigla) bySigla[s.sigla] = s; });
  const children = {};
  SETORES_DATA.forEach(s => {
    const key = s.superior_sigla || '__ROOT__';
    (children[key] = children[key] || []).push(s);
  });
  Object.values(children).forEach(list => list.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR')));

  const contagemPorSigla = {};
  SERVIDORES_DATA.forEach(sv => {
    contagemPorSigla[sv.exercicio_suap_sigla] = (contagemPorSigla[sv.exercicio_suap_sigla] || 0) + 1;
  });

  function contarTotal(setor){
    let total = setor.sigla ? (contagemPorSigla[setor.sigla] || 0) : 0;
    (children[setor.sigla] || []).forEach(f => total += contarTotal(f));
    setor._total = total;
    return total;
  }
  const raizes = (children['__ROOT__'] || []).sort((a,b) => {
    if(a.sigla === 'REITORIA') return -1;
    if(b.sigla === 'REITORIA') return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
  raizes.forEach(contarTotal);

  return { bySigla, children, raizes };
}

function estruturaChaveSetor(setor){
  return setor.sigla || ('__vazio__' + setor.nome);
}

function estruturaSetorLabel(setor){
  return setor.eh_uo ? setor.nome : (setor.sigla ? `${setor.sigla} - ${setor.nome}` : setor.nome);
}

function estruturaSetorCombina(setor, termo){
  return estruturaSetorLabel(setor).toLowerCase().includes(termo);
}

function estruturaSubarvoreCombina(setor, termo, children){
  if(estruturaSetorCombina(setor, termo)) return true;
  const kids = setor.sigla ? (children[setor.sigla] || []) : [];
  return kids.some(k => estruturaSubarvoreCombina(k, termo, children));
}

function estruturaToggleHTML(){
  return `
    <div class="view-toggle" id="estruturaViewToggle" style="margin-left:auto;">
      <button type="button" class="view-toggle-btn${estruturaView==='tabela'?' active':''}" data-view="tabela" onclick="setEstruturaView('tabela')">Tabela</button>
      <button type="button" class="view-toggle-btn${estruturaView==='mapa'?' active':''}" data-view="mapa" onclick="setEstruturaView('mapa')">Mapa</button>
      <button type="button" class="view-toggle-btn${estruturaView==='treemap'?' active':''}" data-view="treemap" onclick="setEstruturaView('treemap')">Treemap</button>
    </div>`;
}

function buildEstruturaFilters(){
  const { raizes } = buildEstruturaTree();
  const opts = raizes.map(r => {
    const valor = r.sigla || r.nome;
    return `<option value="${valor}">${r.nome}</option>`;
  }).join('');

  return `
    <div class="filter-bar">
      <div class="filter-field" style="min-width:260px;">
        <label>Buscar setor</label>
        <input type="text" id="fEstruturaBusca" placeholder="Nome ou sigla do setor…" value="${estruturaFiltros.busca}" oninput="onEstruturaFilterChange()">
      </div>
      <div class="filter-field">
        <label>Unidade</label>
        <select id="fEstruturaUO" onchange="onEstruturaFilterChange()">
          <option value="">Todas</option>${opts}
        </select>
      </div>
      <button class="filter-clear" onclick="clearEstruturaFilters()">Limpar filtros</button>
      ${estruturaToggleHTML()}
    </div>`;
}

function onEstruturaFilterChange(){
  estruturaFiltros.busca = document.getElementById('fEstruturaBusca').value;
  estruturaFiltros.uo = document.getElementById('fEstruturaUO').value;
  renderEstruturaTabela();
}

function clearEstruturaFilters(){
  estruturaFiltros = { busca: '', uo: '' };
  renderEstruturaOrganizacional();
}

function renderEstruturaOrganizacional(){
  const el = document.getElementById('contentEstrutura');
  if(!el) return;
  if(estruturaView === 'mapa'){
    renderEstruturaMapa(el);
    return;
  }
  if(estruturaView === 'treemap'){
    renderEstruturaTreemap(el);
    return;
  }
  el.innerHTML = buildEstruturaFilters() + `
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th style="top:0">Setor</th>
            <th class="num th-center" style="top:0">Servidores (exercício)</th>
          </tr>
        </thead>
        <tbody id="estruturaTbody"></tbody>
      </table>
    </div>`;
  renderEstruturaTabela();
}

function setEstruturaView(view){
  estruturaView = view;
  document.querySelectorAll('#estruturaViewToggle .view-toggle-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  renderEstruturaOrganizacional();
}

function renderEstruturaMapa(el){
  el.innerHTML = `
    <div class="filter-bar">${estruturaToggleHTML()}</div>
    <div id="estruturaMapaEl" style="height:560px; border-radius:var(--radius); overflow:hidden;"></div>`;

  const { raizes } = buildEstruturaTree();
  const pontos = raizes.map(r => {
    const chave = r.sigla;
    const coord = (chave && COORDENADAS_UO.por_sigla[chave]) || COORDENADAS_UO.por_nome[r.nome];
    return coord ? { nome: r.nome, total: r._total || 0, coord } : null;
  }).filter(Boolean);

  if(estruturaMapaInstance){ estruturaMapaInstance.remove(); estruturaMapaInstance = null; }
  const mapa = L.map('estruturaMapaEl', { scrollWheelZoom: false }).setView([-7.15, -36.3], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(mapa);

  const maxTotal = Math.max(1, ...pontos.map(p => p.total));
  pontos.forEach(p => {
    const raio = 6 + Math.sqrt(p.total / maxTotal) * 26;
    L.circleMarker(p.coord, {
      radius: raio, color: '#2A1458', weight: 1.5, fillColor: '#8E1774', fillOpacity: .55,
    }).addTo(mapa).bindTooltip(`<strong>${p.nome}</strong><br>${p.total} servidor${p.total===1?'':'es'}`, { direction: 'top' });
  });

  estruturaMapaInstance = mapa;
}

function estruturaEscopoSetores(){
  if(estruturaFiltros.uo){
    return SETORES_DATA.filter(s => s.superior_sigla === estruturaFiltros.uo);
  }
  return SETORES_DATA.filter(s => s.eh_uo);
}

function estruturaEscopoRaiz(sigla, escopoSiglas){
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

let estruturaTreemapInstance = null;

function buildEstruturaFiltroUOSimples(onchangeFn){
  const { raizes } = buildEstruturaTree();
  const opts = raizes.map(r => {
    const valor = r.sigla || r.nome;
    return `<option value="${valor}" ${estruturaFiltros.uo===valor?'selected':''}>${r.nome}</option>`;
  }).join('');
  return `
    <div class="filter-bar">
      <div class="filter-field">
        <label>Unidade</label>
        <select onchange="${onchangeFn}(this.value)">
          <option value="">Todas</option>${opts}
        </select>
      </div>
      ${estruturaToggleHTML()}
    </div>`;
}

function renderEstruturaTreemap(el){
  el.innerHTML = buildEstruturaFiltroUOSimples('onEstruturaTreemapUOChange') + `<canvas id="estruturaTreemapChart" height="130"></canvas>`;
  desenharEstruturaTreemap();
}

function onEstruturaTreemapUOChange(valor){
  estruturaFiltros.uo = valor;
  desenharEstruturaTreemap();
}

function desenharEstruturaTreemap(){
  const ctx = document.getElementById('estruturaTreemapChart').getContext('2d');
  if(estruturaTreemapInstance){ estruturaTreemapInstance.destroy(); estruturaTreemapInstance = null; }

  const escopo = estruturaEscopoSetores();
  const escopoSiglas = new Set(escopo.map(s => s.sigla).filter(Boolean));
  const contagemPorSigla = {};
  SERVIDORES_DATA.forEach(sv => {
    contagemPorSigla[sv.exercicio_suap_sigla] = (contagemPorSigla[sv.exercicio_suap_sigla] || 0) + 1;
  });

  const dados = escopo.map(s => {
    const bySigla = {}; SETORES_DATA.forEach(x => { if(x.sigla) bySigla[x.sigla] = x; });
    const children = {}; SETORES_DATA.forEach(x => { const k = x.superior_sigla || '__ROOT__'; (children[k]=children[k]||[]).push(x); });
    function total(setor){
      let t = setor.sigla ? (contagemPorSigla[setor.sigla]||0) : 0;
      (children[setor.sigla]||[]).forEach(f => t += total(f));
      return t;
    }
    const label = s.eh_uo ? s.nome.replace('Campus ', '') : s.sigla;
    return { label, value: total(s) };
  }).filter(d => d.value > 0);

  estruturaTreemapInstance = new Chart(ctx, {
    type: 'treemap',
    data: {
      datasets: [{
        tree: dados,
        key: 'value',
        labels: {
          display: true,
          formatter(ctx){
            const d = ctx.raw._data;
            return [d.label, `${d.value} serv.`];
          },
          color: '#fff', font: { size: 12, weight: '600' },
        },
        backgroundColor(ctx){
          if(!ctx.raw) return '#8E1774';
          const paleta = ['#2A1458','#3A1E72','#8E1774','#B23A8E','#1E8E5A','#1E9B9B','#1B5E82','#7FB443'];
          return paleta[ctx.dataIndex % paleta.length];
        },
        spacing: 1.5, borderWidth: 1.5, borderColor: '#fff',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(){ return ''; },
            label(ctx){ const d = ctx.raw._data; return `${d.label}: ${d.value} servidor${d.value===1?'':'es'}`; }
          }
        }
      }
    }
  });
}

function renderEstruturaTabela(){
  const tbody = document.getElementById('estruturaTbody');
  if(!tbody) return;
  const { children, raizes } = buildEstruturaTree();
  const termo = estruturaFiltros.busca.trim().toLowerCase();
  const filtrando = !!termo;

  function linha(setor, depth){
    const key = estruturaChaveSetor(setor);
    const kids = setor.sigla ? (children[setor.sigla] || []) : [];
    const kidsVisiveis = filtrando ? kids.filter(k => estruturaSubarvoreCombina(k, termo, children)) : kids;
    const hasKids = kidsVisiveis.length > 0;
    const isMatch = filtrando && estruturaSetorCombina(setor, termo);
    const isOpen = filtrando ? true : ESTRUTURA_EXPANDED.has(key);
    const label = estruturaSetorLabel(setor);
    const rowStyle = setor.eh_uo ? ' style="background:#F3EDFA; font-weight:600;"' : '';
    const toggle = hasKids
      ? `<span class="tree-toggle${isOpen ? ' is-open' : ''}" data-key="${key.replace(/"/g,'&quot;')}"></span>`
      : `<span class="tree-toggle tree-toggle-leaf">•</span>`;
    const clickable = setor.sigla ? ` onclick="openServidoresSetor('${setor.sigla}')" style="cursor:pointer;"` : '';
    const labelHtml = isMatch ? `<mark>${label}</mark>` : label;
    let html = `<tr${rowStyle}>
      <td style="padding-left:${16 + depth*20}px;">
        ${toggle}<span${clickable}>${labelHtml}</span>
      </td>
      <td class="num">${setor._total || 0}</td>
    </tr>`;
    if(hasKids && isOpen){
      kidsVisiveis.forEach(k => { html += linha(k, depth+1); });
    }
    return html;
  }

  let raizesVisiveis = raizes;
  if(estruturaFiltros.uo){
    raizesVisiveis = raizes.filter(r => (r.sigla || r.nome) === estruturaFiltros.uo);
  }
  if(filtrando){
    raizesVisiveis = raizesVisiveis.filter(r => estruturaSubarvoreCombina(r, termo, children));
  }

  tbody.innerHTML = raizesVisiveis.length
    ? raizesVisiveis.map(r => linha(r, 0)).join('')
    : `<tr><td colspan="2" class="muted" style="padding:20px 26px;">Nenhum setor encontrado para os filtros selecionados.</td></tr>`;

  tbody.querySelectorAll('.tree-toggle:not(.tree-toggle-leaf)').forEach(t => {
    t.addEventListener('click', (e) => {
      e.stopPropagation();
      if(filtrando) return; // navegação de expandir/recolher fica desativada durante a busca
      const key = t.dataset.key;
      if(ESTRUTURA_EXPANDED.has(key)) ESTRUTURA_EXPANDED.delete(key);
      else ESTRUTURA_EXPANDED.add(key);
      renderEstruturaTabela();
    });
  });
}

function openServidoresSetor(sigla){
  const setor = SETORES_DATA.find(s => s.sigla === sigla);
  const label = estruturaSetorLabel(setor);
  const lista = SERVIDORES_DATA
    .filter(sv => sv.exercicio_suap_sigla === sigla)
    .sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const rows = lista.map(sv => `
    <tr>
      <td>${sv.nome}</td>
      <td>${sv.cargo}</td>
      <td>${sv.funcao || '—'}</td>
    </tr>`).join('');

  document.getElementById('notesModalBody').innerHTML = `
    <h3>${label}</h3>
    <p style="margin-bottom:14px; color:var(--ink-soft); font-size:13px;">${lista.length} servidor${lista.length===1?'':'es'} em exercício neste setor.</p>
    <div class="panel">
      <table>
        <thead><tr><th style="top:0">Nome</th><th style="top:0">Cargo</th><th style="top:0">Função</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" class="muted" style="padding:16px;">Nenhum servidor em exercício neste setor.</td></tr>'}</tbody>
      </table>
    </div>`;
  document.getElementById('notesModal').classList.remove('hidden');
}
