/* ================= Módulo Despesas · Lista =================
 * Abas: "Não analisadas" (com contador) e "Analisadas".
 *
 * Fluxo: REGISTRO → ANÁLISE → deferida (ganha o ID) | indeferida (sem ID).
 *   - registrador_despesas: registra e edita despesas das SUAS unidades enquanto não analisadas;
 *   - gestor_planejamento (analista) e administrador: registram, editam e analisam;
 *   - leitores: consultam.
 * ID: #UU.NNNN.O.FFFF, gerado no DEFERIMENTO (sequencial da unidade no ano, origem e
 * financiador definidos na análise). Depois de gerado, nunca muda.
 */
let listaFiltros = { aba: 'pendentes', ano: 'todos', busca: '', unidade: '', origem: '', resultado: '', inativas: false };

const podeAnalisar = () => temPerfil(P_GESTAO);
const podeRegistrar = () => temPerfil(P_REGISTRO);
function podeEditarRegistro(d){
  if(podeAnalisar()) return true;
  return temPerfil(['registrador_despesas']) && d.status === 'pendente' && UNIDADES_ATUAIS.includes(d.unidade);
}
const podeInativar = podeEditarRegistro;

function resultadoTag(status){
  const cls = status === 'deferida' ? 'sit-atendida' : status === 'indeferida' ? 'sit-indeferida' : 'sit-prevista';
  return `<span class="sit-tag ${cls}">${RESULTADOS_ANALISE[status] || status}</span>`;
}
function processoCell(d){
  if(!d.processo && !d.linkSuap) return '<span class="muted">—</span>';
  const num = escapeHtml(d.processo || 'Processo');
  return d.linkSuap
    ? `<a class="link-suap" href="${escapeAttr(d.linkSuap)}" target="_blank" rel="noopener" title="Abrir no SUAP">${num} ↗</a>`
    : num;
}

/* ---------- contador de pendências (aba e menu) ---------- */
function atualizarContadorPendencias(){
  const n = despesasPendentes().length;
  const badge = document.getElementById('navListaBadge');
  if(badge){ badge.textContent = n; badge.style.display = n ? '' : 'none'; }
  const aba = document.getElementById('abaPendentesContador');
  if(aba){ aba.textContent = n; aba.style.display = n ? '' : 'none'; }
}
aoMudarDadosRegistrar(['despesas'], atualizarContadorPendencias);

/* ---------- tela ---------- */
function renderLista(){
  const el = document.getElementById('contentLista');
  if(!el || !podeVerPagina('lista')) return;
  document.getElementById('btnRegistrarDespesa').style.display = podeRegistrar() ? '' : 'none';
  document.getElementById('btnImportarDespesas').style.display = temPerfil(P_ADMIN) ? '' : 'none';

  if(TABELAS_ERRO.despesas){ el.innerHTML = estadoErro(TABELAS_ERRO.despesas); return; }
  if(!TABELAS_CARREGADAS.despesas || !TABELAS_CARREGADAS.unidades){ el.innerHTML = estadoCarregando('Carregando despesas…'); return; }

  const anos = [...new Set(TABELAS.despesas.map(d => d.ano))].sort((a, b) => b - a);
  if(listaFiltros.ano !== 'todos' && !anos.includes(Number(listaFiltros.ano))) listaFiltros.ano = 'todos';
  const minhas = soRegistrador() ? UNIDADES_ATUAIS : null;
  const unidades = unidadesOrdenadas(false).filter(u => !minhas || minhas.includes(u.codigo))
    .map(u => ({ valor: u.codigo, texto: u.nome }));
  const analisadas = listaFiltros.aba === 'analisadas';

  el.innerHTML = `
    <div class="lista-abas" role="tablist">
      <button type="button" role="tab" class="lista-aba ${!analisadas ? 'ativa' : ''}" onclick="trocarAbaLista('pendentes')">
        Não analisadas <span class="aba-contador" id="abaPendentesContador"></span>
      </button>
      <button type="button" role="tab" class="lista-aba ${analisadas ? 'ativa' : ''}" onclick="trocarAbaLista('analisadas')">Analisadas</button>
    </div>
    <div class="filter-bar">
      <div class="filter-field" style="min-width:110px;">
        <label>Ano</label>
        <select id="lfAno" onchange="onListaFiltro()"><option value="todos">Todos</option>${opcoesSelect(anos.map(String), String(listaFiltros.ano))}</select>
      </div>
      <div class="filter-field" style="min-width:220px;">
        <label>Buscar</label>
        <input type="text" id="lfBusca" placeholder="${analisadas ? 'ID, descrição ou processo…' : 'Descrição ou processo…'}" value="${escapeAttr(listaFiltros.busca)}" oninput="onListaFiltro()">
      </div>
      <div class="filter-field">
        <label>Unidade</label>
        <select id="lfUnidade" onchange="onListaFiltro()"><option value="">Todas</option>${opcoesSelect(unidades, listaFiltros.unidade)}</select>
      </div>
      ${analisadas ? `
      <div class="filter-field">
        <label>Resultado</label>
        <select id="lfResultado" onchange="onListaFiltro()"><option value="">Todos</option>${opcoesSelect([{ valor: 'deferida', texto: 'Deferidas' }, { valor: 'indeferida', texto: 'Indeferidas' }], listaFiltros.resultado)}</select>
      </div>
      <div class="filter-field">
        <label>Origem</label>
        <select id="lfOrigem" onchange="onListaFiltro()"><option value="">Todas</option>${opcoesSelect(origensOrdenadas(false).map(o => o.sigla), listaFiltros.origem)}</select>
      </div>` : ''}
      <label class="filter-check"><input type="checkbox" id="lfInativas" ${listaFiltros.inativas ? 'checked' : ''} onchange="onListaFiltro()"> Mostrar inativas</label>
      <button class="filter-clear" onclick="limparListaFiltros()">Limpar filtros</button>
    </div>
    <div class="result-count" id="listaContagem"></div>
    <div class="panel">
      <table>
        <thead>${analisadas ? `
          <tr>
            <th>ID</th><th>Unidade</th><th>Descrição</th>
            <th class="th-center">Origem</th><th class="th-center">Natureza</th><th class="th-center">Resultado</th>
            <th class="num th-center">Valor</th><th class="th-center">Ações</th>
          </tr>` : `
          <tr>
            <th>Unidade</th><th>Descrição</th><th class="th-center">Natureza</th><th>Processo</th>
            <th class="num th-center">Valor</th><th>Registro</th><th class="th-center">Ações</th>
          </tr>`}
        </thead>
        <tbody id="listaBody"></tbody>
        <tfoot id="listaFoot"></tfoot>
      </table>
    </div>`;
  atualizarContadorPendencias();
  renderListaTabela();
}
aoMudarDadosRegistrar(['despesas', 'unidades', 'origens', 'financiadores'], renderLista);

function trocarAbaLista(aba){
  listaFiltros.aba = aba;
  listaFiltros.origem = ''; listaFiltros.resultado = '';
  renderLista();
}
function onListaFiltro(){
  const v = id => (document.getElementById(id) || {}).value || '';
  listaFiltros.ano = v('lfAno') || 'todos';
  listaFiltros.busca = v('lfBusca');
  listaFiltros.unidade = v('lfUnidade');
  listaFiltros.origem = v('lfOrigem');
  listaFiltros.resultado = v('lfResultado');
  listaFiltros.inativas = document.getElementById('lfInativas').checked;
  renderListaTabela();
}
function limparListaFiltros(){
  listaFiltros = { aba: listaFiltros.aba, ano: 'todos', busca: '', unidade: '', origem: '', resultado: '', inativas: false };
  renderLista();
}

function despesasDaAba(){
  const analisadas = listaFiltros.aba === 'analisadas';
  const busca = listaFiltros.busca.trim().toLowerCase();
  return TABELAS.despesas.filter(d => {
    if(analisadas ? d.status === 'pendente' : d.status !== 'pendente') return false;
    if(listaFiltros.ano !== 'todos' && d.ano !== Number(listaFiltros.ano)) return false;
    if(!listaFiltros.inativas && !d.ativo) return false;
    if(listaFiltros.unidade && d.unidade !== listaFiltros.unidade) return false;
    if(analisadas && listaFiltros.resultado && d.status !== listaFiltros.resultado) return false;
    if(analisadas && listaFiltros.origem && d.origem !== listaFiltros.origem) return false;
    if(busca && !`${d.id || ''} ${d.descricao} ${d.processo}`.toLowerCase().includes(busca)) return false;
    return true;
  }).sort((a, b) => analisadas
    ? (a.id || '~').localeCompare(b.id || '~')
    : ((a.criadoEm || 0) - (b.criadoEm || 0)));
}

function botoesLinha(d){
  const b = [];
  const id = escapeAttr(d.docId);
  if(d.status === 'pendente'){
    if(podeAnalisar() && d.ativo) b.push(`<button class="linha-btn destaque" onclick="abrirAnalise('${id}')">Analisar</button>`);
    if(podeEditarRegistro(d) && d.ativo) b.push(`<button class="linha-btn" onclick="abrirFormRegistro('${id}')">Editar</button>`);
  } else {
    b.push(`<button class="linha-btn" onclick="verDespesa('${id}')">Ver</button>`);
    if(podeAnalisar() && d.ativo){
      if(d.status === 'deferida') b.push(`<button class="linha-btn" onclick="abrirFormRegistro('${id}')">Editar</button>`);
      else b.push(`<button class="linha-btn" onclick="abrirAnalise('${id}')">Reanalisar</button>`);
    }
  }
  if(podeInativar(d)){
    b.push(d.ativo
      ? `<button class="linha-btn perigo" onclick="alternarAtivoDespesa('${id}', false)">Inativar</button>`
      : `<button class="linha-btn" onclick="alternarAtivoDespesa('${id}', true)">Reativar</button>`);
  }
  return `<div class="linha-acoes">${b.join('')}</div>`;
}

function renderListaTabela(){
  const body = document.getElementById('listaBody');
  if(!body) return;
  const analisadas = listaFiltros.aba === 'analisadas';
  const lista = despesasDaAba();
  const ativas = lista.filter(d => d.ativo);
  document.getElementById('listaContagem').textContent = analisadas
    ? `${lista.length} exibida(s) · ${ativas.filter(d => d.status === 'deferida').length} deferida(s) e ${ativas.filter(d => d.status === 'indeferida').length} indeferida(s)`
    : `${lista.length} exibida(s) aguardando análise`;
  const inativa = d => d.ativo ? '' : '<span class="tag-inativa">Inativa</span>';

  body.innerHTML = lista.map(d => analisadas ? `
    <tr class="${d.ativo ? '' : 'linha-inativa'}">
      <td class="id-cell">${d.id ? escapeHtml(d.id) : '<span class="muted">sem ID</span>'}</td>
      <td>${escapeHtml(nomeUnidade(d.unidade))}</td>
      <td class="desc-cell">${escapeHtml(d.descricao)}${inativa(d)}</td>
      <td>${d.origem ? `<span class="badge ${origemBadgeClass(d.origem)}">${escapeHtml(d.origem)}</span>` : '<span class="muted">—</span>'}</td>
      <td><span class="tipo-tag ${naturezaTagClass(d.natureza)}">${escapeHtml(d.natureza)}</span></td>
      <td>${resultadoTag(d.status)}</td>
      <td class="num">${fmtBRLCell(d.valor)}</td>
      <td>${botoesLinha(d)}</td>
    </tr>` : `
    <tr class="${d.ativo ? '' : 'linha-inativa'}">
      <td>${escapeHtml(nomeUnidade(d.unidade))}</td>
      <td class="desc-cell">${escapeHtml(d.descricao)}${inativa(d)}</td>
      <td><span class="tipo-tag ${naturezaTagClass(d.natureza)}">${escapeHtml(d.natureza)}</span></td>
      <td>${processoCell(d)}</td>
      <td class="num">${fmtBRLCell(d.valor)}</td>
      <td class="muted" style="font-size:12px;">${escapeHtml(d.criadoPor)}<br>${fmtDataHora(d.criadoEm)}</td>
      <td>${botoesLinha(d)}</td>
    </tr>`).join('') || `<tr><td colspan="8" class="muted" style="padding:24px 26px;">${analisadas ? 'Nenhuma despesa analisada para os filtros selecionados.' : 'Nenhuma despesa aguardando análise.'}</td></tr>`;

  const total = ativas.filter(d => !analisadas || d.status === 'deferida').reduce((s, d) => s + d.valor, 0);
  document.getElementById('listaFoot').innerHTML = analisadas
    ? `<tr><td colspan="6">Total deferido (ativas exibidas)</td><td class="num">${fmtBRLCell(total)}</td><td></td></tr>`
    : `<tr><td colspan="4">Total (ativas exibidas)</td><td class="num">${fmtBRLCell(total)}</td><td colspan="2"></td></tr>`;
}

/* ---------- formulário de registro / edição ---------- */
function abrirFormRegistro(docId){
  const d = docId ? TABELAS.despesas.find(x => x.docId === docId) : null;
  if(docId && !d){ mostrarToast('Despesa não encontrada.', true); return; }
  const permitidas = unidadesPermitidasRegistro(); // null = todas
  const unidades = unidadesOrdenadas(false)
    .filter(u => (u.ativo || (d && d.unidade === u.codigo)) && (!permitidas || permitidas.includes(u.codigo)))
    .map(u => ({ valor: u.codigo, texto: `${u.nome} (${u.codigo})` }));
  if(!unidades.length){ mostrarToast('Nenhuma unidade liberada para você registrar despesas. Fale com o administrador.', true); return; }
  const deferida = d && d.status === 'deferida';
  const anoPadrao = listaFiltros.ano !== 'todos' ? Number(listaFiltros.ano) : new Date().getFullYear();

  abrirFormModal({
    titulo: d ? 'Editar despesa' : 'Registrar despesa',
    corpo: `
      ${deferida ? `<div class="id-preview"><div class="id-valor">${escapeHtml(d.id)}</div>
        <div class="id-nota">Despesa deferida. O ID e o ano não mudam; origem e financiador são alterados pela análise.</div></div>`
      : `<p class="form-nota">A origem e o financiador são definidos na análise. O ID é gerado quando a despesa for deferida.</p>`}
      <div class="form-grid">
        <div class="form-field">
          <label for="rfAno">Ano de referência</label>
          <input type="number" id="rfAno" min="2000" max="2100" step="1" value="${d ? d.ano : anoPadrao}" ${deferida ? 'disabled' : ''}>
        </div>
        <div class="form-field">
          <label for="rfUnidade">Unidade</label>
          <select id="rfUnidade"><option value="">Selecione…</option>${opcoesSelect(unidades, d ? d.unidade : (unidades.length === 1 ? unidades[0].valor : ''))}</select>
        </div>
        <div class="form-field span-2">
          <label for="rfDescricao">Descrição</label>
          <textarea id="rfDescricao" maxlength="500">${d ? escapeHtml(d.descricao) : ''}</textarea>
        </div>
        <div class="form-field">
          <label for="rfValor">Valor (R$)</label>
          <input type="text" id="rfValor" inputmode="decimal" placeholder="0,00" value="${d ? fmtValorInput(d.valor) : ''}"
            onblur="const v=parseValorBR(this.value); if(!isNaN(v)) this.value=fmtValorInput(v);">
        </div>
        <div class="form-field">
          <label for="rfNatureza">Natureza</label>
          <select id="rfNatureza"><option value="">Selecione…</option>${opcoesSelect(NATUREZAS, d ? d.natureza : '')}</select>
        </div>
        <div class="form-field">
          <label for="rfProcesso">Nº do processo eletrônico</label>
          <input type="text" id="rfProcesso" maxlength="100" placeholder="Ex.: 23381.000123.2026-45" value="${d ? escapeAttr(d.processo) : ''}">
        </div>
        <div class="form-field">
          <label for="rfLink">Link do processo no SUAP</label>
          <input type="url" id="rfLink" maxlength="500" placeholder="https://suap.ifpb.edu.br/…" value="${d ? escapeAttr(d.linkSuap) : ''}">
        </div>
      </div>
      ${d ? `<div class="auditoria">Registrada por ${escapeHtml(d.criadoPor || '—')} em ${fmtDataHora(d.criadoEm)}<br>
        Última alteração por ${escapeHtml(d.atualizadoPor || '—')} em ${fmtDataHora(d.atualizadoEm)}</div>` : ''}`,
    textoSalvar: d ? 'Salvar alterações' : 'Registrar',
    aoSalvar: async () => {
      const dados = {
        ano: parseInt(document.getElementById('rfAno').value, 10),
        unidade: document.getElementById('rfUnidade').value,
        descricao: document.getElementById('rfDescricao').value.trim(),
        valor: parseValorBR(document.getElementById('rfValor').value),
        natureza: document.getElementById('rfNatureza').value,
        processo: document.getElementById('rfProcesso').value.trim(),
        linkSuap: document.getElementById('rfLink').value.trim(),
      };
      const erros = [];
      const checar = (id, ok, msg) => { marcarInvalido(id, !ok); if(!ok) erros.push(msg); };
      checar('rfAno', dados.ano >= 2000 && dados.ano <= 2100, 'Informe um ano válido.');
      checar('rfUnidade', !!dados.unidade, 'Selecione a unidade.');
      checar('rfDescricao', dados.descricao.length > 0, 'Informe a descrição.');
      checar('rfValor', !isNaN(dados.valor) && dados.valor >= 0, 'Informe um valor válido (ex.: 12.345,67).');
      checar('rfNatureza', !!dados.natureza, 'Selecione a natureza.');
      checar('rfLink', !dados.linkSuap || /^https:\/\/\S+$/.test(dados.linkSuap), 'O link do SUAP deve começar com https://');
      if(erros.length) throw new Error(erros.join(' '));
      if(d){
        await Repo.despesas.atualizarRegistro(d.docId, dados);
        fecharFormModal(); mostrarToast('Despesa atualizada.');
      } else {
        await Repo.despesas.registrar(dados);
        fecharFormModal();
        listaFiltros.aba = 'pendentes'; renderLista();
        mostrarToast('Despesa registrada. Ela aparece em "Não analisadas" até ser analisada.');
      }
    },
  });
}

/* ---------- detalhe (somente leitura) ---------- */
function dlDespesa(d){
  return `
    <dl class="modal-dl">
      ${d.id ? `<dt>ID</dt><dd class="id-cell" style="font-size:14px;">${escapeHtml(d.id)}</dd>` : ''}
      <dt>Ano · Unidade</dt><dd>${d.ano} · ${escapeHtml(nomeUnidade(d.unidade))}</dd>
      <dt>Descrição</dt><dd>${escapeHtml(d.descricao)}</dd>
      <dt>Valor · Natureza</dt><dd>${fmtBRL(d.valor)} · ${escapeHtml(d.natureza)}</dd>
      <dt>Processo eletrônico</dt><dd>${processoCell(d)}</dd>
      <dt>Registro</dt><dd>${escapeHtml(d.criadoPor || '—')} em ${fmtDataHora(d.criadoEm)}</dd>
      ${d.status !== 'pendente' ? `
      <dt>Resultado da análise</dt><dd>${resultadoTag(d.status)}${d.analise.por ? ` por ${escapeHtml(d.analise.por)} em ${fmtDataHora(d.analise.em)}` : ''}</dd>
      ${d.status === 'deferida' ? `<dt>Origem · Financiador</dt><dd>${escapeHtml(d.origem)} · ${escapeHtml(d.financiador)} (${escapeHtml(descricaoFinanciador(d.financiador))})</dd>` : ''}
      ${d.analise.observacao ? `<dt>${d.status === 'indeferida' ? 'Justificativa' : 'Observação'}</dt><dd>${escapeHtml(d.analise.observacao)}</dd>` : ''}
      ${d.situacaoLegado ? `<dt>Situação (planilha de origem)</dt><dd>${escapeHtml(d.situacaoLegado)}</dd>` : ''}` : ''}
    </dl>`;
}
function verDespesa(docId){
  const d = TABELAS.despesas.find(x => x.docId === docId);
  if(!d) return;
  abrirFormModal({ titulo: d.id ? `Despesa ${d.id}` : 'Despesa', corpo: dlDespesa(d) });
}

/* ---------- análise: deferir (gera o ID) ou indeferir ---------- */
function abrirAnalise(docId){
  const d = TABELAS.despesas.find(x => x.docId === docId);
  if(!d) return;
  const deferida = d.status === 'deferida';
  const origens = origensOrdenadas(false).filter(o => o.ativo || o.sigla === d.origem)
    .map(o => ({ valor: o.sigla, texto: `${o.sigla} (código ${o.codigo})` }));
  const financiadores = [{ valor: FINANCIADOR_NENHUM, texto: '0000 · Sem financiador' }]
    .concat(financiadoresOrdenados(false).filter(f => f.ativo || f.codigo === d.financiador)
      .map(f => ({ valor: f.codigo, texto: `${f.codigo} · ${f.descricao}` })));

  abrirFormModal({
    titulo: deferida ? `Editar análise · ${d.id}` : 'Analisar despesa',
    largo: false,
    corpo: `
      ${dlDespesa(d)}
      <div class="form-grid" style="margin-top:18px; padding-top:16px; border-top:1px solid var(--border);">
        <div class="form-field">
          <label for="afOrigem">Origem</label>
          <select id="afOrigem" onchange="previewIdAnalise('${escapeAttr(d.unidade)}')"><option value="">Selecione…</option>${opcoesSelect(origens, d.origem)}</select>
        </div>
        <div class="form-field">
          <label for="afFinanciador">Financiador</label>
          <select id="afFinanciador" onchange="previewIdAnalise('${escapeAttr(d.unidade)}')">${opcoesSelect(financiadores, d.financiador || FINANCIADOR_NENHUM)}</select>
        </div>
        <div class="form-field span-2">
          <label for="afObs">Observação ${deferida ? '' : '(obrigatória para indeferir)'}</label>
          <textarea id="afObs" maxlength="1000" placeholder="${deferida ? '' : 'Justificativa, se indeferir; comentário opcional, se deferir.'}">${escapeHtml(d.analise.observacao || '')}</textarea>
        </div>
      </div>
      ${deferida ? `<p class="form-nota" style="margin-top:12px;">O ID ${escapeHtml(d.id)} não muda, mesmo que a origem ou o financiador sejam alterados.</p>`
        : `<div class="id-preview" style="margin-top:14px; margin-bottom:0;"><div class="id-valor" id="afIdPreview"></div>
           <div class="id-nota">ID que será gerado ao deferir (o número sequencial é reservado no momento de salvar).</div></div>`}`,
    textoSalvar: deferida ? 'Salvar análise' : 'Deferir e gerar ID',
    aoSalvar: async () => {
      const origem = document.getElementById('afOrigem').value;
      const financiador = document.getElementById('afFinanciador').value || FINANCIADOR_NENHUM;
      const observacao = document.getElementById('afObs').value.trim();
      marcarInvalido('afOrigem', !origem);
      if(!origem) throw new Error('Selecione a origem para deferir.');
      if(deferida){
        await Repo.despesas.atualizarAnalise(d.docId, { origem, financiador, observacao });
        fecharFormModal(); mostrarToast(`Análise de ${d.id} atualizada.`);
      } else {
        const origemCodigo = codigoOrigem(origem);
        if(!origemCodigo) throw new Error('A origem selecionada não tem código cadastrado.');
        const id = await Repo.despesas.deferir(d.docId, { origem, origemCodigo, financiador, observacao });
        fecharFormModal(); mostrarToast(`Despesa deferida com o ID ${id}.`);
      }
    },
    acaoExtra: deferida ? null : {
      texto: 'Indeferir',
      perigo: true,
      fn: async () => {
        const observacao = document.getElementById('afObs').value.trim();
        marcarInvalido('afObs', !observacao);
        if(!observacao) throw new Error('Informe a justificativa para indeferir.');
        await Repo.despesas.indeferir(d.docId, observacao);
        fecharFormModal(); mostrarToast('Despesa indeferida.');
      },
    },
  });
  if(!deferida) previewIdAnalise(d.unidade);
}
function previewIdAnalise(unidade){
  const el = document.getElementById('afIdPreview');
  if(!el) return;
  const ori = codigoOrigem(document.getElementById('afOrigem').value) || '·';
  el.textContent = `#${unidade}.····.${ori}.${document.getElementById('afFinanciador').value || FINANCIADOR_NENHUM}`;
}

async function alternarAtivoDespesa(docId, ativo){
  const d = TABELAS.despesas.find(x => x.docId === docId);
  if(!d) return;
  const nome = d.id || `"${d.descricao}"`;
  const msg = ativo
    ? `Reativar a despesa ${nome}?`
    : `Inativar a despesa ${nome}?\n\nEla sai das listas e dos Totais, mas continua registrada e pode ser reativada depois.`;
  if(!confirm(msg)) return;
  try{
    await Repo.despesas.definirAtivo(docId, ativo);
    mostrarToast(`Despesa ${ativo ? 'reativada' : 'inativada'}.`);
  } catch(e){ mostrarToast(traduzirErro(e), true); }
}

/* ================= Importação (administrador) =================
 * Despesas JÁ ANALISADAS da planilha antiga entram como DEFERIDAS.
 * Colunas (separadas por TAB): ID  Unidade  Descrição  Valor  Origem  Natureza  Situação
 * - ID válido: mantido (o financiador vem das 4 últimas posições);
 * - ID vazio ou com "X": gerado pelo sistema, na ordem das linhas.
 * A coluna Situação fica guardada como "situação da planilha de origem".
 */
let importAnalise = null;

function abrirImportacao(){
  importAnalise = null;
  abrirFormModal({
    titulo: 'Importar despesas já analisadas',
    largo: true,
    corpo: `
      <p style="font-size:13px; line-height:1.6; margin-bottom:12px;">
        Cole as linhas copiadas da planilha, com as colunas nesta ordem:
        <strong>ID, Unidade, Descrição, Valor, Origem, Natureza, Situação</strong>.
        Elas entram como <strong>deferidas</strong>. IDs válidos são mantidos; IDs vazios ou com "X"
        (ex.: <code>#XX.0XXX.2.0000</code>) são gerados pelo sistema. Linhas já existentes no ano
        (mesmo ID ou, sem ID, mesma unidade, descrição, valor e origem) são ignoradas.
      </p>
      <div class="form-grid" style="margin-bottom:12px;">
        <div class="form-field">
          <label for="impAno">Ano de referência das despesas</label>
          <input type="number" id="impAno" min="2000" max="2100" value="${listaFiltros.ano !== 'todos' ? listaFiltros.ano : new Date().getFullYear()}">
        </div>
      </div>
      <textarea class="import-textarea" id="impTexto" placeholder="#AR.0001.2.0000&#9;Areia&#9;Estruturação de laboratórios…&#9;23926&#9;RP2&#9;Investimento&#9;Atendida"></textarea>
      <div style="margin-top:10px;"><button class="acao-btn secundario" onclick="analisarImportacao()">Analisar linhas</button></div>
      <div id="impResultado"></div>`,
    textoSalvar: 'Importar',
    aoSalvar: executarImportacao,
  });
  document.getElementById('formModalSalvar').disabled = true;
}

function analisarImportacao(){
  const ano = parseInt(document.getElementById('impAno').value, 10);
  const linhasBrutas = document.getElementById('impTexto').value.split(/\r?\n/).filter(l => l.trim());
  const porNome = {};
  TABELAS.unidades.forEach(u => { porNome[normalizarTexto(u.nome)] = u; });
  const doAno = TABELAS.despesas.filter(d => d.ano === ano);
  const existentes = new Set(doAno.filter(d => d.id).map(d => d.id));
  const assinatura = (uni, desc, valor, origem) => [uni, normalizarTexto(desc), Number(valor).toFixed(2), origem].join('|');
  const jaImportadas = new Set(doAno.map(d => assinatura(d.unidade, d.descricao, d.valor, d.origem)));
  const vistos = new Set();

  const linhas = linhasBrutas.map((bruta, i) => {
    const c = bruta.split('\t').map(x => x.trim());
    const r = { n: i + 1, bruta: c, erros: [], avisos: [], status: '' };
    if(i === 0 && normalizarTexto(c[0]) === 'id'){ r.cabecalho = true; return r; }
    if(c.length < 7){ r.erros.push(`Esperava 7 colunas separadas por TAB, encontrei ${c.length}.`); r.status = 'erro'; return r; }
    const [idTxt, unidadeTxt, descricao, valorTxt, origemTxt, naturezaTxt, situacaoTxt] = c;
    const uni = porNome[normalizarTexto(unidadeTxt)];
    if(!uni) r.erros.push(`Unidade "${unidadeTxt}" não está cadastrada (ou não tem código) — cadastre em Unidades e Origens.`);
    const ori = TABELAS.origens.find(o => o.sigla.toUpperCase() === origemTxt.toUpperCase());
    if(!ori) r.erros.push(`Origem "${origemTxt}" não está cadastrada.`);
    const natureza = NATUREZAS.find(x => normalizarTexto(x) === normalizarTexto(naturezaTxt));
    if(!natureza) r.erros.push(`Natureza "${naturezaTxt}" inválida.`);
    const valor = parseValorBR(valorTxt);
    if(isNaN(valor) || valor < 0) r.erros.push(`Valor "${valorTxt}" inválido.`);
    if(!descricao) r.erros.push('Descrição vazia.');

    const m = idTxt.match(Repo.ID_REGEX);
    let financiador = FINANCIADOR_NENHUM;
    if(m){
      financiador = m[4];
      if(uni && m[1] !== uni.codigo) r.avisos.push(`Prefixo ${m[1]} diferente do código da unidade (${uni.codigo}) — o ID será mantido.`);
      if(ori && m[3] !== ori.codigo) r.avisos.push(`Código de origem "${m[3]}" diferente do cadastrado para ${ori.sigla} ("${ori.codigo}") — o ID será mantido.`);
      if(financiador !== FINANCIADOR_NENHUM && !TABELAS.financiadores.some(f => f.codigo === financiador))
        r.avisos.push(`Financiador ${financiador} ainda não cadastrado.`);
      if(vistos.has(idTxt)) r.erros.push(`ID ${idTxt} repetido nesta lista.`);
      vistos.add(idTxt);
    } else if(idTxt && !/X/i.test(idTxt)){
      r.erros.push(`ID "${idTxt}" fora do padrão #UU.NNNN.O.FFFF (use vazio ou com X para gerar).`);
    }
    r.registro = {
      id: m ? idTxt : null, ano, unidade: uni && uni.codigo, descricao, valor,
      origem: ori && ori.sigla, origemCodigo: ori && ori.codigo, natureza, financiador,
      situacaoLegado: situacaoTxt || '',
    };
    if(r.erros.length) r.status = 'erro';
    else if(m && existentes.has(idTxt)) r.status = 'ignorar';
    else if(!m && jaImportadas.has(assinatura(uni.codigo, descricao, valor, ori.sigla))){
      r.status = 'ignorar'; r.avisos.push('Já existe despesa igual (unidade, descrição, valor e origem) neste ano.');
    }
    else r.status = m ? 'ok' : 'gerar';
    return r;
  }).filter(r => !r.cabecalho);

  importAnalise = { ano, linhas };
  const conta = s => linhas.filter(l => l.status === s).length;
  const rotulo = { ok: 'Manter ID', gerar: 'Gerar ID', ignorar: 'Já existe — ignorar', erro: 'Erro' };
  document.getElementById('impResultado').innerHTML = `
    <div class="import-resumo">
      <span>${linhas.length} linha(s)</span>
      <span class="ok">${conta('ok')} com ID mantido</span>
      <span class="gerar">${conta('gerar')} com ID a gerar</span>
      <span class="ignorar">${conta('ignorar')} já existentes</span>
      <span class="erro">${conta('erro')} com erro</span>
    </div>
    <div class="panel import-tabela">
      <table>
        <thead><tr><th>#</th><th>ID informado</th><th>Resultado</th><th>Unidade</th><th>Descrição</th><th class="num">Valor</th><th>Origem</th></tr></thead>
        <tbody>${linhas.map(l => `
          <tr>
            <td>${l.n}</td>
            <td class="id-cell">${escapeHtml(l.bruta[0] || '—')}</td>
            <td class="resultado"><span class="st-${l.status}">${rotulo[l.status]}</span>
              ${l.erros.map(e => `<span class="st-erro" style="display:block;font-weight:500;">${escapeHtml(e)}</span>`).join('')}
              ${l.avisos.map(a => `<span class="st-aviso">${escapeHtml(a)}</span>`).join('')}</td>
            <td>${escapeHtml(l.bruta[1] || '')}</td>
            <td class="desc-cell">${escapeHtml(l.bruta[2] || '')}</td>
            <td class="num">${l.registro && !isNaN(l.registro.valor) ? fmtBRLCell(l.registro.valor) : '—'}</td>
            <td>${escapeHtml(l.bruta[4] || '')}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="progresso" id="impProgresso" style="display:none;"><div></div></div>
    <p class="result-count" style="margin-top:10px;" id="impNota">
      ${conta('ok') + conta('gerar') > 0
        ? `Serão gravadas ${conta('ok') + conta('gerar')} despesa(s) deferidas em ${ano}. Linhas com erro ou já existentes ficam de fora.`
        : 'Nenhuma linha para importar.'}
    </p>`;
  const btn = document.getElementById('formModalSalvar');
  btn.disabled = conta('ok') + conta('gerar') === 0;
  btn.textContent = `Importar ${conta('ok') + conta('gerar')} despesa(s)`;
}

async function executarImportacao(){
  if(!importAnalise) throw new Error('Clique em "Analisar linhas" antes de importar.');
  const validas = importAnalise.linhas.filter(l => l.status === 'ok' || l.status === 'gerar').map(l => l.registro);
  if(!validas.length) throw new Error('Nenhuma linha válida para importar.');
  const barra = document.getElementById('impProgresso');
  barra.style.display = '';
  const res = await Repo.despesas.importar(validas, (feitos, total) => {
    barra.firstElementChild.style.width = `${Math.round(feitos / total * 100)}%`;
  });
  importAnalise = null;
  listaFiltros.aba = 'analisadas';
  document.getElementById('formModalSalvar').style.display = 'none';
  document.getElementById('impNota').innerHTML =
    `<strong>Importação concluída:</strong> ${res.gravadas} despesa(s) gravada(s)` +
    (res.geradas.length ? `, das quais ${res.geradas.length} com ID gerado agora` : '') +
    (res.ignoradas.length ? `; ${res.ignoradas.length} ignorada(s) por já existirem` : '') + '.' +
    (res.geradas.length ? `<br><br>IDs gerados:<br>${res.geradas.map(g =>
      `<span class="id-cell">${escapeHtml(g.id)}</span> · ${escapeHtml(nomeUnidade(g.linha.unidade))} · ${escapeHtml(g.linha.descricao)}`).join('<br>')}` : '');
  mostrarToast(`Importação concluída: ${res.gravadas} despesa(s).`);
}
