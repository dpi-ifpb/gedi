let ITENS = [];
let lastError = null;
let currentFilters = { busca:'', unidade:'', origem:'', natureza:'', situacao:'' };

/* ================= Carregamento dos dados ================= */
async function loadData(){
  const table = await fetchGvizTable(SHEET_ID, GID, 1);
  if(!table.cols || !table.rows) throw new Error('A planilha foi lida, mas não retornou colunas/linhas.');

  const header = table.cols.map(c => (c.label || '').trim());
  const idx = {
    id: header.indexOf('ID') !== -1 ? header.indexOf('ID') : header.indexOf('Identificador'), // planilha já usou os dois nomes
    descricao: header.indexOf('Descrição'),
    unidade: header.indexOf('Unidade'),
    valor: header.findIndex(h => h.replace(/\s+/g,' ').trim().startsWith('Valor')),
    origem: header.indexOf('Origem'),
    natureza: header.indexOf('Natureza'),
    situacao: header.indexOf('Situação'),
    acao: header.indexOf('Ação do Orçamento'),
    doc: header.indexOf('Doc. de Referência'),
    dataDoc: header.indexOf('Data do Doc.'),
  };

  if(idx.id === -1) throw new Error('Não encontrei a coluna "ID" (ou "Identificador") na planilha — confira se a aba lida é a de despesas.');

  const itens = [];
  table.rows.forEach(row => {
    if(!row || !row.c) return;
    const id = cellText(row, idx.id);
    if(!id) return; // ignora linhas vazias/decorativas
    itens.push({
      id,
      descricao: cellText(row, idx.descricao),
      unidade: cellText(row, idx.unidade),
      valor: cellNumber(row, idx.valor),
      origem: cellText(row, idx.origem),
      natureza: cellText(row, idx.natureza),
      situacao: cellText(row, idx.situacao),
      acao: cellText(row, idx.acao),
      doc: cellText(row, idx.doc),
      dataDoc: cellText(row, idx.dataDoc),
    });
  });
  return itens;
}

async function refreshData(isManual){
  const btns = [document.getElementById('refreshBtnTotais'), document.getElementById('refreshBtnDetalhe')];
  btns.forEach(b => b && b.classList.add('spinning'));
  try{
    ITENS = await loadData();
    lastError = null;
  } catch(e){
    lastError = e.message || 'Erro ao carregar a planilha.';
  }
  btns.forEach(b => b && b.classList.remove('spinning'));
  updatePills();
  if(lastError){
    renderError();
  } else {
    buildTotais();
    buildDetalheFilters();
    buildDetalheTable();
  }
}

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
      p.textContent = `Atualizado às ${hora}`;
      p.classList.remove('err');
    }
  });
}

function renderError(){
  const html = `
    <div class="state-box">
      <h3>Não foi possível carregar os dados</h3>
      <p>${lastError}</p>
      <p style="margin-top:14px;">Confirme se a planilha está compartilhada como "Qualquer pessoa com o link pode visualizar" (ou publicada na web) e clique em Atualizar.</p>
    </div>`;
  document.getElementById('contentTotais').innerHTML = html;
  document.getElementById('contentDetalhe').innerHTML = html;
}


/*
 * Planilha "Bases e reforços orçamentários": colunas fixas por posição.
 * A (0) Unidade, B (1) coluna em branco (espaçamento da planilha, sem dado),
 * C (2) PLOA — ignorada por pedido (não compõe o orçamento do ano, é só
 * referência interna), D (3) LOA, E (4) EF. E QUALIDADE,
 * F a Q (5 a 16) os 12 meses (reforços pontuais ao longo do ano).
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

    const loa = cellNumber(row, 3);
    const efQualidade = cellNumber(row, 4);
    const meses = MESES.map((nome, i) => ({ nome, valor: cellNumber(row, 5 + i) }));
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
