let ITENS = [];
let lastError = null;
let currentFilters = { busca:'', unidade:'', origem:'', natureza:'', situacao:'' };

/* ================= Despesas (Totais e Detalhamento) =================
 * Antes: lidas da planilha "Registro e acompanhamento de despesas".
 * Agora: vêm do registro de despesas no Firestore (TABELAS.despesas, mantido ao
 * vivo por assinaturas.js). Só entram despesas DEFERIDAS e ATIVAS do ano selecionado, no
 * mesmo formato que as telas já usavam — Totais e Detalhamento não mudaram.
 */
let anoPainel = null; // ano de referência exibido em Totais/Detalhamento

function anosDisponiveis(){
  const anos = [...new Set(TABELAS.despesas.filter(d => d.ativo && d.status === 'deferida').map(d => d.ano))];
  if(!anos.length) anos.push(new Date().getFullYear());
  return anos.sort((a, b) => b - a);
}

function montarItensPainel(){
  const anos = anosDisponiveis();
  if(anoPainel === null || !anos.includes(anoPainel)) anoPainel = anos[0];
  return TABELAS.despesas
    .filter(d => d.ativo && d.status === 'deferida' && d.ano === anoPainel)
    .map(d => ({
      id: d.id,
      descricao: d.descricao,
      unidade: nomeUnidade(d.unidade),
      valor: d.valor,
      origem: d.origem,
      natureza: d.natureza,
      situacao: 'Deferida',
      financiador: d.financiador,
      acao: '', doc: '', dataDoc: '', // campos da fase de execução (ainda não registrados)
    }));
}

// Campo "Ano" usado nas barras de filtro de Totais e Detalhamento
function renderAnoPainelField(){
  const opts = anosDisponiveis().map(a => `<option value="${a}"${a === anoPainel ? ' selected' : ''}>${a}</option>`).join('');
  return `
      <div class="filter-field" style="min-width:90px;">
        <label>Ano</label>
        <select onchange="setAnoPainel(this.value)">${opts}</select>
      </div>`;
}
function setAnoPainel(ano){
  anoPainel = parseInt(ano, 10);
  refreshData(false);
}

function refreshData(isManual){
  if(!TABELAS_CARREGADAS.despesas && !TABELAS_ERRO.despesas) return; // ainda carregando
  lastError = TABELAS_ERRO.despesas
    ? 'Não foi possível ler as despesas no banco de dados (' + TABELAS_ERRO.despesas + ').'
    : null;
  ITENS = lastError ? [] : montarItensPainel();
  updatePills();
  if(lastError){
    renderError();
  } else {
    buildTotais();
    buildDetalheFilters();
    buildDetalheTable();
  }
}
aoMudarDadosRegistrar(['despesas', 'unidades', 'origens'], () => refreshData(false));

/*
 * Planilha "Distribuição de recursos": cabeçalho ocupa 2 linhas (a 1ª só tem o
 * rótulo mesclado "PROPOSTA"), então pedimos headers=2 para o gviz pular as
 * duas e entregar os dados a partir da 3ª linha (Reitoria, que é filtrada fora
 * a seguir). Colunas fixas por posição (A a G), já que os rótulos da 1ª linha
 * de cabeçalho não servem de referência (célula mesclada).
 */
async function loadExtraData(){
  const table = await fetchGvizTable(EXTRA_SHEET_ID, EXTRA_GID, 2);
  if(!table.rows) throw new Error('A planilha foi lida, mas não retornou linhas de dados.');

  const dados = [];
  table.rows.forEach(row => {
    if(!row || !row.c) return;
    const unidade = cellText(row, 0);
    if(!unidade) return; // ignora linha de totais / linhas vazias
    if(unidade.trim().toUpperCase() === 'REITORIA') return; // Reitoria fora desta tela, por pedido

    dados.push({
      unidade: toTitleCasePt(unidade),
      v2624: cellNumber(row, 1),
      distJan: cellNumber(row, 2),
      distMaio: cellNumber(row, 3),
      p4Recomp: cellNumber(row, 4),
      p4Todos: cellNumber(row, 5),
      extraP4: cellNumber(row, 6),
    });
  });
  dados.sort((a,b) => a.unidade.localeCompare(b.unidade, 'pt-BR'));
  return dados;
}

// A planilha traz os nomes em CAIXA ALTA; convertendo para Título para bater com o
// padrão visual do restante do painel.
function updateExtraPill(){
  const p = document.getElementById('updatePillExtra');
  if(!p) return;
  if(extraLastError){
    p.textContent = 'Falha ao atualizar';
    p.classList.add('err');
  } else {
    const hora = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    p.textContent = `Atualizado às ${hora}`;
    p.classList.remove('err');
  }
}

function manualRefresh(){
  refreshData(true);
  refreshExtraData();
  refreshFormacaoData();
}

function updatePills(){
  const now = new Date();
  const hora = now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  const pills = [document.getElementById('updatePillTotais'), document.getElementById('updatePillDetalhe')];
  pills.forEach(p => {
    if(!p) return;
    if(lastError){
      p.textContent = 'Falha ao atualizar';
      p.classList.add('err');
    } else {
      p.textContent = `Tempo real · ${hora}`;
      p.classList.remove('err');
    }
  });
}

function renderError(){
  const html = `
    <div class="state-box">
      <h3>Não foi possível carregar os dados</h3>
      <p>${lastError}</p>
      <p style="margin-top:14px;">Verifique sua conexão e se o seu perfil tem acesso às despesas.</p>
    </div>`;
  document.getElementById('contentTotais').innerHTML = html;
  document.getElementById('contentDetalhe').innerHTML = html;
}


/*
 * Planilha "Bases e reforços orçamentários": colunas fixas por posição.
 * A (0) Unidade, B (1) PLOA — ignorada por pedido (não compõe o orçamento do
 * ano, é só referência interna), C (2) LOA, D (3) EF. E QUALIDADE,
 * E a P (4 a 15) os 12 meses (reforços pontuais ao longo do ano).
 */
async function loadFormacaoData(){
  const table = await fetchGvizTable(FORMACAO_SHEET_ID, FORMACAO_GID, 1);
  if(!table.rows) throw new Error('A planilha foi lida, mas não retornou linhas de dados.');

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dados = [];
  table.rows.forEach(row => {
    if(!row || !row.c) return;
    const unidade = cellText(row, 0);
    if(!unidade) return; // ignora linhas vazias (unidades sem base lançada ainda)

    const loa = cellNumber(row, 2);
    const efQualidade = cellNumber(row, 3);
    const meses = MESES.map((nome, i) => ({ nome, valor: cellNumber(row, 4 + i) }));
    const reforcos = meses.reduce((s, m) => s + m.valor, 0);

    dados.push({
      unidade,
      loa,
      efQualidade,
      meses,
      reforcos,
      total: loa + efQualidade + reforcos,
    });
  });
  return dados;
}

let FORMACAO_DATA = [];
let formacaoLastError = null;

async function refreshFormacaoData(){
  const btn = document.getElementById('refreshBtnFormacao');
  if(btn) btn.classList.add('spinning');
  try{
    FORMACAO_DATA = await loadFormacaoData();
    formacaoLastError = null;
  } catch(e){
    formacaoLastError = e.message || 'Erro ao carregar a planilha.';
  }
  if(btn) btn.classList.remove('spinning');
  updateFormacaoPill();
  buildFormacaoOrcamento();
}

function updateFormacaoPill(){
  const p = document.getElementById('updatePillFormacao');
  if(!p) return;
  if(formacaoLastError){
    p.textContent = 'Falha ao atualizar';
    p.classList.add('err');
  } else {
    const hora = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    p.textContent = `Atualizado às ${hora}`;
    p.classList.remove('err');
  }
}
