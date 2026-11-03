/* ================= Utilidades compartilhadas pelas telas de cadastro ================= */

/* ---------- modal de formulário (um só, reaproveitado por todas as telas) ---------- */
let formModalAoSalvar = null;
let formModalExtra = null;

/* opcoes: { titulo, corpo (html), textoSalvar, aoSalvar: async () => {}, largo,
 *           acaoExtra: { texto, perigo, fn: async () => {} } (segundo botão, ex.: "Indeferir") } */
function abrirFormModal(opcoes){
  formModalAoSalvar = opcoes.aoSalvar || null;
  formModalExtra = opcoes.acaoExtra || null;
  const extra = document.getElementById('formModalExtra');
  extra.style.display = formModalExtra ? '' : 'none';
  extra.textContent = formModalExtra ? formModalExtra.texto : '';
  extra.classList.toggle('perigo', !!(formModalExtra && formModalExtra.perigo));
  extra.disabled = false;
  document.getElementById('formModalTitle').textContent = opcoes.titulo || '';
  document.getElementById('formModalBody').innerHTML = opcoes.corpo || '';
  document.getElementById('formModalCard').classList.toggle('modal-card-wide', !!opcoes.largo);
  const salvar = document.getElementById('formModalSalvar');
  salvar.textContent = opcoes.textoSalvar || 'Salvar';
  salvar.style.display = opcoes.aoSalvar ? '' : 'none';
  document.querySelector('#formModal .modal-footer .acao-btn.secundario').textContent = opcoes.aoSalvar ? 'Cancelar' : 'Fechar';
  salvar.disabled = false;
  esconderErroForm();
  document.getElementById('formModal').classList.remove('hidden');
  const primeiro = document.querySelector('#formModalBody input:not([disabled]), #formModalBody select:not([disabled]), #formModalBody textarea');
  if(primeiro) setTimeout(() => primeiro.focus(), 30);
}
function fecharFormModal(){
  document.getElementById('formModal').classList.add('hidden');
  formModalAoSalvar = null;
  formModalExtra = null;
}
async function executarAcaoExtraModal(){
  if(!formModalExtra) return;
  const btn = document.getElementById('formModalExtra');
  btn.disabled = true;
  esconderErroForm();
  try{ await formModalExtra.fn(); }
  catch(e){ console.error(e); mostrarErroForm(traduzirErro(e)); }
  finally{ btn.disabled = false; }
}
async function salvarFormModal(){
  if(!formModalAoSalvar) return;
  const btn = document.getElementById('formModalSalvar');
  btn.disabled = true;
  esconderErroForm();
  try{
    await formModalAoSalvar();
  } catch(e){
    console.error(e);
    mostrarErroForm(traduzirErro(e));
  } finally {
    btn.disabled = false;
  }
}
function mostrarErroForm(msg){
  const el = document.getElementById('formModalErro');
  el.textContent = msg;
  el.classList.add('visivel');
}
function esconderErroForm(){
  const el = document.getElementById('formModalErro');
  if(el){ el.textContent = ''; el.classList.remove('visivel'); }
}
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && !document.getElementById('formModal').classList.contains('hidden')) fecharFormModal();
});

function traduzirErro(e){
  const code = e && e.code;
  if(code === 'permission-denied') return 'Seu perfil não tem permissão para esta operação (ou algum campo não passou na validação do servidor).';
  if(code === 'unavailable') return 'Sem conexão com o banco de dados. Verifique sua internet e tente novamente.';
  return (e && e.message) || 'Erro inesperado.';
}

/* ---------- aviso rápido ---------- */
let toastTimer = null;
function mostrarToast(msg, erro){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.toggle('erro', !!erro);
  el.classList.add('visivel');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visivel'), 3800);
}

/* ---------- valores em reais ---------- */
// Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56", "48543,13", "1.500"
function parseValorBR(txt){
  let s = String(txt || '').replace(/R\$|\s/g, '').trim();
  if(!s) return NaN;
  if(s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if(!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Math.round(parseFloat(s) * 100) / 100;
}
function fmtValorInput(v){
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDataHora(d){
  if(!d) return '—';
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Comparação sem acento/caixa (usada para casar nomes de unidade na importação)
function normalizarTexto(s){
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function opcoesSelect(lista, selecionado, rotulo){
  return lista.map(item => {
    const valor = typeof item === 'string' ? item : item.valor;
    const texto = typeof item === 'string' ? item : item.texto;
    return `<option value="${escapeAttr(valor)}"${valor === selecionado ? ' selected' : ''}>${escapeHtml(texto)}</option>`;
  }).join('');
}

function marcarInvalido(id, invalido){
  const el = document.getElementById(id);
  if(el && el.closest('.form-field')) el.closest('.form-field').classList.toggle('invalido', !!invalido);
}

function estadoCarregando(texto){
  return `<div class="state-box"><div class="spinner"></div><h3>${texto || 'Carregando…'}</h3></div>`;
}
function estadoErro(msg){
  return `<div class="state-box"><h3>Não foi possível carregar os dados</h3><p>${escapeHtml(msg)}</p></div>`;
}

/* ---------- histórico de alterações (gestor e administrador) ---------- */
const ROTULOS_CAMPOS = {
  ano: 'Ano', unidade: 'Unidade', fonte: 'Fonte', descricao: 'Descrição', valor: 'Valor', natureza: 'Natureza',
  processo: 'Processo', linkSuap: 'Link SUAP', percentual: 'Acompanhar em %', status: 'Situação', id: 'ID', idBase: 'Base do ID',
  origem: 'Origem', acao: 'Ação', financiador: 'Financiador', beneficiarias: 'Beneficiárias', ativo: 'Ativo',
  analise: 'Análise', empenhos: 'Empenhos', pagamentos: 'Pagamentos', execucao: 'Evolução física', transferencia: 'Transferência',
  nome: 'Nome', codigo: 'Código', perfis: 'Perfis', unidades: 'Unidades', previsao: 'Previsão', data: 'Data',
  documento: 'Documento', observacao: 'Observação', de: 'De', para: 'Para', justificativa: 'Justificativa',
  dataRealizacao: 'Data da NC', automatica: 'Automática', despesa: 'Despesa', situacaoLegado: 'Situação (planilha)', importado: 'Importada',
};
// O histórico não aparece nos painéis: fica na página de histórico, acessível só pela URL (index.html#auditoria).
function blocoHistorico(){ return ''; }
function resumoValor(v){
  if(v === null || v === undefined || v === '') return '—';
  if(typeof v === 'boolean') return v ? 'sim' : 'não';
  if(Array.isArray(v)) return v.length && typeof v[0] === 'object' ? `${v.length} lançamento(s)` : (v.join(', ') || '—');
  if(typeof v === 'object'){
    if(v.unidade) return `${v.unidade}/${v.origem || ''}/${v.acao || ''}/${v.natureza || ''}`;
    if('resultado' in v) return `${v.resultado || ''}${v.observacao ? ': ' + v.observacao : ''}`;
    if(v._d || v.seconds) return 'data/hora';
    return '…';
  }
  const t = String(v);
  return t.length > 80 ? t.slice(0, 77) + '…' : t;
}
async function carregarHistorico(entidade, docId){
  const el = document.getElementById(`hist_${docId}`);
  if(!el) return;
  try{
    const itens = await Repo.historico.listar(entidade, docId);
    if(!document.getElementById(`hist_${docId}`)) return;
    el.classList.remove('muted');
    el.innerHTML = itens.length ? `<ul class="historico-lista">${itens.map(h => {
      const alts = h.versao === 1 ? [] : Object.entries(h.alteracoes || {}).filter(([k]) => k !== '_documento')
        .map(([k, v]) => `${ROTULOS_CAMPOS[k] || k}: ${escapeHtml(resumoValor(v.de))} → ${escapeHtml(resumoValor(v.para))}`);
      return `<li><span class="h-cab">${fmtDataHora(h.em)} · ${escapeHtml(h.por)}</span><br><span class="h-acao">${escapeHtml(h.acao)}${h.versao === 1 ? ' (criação)' : ''}</span>
        ${alts.length ? `<div class="h-alt">${alts.join('<br>')}</div>` : ''}</li>`;
    }).join('')}</ul>` : '<span class="muted">Sem registros.</span>';
  } catch(e){ el.textContent = 'Não foi possível carregar o histórico.'; }
}

/* ---------- tabelas em cartões no celular: copia o título da coluna para cada célula ---------- */
function rotularTabelasCartoes(){
  document.querySelectorAll('table.tabela-cartoes').forEach(t => {
    const ths = [...t.querySelectorAll('thead tr:last-child th')].map(th => th.textContent.trim());
    if(!ths.length) return;
    t.querySelectorAll('tbody tr').forEach(tr => {
      [...tr.children].forEach((td, i) => { if(!td.hasAttribute('data-label')) td.setAttribute('data-label', td.colSpan > 1 ? '' : (ths[i] || '')); });
    });
  });
}
let rotularPendente = false;
new MutationObserver(() => {
  if(rotularPendente) return;
  rotularPendente = true;
  requestAnimationFrame(() => { rotularPendente = false; rotularTabelasCartoes(); });
}).observe(document.documentElement, { childList: true, subtree: true });

// acrescenta o bloco de histórico ao painel lateral já aberto
function anexarHistorico(){}
