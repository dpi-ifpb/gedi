/* ================= Tela 7 · Simulador Bloco Funcionamento ================= */
let simFState = null;

// RAP por campus já existe na tela de Indicadores (RFEPCT_DATA) — reaproveitado aqui.
function getRapAtual(unidade){
  const ind = RFEPCT_DATA.find(u => u.unidade === unidade);
  return (ind && ind.rap) ? parseIndicatorValue(ind.rap.v) : null;
}

// "atual" usa o valor OFICIAL real (IFPB_FUNC_REAL[unidade].custeio). "simulado" parte do RAP:
// como RAP = matrículas ÷ professores, mantendo o nº de professores e o mix de cursos fixos, a
// Matrícula Total escala na mesma proporção do RAP (novoMT = MT_atual × RAP_novo/RAP_atual) —
// depois recalcula a participação na rede e aplica o piso de R$ 700.000 (Art. 8º) quando cabível.
function calcFuncionamentoSimulado(unidade, novoRap){
  const atual = IFPB_FUNC_REAL[unidade];
  const rapAtual = getRapAtual(unidade);
  const fator = (rapAtual && rapAtual > 0) ? (novoRap / rapAtual) : 1;
  const novoMt = atual.mt * fator;
  const novoTotalRede = FUNC_NETWORK_MT_TOTAL - atual.mt + novoMt;
  const rawShare = novoTotalRede > 0 ? (novoMt / novoTotalRede) * atual.fEfetivo : 0;
  const valor = atual.ano >= 2018 ? Math.max(FUNC_FLOOR, rawShare) : rawShare;
  return { rap: novoRap, mt: novoMt, rawShare, valor };
}

function buildSimuladorFScreen(){
  const unidades = Object.keys(IFPB_FUNC_REAL).sort((a,b) => a.localeCompare(b,'pt-BR'));
  if(!simFState) simFState = { ref: unidades[0], rap: getRapAtual(unidades[0]) };

  const opts = unidades.map(u => `<option value="${escapeAttr(u)}" ${u===simFState.ref?'selected':''}>${u}</option>`).join('');
  const optsCopiar = unidades.filter(u => u !== simFState.ref)
    .map(u => `<option value="${escapeAttr(u)}">${u} (RAP ${getRapAtual(u)!=null ? String(getRapAtual(u)).replace('.',',') : '—'})</option>`).join('');

  document.getElementById('contentSimuladorF').innerHTML = `
    <div class="filter-bar">
      <div class="filter-field">
        <label>Unidade de referência</label>
        <select id="simFRef" onchange="onSimFRefChange()">${opts}</select>
      </div>
      <div class="filter-field">
        <label>Copiar RAP de</label>
        <select id="simFCopiar" onchange="onSimFCopiar()">
          <option value="">— manual —</option>
          ${optsCopiar}
        </select>
      </div>
      <div class="filter-field">
        <label>RAP</label>
        <input type="number" id="simFRap" step="0.01" value="${simFState.rap}" oninput="onSimFInputChange()">
      </div>
      <button class="filter-clear" onclick="onSimFReset()">Restaurar atual</button>
    </div>
    <div id="simFArea"></div>
    <div class="notes-panel">
      <p><strong>"Atual" é o valor oficial de 2026</strong> (aba RESUMO PROPOSTA da planilha CONIF, recalculada — confere com o valor já validado de cada campus). <strong>"Simulado" parte do RAP</strong>, não da matrícula direta: como RAP = matrículas ÷ professores, mudar o RAP mantendo o nº de professores e o mix de cursos da unidade implica uma nova Matrícula Total na mesma proporção (RAP dobrou → matrícula equalizada dobra). A partir daí, recalcula a participação na matrícula da rede inteira usando um fator calibrado a partir do próprio valor oficial da unidade — por isso, sem nenhuma alteração, "atual" e "simulado" ficam iguais. E aplica o mesmo piso de R$ 700.000 do Art. 8º quando cabível.</p>
      <p class="notes-footer">Suposições desta estimativa: nº de professores e mix de cursos da unidade não mudam — só o volume de alunos escala. Não reproduz o mecanismo de manutenção do valor do ano anterior corrigido pelo IPCA (Art. 7º/9º) — para as unidades no piso (Areia, Pedras de Fogo), a simulação usa um fator médio da rede em vez do fator próprio, já que não é possível calibrar a partir de um valor que já está no piso. Piso institucional: ${fmtBRL(FUNC_FLOOR)} para campi criados a partir de 2018.</p>
    </div>`;
  renderSimuladorFResult();
}

function onSimFRefChange(){
  const novoRef = document.getElementById('simFRef').value;
  simFState = { ref: novoRef, rap: getRapAtual(novoRef) };
  buildSimuladorFScreen();
}

function onSimFCopiar(){
  const sigla = document.getElementById('simFCopiar').value;
  if(!sigla) return;
  simFState.rap = getRapAtual(sigla);
  document.getElementById('simFRap').value = simFState.rap;
  renderSimuladorFResult();
}

function onSimFInputChange(){
  document.getElementById('simFCopiar').value = '';
  simFState.rap = parseFloat(document.getElementById('simFRap').value) || 0;
  renderSimuladorFResult();
}

function onSimFReset(){
  simFState.rap = getRapAtual(simFState.ref);
  buildSimuladorFScreen();
}

function renderSimuladorFResult(){
  const atualReal = IFPB_FUNC_REAL[simFState.ref];
  const rapAtual = getRapAtual(simFState.ref);
  const simulado = calcFuncionamentoSimulado(simFState.ref, simFState.rap);
  const delta = simulado.valor - atualReal.custeio;

  document.getElementById('simFArea').innerHTML = `
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">Funcionamento atual (oficial) — ${simFState.ref}</div>
        <div class="kpi-value">${fmtBRL(atualReal.custeio)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Funcionamento simulado (estimativa)</div>
        <div class="kpi-value">${fmtBRL(simulado.valor)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Diferença</div>
        <div class="kpi-value" style="color:${delta>=0?'#1E8E5A':'#CC0000'};">${delta>=0?'+':''}${fmtBRL(delta)}</div>
      </div>
    </div>
    <div class="panel">
      <table>
        <thead>
          <tr><th>Unidade</th><th class="num th-center">RAP</th><th class="num th-center">Matrícula total equalizada</th><th class="num th-center">Valor Funcionamento</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${simFState.ref} (atual, oficial)</td>
            <td class="num pares-center">${rapAtual!=null ? String(rapAtual).replace('.',',') : '—'}</td>
            <td class="num pares-center">${atualReal.mt.toLocaleString('pt-BR')}</td>
            <td class="num pares-center">${fmtBRLCell(atualReal.custeio)}</td>
          </tr>
          <tr>
            <td>${simFState.ref} (simulado)</td>
            <td class="num pares-center">${String(simulado.rap).replace('.',',')}</td>
            <td class="num pares-center">${simulado.mt.toLocaleString('pt-BR')}</td>
            <td class="num pares-center rfepct-cell ${delta>0.5?'rfepct-green':(delta<-0.5?'rfepct-red':'')}">${fmtBRLCell(simulado.valor)}</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}


