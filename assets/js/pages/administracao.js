/* ================= Telas de administração (somente perfil administrador) =================
 * Financiadores · Unidades e Origens · Usuários
 */

/* ---------------- Financiadores ---------------- */
let finFiltros = { busca: '', inativos: false };

function renderFinanciadores(){
  const el = document.getElementById('contentFinanciadores');
  if(!el || !podeVerPagina('financiadores')) return;
  if(TABELAS_ERRO.financiadores){ el.innerHTML = estadoErro(TABELAS_ERRO.financiadores); return; }
  if(!TABELAS_CARREGADAS.financiadores){ el.innerHTML = estadoCarregando('Carregando financiadores…'); return; }

  el.innerHTML = `
    <div class="filter-bar">
      <div class="filter-field" style="min-width:240px;">
        <label>Buscar</label>
        <input type="text" id="ffBusca" placeholder="Código ou descrição…" value="${escapeAttr(finFiltros.busca)}" oninput="finFiltros.busca=this.value; renderFinanciadoresTabela()">
      </div>
      <label class="filter-check"><input type="checkbox" ${finFiltros.inativos ? 'checked' : ''} onchange="finFiltros.inativos=this.checked; renderFinanciadoresTabela()"> Mostrar inativos</label>
    </div>
    <div class="result-count" id="finContagem"></div>
    <div class="panel">
      <table class="tabela-cartoes">
        <thead><tr>
          <th style="width:110px;">Código</th><th>Descrição</th><th class="th-center" style="width:120px;">Situação</th><th class="th-center" style="width:190px;">Ações</th>
        </tr></thead>
        <tbody id="finBody"></tbody>
      </table>
    </div>`;
  renderFinanciadoresTabela();
}
aoMudarDadosRegistrar(['financiadores'], renderFinanciadores);

function renderFinanciadoresTabela(){
  const body = document.getElementById('finBody');
  if(!body) return;
  const busca = finFiltros.busca.trim().toLowerCase();
  const lista = financiadoresOrdenados(false).filter(f =>
    (finFiltros.inativos || f.ativo) && (!busca || (f.codigo + ' ' + f.descricao).toLowerCase().includes(busca)));
  const usos = {};
  TABELAS.despesas.forEach(d => { usos[d.financiador] = (usos[d.financiador] || 0) + 1; });
  document.getElementById('finContagem').textContent =
    `${lista.length} exibido(s) · o código 000 é reservado para "sem financiador"`;
  body.innerHTML = lista.map(f => `
    <tr class="${f.ativo ? '' : 'linha-inativa'}">
      <td class="id-cell">${escapeHtml(f.codigo)}</td>
      <td class="desc-cell" style="max-width:none;">${escapeHtml(f.descricao)}${usos[f.codigo] ? ` <span class="muted" style="font-size:11.5px;">· ${usos[f.codigo]} despesa(s)</span>` : ''}</td>
      <td style="text-align:center;">${f.ativo ? '<span class="tag-ativa">Ativo</span>' : '<span class="tag-inativa" style="margin:0;">Inativo</span>'}</td>
      <td><div class="linha-acoes" style="justify-content:center;">
        <button class="linha-btn" onclick="abrirFormFinanciador('${escapeAttr(f.codigo)}')">Editar</button>
        <button class="linha-btn ${f.ativo ? 'perigo' : ''}" onclick="alternarAtivoFinanciador('${escapeAttr(f.codigo)}', ${!f.ativo})">${f.ativo ? 'Inativar' : 'Reativar'}</button>
      </div></td>
    </tr>`).join('') || `<tr><td colspan="4" class="muted" style="padding:24px 26px;">Nenhum financiador cadastrado.</td></tr>`;
}

function abrirFormFinanciador(codigo){
  const f = codigo ? TABELAS.financiadores.find(x => x.codigo === codigo) : null;
  abrirFormModal({
    titulo: f ? 'Editar financiador' : 'Novo financiador',
    corpo: `
      <div class="form-grid">
        <div class="form-field">
          <label for="ffCodigo">Código</label>
          <input type="text" id="ffCodigo" maxlength="3" inputmode="numeric" placeholder="001" value="${f ? escapeAttr(f.codigo) : ''}" ${f ? 'disabled' : ''}>
          <span class="ajuda">3 dígitos. Compõe o 4º bloco do ID da despesa e não pode ser alterado depois.</span>
        </div>
        <div class="form-field span-2">
          <label for="ffDescricao">Descrição</label>
          <input type="text" id="ffDescricao" maxlength="200" placeholder="Ex.: Dep. Fulano de Tal (emenda individual)" value="${f ? escapeAttr(f.descricao) : ''}">
        </div>
      </div>`,
    aoSalvar: async () => {
      const descricao = document.getElementById('ffDescricao').value.trim();
      marcarInvalido('ffDescricao', !descricao);
      if(f){
        if(!descricao) throw new Error('Informe a descrição.');
        await Repo.financiadores.atualizar(f.codigo, { descricao });
        fecharFormModal(); mostrarToast(`Financiador ${f.codigo} atualizado.`);
      } else {
        const cod = document.getElementById('ffCodigo').value.trim();
        const codOk = /^\d{3}$/.test(cod) && cod !== FINANCIADOR_NENHUM;
        marcarInvalido('ffCodigo', !codOk);
        if(!codOk) throw new Error('O código deve ter exatamente 3 dígitos e não pode ser 000.');
        if(!descricao) throw new Error('Informe a descrição.');
        await Repo.financiadores.criar(cod, descricao);
        fecharFormModal(); mostrarToast(`Financiador ${cod} cadastrado.`);
      }
    },
  });
  if(f && f.codigo) anexarHistorico('financiadores', f && f.codigo);
}

async function alternarAtivoFinanciador(codigo, ativo){
  if(!ativo && !confirm(`Inativar o financiador ${codigo}? Ele deixa de aparecer para novas despesas, mas as despesas que já o usam não mudam.`)) return;
  try{
    await Repo.financiadores.atualizar(codigo, { ativo });
    mostrarToast(`Financiador ${codigo} ${ativo ? 'reativado' : 'inativado'}.`);
  } catch(e){ mostrarToast(traduzirErro(e), true); }
}

/* ---------------- Unidades e Origens ---------------- */
function renderTabelasApoio(){
  const el = document.getElementById('contentTabelas');
  if(!el || !podeVerPagina('tabelas')) return;
  if(TABELAS_ERRO.unidades || TABELAS_ERRO.origens){ el.innerHTML = estadoErro(TABELAS_ERRO.unidades || TABELAS_ERRO.origens); return; }
  if(!TABELAS_CARREGADAS.unidades || !TABELAS_CARREGADAS.origens){ el.innerHTML = estadoCarregando(); return; }

  const vazias = !TABELAS.unidades.length && !TABELAS.origens.length;
  const usosUni = {}, usosOri = {};
  TABELAS.despesas.forEach(d => { usosUni[d.unidade] = (usosUni[d.unidade] || 0) + 1; usosOri[d.origem] = (usosOri[d.origem] || 0) + 1; });

  el.innerHTML = `
    ${vazias ? `<div class="aviso-box">
      <span>As tabelas ainda estão vazias. Carregue os valores extraídos dos IDs já existentes (24 unidades e 6 origens).
      Cajazeiras e LOA ficam de fora porque ainda não têm código — cadastre-os em seguida.</span>
      <button class="acao-btn" onclick="carregarTabelasIniciais()">Carregar valores iniciais</button>
    </div>` : ''}
    <div class="cad-grid">
      <div>
        <div class="cad-section-head">
          <h2>Unidades</h2>
          <button class="acao-btn" onclick="abrirFormUnidade()">+ Nova unidade</button>
        </div>
        <div class="panel">
          <table>
            <thead><tr><th style="width:80px;">Código</th><th>Nome</th><th class="th-center">UG</th><th class="th-center">Despesas</th><th class="th-center">Ações</th></tr></thead>
            <tbody>${unidadesOrdenadas(false).map(u => `
              <tr class="${u.ativo ? '' : 'linha-inativa'}">
                <td class="id-cell">${escapeHtml(u.codigo)}</td>
                <td>${escapeHtml(u.nome)}${u.ativo ? '' : '<span class="tag-inativa">Inativa</span>'}</td>
                <td style="text-align:center;" class="id-cell">${escapeHtml(u.ug) || '<span class="muted">—</span>'}</td>
                <td style="text-align:center;">${usosUni[u.codigo] || '—'}</td>
                <td><div class="linha-acoes" style="justify-content:center;">
                  <button class="linha-btn" onclick="abrirFormUnidade('${escapeAttr(u.codigo)}')">Editar</button>
                  <button class="linha-btn ${u.ativo ? 'perigo' : ''}" onclick="alternarAtivoUnidade('${escapeAttr(u.codigo)}', ${!u.ativo})">${u.ativo ? 'Inativar' : 'Reativar'}</button>
                </div></td>
              </tr>`).join('') || `<tr><td colspan="5" class="muted" style="padding:20px 26px;">Nenhuma unidade cadastrada.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="cad-section-head">
          <h2>Origens</h2>
          <button class="acao-btn" onclick="abrirFormOrigem()">+ Nova origem</button>
        </div>
        <div class="panel">
          <table>
            <thead><tr><th>Sigla</th><th class="th-center">Código no ID</th><th class="th-center">RP (SIAFI)</th><th class="th-center">Despesas</th><th class="th-center">Ações</th></tr></thead>
            <tbody>${origensOrdenadas(false).map(o => `
              <tr class="${o.ativo ? '' : 'linha-inativa'}">
                <td><span class="badge ${origemBadgeClass(o.sigla)}">${escapeHtml(o.sigla)}</span>${o.ativo ? '' : '<span class="tag-inativa">Inativa</span>'}</td>
                <td class="id-cell" style="text-align:center;">${escapeHtml(o.codigo)}</td>
                <td style="text-align:center;">${o.rp ? 'RP ' + escapeHtml(o.rp) : '<span class="muted">—</span>'}</td>
                <td style="text-align:center;">${usosOri[o.sigla] || '—'}</td>
                <td><div class="linha-acoes" style="justify-content:center;">
                  <button class="linha-btn" onclick="abrirFormOrigem('${escapeAttr(o.sigla)}')">Editar</button>
                  <button class="linha-btn ${o.ativo ? 'perigo' : ''}" onclick="alternarAtivoOrigem('${escapeAttr(o.sigla)}', ${!o.ativo})">${o.ativo ? 'Inativar' : 'Reativar'}</button>
                </div></td>
              </tr>`).join('') || `<tr><td colspan="5" class="muted" style="padding:20px 26px;">Nenhuma origem cadastrada.</td></tr>`}
            </tbody>
          </table>
        </div>
        <p class="result-count" style="margin-top:10px;">Sigla e código não mudam depois de criados, porque fazem parte dos IDs. Uma origem inativa deixa de aparecer para novas despesas.</p>

        <div class="cad-section-head" style="margin-top:28px;">
          <h2>Ações do orçamento</h2>
          <button class="acao-btn" onclick="abrirFormAcao()">+ Nova ação</button>
        </div>
        <div class="panel">
          <table>
            <thead><tr><th>Código</th><th>Descrição</th><th class="th-center">Ações</th></tr></thead>
            <tbody>${acoesOrdenadas(false).map(a => `
              <tr class="${a.ativo ? '' : 'linha-inativa'}">
                <td class="id-cell">${escapeHtml(a.codigo)}</td>
                <td>${escapeHtml(a.descricao)}${a.ativo ? '' : '<span class="tag-inativa">Inativa</span>'}</td>
                <td><div class="linha-acoes" style="justify-content:center;">
                  <button class="linha-btn" onclick="abrirFormAcao('${escapeAttr(a.codigo)}')">Editar</button>
                  <button class="linha-btn ${a.ativo ? 'perigo' : ''}" onclick="alternarAtivoAcao('${escapeAttr(a.codigo)}', ${!a.ativo})">${a.ativo ? 'Inativar' : 'Reativar'}</button>
                </div></td>
              </tr>`).join('') || `<tr><td colspan="3" class="muted" style="padding:20px 26px;">Nenhuma ação cadastrada.</td></tr>`}
            </tbody>
          </table>
        </div>

        <div class="cad-section-head" style="margin-top:28px;">
          <h2>PTRES</h2>
          <button class="acao-btn" onclick="abrirFormPtres()" ${TABELAS.acoes.length ? '' : 'disabled title="Cadastre uma ação antes"'}>+ Novo PTRES</button>
        </div>
        <div class="panel">
          <table>
            <thead><tr><th>PTRES</th><th>Ação</th><th>Descrição</th><th class="th-center">Ações</th></tr></thead>
            <tbody>${ptresOrdenados(false).map(pt => `
              <tr class="${pt.ativo ? '' : 'linha-inativa'}">
                <td class="id-cell">${escapeHtml(pt.codigo)}</td>
                <td class="id-cell">${escapeHtml(pt.acao)}</td>
                <td>${escapeHtml(pt.descricao)}${pt.ativo ? '' : '<span class="tag-inativa">Inativo</span>'}</td>
                <td><div class="linha-acoes" style="justify-content:center;">
                  <button class="linha-btn" onclick="abrirFormPtres('${escapeAttr(pt.codigo)}')">Editar</button>
                  <button class="linha-btn ${pt.ativo ? 'perigo' : ''}" onclick="alternarAtivoPtres('${escapeAttr(pt.codigo)}', ${!pt.ativo})">${pt.ativo ? 'Inativar' : 'Reativar'}</button>
                </div></td>
              </tr>`).join('') || `<tr><td colspan="4" class="muted" style="padding:20px 26px;">Nenhum PTRES cadastrado.</td></tr>`}
            </tbody>
          </table>
        </div>
        <p class="result-count" style="margin-top:10px;">Cada PTRES pertence a uma ação. Nos lançamentos escolhe-se o PTRES, e a ação vem junto.</p>
      </div>
    </div>
    ${secaoPosicoes()}`;
}

/* ---------- tabela de posições das unidades no ID (por ano) ---------- */
let posAno = new Date().getFullYear();
function secaoPosicoes(){
  const pos = posicoesDoAno(posAno);
  const anos = [...new Set([new Date().getFullYear(), new Date().getFullYear() + 1, ...TABELAS.posicoes.map(p => p.ano)])].sort((a, b) => b - a);
  const fora = unidadesOrdenadas(true).filter(u => u.codigo !== 'IF' && (!pos || !pos.includes(u.codigo)));
  const hex = pos ? Math.ceil(pos.length / 4) : 0;
  return `
    <div class="cad-section-head" style="margin-top:32px;">
      <h2>Posições das unidades no ID (beneficiárias)</h2>
      <div class="filter-field" style="min-width:110px;"><select onchange="posAno=parseInt(this.value,10); renderTabelasApoio()">${opcoesSelect(anos.map(String), String(posAno))}</select></div>
    </div>
    <p class="form-nota">Ordem das unidades no bloco hexadecimal do ID das despesas de ${posAno}. Cada caractere representa 4 unidades: a 1ª da tabela é o bit mais à esquerda do 1º caractere. <strong>Posições não mudam depois de criadas</strong>; unidades novas entram no fim.</p>
    ${pos ? `
      <div class="panel"><table>
        <thead><tr><th class="th-center">Posição</th><th class="th-center">Caractere</th><th class="th-center">Bit</th><th>Unidade</th></tr></thead>
        <tbody>${pos.map((c, i) => `<tr><td style="text-align:center;">${i + 1}</td><td style="text-align:center;">${Math.floor(i / 4) + 1}º</td>
          <td style="text-align:center;" class="id-cell">${[8, 4, 2, 1][i % 4]}</td><td>${escapeHtml(nomeUnidade(c))} <span class="muted">(${escapeHtml(c)})</span></td></tr>`).join('')}</tbody>
      </table></div>
      <p class="result-count" style="margin-top:8px;">${pos.length} unidade(s) · bloco de ${hex} caractere(s). Para ler um caractere, some os bits das unidades beneficiadas do grupo (ex.: 8 + 1 = 9).</p>
      ${fora.length ? `<div class="filter-bar" style="margin-top:10px;"><div class="filter-field"><label>Acrescentar ao fim</label>
        <select id="posNova">${opcoesSelect(fora.map(u => ({ valor: u.codigo, texto: u.nome })), '')}</select></div>
        <button class="acao-btn" onclick="acrescentarPosicao()">Acrescentar</button></div>` : ''}`
    : `<div class="aviso-box"><span>Ainda não há tabela de posições de ${posAno}. Ela será criada com as unidades ativas (sem "- Institucional -"), em ordem alfabética. Confira antes: depois de criada, a ordem não muda.</span>
        <button class="acao-btn" onclick="criarPosicoes()">Criar tabela de ${posAno}</button></div>`}`;
}
async function criarPosicoes(){
  const lista = unidadesOrdenadas(true).filter(u => u.codigo !== 'IF').map(u => u.codigo);
  if(!confirm(`Criar a tabela de ${posAno} com ${lista.length} unidades nesta ordem?\n\n${lista.map((c, i) => `${i + 1}. ${nomeUnidade(c)}`).join('\n')}`)) return;
  try{ await Repo.posicoes.criar(posAno, lista); mostrarToast(`Tabela de posições de ${posAno} criada.`); } catch(e){ mostrarToast(traduzirErro(e), true); }
}
async function acrescentarPosicao(){
  const c = document.getElementById('posNova').value;
  try{ await Repo.posicoes.acrescentar(posAno, c); mostrarToast(`${nomeUnidade(c)} acrescentada ao fim da tabela de ${posAno}.`); } catch(e){ mostrarToast(traduzirErro(e), true); }
}

/* ---------- ações do orçamento ---------- */
function abrirFormAcao(codigo){
  const a = codigo ? TABELAS.acoes.find(x => x.codigo === codigo) : null;
  abrirFormModal({
    titulo: a ? 'Editar ação do orçamento' : 'Nova ação do orçamento',
    corpo: `
      <div class="form-grid">
        <div class="form-field"><label for="faCodigo">Código</label>
          <input type="text" id="faCodigo" maxlength="8" placeholder="Ex.: 20RL" style="text-transform:uppercase;" value="${a ? escapeAttr(a.codigo) : ''}" ${a ? 'disabled' : ''}>
          <span class="ajuda">Letras e números (2 a 8). Não muda depois de criado.</span></div>
        <div class="form-field span-2"><label for="faDesc">Descrição</label>
          <input type="text" id="faDesc" maxlength="200" placeholder="Ex.: Funcionamento de Instituições Federais de Educação Profissional e Tecnológica" value="${a ? escapeAttr(a.descricao) : ''}"></div>
      </div>
      ${a && a.criadoPor ? `<div class="auditoria">Criada por ${escapeHtml(a.criadoPor)} em ${fmtDataHora(a.criadoEm)}<br>Última alteração por ${escapeHtml(a.atualizadoPor)} em ${fmtDataHora(a.atualizadoEm)}</div>` : ''}
      ${a ? blocoHistorico('acoes', a.codigo) : ''}`,
    aoSalvar: async () => {
      const descricao = document.getElementById('faDesc').value.trim();
      marcarInvalido('faDesc', !descricao);
      if(!descricao) throw new Error('Informe a descrição.');
      if(a){ await Repo.acoes.atualizar(a.codigo, { descricao }); fecharFormModal(); mostrarToast(`Ação ${a.codigo} atualizada.`); return; }
      const cod = document.getElementById('faCodigo').value.trim().toUpperCase();
      const ok = /^[0-9A-Z]{2,8}$/.test(cod);
      marcarInvalido('faCodigo', !ok);
      if(!ok) throw new Error('O código deve ter de 2 a 8 letras ou números.');
      await Repo.acoes.criar(cod, descricao);
      fecharFormModal(); mostrarToast(`Ação ${cod} cadastrada.`);
    },
  });
  if(a) carregarHistorico('acoes', a.codigo);
}
async function alternarAtivoAcao(codigo, ativo){
  if(!ativo && !confirm(`Inativar a ação ${codigo}? Ela deixa de aparecer em novos lançamentos.`)) return;
  try{ await Repo.acoes.atualizar(codigo, { ativo }); mostrarToast(`Ação ${codigo} ${ativo ? 'reativada' : 'inativada'}.`); } catch(e){ mostrarToast(traduzirErro(e), true); }
}
aoMudarDadosRegistrar(['unidades', 'origens', 'acoes', 'ptres', 'posicoes', 'despesas'], renderTabelasApoio);

async function carregarTabelasIniciais(){
  try{
    await Repo.carregarTabelasIniciais();
    mostrarToast('Tabelas de unidades e origens carregadas.');
  } catch(e){ mostrarToast(traduzirErro(e), true); }
}

function abrirFormUnidade(codigo){
  const u = codigo ? TABELAS.unidades.find(x => x.codigo === codigo) : null;
  abrirFormModal({
    titulo: u ? 'Editar unidade' : 'Nova unidade',
    corpo: `
      <div class="form-grid">
        <div class="form-field">
          <label for="fuCodigo">Código</label>
          <input type="text" id="fuCodigo" maxlength="2" placeholder="AR" style="text-transform:uppercase;" value="${u ? escapeAttr(u.codigo) : ''}" ${u ? 'disabled' : ''}>
          <span class="ajuda">2 letras. Início do ID das despesas; não pode ser alterado depois.</span>
        </div>
        <div class="form-field span-2">
          <label for="fuNome">Nome</label>
          <input type="text" id="fuNome" maxlength="80" placeholder="Ex.: Cajazeiras" value="${u ? escapeAttr(u.nome) : ''}">
          <span class="ajuda">É o nome mostrado em Totais e Detalhamento e o usado para reconhecer a unidade na importação.</span>
        </div>
        <div class="form-field">
          <label for="fuUg">UG (SIAFI)</label>
          <input type="text" id="fuUg" maxlength="6" inputmode="numeric" placeholder="158xxx" value="${u ? escapeAttr(u.ug) : ''}">
          <span class="ajuda">Código da unidade gestora, com 6 dígitos. Usado para cruzar com o Tesouro Gerencial.</span>
        </div>
      </div>`,
    aoSalvar: async () => {
      const nome = document.getElementById('fuNome').value.trim();
      const ug = document.getElementById('fuUg').value.trim();
      marcarInvalido('fuUg', ug && !/^\d{6}$/.test(ug));
      if(ug && !/^\d{6}$/.test(ug)) throw new Error('A UG deve ter 6 dígitos.');
      const ugRep = ug && TABELAS.unidades.find(x => x.ug === ug && (!u || x.codigo !== u.codigo));
      if(ugRep) throw new Error(`A UG ${ug} já está na unidade ${ugRep.nome}.`);
      marcarInvalido('fuNome', !nome);
      if(!nome) throw new Error('Informe o nome da unidade.');
      const repetido = TABELAS.unidades.find(x => normalizarTexto(x.nome) === normalizarTexto(nome) && (!u || x.codigo !== u.codigo));
      if(repetido) throw new Error(`Já existe a unidade "${repetido.nome}" (${repetido.codigo}).`);
      if(u){
        await Repo.unidades.atualizar(u.codigo, { nome, ug });
        fecharFormModal(); mostrarToast(`Unidade ${u.codigo} atualizada.`);
      } else {
        const cod = document.getElementById('fuCodigo').value.trim().toUpperCase();
        marcarInvalido('fuCodigo', !/^[A-Z]{2}$/.test(cod));
        if(!/^[A-Z]{2}$/.test(cod)) throw new Error('O código deve ter exatamente 2 letras.');
        await Repo.unidades.criar(cod, nome, ug);
        fecharFormModal(); mostrarToast(`Unidade ${nome} (${cod}) cadastrada.`);
      }
    },
  });
  if(u && u.codigo) anexarHistorico('unidades', u && u.codigo);
}

async function alternarAtivoUnidade(codigo, ativo){
  if(!ativo && !confirm(`Inativar a unidade ${nomeUnidade(codigo)}? Ela deixa de aparecer para novas despesas; as despesas existentes não mudam.`)) return;
  try{
    await Repo.unidades.atualizar(codigo, { ativo });
    mostrarToast(`Unidade ${codigo} ${ativo ? 'reativada' : 'inativada'}.`);
  } catch(e){ mostrarToast(traduzirErro(e), true); }
}

function abrirFormOrigem(sigla){
  const o = sigla ? TABELAS.origens.find(x => x.sigla === sigla) : null;
  abrirFormModal({
    titulo: o ? `Origem ${o.sigla}` : 'Nova origem',
    corpo: `
      <div class="form-grid">
        <div class="form-field">
          <label for="foSigla">Sigla</label>
          <input type="text" id="foSigla" maxlength="6" placeholder="LOA" style="text-transform:uppercase;" value="${o ? escapeAttr(o.sigla) : ''}" ${o ? 'disabled' : ''}>
        </div>
        <div class="form-field">
          <label for="foCodigo">Código no ID</label>
          <input type="text" id="foCodigo" maxlength="1" placeholder="Ex.: 2, R, P" style="text-transform:uppercase;" value="${o ? escapeAttr(o.codigo) : ''}" ${o ? 'disabled' : ''}>
          <span class="ajuda">1 caractere, único entre as origens; não muda depois de criado. Já usados: ${origensOrdenadas(false).map(x => `${x.codigo} (${x.sigla})`).join(', ') || 'nenhum'}.</span>
        </div>
        <div class="form-field">
          <label for="foRp">Resultado primário no SIAFI</label>
          <input type="text" id="foRp" maxlength="1" inputmode="numeric" placeholder="Ex.: 2" value="${o ? escapeAttr(o.rp) : ''}">
          <span class="ajuda">O SIAFI não distingue LOA, EFQ e RTC (todas RP 2): essas origens existem só no GEDI. O RP serve para conferir os dados importados.</span>
        </div>
      </div>`,
    aoSalvar: async () => {
      const rp = document.getElementById('foRp').value.trim();
      marcarInvalido('foRp', rp && !/^\d$/.test(rp));
      if(rp && !/^\d$/.test(rp)) throw new Error('O resultado primário é 1 dígito.');
      if(o){ await Repo.origens.atualizar(o.sigla, { rp }); fecharFormModal(); mostrarToast(`Origem ${o.sigla} atualizada.`); return; }
      const sg = document.getElementById('foSigla').value.trim().toUpperCase();
      const codigo = document.getElementById('foCodigo').value.trim().toUpperCase();
      const siglaOk = /^[A-Z0-9]{2,6}$/.test(sg), codOk = /^[0-9A-Z]$/.test(codigo);
      marcarInvalido('foSigla', !siglaOk); marcarInvalido('foCodigo', !codOk);
      if(!siglaOk) throw new Error('A sigla deve ter de 2 a 6 letras/números.');
      if(!codOk) throw new Error('O código deve ser 1 número ou letra.');
      await Repo.origens.criar(sg, codigo, rp);
      fecharFormModal(); mostrarToast(`Origem ${sg} cadastrada com o código ${codigo}.`);
    },
  });
  if(o) anexarHistorico('origens', o.sigla);
}

async function alternarAtivoOrigem(sigla, ativo){
  if(!ativo && !confirm(`Inativar a origem ${sigla}? Ela deixa de aparecer para novas despesas; as despesas existentes não mudam.`)) return;
  try{
    await Repo.origens.atualizar(sigla, { ativo });
    mostrarToast(`Origem ${sigla} ${ativo ? 'reativada' : 'inativada'}.`);
  } catch(e){ mostrarToast(traduzirErro(e), true); }
}

/* ---------------- Usuários ---------------- */
let usuBusca = '';

function renderUsuarios(){
  const el = document.getElementById('contentUsuarios');
  if(!el || !podeVerPagina('usuarios')) return;
  if(TABELAS_ERRO.usuarios){ el.innerHTML = estadoErro(TABELAS_ERRO.usuarios); return; }
  if(!TABELAS_CARREGADAS.usuarios){ el.innerHTML = estadoCarregando('Carregando usuários…'); return; }

  const legados = TABELAS.usuarios.filter(u => u.legado).length;
  el.innerHTML = `
    ${legados ? `<div class="aviso-box"><span>${legados} usuário(s) ainda usam o cadastro antigo (grupo "completo"/"limitado").
      Eles continuam acessando normalmente, com os perfis equivalentes. Abra e salve cada um para gravar os perfis novos.</span></div>` : ''}
    <div class="filter-bar">
      <div class="filter-field" style="min-width:260px;">
        <label>Buscar</label>
        <input type="text" placeholder="E-mail…" value="${escapeAttr(usuBusca)}" oninput="usuBusca=this.value; renderUsuariosTabela()">
      </div>
    </div>
    <div class="result-count" id="usuContagem"></div>
    <div class="panel">
      <table>
        <thead><tr><th>E-mail</th><th>Perfis</th><th>Última alteração</th><th class="th-center">Ações</th></tr></thead>
        <tbody id="usuBody"></tbody>
      </table>
    </div>`;
  renderUsuariosTabela();
}
aoMudarDadosRegistrar(['usuarios', 'unidades'], renderUsuarios);

function renderUsuariosTabela(){
  const body = document.getElementById('usuBody');
  if(!body) return;
  const eu = (firebase.auth().currentUser || {}).email || '';
  const busca = usuBusca.trim().toLowerCase();
  const lista = TABELAS.usuarios.filter(u => !busca || u.email.includes(busca)).sort((a, b) => a.email.localeCompare(b.email));
  document.getElementById('usuContagem').textContent = `${lista.length} usuário(s)`;
  body.innerHTML = lista.map(u => `
    <tr>
      <td>${escapeHtml(u.email)}${u.email === eu.toLowerCase() ? ' <span class="muted" style="font-size:11.5px;">(você)</span>' : ''}</td>
      <td>${u.perfis.map(p => `<span class="perfil-chip">${escapeHtml(PERFIS[p] || p)}</span>`).join('')}
          ${u.perfis.includes('registrador_despesas') && u.unidades.length ? `<div class="muted" style="font-size:11.5px; margin-top:3px;">Unidades: ${u.unidades.map(c => escapeHtml(nomeUnidade(c))).join(', ')}</div>` : ''}
          ${u.legado ? `<span class="perfil-chip legado">cadastro antigo: ${escapeHtml(u.legado)}</span>` : ''}</td>
      <td class="muted" style="font-size:12px;">${u.atualizadoPor ? `${escapeHtml(u.atualizadoPor)}<br>${fmtDataHora(u.atualizadoEm)}` : '—'}</td>
      <td><div class="linha-acoes" style="justify-content:center;">
        <button class="linha-btn" onclick="abrirFormUsuario('${escapeAttr(u.email)}')">Editar</button>
        ${u.email === eu.toLowerCase() ? '' : `<button class="linha-btn perigo" onclick="removerUsuario('${escapeAttr(u.email)}')">Remover</button>`}
      </div></td>
    </tr>`).join('') || `<tr><td colspan="4" class="muted" style="padding:24px 26px;">Nenhum usuário encontrado.</td></tr>`;
}

const DESCRICAO_PERFIS = {
  administrador: 'Tudo, inclusive usuários, financiadores, tabelas e importações.',
  gestor_planejamento: 'Analisa as despesas (defere ou indefere), registra e edita; vê as telas orçamentárias.',
  registrador_despesas: 'Registra despesas das unidades marcadas abaixo e as edita enquanto não forem analisadas.',
  leitor_orcamentario_financeiro: 'Consulta Formação do Orçamento e as telas de Despesas (Lista e Totais).',
  leitor_recursos_humanos: 'Consulta Estrutura Organizacional e Funções Gratificadas.',
};

function abrirFormUsuario(email){
  const u = email ? TABELAS.usuarios.find(x => x.email === email) : null;
  const eu = ((firebase.auth().currentUser || {}).email || '').toLowerCase();
  const atuais = u ? u.perfis : [];
  abrirFormModal({
    titulo: u ? 'Editar usuário' : 'Novo usuário',
    corpo: `
      <div class="form-grid">
        <div class="form-field span-2">
          <label for="fuEmail">E-mail institucional</label>
          <input type="email" id="fuEmail" placeholder="nome.sobrenome@ifpb.edu.br" value="${u ? escapeAttr(u.email) : ''}" ${u ? 'disabled' : ''}>
          <span class="ajuda">O login é feito com a conta Google deste e-mail.</span>
        </div>
        <div class="form-field span-2">
          <label>Perfis (pode marcar mais de um)</label>
          <div class="form-checks">
            ${Object.keys(PERFIS).map(p => `
              <label><input type="checkbox" name="fuPerfil" value="${p}" ${atuais.includes(p) ? 'checked' : ''}
                ${p === 'registrador_despesas' ? `onchange="document.getElementById('fuUnidadesBloco').style.display=this.checked?'':'none'"` : ''}
                ${u && u.email === eu && p === 'administrador' ? 'disabled' : ''}>
                <span>${escapeHtml(PERFIS[p])}<small>${escapeHtml(DESCRICAO_PERFIS[p])}${u && u.email === eu && p === 'administrador' ? ' Você não pode remover este perfil de si mesmo.' : ''}</small></span>
              </label>`).join('')}
          </div>
        </div>
        <div class="form-field span-2" id="fuUnidadesBloco" style="${atuais.includes('registrador_despesas') ? '' : 'display:none;'}">
          <label>Unidades em que pode registrar despesas</label>
          <div class="checkbox-group checkbox-group-scroll" style="max-width:none;">
            ${unidadesOrdenadas(true).map(x => `<label class="checkbox-item"><input type="checkbox" name="fuUnidade" value="${x.codigo}" ${(u && u.unidades.includes(x.codigo)) ? 'checked' : ''}> ${escapeHtml(x.nome)}</label>`).join('')}
          </div>
        </div>
      </div>`,
    aoSalvar: async () => {
      const mail = u ? u.email : document.getElementById('fuEmail').value.trim().toLowerCase();
      const okMail = /^[^\s@]+@ifpb\.edu\.br$/.test(mail);
      marcarInvalido('fuEmail', !okMail);
      if(!okMail) throw new Error('Informe um e-mail @ifpb.edu.br válido.');
      if(!u && TABELAS.usuarios.some(x => x.email === mail)) throw new Error('Este e-mail já está cadastrado.');
      const perfis = [...document.querySelectorAll('input[name="fuPerfil"]')].filter(c => c.checked).map(c => c.value);
      if(!perfis.length) throw new Error('Marque pelo menos um perfil.');
      const unidades = [...document.querySelectorAll('input[name="fuUnidade"]')].filter(c => c.checked).map(c => c.value);
      if(perfis.includes('registrador_despesas') && !unidades.length) throw new Error('Marque ao menos uma unidade para o registrador.');
      await Repo.usuarios.salvar(mail, perfis, unidades, !u);
      fecharFormModal();
      mostrarToast(u ? `Perfis de ${mail} atualizados.` : `${mail} cadastrado.`);
    },
  });
  if(u && u.email) anexarHistorico('usuarios', u && u.email);
}

async function removerUsuario(email){
  if(!confirm(`Remover o acesso de ${email} ao GEDI?`)) return;
  try{
    await Repo.usuarios.excluir(email);
    mostrarToast(`${email} removido.`);
  } catch(e){ mostrarToast(traduzirErro(e), true); }
}

/* ---------- PTRES ---------- */
function abrirFormPtres(codigo){
  const pt = codigo ? TABELAS.ptres.find(x => x.codigo === codigo) : null;
  const acoes = acoesOrdenadas(false).filter(a => a.ativo || (pt && pt.acao === a.codigo)).map(a => ({ valor: a.codigo, texto: `${a.codigo} · ${a.descricao}` }));
  abrirFormModal({
    titulo: pt ? `PTRES ${pt.codigo}` : 'Novo PTRES',
    corpo: `
      <div class="form-grid">
        <div class="form-field"><label for="fpCodigo">PTRES</label>
          <input type="text" id="fpCodigo" maxlength="8" inputmode="numeric" placeholder="Ex.: 169970" value="${pt ? escapeAttr(pt.codigo) : ''}" ${pt ? 'disabled' : ''}>
          <span class="ajuda">Somente números (4 a 8). Não muda depois de criado.</span></div>
        <div class="form-field"><label for="fpAcao">Ação do orçamento</label>
          <select id="fpAcao"><option value="">Selecione…</option>${opcoesSelect(acoes, pt ? pt.acao : '')}</select></div>
        <div class="form-field span-2"><label for="fpDesc">Descrição (opcional)</label>
          <input type="text" id="fpDesc" maxlength="200" placeholder="Ex.: Funcionamento · campus" value="${pt ? escapeAttr(pt.descricao) : ''}"></div>
      </div>`,
    aoSalvar: async () => {
      const acao = document.getElementById('fpAcao').value, descricao = document.getElementById('fpDesc').value.trim();
      marcarInvalido('fpAcao', !acao);
      if(!acao) throw new Error('Selecione a ação.');
      if(pt){ await Repo.ptres.atualizar(pt.codigo, { acao, descricao }); fecharFormModal(); mostrarToast(`PTRES ${pt.codigo} atualizado.`); return; }
      const cod = document.getElementById('fpCodigo').value.trim();
      marcarInvalido('fpCodigo', !/^\d{4,8}$/.test(cod));
      if(!/^\d{4,8}$/.test(cod)) throw new Error('O PTRES deve ter de 4 a 8 dígitos.');
      await Repo.ptres.criar(cod, acao, descricao);
      fecharFormModal(); mostrarToast(`PTRES ${cod} cadastrado.`);
    },
  });
  if(pt) anexarHistorico('ptres', pt.codigo);
}
async function alternarAtivoPtres(codigo, ativo){
  if(!ativo && !confirm(`Inativar o PTRES ${codigo}? Ele deixa de aparecer em novos lançamentos.`)) return;
  try{ await Repo.ptres.atualizar(codigo, { ativo }); mostrarToast(`PTRES ${codigo} ${ativo ? 'reativado' : 'inativado'}.`); } catch(e){ mostrarToast(traduzirErro(e), true); }
}
