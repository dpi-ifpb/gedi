let ESTRUTURA_EXPANDED = new Set(['REITORIA']);
let estruturaFiltros = { busca: '', uo: '' };

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
