/* ================= Tela 6 · Simulador Bloco Qualidade e Eficiência ================= */
let simState = null;

function calcQEAll(overridesIFPB){
  const list = NETWORK_INDICADORES.map(d => d.sigla === 'IFPB' ? {...d, ...overridesIFPB} : d);

  const pesoIea = v => v < 0.9*MATRIZ_IEA_REDE ? 0.5 : v < MATRIZ_IEA_REDE ? 1 : v < 1.10*MATRIZ_IEA_REDE ? 1.5 : v < 1.20*MATRIZ_IEA_REDE ? 2 : 2.5;
  const pesoRap = v => v < 18 ? 0 : v < 20 ? 1 : v < 22 ? 2 : 2.5;
  const pesoCt  = v => v < 0.50 ? 0 : v < 0.60 ? 1 : 2;
  const pesoFp  = v => v < 0.10 ? 0 : v < 0.15 ? 1 : v < 0.20 ? 2 : 2.5;
  const pesoEja = v => v < 0.025 ? 0 : v < 0.05 ? 1 : v < 0.10 ? 2 : 2.5;

  const withPond = list.map(d => ({
    ...d,
    ieaP: d.iea * pesoIea(d.iea),
    rapP: d.rap * pesoRap(d.rap),
    ctP:  d.ct  * pesoCt(d.ct),
    fpP:  d.fp  * pesoFp(d.fp),
    ejaP: d.eja * pesoEja(d.eja),
  }));

  const somaIea = withPond.reduce((s,d)=>s+d.ieaP,0);
  const somaRap = withPond.reduce((s,d)=>s+d.rapP,0);
  const somaCt  = withPond.reduce((s,d)=>s+d.ctP,0);
  const somaFp  = withPond.reduce((s,d)=>s+d.fpP,0);
  const somaEja = withPond.reduce((s,d)=>s+d.ejaP,0);

  const base = MATRIZ_OT - MATRIZ_AE;
  const VIEA = MATRIZ_PCT_IEA * base;
  const VRAP = MATRIZ_PCT_RAP * base;
  const VIAML = MATRIZ_PCT_IAML * base;

  return withPond.map(d => {
    const ieaEq = d.ieaP/somaIea, rapEq = d.rapP/somaRap;
    const ctEq = d.ctP/somaCt, fpEq = d.fpP/somaFp, ejaEq = d.ejaP/somaEja;
    const iamlEq = 0.7*ctEq + 0.2*fpEq + 0.1*ejaEq;
    const valorIea = ieaEq*VIEA, valorRap = rapEq*VRAP, valorIaml = iamlEq*VIAML;
    return {...d, ieaEq, rapEq, iamlEq, valorIea, valorRap, valorIaml, valorTotal: valorIea+valorRap+valorIaml};
  });
}

function ifpbBase(){ return NETWORK_INDICADORES.find(d => d.sigla === 'IFPB'); }

function buildSimuladorScreen(){
  const base = ifpbBase();
  if(!simState) simState = {iea: base.iea, rap: base.rap, ct: base.ct, fp: base.fp, eja: base.eja};

  const outras = NETWORK_INDICADORES.filter(d => d.sigla !== 'IFPB').sort((a,b) => a.sigla.localeCompare(b.sigla));
  const optsInst = outras.map(d => `<option value="${d.sigla}">${d.sigla} — ${d.nome}</option>`).join('');

  document.getElementById('contentSimulador').innerHTML = `
    <div class="filter-bar">
      <div class="filter-field">
        <label>Copiar índices de</label>
        <select id="simCopiar" onchange="onSimCopiar()">
          <option value="">— manual —</option>
          ${optsInst}
        </select>
      </div>
      <div class="filter-field">
        <label>IEA (%)</label>
        <input type="number" id="simIea" step="0.01" value="${(simState.iea*100).toFixed(2)}" oninput="onSimInputChange()">
      </div>
      <div class="filter-field">
        <label>RAP</label>
        <input type="number" id="simRap" step="0.01" value="${simState.rap.toFixed(2)}" oninput="onSimInputChange()">
      </div>
      <div class="filter-field">
        <label>Técnico (%)</label>
        <input type="number" id="simCt" step="0.01" value="${(simState.ct*100).toFixed(2)}" oninput="onSimInputChange()">
      </div>
      <div class="filter-field">
        <label>Formação (%)</label>
        <input type="number" id="simFp" step="0.01" value="${(simState.fp*100).toFixed(2)}" oninput="onSimInputChange()">
      </div>
      <div class="filter-field">
        <label>EJA (%)</label>
        <input type="number" id="simEja" step="0.01" value="${(simState.eja*100).toFixed(2)}" oninput="onSimInputChange()">
      </div>
      <button class="filter-clear" onclick="onSimReset()">Restaurar atual</button>
    </div>
    <div id="simArea"></div>
    <div class="notes-panel">
      <p>Cálculo fiel à Portaria MEC nº 243/2026 (Anexo, Bloco Qualidade e Eficiência): bandas de peso por indicador, ponderação, e participação percentual ("Equalizado") na soma da rede inteira (41 instituições). OT = ${fmtBRL(MATRIZ_OT)}, AE = ${fmtBRL(MATRIZ_AE)}, IEA Rede = ${(MATRIZ_IEA_REDE*100).toFixed(1)}%. IEA do IFPB considerado: cursos regulares, sem FIC.</p>
      <p class="notes-footer">Simula só o Bloco Qualidade e Eficiência (10% do orçamento da rede) — não o Bloco Funcionamento (80%), que depende de dado adicional (matrícula equalizada por curso/ciclo de toda a rede). Mudar os índices do IFPB desloca ligeiramente a participação das outras 40 instituições, já que o total da rede é fixo — o cálculo já reflete isso.</p>
    </div>`;
  renderSimuladorResult();
}

function onSimCopiar(){
  const sigla = document.getElementById('simCopiar').value;
  if(!sigla) return;
  const inst = NETWORK_INDICADORES.find(d => d.sigla === sigla);
  simState = {iea: inst.iea, rap: inst.rap, ct: inst.ct, fp: inst.fp, eja: inst.eja};
  document.getElementById('simIea').value = (simState.iea*100).toFixed(2);
  document.getElementById('simRap').value = simState.rap.toFixed(2);
  document.getElementById('simCt').value = (simState.ct*100).toFixed(2);
  document.getElementById('simFp').value = (simState.fp*100).toFixed(2);
  document.getElementById('simEja').value = (simState.eja*100).toFixed(2);
  renderSimuladorResult();
}

function onSimInputChange(){
  document.getElementById('simCopiar').value = ''; // edição manual desfaz a seleção de "copiar de"
  simState = {
    iea: (parseFloat(document.getElementById('simIea').value)||0)/100,
    rap: parseFloat(document.getElementById('simRap').value)||0,
    ct:  (parseFloat(document.getElementById('simCt').value)||0)/100,
    fp:  (parseFloat(document.getElementById('simFp').value)||0)/100,
    eja: (parseFloat(document.getElementById('simEja').value)||0)/100,
  };
  renderSimuladorResult();
}

function onSimReset(){
  const base = ifpbBase();
  simState = {iea: base.iea, rap: base.rap, ct: base.ct, fp: base.fp, eja: base.eja};
  buildSimuladorScreen();
}

function renderSimuladorResult(){
  const atual = calcQEAll({}).find(d => d.sigla === 'IFPB');
  const simulado = calcQEAll(simState).find(d => d.sigla === 'IFPB');
  const delta = simulado.valorTotal - atual.valorTotal;

  function linha(label, atualV, simV){
    const d = simV - atualV;
    const cls = d > 0.5 ? 'rfepct-green' : (d < -0.5 ? 'rfepct-red' : '');
    return `<tr><td>${label}</td><td class="num pares-center">${fmtBRLCell(atualV)}</td><td class="num pares-center rfepct-cell ${cls}">${fmtBRLCell(simV)}</td></tr>`;
  }

  document.getElementById('simArea').innerHTML = `
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">QE atual do IFPB</div>
        <div class="kpi-value">${fmtBRL(atual.valorTotal)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">QE simulado</div>
        <div class="kpi-value">${fmtBRL(simulado.valorTotal)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Diferença</div>
        <div class="kpi-value" style="color:${delta>=0?'#1E8E5A':'#CC0000'};">${delta>=0?'+':''}${fmtBRL(delta)}</div>
      </div>
    </div>
    <div class="panel">
      <table>
        <thead>
          <tr><th>Parcela</th><th class="num th-center">Atual</th><th class="num th-center">Simulado</th></tr>
        </thead>
        <tbody>
          ${linha('IEA (2,5% da base)', atual.valorIea, simulado.valorIea)}
          ${linha('RAP (2,5% da base)', atual.valorRap, simulado.valorRap)}
          ${linha('IAML — Técnico/Formação/EJA (5% da base)', atual.valorIaml, simulado.valorIaml)}
        </tbody>
        <tfoot>
          <tr><td>Total QE do IFPB</td><td class="num pares-center">${fmtBRLCell(atual.valorTotal)}</td><td class="num pares-center">${fmtBRLCell(simulado.valorTotal)}</td></tr>
        </tfoot>
      </table>
    </div>`;
}

