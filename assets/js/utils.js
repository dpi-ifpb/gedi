/* ================= Utilidades ================= */
function fmtBRL(v){
  return v.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}

/* Para células de tabela: símbolo R$ à esquerda, valor alinhado à direita */
function fmtBRLCell(v){
  const num = v.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  return `<span class="cur-cell"><span class="cur-sym">R$</span><span class="cur-val">${num}</span></span>`;
}

/*
 * O export CSV/gviz do Google Sheets não envia cabeçalho CORS, então fetch()
 * é bloqueado pelo navegador. A saída é carregar a resposta via <script> (JSONP),
 * que não passa pela checagem de CORS — é a forma padrão de ler uma planilha
 * pública direto do navegador sem backend.
 */
function fetchGvizTable(sheetId, gid, headersCount){
  headersCount = headersCount === undefined ? 1 : headersCount;
  return new Promise((resolve, reject) => {
    const cbName = 'gvizCb_' + Math.random().toString(36).slice(2);
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Tempo esgotado ao contatar a planilha. Verifique sua conexão e tente novamente.'));
    }, 15000);

    function cleanup(){
      clearTimeout(timeoutId);
      delete window[cbName];
      if(script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = function(resp){
      cleanup();
      if(!resp || !resp.table) { reject(new Error('A planilha respondeu, mas em um formato inesperado.')); return; }
      resolve(resp.table);
    };

    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&headers=${headersCount}&tqx=out:json;responseHandler:${cbName}`;
    const script = document.createElement('script');
    script.src = url;
    script.onerror = () => { cleanup(); reject(new Error('Não foi possível carregar os dados da planilha. Confirme se ela está compartilhada como "Qualquer pessoa com o link pode visualizar".')); };
    document.body.appendChild(script);
  });
}

function cellText(row, i){
  if(i < 0 || !row.c || !row.c[i]) return '';
  const c = row.c[i];
  if(c.f !== undefined && c.f !== null) return String(c.f).trim();
  if(c.v !== undefined && c.v !== null) return String(c.v).trim();
  return '';
}

function cellNumber(row, i){
  if(i < 0 || !row.c || !row.c[i]) return 0;
  const c = row.c[i];
  const n = typeof c.v === 'number' ? c.v : parseFloat(c.v);
  return isNaN(n) ? 0 : n;
}

function toTitleCasePt(s){
  // remove o prefixo "Avançado" (não usado nas demais telas — padroniza a nomenclatura)
  const semPrefixo = s.trim().replace(/^avan[çc]ado\s+/i, '');
  const minusculas = ['de','da','do','das','dos','e'];
  const siglas = ['jp']; // mantém sigla em maiúsculas (ex.: "JP" em "JP Zona Sul")
  const titulo = semPrefixo.toLowerCase().split(' ').map((w,i) => {
    if(siglas.includes(w)) return w.toUpperCase();
    if(i > 0 && minusculas.includes(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
  return normalizeUnitName(titulo);
}

// Padroniza variações de nome para a grafia única usada em todo o painel.
function normalizeUnitName(nome){
  if(/^jp\s+zona\s+sul$/i.test(nome) || /^jo[aã]o\s+pessoa\s+zona\s+sul$/i.test(nome)){
    return 'João Pessoa ZS';
  }
  return nome;
}

async function refreshExtraData(){
  const btn = document.getElementById('refreshBtnExtra');
  if(btn) btn.classList.add('spinning');
  try{
    EXTRA_ORC_DATA = await loadExtraData();
    extraLastError = null;
  } catch(e){
    extraLastError = e.message || 'Erro ao carregar a planilha.';
  }
  if(btn) btn.classList.remove('spinning');
  updateExtraPill();
  if(extraLastError){
    document.getElementById('contentExtra').innerHTML = `
      <div class="state-box">
        <h3>Não foi possível carregar os dados</h3>
        <p>${extraLastError}</p>
        <p style="margin-top:14px;">Confirme se a planilha está compartilhada como "Qualquer pessoa com o link pode visualizar" e clique em Atualizar.</p>
      </div>`;
  } else {
    renderExtraTable();
  }
}

function uniqueSorted(itens, keyFn){
  const set = new Set(itens.map(keyFn).map(v => (v||'').trim()).filter(v => v!==''));
  return [...set].sort((a,b) => a.localeCompare(b,'pt-BR'));
}

// "- Institucional -" deve sempre aparecer primeiro nas listas de Unidade (não uma unidade de
// campus como as demais). Usar depois de uniqueSorted() para as listas de unidade especificamente.
const UNIDADE_INSTITUCIONAL = '- Institucional -';
function sortUnidadesList(list){
  if(!list.includes(UNIDADE_INSTITUCIONAL)) return list;
  return [UNIDADE_INSTITUCIONAL, ...list.filter(u => u !== UNIDADE_INSTITUCIONAL)];
}

function escapeAttr(s){
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}
function escapeHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const INDICATOR_KEYS = ['rap', 'iea', 'tecnico', 'formacao', 'eja'];
const INDICATOR_LABELS = ['RAP', 'IEA', 'Técnico', 'Formação', 'EJA'];

function parseIndicatorValue(vStr){
  if(vStr === undefined || vStr === null) return 0;
  const n = parseFloat(String(vStr).replace('%','').replace(',','.'));
  return isNaN(n) ? 0 : n;
}

const fmtInt = v => Math.round(v).toLocaleString('pt-BR');
const fmtMoneyShort = v => v.toLocaleString('pt-BR', {style:'currency', currency:'BRL', maximumFractionDigits:0});

