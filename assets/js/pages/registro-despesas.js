/* ================= Tela · Registro de Despesas (CRUD) =================
 * Perfis: administrador e gestor_planejamento cadastram, editam e inativam.
 * Importação em lote: só administrador.
 *
 * ID: #UU.NNNN.O.FFFF
 *   UU   = código da unidade (tabela Unidades)
 *   NNNN = sequencial da unidade NO ANO (reinicia a cada ano)
 *   O    = código da origem (tabela Origens)
 *   FFFF = código do financiador (0000 = sem financiador)
 * O ID é gerado ao salvar e nunca muda. Despesas não são excluídas: são inativadas.
 */
let regFiltros = { ano: null, busca: '', unidade: '', origem: '', situacao: '', inativas: false };

function anosRegistro(){
  const anos = new Set(TABELAS.despesas.map(d => d.ano));
  anos.add(new Date().getFullYear());
  return [...anos].sort((a, b) => b - a);
}

function renderRegistro(){
  const el = document.getElementById('contentRegistro');
  if(!el || !podeVerPagina('registro')) return;
  const btnImportar = document.getElementById('btnImportarDespesas');
  if(btnImportar) btnImportar.style.display = temPerfil(P_ADMIN) ? '' : 'none';

  if(TABELAS_ERRO.despesas){ el.innerHTML = estadoErro(TABELAS_ERRO.despesas); return; }
  if(!TABELAS_CARREGADAS.despesas || !TABELAS_CARREGADAS.unidades){ el.innerHTML = estadoCarregando('Carregando despesas…'); return; }

  const anos = anosRegistro();
  if(regFiltros.ano === null || !anos.includes(regFiltros.ano)){
    const comDados = anos.filter(a => TABELAS.despesas.some(d => d.ano === a));
    regFiltros.ano = comDados.length ? comDados[0] : anos[0];
  }

  const unidades = unidadesOrdenadas(false).map(u => ({ valor: u.codigo, texto: u.nome }));
  const origens = origensOrdenadas(false).map(o => o.sigla);

  el.innerHTML = `
    <div class="filter-bar">
      <div class="filter-field" style="min-width:90px;">
        <label>Ano</label>
        <select id="rfAno" onchange="onRegFiltro()">${opcoesSelect(anos.map(String), String(regFiltros.ano))}</select>
      </div>
      <div class="filter-field" style="min-width:220px;">
        <label>Buscar</label>
        <input type="text" id="rfBusca" placeholder="ID ou descrição…" value="${escapeAttr(regFiltros.busca)}" oninput="onRegFiltro()">
      </div>
      <div class="filter-field">
        <label>Unidade</label>
        <select id="rfUnidade" onchange="onRegFiltro()"><option value="">Todas</option>${opcoesSelect(unidades, regFiltros.unidade)}</select>
      </div>
      <div class="filter-field">
        <label>Origem</label>
        <select id="rfOrigem" onchange="onRegFiltro()"><option value="">Todas</option>${opcoesSelect(origens, regFiltros.origem)}</select>
      </div>
      <div class="filter-field">
        <label>Situação</label>
        <select id="rfSituacao" onchange="onRegFiltro()"><option value="">Todas</option>${opcoesSelect(SITUACOES, regFiltros.situacao)}</select>
      </div>
      <label class="filter-check"><input type="checkbox" id="rfInativas" ${regFiltros.inativas ? 'checked' : ''} onchange="onRegFiltro()"> Mostrar inativas</label>
      <button class="filter-clear" onclick="limparRegFiltros()">Limpar filtros</button>
    </div>
    <div class="result-count" id="regContagem"></div>
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Unidade</th>
            <th>Descrição</th>
            <th class="th-center">Origem</th>
            <th class="th-center">Natureza</th>
            <th class="th-center">Situação</th>
            <th class="num th-center">Valor</th>
            <th class="th-center">Ações</th>
          </tr>
        </thead>
        <tbody id="regBody"></tbody>
        <tfoot id="regFoot"></tfoot>
      </table>
    </div>`;
  renderRegistroTabela();
}
aoMudarDadosRegistrar(['despesas', 'unidades', 'origens', 'financiadores'], renderRegistro);

function onRegFiltro(){
  regFiltros.ano = parseInt(document.getElementById('rfAno').value, 10);
  regFiltros.busca = document.getElementById('rfBusca').value;
  regFiltros.unidade = document.getElementById('rfUnidade').value;
  regFiltros.origem = document.getElementById('rfOrigem').value;
  regFiltros.situacao = document.getElementById('rfSituacao').value;
  regFiltros.inativas = document.getElementById('rfInativas').checked;
  renderRegistroTabela();
}
function limparRegFiltros(){
  regFiltros = { ano: regFiltros.ano, busca: '', unidade: '', origem: '', situacao: '', inativas: false };
  renderRegistro();
}

function despesasFiltradasRegistro(){
  const busca = regFiltros.busca.trim().toLowerCase();
  return TABELAS.despesas.filter(d => {
    if(d.ano !== regFiltros.ano) return false;
    if(!regFiltros.inativas && !d.ativo) return false;
    if(regFiltros.unidade && d.unidade !== regFiltros.unidade) return false;
    if(regFiltros.origem && d.origem !== regFiltros.origem) return false;
    if(regFiltros.situacao && d.situacao !== regFiltros.situacao) return false;
    if(busca && !(d.id + ' ' + d.descricao).toLowerCase().includes(busca)) return false;
    return true;
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function renderRegistroTabela(){
  const body = document.getElementById('regBody');
  if(!body) return;
  const lista = despesasFiltradasRegistro();
  const doAno = TABELAS.despesas.filter(d => d.ano === regFiltros.ano);
  const ativasAno = doAno.filter(d => d.ativo).length;
  document.getElementById('regContagem').textContent =
    `${lista.length} exibida(s) · ${ativasAno} ativa(s) e ${doAno.length - ativasAno} inativa(s) em ${regFiltros.ano}`;

  body.innerHTML = lista.map(d => `
    <tr class="${d.ativo ? '' : 'linha-inativa'}">
      <td class="id-cell">${escapeHtml(d.id)}</td>
      <td>${escapeHtml(nomeUnidade(d.unidade))}</td>
      <td class="desc-cell">${escapeHtml(d.descricao)}${d.ativo ? '' : '<span class="tag-inativa">Inativa</span>'}</td>
      <td><span class="badge ${origemBadgeClass(d.origem)}">${escapeHtml(d.origem) || '—'}</span></td>
      <td><span class="tipo-tag ${naturezaTagClass(d.natureza)}">${escapeHtml(d.natureza) || '—'}</span></td>
      <td><span class="sit-tag ${situacaoTagClass(d.situacao)}">${escapeHtml(d.situacao) || '—'}</span></td>
      <td class="num">${fmtBRLCell(d.valor)}</td>
      <td><div class="linha-acoes">
        <button class="linha-btn" onclick="abrirFormDespesa('${escapeAttr(d.docId)}')">Editar</button>
        ${d.ativo
          ? `<button class="linha-btn perigo" onclick="alternarAtivoDespesa('${escapeAttr(d.docId)}', false)">Inativar</button>`
          : `<button class="linha-btn" onclick="alternarAtivoDespesa('${escapeAttr(d.docId)}', true)">Reativar</button>`}
      </div></td>
    </tr>`).join('') || `<tr><td colspan="8" class="muted" style="padding:24px 26px;">Nenhuma despesa para os filtros selecionados.</td></tr>`;

  const total = lista.filter(d => d.ativo).reduce((s, d) => s + d.valor, 0);
  document.getElementById('regFoot').innerHTML =
    `<tr><td colspan="6">Total (ativas exibidas)</td><td class="num">${fmtBRLCell(total)}</td><td></td></tr>`;
}

/* ---------- formulário de inclusão/edição ---------- */
function abrirFormDespesa(docId){
  const d = docId ? TABELAS.despesas.find(x => x.docId === docId) : null;
  if(docId && !d){ mostrarToast('Despesa não encontrada.', true); return; }
  const novo = !d;

  // listas: só itens ativos, mas mantendo o valor atual da despesa mesmo se inativo
  const unidades = unidadesOrdenadas(false).filter(u => u.ativo || (d && d.unidade === u.codigo))
    .map(u => ({ valor: u.codigo, texto: `${u.nome} (${u.codigo})` }));
  const origens = origensOrdenadas(false).filter(o => o.ativo || (d && d.origem === o.sigla))
    .map(o => ({ valor: o.sigla, texto: `${o.sigla} (${o.codigo})` }));
  const financiadores = [{ valor: FINANCIADOR_NENHUM, texto: '0000 · Sem financiador' }]
    .concat(financiadoresOrdenados(false).filter(f => f.ativo || (d && d.financiador === f.codigo))
      .map(f => ({ valor: f.codigo, texto: `${f.codigo} · ${f.descricao}` })));

  const anoInicial = d ? d.ano : (regFiltros.ano || new Date().getFullYear());

  const corpo = `
    <div class="id-preview">
      <div class="id-valor" id="dfIdPreview">${d ? escapeHtml(d.id) : ''}</div>
      <div class="id-nota">${novo
        ? 'O número sequencial é reservado no momento em que você salvar (reinicia a cada ano, por unidade).'
        : 'O ID não muda, mesmo que unidade, origem ou financiador sejam alterados.'}</div>
    </div>
    <div class="form-grid">
      <div class="form-field">
        <label for="dfAno">Ano de referência</label>
        <input type="number" id="dfAno" min="2000" max="2100" step="1" value="${anoInicial}" ${novo ? '' : 'disabled'} oninput="atualizarPreviewId()">
      </div>
      <div class="form-field">
        <label for="dfUnidade">Unidade</label>
        <select id="dfUnidade" onchange="atualizarPreviewId()"><option value="">Selecione…</option>${opcoesSelect(unidades, d ? d.unidade : '')}</select>
      </div>
      <div class="form-field span-2">
        <label for="dfDescricao">Descrição</label>
        <textarea id="dfDescricao" maxlength="500">${d ? escapeHtml(d.descricao) : ''}</textarea>
      </div>
      <div class="form-field">
        <label for="dfValor">Valor (R$)</label>
        <input type="text" id="dfValor" inputmode="decimal" placeholder="0,00" value="${d ? fmtValorInput(d.valor) : ''}"
          onblur="const v=parseValorBR(this.value); if(!isNaN(v)) this.value=fmtValorInput(v);">
      </div>
      <div class="form-field">
        <label for="dfOrigem">Origem</label>
        <select id="dfOrigem" onchange="atualizarPreviewId()"><option value="">Selecione…</option>${opcoesSelect(origens, d ? d.origem : '')}</select>
      </div>
      <div class="form-field">
        <label for="dfNatureza">Natureza</label>
        <select id="dfNatureza"><option value="">Selecione…</option>${opcoesSelect(NATUREZAS, d ? d.natureza : '')}</select>
      </div>
      <div class="form-field">
        <label for="dfSituacao">Situação</label>
        <select id="dfSituacao"><option value="">Selecione…</option>${opcoesSelect(SITUACOES, d ? d.situacao : (novo ? 'Prevista' : ''))}</select>
      </div>
      <div class="form-field span-2">
        <label for="dfFinanciador">Financiador</label>
        <select id="dfFinanciador" onchange="atualizarPreviewId()">${opcoesSelect(financiadores, d ? d.financiador : FINANCIADOR_NENHUM)}</select>
        <span class="ajuda">Parlamentar (emenda), empresa parceira etc. Os financiadores são cadastrados pelo administrador.</span>
      </div>
    </div>
    ${d ? `<div class="auditoria">
      Criada por ${escapeHtml(d.criadoPor || '—')} em ${fmtDataHora(d.criadoEm)}<br>
      Última alteração por ${escapeHtml(d.atualizadoPor || '—')} em ${fmtDataHora(d.atualizadoEm)}
      ${d.ativo ? '' : '<br><strong>Esta despesa está inativa</strong> — não entra em Totais nem em Detalhamento.'}
    </div>` : ''}`;

  abrirFormModal({
    titulo: novo ? 'Nova despesa' : 'Editar despesa',
    corpo,
    textoSalvar: novo ? 'Salvar e gerar ID' : 'Salvar alterações',
    aoSalvar: () => salvarDespesa(d),
  });
  if(novo) atualizarPreviewId();
}

function atualizarPreviewId(){
  const el = document.getElementById('dfIdPreview');
  if(!el || document.getElementById('dfAno').disabled) return; // edição: ID fixo
  const uni = document.getElementById('dfUnidade').value || '··';
  const ori = codigoOrigem(document.getElementById('dfOrigem').value) || '·';
  const fin = document.getElementById('dfFinanciador').value || FINANCIADOR_NENHUM;
  el.textContent = `#${uni}.····.${ori}.${fin}`;
}

function lerFormDespesa(){
  const dados = {
    ano: parseInt(document.getElementById('dfAno').value, 10),
    unidade: document.getElementById('dfUnidade').value,
    descricao: document.getElementById('dfDescricao').value.trim(),
    valor: parseValorBR(document.getElementById('dfValor').value),
    origem: document.getElementById('dfOrigem').value,
    natureza: document.getElementById('dfNatureza').value,
    situacao: document.getElementById('dfSituacao').value,
    financiador: document.getElementById('dfFinanciador').value || FINANCIADOR_NENHUM,
  };
  const erros = [];
  const checar = (id, ok, msg) => { marcarInvalido(id, !ok); if(!ok) erros.push(msg); };
  checar('dfAno', dados.ano >= 2000 && dados.ano <= 2100, 'Informe um ano válido.');
  checar('dfUnidade', !!dados.unidade, 'Selecione a unidade.');
  checar('dfDescricao', dados.descricao.length > 0, 'Informe a descrição.');
  checar('dfValor', !isNaN(dados.valor) && dados.valor >= 0, 'Informe um valor válido (ex.: 12.345,67).');
  checar('dfOrigem', !!dados.origem, 'Selecione a origem.');
  checar('dfNatureza', !!dados.natureza, 'Selecione a natureza.');
  checar('dfSituacao', !!dados.situacao, 'Selecione a situação.');
  return { dados, erros };
}

async function salvarDespesa(existente){
  const { dados, erros } = lerFormDespesa();
  if(erros.length) throw new Error(erros.join(' '));
  if(existente){
    await Repo.despesas.atualizar(existente.docId, dados);
    fecharFormModal();
    mostrarToast(`Despesa ${existente.id} atualizada.`);
  } else {
    const codOrigem = codigoOrigem(dados.origem);
    if(!codOrigem) throw new Error('A origem selecionada não tem código cadastrado.');
    const id = await Repo.despesas.criar(dados, codOrigem);
    fecharFormModal();
    regFiltros.ano = dados.ano;
    mostrarToast(`Despesa registrada com o ID ${id}.`);
  }
}

async function alternarAtivoDespesa(docId, ativo){
  const d = TABELAS.despesas.find(x => x.docId === docId);
  if(!d) return;
  const msg = ativo
    ? `Reativar a despesa ${d.id}? Ela volta a contar em Totais e Detalhamento.`
    : `Inativar a despesa ${d.id}?\n\n"${d.descricao}"\n\nEla deixa de contar em Totais e Detalhamento, mas continua registrada (o ID não é reaproveitado) e pode ser reativada depois.`;
  if(!confirm(msg)) return;
  try{
    await Repo.despesas.definirAtivo(docId, ativo);
    mostrarToast(`Despesa ${d.id} ${ativo ? 'reativada' : 'inativada'}.`);
  } catch(e){
    mostrarToast(traduzirErro(e), true);
  }
}

/* ================= Importação em lote (administrador) =================
 * Cola-se o conteúdo copiado da planilha antiga (colunas, separadas por TAB):
 *   ID  Unidade  Descrição  Valor  Origem  Natureza  Situação
 * - ID válido (#AR.0001.2.0000): mantido como está (o financiador vem das 4 últimas posições);
 * - ID vazio ou com "X" (#XX.0XXX.2.0000): gerado pelo sistema, na ordem das linhas.
 */
let importAnalise = null;

function abrirImportacao(){
  importAnalise = null;
  abrirFormModal({
    titulo: 'Importar despesas',
    largo: true,
    corpo: `
      <p style="font-size:13px; line-height:1.6; margin-bottom:12px;">
        Copie as linhas da planilha e cole abaixo, com as colunas nesta ordem:
        <strong>ID, Unidade, Descrição, Valor, Origem, Natureza, Situação</strong>.
        IDs válidos são mantidos; IDs vazios ou com "X" (ex.: <code>#XX.0XXX.2.0000</code>) são gerados pelo sistema.
        Linhas já existentes no ano (mesmo ID ou, sem ID, mesma unidade, descrição, valor e origem) são ignoradas, então é seguro importar de novo.
      </p>
      <div class="form-grid" style="margin-bottom:12px;">
        <div class="form-field">
          <label for="impAno">Ano de referência das despesas</label>
          <input type="number" id="impAno" min="2000" max="2100" value="${regFiltros.ano || new Date().getFullYear()}">
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
  const texto = document.getElementById('impTexto').value;
  const linhasBrutas = texto.split(/\r?\n/).filter(l => l.trim());
  const porNome = {};
  TABELAS.unidades.forEach(u => { porNome[normalizarTexto(u.nome)] = u; });
  const doAno = TABELAS.despesas.filter(d => d.ano === ano);
  const existentes = new Set(doAno.map(d => d.id));
  // linhas sem ID já importadas antes: mesma unidade, descrição, valor e origem no ano
  const assinatura = (uni, desc, valor, origem) => [uni, normalizarTexto(desc), Number(valor).toFixed(2), origem].join('|');
  const jaImportadas = new Set(doAno.map(d => assinatura(d.unidade, d.descricao, d.valor, d.origem)));
  const vistos = new Set();
  const normalizarLista = (valor, lista) => lista.find(x => normalizarTexto(x) === normalizarTexto(valor)) || null;

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
    const natureza = normalizarLista(naturezaTxt, NATUREZAS);
    if(!natureza) r.erros.push(`Natureza "${naturezaTxt}" inválida.`);
    const situacao = normalizarLista(situacaoTxt, SITUACOES);
    if(!situacao) r.erros.push(`Situação "${situacaoTxt}" inválida.`);
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
      origem: ori && ori.sigla, origemCodigo: ori && ori.codigo,
      natureza, situacao, financiador,
    };
    if(r.erros.length) r.status = 'erro';
    else if(m && existentes.has(idTxt)) r.status = 'ignorar';
    else if(!m && jaImportadas.has(assinatura(uni.codigo, descricao, valor, ori.sigla))){
      r.status = 'ignorar';
      r.avisos.push('Já existe despesa igual (unidade, descrição, valor e origem) neste ano.');
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
        ? `Serão gravadas ${conta('ok') + conta('gerar')} despesa(s) em ${ano}. Linhas com erro ou já existentes ficam de fora.`
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
  regFiltros.ano = validas[0].ano;
  document.getElementById('formModalSalvar').style.display = 'none';
  document.getElementById('impNota').innerHTML =
    `<strong>Importação concluída:</strong> ${res.gravadas} despesa(s) gravada(s)` +
    (res.geradas.length ? `, das quais ${res.geradas.length} com ID gerado agora` : '') +
    (res.ignoradas.length ? `; ${res.ignoradas.length} ignorada(s) por já existirem` : '') + '.' +
    (res.geradas.length ? `<br><br>IDs gerados:<br>${res.geradas.map(g =>
      `<span class="id-cell">${escapeHtml(g.id)}</span> · ${escapeHtml(nomeUnidade(g.linha.unidade))} · ${escapeHtml(g.linha.descricao)}`).join('<br>')}` : '');
  mostrarToast(`Importação concluída: ${res.gravadas} despesa(s).`);
}
