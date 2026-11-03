/* ================= Histórico de alterações (página acessível só pela URL: index.html#auditoria) =================
 * Gestor de planejamento e administrador. Mostra, por entidade, quem fez cada gravação, quando e o que mudou.
 */
const ENTIDADES_AUDIT = [
  ['despesas', 'Despesas'], ['receitas', 'Receitas'], ['transferencias', 'Transferências'],
  ['unidades', 'Unidades'], ['origens', 'Origens'], ['acoes', 'Ações'], ['financiadores', 'Financiadores'],
  ['posicoes', 'Posições no ID'], ['usuarios', 'Usuários'],
];
let audEstado = { entidade: 'despesas', busca: '', limite: 200, itens: null, erro: null, carregando: false };

function rotuloRegistroAudit(entidade, docId){
  if(entidade === 'despesas'){
    const d = TABELAS.despesas.find(x => x.docId === docId);
    return d ? `${d.id || 'sem ID'} · ${d.descricao}` : docId;
  }
  if(entidade === 'transferencias'){
    const t = TABELAS.transferencias.find(x => x.docId === docId);
    return t ? `${t.codigo} · ${nomeUnidade(t.de.unidade)} → ${nomeUnidade(t.para.unidade)}` : docId;
  }
  if(entidade === 'receitas'){
    const r = TABELAS.receitas.find(x => x.docId === docId);
    return r ? `${r.previsao ? 'Previsão' : 'Chegada'} · ${nomeUnidade(r.unidade)} · ${r.origem} · ${r.acao} · ${fmtBRL(r.valor)}` : docId;
  }
  if(entidade === 'unidades') return `${docId} · ${nomeUnidade(docId)}`;
  if(entidade === 'acoes') return nomeAcao(docId);
  if(entidade === 'financiadores') return `${docId} · ${descricaoFinanciador(docId)}`;
  return docId;
}

async function carregarAuditoria(){
  audEstado.carregando = true; audEstado.itens = null; audEstado.erro = null;
  renderAuditoria();
  const ent = audEstado.entidade;
  try{
    const itens = await Repo.historico.listarEntidade(ent);
    if(audEstado.entidade !== ent) return;
    audEstado.itens = itens;
  } catch(e){ audEstado.erro = traduzirErro(e); }
  audEstado.carregando = false;
  renderAuditoria();
}
function trocarEntidadeAudit(ent){ audEstado.entidade = ent; audEstado.limite = 200; carregarAuditoria(); }

function renderAuditoria(){
  const el = document.getElementById('contentAuditoria');
  if(!el || !podeVerPagina('auditoria')) return;
  const abas = `<div class="lista-abas" role="tablist">${ENTIDADES_AUDIT.map(([k, t]) =>
    `<button type="button" role="tab" class="lista-aba ${audEstado.entidade === k ? 'ativa' : ''}" onclick="trocarEntidadeAudit('${k}')">${t}</button>`).join('')}</div>`;
  if(audEstado.erro){ el.innerHTML = abas + estadoErro(audEstado.erro); return; }
  if(!audEstado.itens){ el.innerHTML = abas + estadoCarregando('Carregando histórico…'); return; }
  el.innerHTML = `${abas}
    <div class="filter-bar">
      <div class="filter-field" style="min-width:280px;">
        <label>Buscar</label>
        <input type="text" id="audBusca" placeholder="Registro, usuário, operação ou campo…" value="${escapeAttr(audEstado.busca)}" oninput="audEstado.busca=this.value; audEstado.limite=200; renderAuditoriaTabela()">
      </div>
      <button class="acao-btn secundario" onclick="carregarAuditoria()">Atualizar</button>
    </div>
    <div class="result-count" id="audContagem"></div>
    <div class="panel">
      <table class="tabela-cartoes">
        <thead><tr><th style="width:130px;">Data e hora</th><th>Usuário</th><th>Operação</th><th>Registro</th><th>O que mudou</th></tr></thead>
        <tbody id="audBody"></tbody>
      </table>
    </div>
    <div id="audMais" style="margin-top:12px;"></div>`;
  renderAuditoriaTabela();
}

function linhasAlteracao(h){
  if(h.versao === 1) return '<span class="muted">criação do registro</span>';
  const alts = Object.entries(h.alteracoes || {}).filter(([k, v]) => k !== '_documento' && resumoValor(v.de) !== resumoValor(v.para))
    .map(([k, v]) => `<strong>${escapeHtml(ROTULOS_CAMPOS[k] || k)}:</strong> ${escapeHtml(resumoValor(v.de))} → ${escapeHtml(resumoValor(v.para))}`);
  return alts.join('<br>') || '<span class="muted">—</span>';
}
function renderAuditoriaTabela(){
  const body = document.getElementById('audBody');
  if(!body) return;
  const busca = normalizarTexto(audEstado.busca);
  const ent = audEstado.entidade;
  const filtrados = audEstado.itens.filter(h => !busca || normalizarTexto([
    h.por, h.acao, h.docId, rotuloRegistroAudit(ent, h.docId), Object.keys(h.alteracoes || {}).map(k => ROTULOS_CAMPOS[k] || k).join(' '),
  ].join(' ')).includes(busca));
  const vis = filtrados.slice(0, audEstado.limite);
  document.getElementById('audContagem').textContent = `${filtrados.length} registro(s) de histórico${filtrados.length > vis.length ? ` · exibindo os ${vis.length} mais recentes` : ''}`;
  body.innerHTML = vis.map(h => `<tr>
      <td class="muted" style="font-size:12.5px; white-space:nowrap;">${fmtDataHora(h.em)}</td>
      <td style="font-size:12.5px;">${escapeHtml(h.por || '—')}</td>
      <td><span class="perfil-chip">${escapeHtml(h.acao || '')}</span> <span class="muted" style="font-size:11.5px;">v${h.versao}</span></td>
      <td style="font-size:12.5px;">${escapeHtml(rotuloRegistroAudit(ent, h.docId))}</td>
      <td style="font-size:12.5px; line-height:1.5;">${linhasAlteracao(h)}</td>
    </tr>`).join('') || `<tr><td colspan="5" class="muted" style="padding:24px 26px;">Nenhum registro de histórico.</td></tr>`;
  document.getElementById('audMais').innerHTML = filtrados.length > vis.length
    ? `<button class="acao-btn secundario" onclick="audEstado.limite+=200; renderAuditoriaTabela()">Mostrar mais</button>` : '';
}

// abrir pela URL (#auditoria) depois do login, e também ao mudar o endereço
function abrirPaginaPelaUrl(){
  if(location.hash === '#auditoria' && podeVerPagina('auditoria')){
    switchPage('auditoria');
    carregarAuditoria();
  }
}
window.addEventListener('hashchange', abrirPaginaPelaUrl);
