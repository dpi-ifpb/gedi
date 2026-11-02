/* ================= Módulo Orçamento =================
 * Painel do Orçamento · Receitas (previsão e chegada) · Transferências
 *
 * RECEITA de uma unidade = lançamentos de receita + transferências recebidas − transferências enviadas
 *   prevista  = previsões + transferências (valor planejado, exceto canceladas)
 *   recebida  = chegadas  + transferências realizadas (soma das NCs / documentos lançados)
 * DESPESA da unidade executora: registrada (sem origem) → deferida → empenhada → paga
 * SALDOS: para planejar = prevista − deferida · para empenhar = recebida − empenhada · a pagar = empenhada − paga
 * Escrita: administrador e gestor_planejamento. Leitura: + leitor orçamentário.
 */
const podeEditarOrc = () => temPerfil(P_GESTAO);
const anoAtual = () => new Date().getFullYear();

function anosOrcamento(){
  const anos = new Set([anoAtual()]);
  TABELAS.receitas.forEach(r => anos.add(r.ano));
  TABELAS.transferencias.forEach(t => anos.add(t.ano));
  TABELAS.despesas.forEach(d => anos.add(d.ano));
  return [...anos].filter(Boolean).sort((a, b) => b - a);
}
function valorCell(v){ return `<td class="num">${Math.abs(v) > 0.004 ? fmtBRLCell(v) : '<span class="muted">—</span>'}</td>`; }
function saldoCell(v){
  const cor = v < -0.004 ? ' style="color:#B42318; font-weight:600;"' : '';
  return `<td class="num"${cor}>${Math.abs(v) > 0.004 ? fmtBRLCell(v) : '<span class="muted">—</span>'}</td>`;
}
function fmtDataISO(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '—';
  const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`;
}
function hojeISO(){
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const opUnidades = (filtroAtivo, atual) => unidadesOrdenadas(false).filter(u => !filtroAtivo || u.ativo || u.codigo === atual).map(u => ({ valor: u.codigo, texto: u.nome }));
const opOrigens = (atual) => origensOrdenadas(false).filter(o => o.ativo || o.sigla === atual).map(o => o.sigla);
const opAcoes = (atual) => acoesOrdenadas(false).filter(a => a.ativo || a.codigo === atual).map(a => ({ valor: a.codigo, texto: `${a.codigo} · ${a.descricao}` }));
function auditoriaTexto(x){
  return x && x.criadoPor ? `<div class="auditoria">Criado por ${escapeHtml(x.criadoPor)} em ${fmtDataHora(x.criadoEm)}<br>Última alteração por ${escapeHtml(x.atualizadoPor)} em ${fmtDataHora(x.atualizadoEm)}</div>` : '';
}

/* =============== Painel do Orçamento =============== */
let poFiltros = { ano: null, agrupar: 'origem', unidade: '', origem: '', acao: '', ptres: '', natureza: '' };
const AGRUPAMENTOS = [{ valor: 'origem', texto: 'Origem' }, { valor: 'unidade', texto: 'Unidade' }, { valor: 'acao', texto: 'Ação do orçamento' }, { valor: 'ptres', texto: 'PTRES' }, { valor: 'natureza', texto: 'Natureza' }];

function casaFiltro(x){
  return (!poFiltros.unidade || x.unidade === poFiltros.unidade) && (!poFiltros.origem || x.origem === poFiltros.origem)
    && (!poFiltros.acao || x.acao === poFiltros.acao) && (!poFiltros.ptres || x.ptres === poFiltros.ptres)
    && (!poFiltros.natureza || x.natureza === poFiltros.natureza);
}
function calcularPainel(){
  const ano = poFiltros.ano, chave = x => x[poFiltros.agrupar] || '—';
  const grupos = {};
  const vazio = () => ({ prevista: 0, recebida: 0, registrada: 0, deferida: 0, empenhada: 0, paga: 0 });
  const g = k => grupos[k] || (grupos[k] = vazio());
  let aConfirmar = 0;

  TABELAS.receitas.filter(r => r.ano === ano && r.ativo && casaFiltro(r)).forEach(r => {
    g(chave(r))[r.previsao ? 'prevista' : 'recebida'] += r.valor;
  });
  TABELAS.transferencias.filter(t => t.ano === ano && t.ativo).forEach(t => {
    [[t.de, -1], [t.para, 1]].forEach(([p, sinal]) => {
      if(!casaFiltro(p)) return;
      const x = g(chave(p));
      if(t.status !== 'cancelada') x.prevista += sinal * t.valor;
      x.recebida += sinal * t.realizado;   // NCs lançadas contam mesmo se a transferência foi cancelada depois
    });
    if(t.status !== 'cancelada' && (casaFiltro(t.de) || casaFiltro(t.para))) aConfirmar += Math.max(0, t.valor - t.realizado);
  });
  let registradaTotal = 0;
  TABELAS.despesas.filter(d => d.ano === ano && d.ativo).forEach(d => {
    if(d.status === 'pendente'){
      if(poFiltros.origem || poFiltros.acao || poFiltros.ptres) return;
      if((poFiltros.unidade && d.unidade !== poFiltros.unidade) || (poFiltros.natureza && d.natureza !== poFiltros.natureza)) return;
      registradaTotal += d.valor;
      if(poFiltros.agrupar === 'unidade' || poFiltros.agrupar === 'natureza') g(chave(d)).registrada += d.valor;
      return;
    }
    if(d.status !== 'deferida' || !casaFiltro(d)) return;
    const r = resumoExecucao(d), x = g(chave(d));
    x.deferida += d.valor; x.empenhada += r.empenhado; x.paga += r.pago;
  });
  return { grupos, registradaTotal, aConfirmar };
}

function rotuloGrupo(k){
  if(poFiltros.agrupar === 'origem') return `<span class="badge ${origemBadgeClass(k)}">${escapeHtml(k)}</span>`;
  if(poFiltros.agrupar === 'unidade') return escapeHtml(nomeUnidade(k));
  if(poFiltros.agrupar === 'acao') return escapeHtml(nomeAcao(k));
  if(poFiltros.agrupar === 'ptres'){ const p = TABELAS.ptres.find(x => x.codigo === k); return escapeHtml(p ? `${p.codigo} · ${p.acao}` : k); }
  return escapeHtml(k);
}

function renderPainelOrc(){
  const el = document.getElementById('contentPainelOrc');
  if(!el || !podeVerPagina('painelOrc')) return;
  const erro = TABELAS_ERRO.receitas || TABELAS_ERRO.transferencias || TABELAS_ERRO.despesas;
  if(erro){ el.innerHTML = estadoErro(erro); return; }
  if(!['receitas', 'transferencias', 'despesas', 'unidades', 'origens', 'acoes'].every(t => TABELAS_CARREGADAS[t])){ el.innerHTML = estadoCarregando(); return; }
  if(poFiltros.ano === null) poFiltros.ano = anoAtual();

  const { grupos, registradaTotal, aConfirmar } = calcularPainel();
  const mostraReg = poFiltros.agrupar === 'unidade' || poFiltros.agrupar === 'natureza';
  const base = { origem: origensOrdenadas(true).map(o => o.sigla), unidade: unidadesOrdenadas(true).map(u => u.codigo), acao: [], ptres: [], natureza: NATUREZAS.slice() }[poFiltros.agrupar];
  const ordem = [...new Set([...base, ...Object.keys(grupos)])];
  const tot = { prevista: 0, recebida: 0, registrada: 0, deferida: 0, empenhada: 0, paga: 0 };
  Object.values(grupos).forEach(x => Object.keys(tot).forEach(k => { tot[k] += x[k]; }));
  tot.registrada = registradaTotal;

  const linhas = ordem.map(k => {
    const x = grupos[k];
    if(!x || !Object.values(x).some(v => Math.abs(v) > 0.004)) return '';
    return `<tr><td class="pivot-unit-col">${rotuloGrupo(k)}</td>
      ${valorCell(x.prevista)}${valorCell(x.recebida)}${saldoCell(x.prevista - x.recebida)}
      ${mostraReg ? valorCell(x.registrada) : ''}${valorCell(x.deferida)}${valorCell(x.empenhada)}${valorCell(x.paga)}
      ${saldoCell(x.prevista - x.deferida)}${saldoCell(x.recebida - x.empenhada)}${saldoCell(x.empenhada - x.paga)}</tr>`;
  }).join('');
  const kpi = (rot, v, sub) => `<div class="kpi-card"><div class="kpi-label">${rot}</div><div class="kpi-value"${v < -0.004 ? ' style="color:#B42318;"' : ''}>${fmtBRL(v)}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;
  const pct = (a, b) => b > 0 ? `${(a / b * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% de ${fmtBRL(b)}` : '';
  const sel = (id, lista, atual, todos) => `<select onchange="poFiltros.${id}=this.value; renderPainelOrc()"><option value="">${todos}</option>${opcoesSelect(lista, atual)}</select>`;

  el.innerHTML = `
    <div class="filter-bar">
      <div class="filter-field" style="min-width:100px;"><label>Ano</label>
        <select onchange="poFiltros.ano=parseInt(this.value,10); renderPainelOrc()">${opcoesSelect(anosOrcamento().map(String), String(poFiltros.ano))}</select></div>
      <div class="filter-field"><label>Agrupar por</label>
        <select onchange="poFiltros.agrupar=this.value; renderPainelOrc()">${opcoesSelect(AGRUPAMENTOS, poFiltros.agrupar)}</select></div>
      <div class="filter-field"><label>Unidade</label>${sel('unidade', opUnidades(false), poFiltros.unidade, 'Todas')}</div>
      <div class="filter-field"><label>Origem</label>${sel('origem', origensOrdenadas(false).map(o => o.sigla), poFiltros.origem, 'Todas')}</div>
      <div class="filter-field"><label>Ação</label>${sel('acao', acoesOrdenadas(false).map(a => ({ valor: a.codigo, texto: a.codigo })), poFiltros.acao, 'Todas')}</div>
      <div class="filter-field"><label>PTRES</label>${sel('ptres', ptresOrdenados(false).map(p => ({ valor: p.codigo, texto: `${p.codigo} · ${p.acao}` })), poFiltros.ptres, 'Todos')}</div>
      <div class="filter-field"><label>Natureza</label>${sel('natureza', NATUREZAS, poFiltros.natureza, 'Todas')}</div>
    </div>
    <div class="po-bloco-titulo">Receita${poFiltros.unidade ? ` · ${escapeHtml(nomeUnidade(poFiltros.unidade))}` : ''}</div>
    <div class="kpi-row">
      ${kpi('Prevista', tot.prevista, 'previsões + transferências')}
      ${kpi('Recebida', tot.recebida, pct(tot.recebida, tot.prevista))}
      ${kpi('A receber', tot.prevista - tot.recebida)}
      ${kpi('Transferências a realizar', aConfirmar, 'planejado ainda sem NC')}
    </div>
    <div class="po-bloco-titulo">Despesa</div>
    <div class="kpi-row">
      ${kpi('Registrada · não analisada', tot.registrada, poFiltros.origem || poFiltros.acao || poFiltros.ptres ? 'sem origem/PTRES até a análise' : '')}
      ${kpi('Deferida', tot.deferida, pct(tot.deferida, tot.prevista))}
      ${kpi('Empenhada', tot.empenhada, pct(tot.empenhada, tot.deferida))}
      ${kpi('Paga', tot.paga, pct(tot.paga, tot.empenhada))}
    </div>
    <div class="po-bloco-titulo">Saldos</div>
    <div class="kpi-row">
      ${kpi('Para planejar', tot.prevista - tot.deferida, 'prevista − deferida')}
      ${kpi('Para empenhar', tot.recebida - tot.empenhada, 'recebida − empenhada')}
      ${kpi('A pagar', tot.empenhada - tot.paga, 'empenhada − paga')}
    </div>
    <div class="panel pivot-wrap">
      <table class="pivot-table">
        <thead>
          <tr>
            <th rowspan="2" class="pivot-th pivot-unit-col" style="top:0">${AGRUPAMENTOS.find(a => a.valor === poFiltros.agrupar).texto}</th>
            <th colspan="3" class="pivot-th group-origem" style="top:0">Receita</th>
            <th colspan="${mostraReg ? 4 : 3}" class="pivot-th group-origem" style="top:0">Despesa</th>
            <th colspan="3" class="pivot-th group-origem" style="top:0">Saldos</th>
          </tr>
          <tr>${['Prevista', 'Recebida', 'A receber'].concat(mostraReg ? ['Registrada'] : []).concat(['Deferida', 'Empenhada', 'Paga', 'Para planejar', 'Para empenhar', 'A pagar'])
              .map(t => `<th class="pivot-th num pivot-val" style="top:${PIVOT_HEAD_ROW_H}px">${t}</th>`).join('')}</tr>
        </thead>
        <tbody>${linhas || `<tr><td colspan="11" class="muted" style="padding:20px;">Sem valores para os filtros selecionados.</td></tr>`}</tbody>
        <tfoot><tr><td class="pivot-unit-col">Total</td>
          ${valorCell(tot.prevista)}${valorCell(tot.recebida)}${saldoCell(tot.prevista - tot.recebida)}
          ${mostraReg ? valorCell(tot.registrada) : ''}${valorCell(tot.deferida)}${valorCell(tot.empenhada)}${valorCell(tot.paga)}
          ${saldoCell(tot.prevista - tot.deferida)}${saldoCell(tot.recebida - tot.empenhada)}${saldoCell(tot.empenhada - tot.paga)}</tr></tfoot>
      </table>
    </div>
    <p class="result-count" style="margin-top:10px;">Transferências tiram da origem e somam no destino (planejado na receita prevista; NCs lançadas na recebida): no total do IFPB elas se anulam. Despesas registradas e ainda não analisadas não têm origem nem PTRES. Saldos negativos em vermelho; indeferidas, canceladas e inativas ficam de fora.</p>`;
}
aoMudarDadosRegistrar(['receitas', 'transferencias', 'despesas', 'unidades', 'origens', 'acoes', 'ptres'], renderPainelOrc);

/* =============== Receitas (previsão e chegada) =============== */
let rcFiltros = { ano: null, tipo: '', unidade: '', origem: '', acao: '', natureza: '', inativos: false };

function renderReceitas(){
  const el = document.getElementById('contentReceitas');
  if(!el || !podeVerPagina('receitas')) return;
  document.getElementById('btnNovaReceita').style.display = podeEditarOrc() ? '' : 'none';
  if(TABELAS_ERRO.receitas){ el.innerHTML = estadoErro(TABELAS_ERRO.receitas); return; }
  if(!TABELAS_CARREGADAS.receitas || !TABELAS_CARREGADAS.unidades){ el.innerHTML = estadoCarregando(); return; }
  if(rcFiltros.ano === null) rcFiltros.ano = anoAtual();
  const sel = (id, lista, todos) => `<select onchange="rcFiltros.${id}=this.value; renderReceitasTabela()"><option value="">${todos}</option>${opcoesSelect(lista, rcFiltros[id])}</select>`;
  el.innerHTML = `
    <div class="filter-bar">
      <div class="filter-field" style="min-width:100px;"><label>Ano</label>
        <select onchange="rcFiltros.ano=parseInt(this.value,10); renderReceitasTabela()">${opcoesSelect(anosOrcamento().map(String), String(rcFiltros.ano))}</select></div>
      <div class="filter-field"><label>Tipo</label>${sel('tipo', [{ valor: 'previsao', texto: 'Previsão' }, { valor: 'chegada', texto: 'Chegada' }], 'Todos')}</div>
      <div class="filter-field"><label>Unidade</label>${sel('unidade', opUnidades(false), 'Todas')}</div>
      <div class="filter-field"><label>Origem</label>${sel('origem', origensOrdenadas(false).map(o => o.sigla), 'Todas')}</div>
      <div class="filter-field"><label>Ação</label>${sel('acao', acoesOrdenadas(false).map(a => ({ valor: a.codigo, texto: a.codigo })), 'Todas')}</div>
      <div class="filter-field"><label>Natureza</label>${sel('natureza', NATUREZAS, 'Todas')}</div>
      <label class="filter-check"><input type="checkbox" ${rcFiltros.inativos ? 'checked' : ''} onchange="rcFiltros.inativos=this.checked; renderReceitasTabela()"> Mostrar inativos</label>
    </div>
    <div class="result-count" id="rcContagem"></div>
    <div class="panel"><table class="tabela-cartoes">
      <thead><tr><th>Tipo</th><th>Data</th><th>Unidade</th><th>PTRES · ação</th><th class="th-center">Origem</th><th class="th-center">Natureza</th><th>Documento</th><th class="num th-center">Valor</th><th class="th-center">Ações</th></tr></thead>
      <tbody id="rcBody"></tbody><tfoot id="rcFoot"></tfoot>
    </table></div>`;
  renderReceitasTabela();
}
aoMudarDadosRegistrar(['receitas', 'unidades', 'origens', 'acoes', 'ptres'], renderReceitas);

function renderReceitasTabela(){
  const body = document.getElementById('rcBody');
  if(!body) return;
  const f = rcFiltros;
  const lista = TABELAS.receitas.filter(r => r.ano === f.ano && (f.inativos || r.ativo)
    && (!f.tipo || (f.tipo === 'previsao') === r.previsao) && (!f.unidade || r.unidade === f.unidade)
    && (!f.origem || r.origem === f.origem) && (!f.acao || r.acao === f.acao) && (!f.natureza || r.natureza === f.natureza))
    .sort((a, b) => (b.previsao - a.previsao) || (b.data || '').localeCompare(a.data || ''));
  const ativos = lista.filter(r => r.ativo);
  const somaPrev = ativos.filter(r => r.previsao).reduce((s, r) => s + r.valor, 0);
  const somaCheg = ativos.filter(r => !r.previsao).reduce((s, r) => s + r.valor, 0);
  document.getElementById('rcContagem').textContent = `${lista.length} lançamento(s) · previsão ${fmtBRL(somaPrev)} · chegada ${fmtBRL(somaCheg)}`;
  body.innerHTML = lista.map(r => `
    <tr class="${r.ativo ? '' : 'linha-inativa'}">
      <td><span class="tipo-receita ${r.previsao ? 'previsao' : 'chegada'}">${r.previsao ? 'Previsão' : 'Chegada'}</span>${r.ativo ? '' : '<span class="tag-inativa">Inativo</span>'}</td>
      <td style="white-space:nowrap;">${fmtDataISO(r.data)}</td>
      <td>${escapeHtml(nomeUnidade(r.unidade))}</td>
      <td class="id-cell">${escapeHtml(r.ptres || '—')} · ${escapeHtml(r.acao)}</td>
      <td><span class="badge ${origemBadgeClass(r.origem)}">${escapeHtml(r.origem)}</span></td>
      <td><span class="tipo-tag ${naturezaTagClass(r.natureza)}">${escapeHtml(r.natureza)}</span></td>
      <td>${escapeHtml(r.documento) || '<span class="muted">—</span>'}</td>
      <td class="num">${fmtBRLCell(r.valor)}</td>
      <td><div class="linha-acoes"><button class="linha-btn" onclick="abrirFormReceita('${escapeAttr(r.docId)}')">${podeEditarOrc() ? 'Editar' : 'Ver'}</button>
        ${podeEditarOrc() ? `<button class="linha-btn ${r.ativo ? 'perigo' : ''}" onclick="alternarAtivoReceita('${escapeAttr(r.docId)}', ${!r.ativo})">${r.ativo ? 'Inativar' : 'Reativar'}</button>` : ''}</div></td>
    </tr>`).join('') || `<tr><td colspan="9" class="muted" style="padding:24px 26px;">Nenhum lançamento para os filtros selecionados.</td></tr>`;
  document.getElementById('rcFoot').innerHTML = `<tr><td colspan="7">Previsão / chegada (ativos exibidos)</td><td class="num" style="white-space:nowrap;">${fmtBRLCell(somaPrev)}<br>${fmtBRLCell(somaCheg)}</td><td></td></tr>`;
}

function abrirFormReceita(docId){
  const r = docId ? TABELAS.receitas.find(x => x.docId === docId) : null;
  const editar = podeEditarOrc();
  const dis = editar ? '' : 'disabled';
  abrirFormModal({
    titulo: r ? (editar ? 'Editar lançamento de receita' : 'Lançamento de receita') : 'Lançar receita',
    corpo: `
      <label class="check-linha" style="margin-bottom:16px;"><input type="checkbox" id="rcPrevisao" ${!r || r.previsao ? 'checked' : ''} ${dis} onchange="document.getElementById('rcDataBloco').querySelector('label').textContent=this.checked?'Data (opcional)':'Data da chegada'">
        <span>Previsão orçamentária<small>Marcado: previsão (ex.: LOA da unidade). Desmarcado: receita que chegou (crédito recebido).</small></span></label>
      <div class="form-grid">
        <div class="form-field"><label for="rcAno">Ano</label><input type="number" id="rcAno" min="2000" max="2100" value="${r ? r.ano : (rcFiltros.ano || anoAtual())}" ${dis}></div>
        <div class="form-field" id="rcDataBloco"><label for="rcData">${!r || r.previsao ? 'Data (opcional)' : 'Data da chegada'}</label><input type="date" id="rcData" value="${r ? r.data : ''}" ${dis}></div>
        <div class="form-field"><label for="rcUnidade">Unidade</label><select id="rcUnidade" ${dis}><option value="">Selecione…</option>${opcoesSelect(opUnidades(true, r && r.unidade), r ? r.unidade : rcFiltros.unidade)}</select></div>
        <div class="form-field"><label for="rcPtres">PTRES · ação do orçamento</label><select id="rcPtres" ${dis}><option value="">Selecione…</option>${opcoesSelect(opcoesPtres(r && r.ptres), r ? r.ptres : '')}</select></div>
        <div class="form-field"><label for="rcOrigem">Origem</label><select id="rcOrigem" ${dis}><option value="">Selecione…</option>${opcoesSelect(opOrigens(r && r.origem), r ? r.origem : rcFiltros.origem)}</select></div>
        <div class="form-field"><label for="rcNatureza">Natureza</label><select id="rcNatureza" ${dis}><option value="">Selecione…</option>${opcoesSelect(NATUREZAS, r ? r.natureza : rcFiltros.natureza)}</select></div>
        <div class="form-field"><label for="rcValor">Valor (R$)</label>
          <input type="text" id="rcValor" inputmode="decimal" placeholder="0,00" value="${r ? fmtValorInput(r.valor) : ''}" ${dis} onblur="const v=parseValorBR(this.value); if(!isNaN(v)) this.value=fmtValorInput(v);">
          <span class="ajuda">Use valor negativo para ajuste de previsão ou estorno.</span></div>
        <div class="form-field"><label for="rcDocumento">Documento</label><input type="text" id="rcDocumento" maxlength="100" placeholder="Ex.: LOA 2026" value="${r ? escapeAttr(r.documento) : ''}" ${dis}></div>
        <div class="form-field span-2"><label for="rcObs">Observação</label><input type="text" id="rcObs" maxlength="300" value="${r ? escapeAttr(r.observacao) : ''}" ${dis}></div>
      </div>
      ${auditoriaTexto(r)}${r ? blocoHistorico('receitas', r.docId) : ''}`,
    textoSalvar: r ? 'Salvar alterações' : 'Lançar',
    aoSalvar: editar ? async () => {
      const x = {
        previsao: document.getElementById('rcPrevisao').checked, ano: parseInt(document.getElementById('rcAno').value, 10),
        data: document.getElementById('rcData').value, unidade: document.getElementById('rcUnidade').value,
        ptres: document.getElementById('rcPtres').value, acao: acaoDoPtres(document.getElementById('rcPtres').value), origem: document.getElementById('rcOrigem').value,
        natureza: document.getElementById('rcNatureza').value, valor: parseValorBR(document.getElementById('rcValor').value),
        documento: document.getElementById('rcDocumento').value, observacao: document.getElementById('rcObs').value,
      };
      const erros = [], checar = (id, ok, m) => { marcarInvalido(id, !ok); if(!ok) erros.push(m); };
      checar('rcAno', x.ano >= 2000 && x.ano <= 2100, 'Informe o ano.');
      checar('rcData', x.previsao || /^\d{4}-\d{2}-\d{2}$/.test(x.data), 'Informe a data da chegada.');
      checar('rcUnidade', !!x.unidade, 'Selecione a unidade.');
      checar('rcPtres', !!x.ptres, 'Selecione o PTRES.');
      checar('rcOrigem', !!x.origem, 'Selecione a origem.');
      checar('rcNatureza', !!x.natureza, 'Selecione a natureza.');
      checar('rcValor', !isNaN(x.valor) && x.valor !== 0, 'Informe um valor diferente de zero.');
      if(erros.length) throw new Error(erros.join(' '));
      if(r) await Repo.receitas.atualizar(r.docId, x); else await Repo.receitas.criar(x);
      fecharFormModal(); mostrarToast(r ? 'Lançamento atualizado.' : `${x.previsao ? 'Previsão' : 'Chegada'} lançada.`);
    } : null,
  });
  if(r) carregarHistorico('receitas', r.docId);
}
async function alternarAtivoReceita(docId, ativo){
  if(!ativo && !confirm('Inativar este lançamento? Ele deixa de contar na receita.')) return;
  try{ await Repo.receitas.definirAtivo(docId, ativo); mostrarToast(`Lançamento ${ativo ? 'reativado' : 'inativado'}.`); }
  catch(e){ mostrarToast(traduzirErro(e), true); }
}

/* =============== Transferências =============== */
/* Tipos: automática (despesa) · repasse (manual, entre unidades, sem objeto) · troca orçamentária
 * (mesma unidade: muda PTRES/ação, origem ou natureza; exige processo do pedido formal).
 * Cada transferência tem um código para constar na observação do documento no SIAFI:
 * despesa = base do ID (#AR.0001.2.000); repasse = #TR.NNNN; troca = #TO.NNNN.
 * Lançamentos: NCs (troca: documento da alteração); anulação = valor negativo.
 * Status: prevista → parcial → realizada (quando a soma bate com o planejado). */
let trFiltros = { ano: null, status: '', unidade: '', tipo: '' };

function pontaHtml(p){
  return `<div class="ponta"><strong>${escapeHtml(nomeUnidade(p.unidade))}</strong><br><small>${escapeHtml(p.origem || '')} · ${escapeHtml(p.ptres || '—')} · ${escapeHtml(p.acao || '')} · ${escapeHtml(p.natureza || '')}</small></div>`;
}
// "Reitoria → Areia" + classificação (uma linha se igual dos dois lados; duas, se mudou)
function deParaHtml(t){
  const cls = p => `${escapeHtml(p.origem || '')} · ${escapeHtml(p.ptres || '—')} · ${escapeHtml(p.acao || '')} · ${escapeHtml(p.natureza || '')}`;
  const igual = cls(t.de) === cls(t.para);
  const unid = t.de.unidade === t.para.unidade ? escapeHtml(nomeUnidade(t.de.unidade)) : `${escapeHtml(nomeUnidade(t.de.unidade))} → ${escapeHtml(nomeUnidade(t.para.unidade))}`;
  return `<div class="ponta"><strong>${unid}</strong><br><small>${igual ? cls(t.de) : `${cls(t.de)}<br>→ ${cls(t.para)}`}</small></div>`;
}
function statusTag(t){ return `<span class="transf-tag ${t.status}">${ROTULO_STATUS_TRANSF[t.status] || t.status}</span>`; }
const rotuloDoc = t => t.tipo === 'troca' ? 'documento da alteração' : 'NC';

function renderTransferencias(){
  const el = document.getElementById('contentTransferencias');
  if(!el || !podeVerPagina('transferencias')) return;
  ['btnNovoRepasse', 'btnNovaTroca'].forEach(id => { const b = document.getElementById(id); if(b) b.style.display = podeEditarOrc() ? '' : 'none'; });
  if(TABELAS_ERRO.transferencias){ el.innerHTML = estadoErro(TABELAS_ERRO.transferencias); return; }
  if(!TABELAS_CARREGADAS.transferencias || !TABELAS_CARREGADAS.unidades){ el.innerHTML = estadoCarregando(); return; }
  if(trFiltros.ano === null) trFiltros.ano = anoAtual();
  const sel = (id, lista, todos) => `<select onchange="trFiltros.${id}=this.value; renderTransferenciasTabela()"><option value="">${todos}</option>${opcoesSelect(lista, trFiltros[id])}</select>`;
  el.innerHTML = `
    <div class="filter-bar">
      <div class="filter-field" style="min-width:100px;"><label>Ano</label>
        <select onchange="trFiltros.ano=parseInt(this.value,10); renderTransferenciasTabela()">${opcoesSelect(anosOrcamento().map(String), String(trFiltros.ano))}</select></div>
      <div class="filter-field"><label>Tipo</label>${sel('tipo', Object.entries(ROTULO_TIPO_TRANSF).map(([valor, texto]) => ({ valor, texto })), 'Todos')}</div>
      <div class="filter-field"><label>Situação</label>${sel('status', Object.entries(ROTULO_STATUS_TRANSF).map(([valor, texto]) => ({ valor, texto })), 'Todas')}</div>
      <div class="filter-field"><label>Unidade (origem ou destino)</label>${sel('unidade', opUnidades(false), 'Todas')}</div>
    </div>
    <div class="result-count" id="trContagem"></div>
    <div class="panel"><table class="tabela-cartoes">
      <thead><tr><th>Código</th><th class="th-center">Situação</th><th>De → Para</th><th class="num th-center">Planejado</th><th class="num th-center">Realizado</th><th>Objetivo</th><th class="th-center">Ações</th></tr></thead>
      <tbody id="trBody"></tbody>
    </table></div>`;
  renderTransferenciasTabela();
}
aoMudarDadosRegistrar(['transferencias', 'unidades', 'despesas', 'ptres'], renderTransferencias);

function renderTransferenciasTabela(){
  const body = document.getElementById('trBody');
  if(!body) return;
  const f = trFiltros, editar = podeEditarOrc();
  const ordem = { prevista: 0, parcial: 1, realizada: 2, cancelada: 3 };
  const lista = TABELAS.transferencias.filter(t => t.ano === f.ano && (!f.status || t.status === f.status)
    && (!f.unidade || t.de.unidade === f.unidade || t.para.unidade === f.unidade) && (!f.tipo || t.tipo === f.tipo))
    .sort((a, b) => (ordem[a.status] - ordem[b.status]) || a.codigo.localeCompare(b.codigo));
  const ativos = lista.filter(t => t.status !== 'cancelada');
  document.getElementById('trContagem').textContent =
    `${lista.length} transferência(s) · planejado ${fmtBRL(ativos.reduce((s, t) => s + t.valor, 0))} · realizado ${fmtBRL(lista.reduce((s, t) => s + t.realizado, 0))}`;
  body.innerHTML = lista.map(t => {
    const id = escapeAttr(t.docId);
    const b = [];
    if(editar && t.status !== 'cancelada') b.push(`<button class="linha-btn destaque" onclick="abrirLancamentos('${id}')">${t.tipo === 'troca' ? 'Documentos' : 'NCs'}</button>`);
    b.push(`<button class="linha-btn" onclick="verTransferencia('${id}')">Ver</button>`);
    if(editar && t.tipo !== 'despesa'){
      if(t.status === 'prevista') b.push(`<button class="linha-btn" onclick="abrirFormTransferencia('${t.tipo}', '${id}')">Editar</button>`, `<button class="linha-btn perigo" onclick="cancelarTransferencia('${id}', true)">Cancelar</button>`);
      if(t.status === 'cancelada') b.push(`<button class="linha-btn" onclick="cancelarTransferencia('${id}', false)">Reativar</button>`);
    }
    const diff = t.valor - t.realizado;
    return `<tr class="${t.status === 'cancelada' ? 'linha-inativa' : ''}">
      <td class="id-cell">${escapeHtml(t.codigo)}<div class="fase-pct" style="font-family:inherit;">${ROTULO_TIPO_TRANSF[t.tipo]}</div></td>
      <td style="text-align:center;">${statusTag(t)}</td>
      <td>${deParaHtml(t)}</td>
      <td class="num">${fmtBRLCell(t.valor)}</td>
      <td class="num">${fmtBRLCell(t.realizado)}${t.status !== 'cancelada' && Math.abs(diff) > 0.004 && t.realizado !== 0 ? `<div class="fase-pct">${diff > 0 ? 'falta' : 'excede'} ${fmtBRL(Math.abs(diff))}</div>` : ''}</td>
      <td class="desc-cell">${escapeHtml(t.justificativa)}${t.processo ? `<div class="fase-pct">processo ${escapeHtml(t.processo)}</div>` : ''}</td>
      <td><div class="linha-acoes">${b.join('')}</div></td></tr>`;
  }).join('') || `<tr><td colspan="7" class="muted" style="padding:24px 26px;">Nenhuma transferência para os filtros selecionados.</td></tr>`;
}

function camposPonta(prefixo, p, opcoes){
  const o = opcoes || {};
  return `
    ${o.semUnidade ? '' : `<div class="form-field"><label for="${prefixo}Unidade">Unidade</label><select id="${prefixo}Unidade"><option value="">Selecione…</option>${opcoesSelect(opUnidades(true, p && p.unidade), p ? p.unidade : '')}</select></div>`}
    <div class="form-field"><label for="${prefixo}Ptres">PTRES · ação</label><select id="${prefixo}Ptres"><option value="">Selecione…</option>${opcoesSelect(opcoesPtres(p && p.ptres), p ? p.ptres : '')}</select></div>
    <div class="form-field"><label for="${prefixo}Origem">Origem</label><select id="${prefixo}Origem"><option value="">Selecione…</option>${opcoesSelect(opOrigens(p && p.origem), p ? p.origem : '')}</select></div>
    <div class="form-field"><label for="${prefixo}Natureza">Natureza</label><select id="${prefixo}Natureza"><option value="">Selecione…</option>${opcoesSelect(NATUREZAS, p ? p.natureza : '')}</select></div>`;
}
function lerPonta(prefixo, unidadeFixa){
  const v = s => (document.getElementById(prefixo + s) || {}).value || '';
  const ptres = v('Ptres');
  return { unidade: unidadeFixa || v('Unidade'), ptres, acao: acaoDoPtres(ptres), origem: v('Origem'), natureza: v('Natureza') };
}
function copiarPontaDe(){
  ['Ptres', 'Origem', 'Natureza'].forEach(s => { document.getElementById('tpara' + s).value = document.getElementById('tde' + s).value; });
}

/* repasse (entre unidades) ou troca orçamentária (mesma unidade) */
function abrirFormTransferencia(tipo, docId){
  const t = docId ? TABELAS.transferencias.find(x => x.docId === docId) : null;
  const troca = tipo === 'troca';
  abrirFormModal({
    titulo: t ? `Editar ${troca ? 'troca orçamentária' : 'repasse'} ${t.codigo}` : (troca ? 'Nova troca orçamentária' : 'Novo repasse'),
    corpo: `
      <p class="form-nota">${troca
        ? 'Troca orçamentária: a mesma unidade passa recurso de um PTRES, origem ou natureza para outro. Exige pedido formal; registre o processo. Ela nasce <strong>prevista</strong> e é realizada quando a alteração aparece no Tesouro Gerencial.'
        : 'Repasse: recurso enviado a outra unidade sem objeto definido (a unidade prioriza os pagamentos). Ele nasce <strong>previsto</strong> e é realizado pelas NCs.'}
        O código gerado (${troca ? '#TO' : '#TR'}.NNNN) deve constar na observação do documento no SIAFI.</p>
      <div class="form-grid">
        <div class="form-field"><label for="tAno">Ano</label><input type="number" id="tAno" min="2000" max="2100" value="${t ? t.ano : (trFiltros.ano || anoAtual())}"></div>
        <div class="form-field"><label for="tValor">Valor planejado (R$)</label><input type="text" id="tValor" inputmode="decimal" placeholder="0,00" value="${t ? fmtValorInput(t.valor) : ''}" onblur="const v=parseValorBR(this.value); if(!isNaN(v)) this.value=fmtValorInput(v);"></div>
        ${troca ? `<div class="form-field span-2"><label for="tUnidade">Unidade</label><select id="tUnidade"><option value="">Selecione…</option>${opcoesSelect(opUnidades(true, t && t.de.unidade), t ? t.de.unidade : '')}</select></div>` : ''}
      </div>
      <div class="bloco-drawer"><h4>De (sai daqui)</h4><div class="form-grid">${camposPonta('tde', t && t.de, { semUnidade: troca })}</div></div>
      <div class="bloco-drawer"><h4>Para (entra aqui)${troca ? '' : ` · <a href="#" onclick="copiarPontaDe(); return false;" style="text-transform:none; letter-spacing:0; color:var(--c2);">copiar PTRES, origem e natureza</a>`}</h4><div class="form-grid">${camposPonta('tpara', t && t.para, { semUnidade: troca })}</div></div>
      <div class="bloco-drawer"><div class="form-grid">
        <div class="form-field span-2"><label for="tJust">Objetivo / justificativa</label><textarea id="tJust" maxlength="500">${t ? escapeHtml(t.justificativa) : ''}</textarea></div>
        <div class="form-field"><label for="tProc">Processo${troca ? ' do pedido formal' : ' (opcional)'}</label><input type="text" id="tProc" maxlength="100" placeholder="23381.000000.2026-00" value="${t ? escapeAttr(t.processo) : ''}"></div>
        <div class="form-field"><label for="tDoc">Documento de referência (opcional)</label><input type="text" id="tDoc" maxlength="100" placeholder="Ex.: memorando" value="${t ? escapeAttr(t.documento) : ''}"></div>
      </div></div>
      ${auditoriaTexto(t)}${t ? blocoHistorico('transferencias', t.docId) : ''}`,
    textoSalvar: t ? 'Salvar alterações' : 'Registrar',
    aoSalvar: async () => {
      const uni = troca ? document.getElementById('tUnidade').value : null;
      const x = { tipo, ano: parseInt(document.getElementById('tAno').value, 10), valor: parseValorBR(document.getElementById('tValor').value),
        de: lerPonta('tde', uni), para: lerPonta('tpara', uni), justificativa: document.getElementById('tJust').value,
        processo: document.getElementById('tProc').value, documento: document.getElementById('tDoc').value };
      const ids = [...(troca ? ['tUnidade'] : ['tdeUnidade', 'tparaUnidade']), 'tdePtres', 'tdeOrigem', 'tdeNatureza', 'tparaPtres', 'tparaOrigem', 'tparaNatureza'];
      const faltam = ids.filter(id => !document.getElementById(id).value);
      ids.forEach(id => marcarInvalido(id, faltam.includes(id)));
      if(faltam.length) throw new Error('Preencha todos os campos de origem e destino.');
      if(!troca && x.de.unidade === x.para.unidade) throw new Error('No repasse, as unidades de origem e destino devem ser diferentes. Para mudar PTRES, origem ou natureza na mesma unidade, use a troca orçamentária.');
      if(troca && JSON.stringify(x.de) === JSON.stringify(x.para)) throw new Error('Na troca, PTRES, origem ou natureza precisam mudar.');
      if(isNaN(x.valor) || x.valor <= 0) throw new Error('Informe um valor maior que zero.');
      if(!x.justificativa.trim()){ marcarInvalido('tJust', true); throw new Error('Informe o objetivo / justificativa.'); }
      if(troca && !x.processo.trim()){ marcarInvalido('tProc', true); throw new Error('Informe o processo do pedido formal.'); }
      if(t){ await Repo.transferencias.atualizar(t.docId, x); fecharFormModal(); mostrarToast(`${t.codigo} atualizada.`); }
      else { const codigo = await Repo.transferencias.criar(x); fecharFormModal(); mostrarToast(troca ? `Troca ${codigo} registrada como prevista.` : `Repasse ${codigo} registrado como previsto.`); }
    },
  });
  if(t) carregarHistorico('transferencias', t.docId);
}

function detalheTransferencia(t){
  const desp = t.despesa ? TABELAS.despesas.find(d => d.docId === t.despesa) : null;
  return `
    <dl class="modal-dl">
      <dt>Código · tipo</dt><dd><span class="id-cell" style="font-size:14px;">${escapeHtml(t.codigo)}</span> · ${ROTULO_TIPO_TRANSF[t.tipo]}</dd>
      <dt>Situação</dt><dd>${statusTag(t)} · planejado ${fmtBRL(t.valor)} · realizado ${fmtBRL(t.realizado)}</dd>
      <dt>De</dt><dd>${pontaHtml(t.de)}</dd>
      <dt>Para</dt><dd>${pontaHtml(t.para)}</dd>
      <dt>Objetivo / justificativa</dt><dd>${escapeHtml(t.justificativa)}</dd>
      ${desp ? `<dt>Despesa</dt><dd><a href="#" onclick="verDespesa('${escapeAttr(desp.docId)}'); return false;" class="link-suap">${escapeHtml(desp.id || desp.descricao)}</a></dd>` : ''}
      ${t.processo ? `<dt>Processo</dt><dd>${escapeHtml(t.processo)}</dd>` : ''}
      ${t.documento ? `<dt>Documento de referência</dt><dd>${escapeHtml(t.documento)}</dd>` : ''}
    </dl>`;
}
function tabelaLancamentos(t, editar){
  const ord = t.lancamentos.slice().sort((a, b) => (a.data + (a.registradoEm || '')).localeCompare(b.data + (b.registradoEm || '')));
  return `<div class="panel"><table class="exec-tab">
    <thead><tr><th>Data</th><th>Tipo</th><th>Nº do ${rotuloDoc(t)}</th><th class="num th-center">Valor</th><th>Lançado por</th><th></th></tr></thead>
    <tbody>${ord.map(l => `<tr><td>${fmtDataISO(l.data)}</td><td>${l.valor < 0 ? 'Anulação' : (t.tipo === 'troca' ? 'Alteração' : 'NC')}</td>
      <td class="id-cell">${escapeHtml(l.numero)}</td><td class="num">${fmtBRLCell(l.valor)}</td><td class="muted" style="font-size:11.5px;">${escapeHtml(l.por || '')}</td>
      <td>${editar ? `<button class="linha-btn perigo" onclick="removerLancamentoTransf('${escapeAttr(l.id)}')">Excluir</button>` : ''}</td></tr>`).join('')
      || `<tr><td colspan="6" class="muted">Nenhum ${rotuloDoc(t)} lançado.</td></tr>`}</tbody>
    <tfoot><tr><td colspan="3">Realizado</td><td class="num">${fmtBRLCell(t.realizado)}</td><td colspan="2">${Math.abs(t.valor - t.realizado) > 0.004 ? `${t.valor > t.realizado ? 'falta' : 'excede'} ${fmtBRL(Math.abs(t.valor - t.realizado))}` : 'bate com o planejado'}</td></tr></tfoot>
  </table></div>`;
}
function verTransferencia(docId){
  const t = TABELAS.transferencias.find(x => x.docId === docId);
  if(!t) return;
  abrirFormModal({ titulo: `Transferência ${t.codigo}`, corpo: `${detalheTransferencia(t)}
    <div class="bloco-drawer"><h4>${t.tipo === 'troca' ? 'Documentos da alteração' : 'Notas de crédito (NC)'}</h4>${tabelaLancamentos(t, false)}</div>
    ${auditoriaTexto(t)}${blocoHistorico('transferencias', t.docId)}` });
  carregarHistorico('transferencias', t.docId);
}

/* lançamentos: NCs / anulações / documentos da alteração (depois virão da importação do Tesouro Gerencial) */
let lancDocId = null;
function abrirLancamentos(docId){
  lancDocId = docId;
  abrirFormModal({ titulo: 'Lançamentos', largo: true, corpo: '<div id="lancCorpo"></div>' });
  renderLancamentos();
}
aoMudarDadosRegistrar(['transferencias'], () => {
  if(lancDocId && document.getElementById('lancCorpo') && !document.getElementById('formModal').classList.contains('hidden')) renderLancamentos();
});
function renderLancamentos(){
  const el = document.getElementById('lancCorpo');
  const t = TABELAS.transferencias.find(x => x.docId === lancDocId);
  if(!el || !t) return;
  document.getElementById('formModalTitle').textContent = `${t.tipo === 'troca' ? 'Documentos' : 'NCs'} · ${t.codigo}`;
  el.innerHTML = `${detalheTransferencia(t)}
    <div class="bloco-drawer"><h4>${t.tipo === 'troca' ? 'Documentos da alteração' : 'Notas de crédito (NC)'}</h4>
      ${tabelaLancamentos(t, true)}
      <div class="exec-form">
        <div class="form-field"><label>Tipo</label><select id="lcTipo">${opcoesSelect([{ valor: 'nc', texto: t.tipo === 'troca' ? 'Alteração' : 'NC' }, { valor: 'anulacao', texto: 'Anulação' }], 'nc')}</select></div>
        <div class="form-field"><label>Número</label><input type="text" id="lcNum" maxlength="40" placeholder="${t.tipo === 'troca' ? 'Nº do documento' : '2026NC000123'}"></div>
        <div class="form-field"><label>Data</label><input type="date" id="lcData" value="${hojeISO()}"></div>
        <div class="form-field"><label>Valor (R$)</label><input type="text" id="lcValor" inputmode="decimal" placeholder="${fmtValorInput(Math.max(0, t.valor - t.realizado))}"></div>
        <button class="acao-btn" onclick="lancarDocumentoTransf()">Lançar</button>
      </div>
      <p class="form-nota" style="margin-top:10px;">A transferência fica <strong>realizada</strong> quando a soma bate com o planejado. Anulação reduz o realizado (informe o valor positivo). Por enquanto o lançamento é manual; depois virá da importação do Tesouro Gerencial, reconhecendo o código <strong>${escapeHtml(t.codigo)}</strong> na observação.</p>
    </div>`;
}
async function lancarDocumentoTransf(){
  const t = TABELAS.transferencias.find(x => x.docId === lancDocId);
  const tipo = document.getElementById('lcTipo').value, numero = document.getElementById('lcNum').value.trim();
  const data = document.getElementById('lcData').value;
  let valor = parseValorBR(document.getElementById('lcValor').value);
  if(!numero) return mostrarErroForm('Informe o número do documento.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(data)) return mostrarErroForm('Informe a data.');
  if(isNaN(valor) || valor <= 0) return mostrarErroForm('Informe um valor maior que zero.');
  if(tipo === 'anulacao'){
    if(valor > t.realizado + 0.004) return mostrarErroForm(`A anulação não pode passar do realizado (${fmtBRL(t.realizado)}).`);
    valor = -valor;
  } else if(t.realizado + valor > t.valor + 0.004 && !confirm(`O realizado (${fmtBRL(t.realizado + valor)}) passará do planejado (${fmtBRL(t.valor)}). Lançar mesmo assim?`)) return;
  esconderErroForm();
  try{ await Repo.transferencias.adicionarLancamento(t.docId, { tipo, numero, data, valor }); mostrarToast(tipo === 'anulacao' ? 'Anulação lançada.' : 'Documento lançado.'); }
  catch(e){ mostrarErroForm(traduzirErro(e)); }
}
async function removerLancamentoTransf(lancId){
  if(!confirm('Excluir este lançamento?')) return;
  try{ await Repo.transferencias.removerLancamento(lancDocId, lancId); mostrarToast('Lançamento excluído.'); } catch(e){ mostrarErroForm(traduzirErro(e)); }
}
async function cancelarTransferencia(docId, cancelar){
  if(cancelar && !confirm('Cancelar esta transferência? Ela deixa de contar nos saldos.')) return;
  try{ await Repo.transferencias.definirCancelada(docId, cancelar); mostrarToast(cancelar ? 'Transferência cancelada.' : 'Transferência reativada.'); }
  catch(e){ mostrarToast(traduzirErro(e), true); }
}
