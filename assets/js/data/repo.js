/* ================= Repositório de dados (camada única de acesso ao banco) =================
 * TODA leitura e gravação de despesas, financiadores, tabelas de apoio e usuários
 * passa por aqui. As telas nunca chamam o Firebase diretamente.
 *
 * Para migrar para outro banco (PostgreSQL via API, Supabase etc.), reescreva só
 * este arquivo mantendo as mesmas funções e o mesmo formato dos objetos
 * devolvidos — o resto do painel não precisa mudar.
 *
 * Formato de uma despesa devolvida pelo repositório:
 *   { docId, id (null até ser deferida), ano, unidade (código, ex. "AR"), descricao,
 *     valor (número), natureza, processo, linkSuap,
 *     status ("pendente" | "deferida" | "indeferida"), origem, financiador,
 *     analise: { observacao, por, em }, ativo,
 *     criadoPor, criadoEm (Date|null), atualizadoPor, atualizadoEm (Date|null) }
 */
const Repo = (() => {
  const db = () => firebase.firestore();
  const agora = () => firebase.firestore.FieldValue.serverTimestamp();
  const emailAtual = () => ((firebase.auth().currentUser || {}).email || '').toLowerCase();
  const paraData = (ts) => (ts && typeof ts.toDate === 'function') ? ts.toDate() : null;

  const arred2 = (v) => Math.round(Number(v) * 100) / 100;
  const pad4 = (n) => String(n).padStart(4, '0');

  // "#AR.0001.2.0000" + 2026 -> "2026_AR.0001.2.0000" (id do documento no Firestore)
  const montarId = (unidade, seq, origemCodigo, financiador) =>
    `#${unidade}.${pad4(seq)}.${origemCodigo}.${financiador}`;
  const ID_REGEX = /^#([A-Z]{2})\.(\d{4})\.([0-9A-Z])\.(\d{4})$/;

  function observarColecao(nome, mapear, onDados, onErro){
    return db().collection(nome).onSnapshot(
      snap => onDados(snap.docs.map(d => mapear(d.id, d.data()))),
      err => { console.error(`[repo] ${nome}:`, err); if(onErro) onErro(err); }
    );
  }

  /* ---------------- usuários ---------------- */
  function perfisDe(dados){
    if(!dados) return [];
    if(Array.isArray(dados.perfis)) return dados.perfis;
    return PERFIS_LEGADO[dados.grupo] || [];
  }

  const usuarios = {
    // { perfis, unidades } do usuário; null = e-mail não cadastrado
    async acessoDoUsuario(email){
      const doc = await db().collection('usuarios').doc(email.toLowerCase()).get();
      if(!doc.exists) return null;
      const d = doc.data();
      return { perfis: perfisDe(d), unidades: Array.isArray(d.unidades) ? d.unidades : [] };
    },
    observar(onDados, onErro){
      return observarColecao('usuarios', (email, d) => ({
        email, perfis: perfisDe(d), unidades: Array.isArray(d.unidades) ? d.unidades : [],
        legado: !Array.isArray(d.perfis) && d.grupo ? d.grupo : null,
        atualizadoPor: d.atualizadoPor || '', atualizadoEm: paraData(d.atualizadoEm),
      }), onDados, onErro);
    },
    // set() substitui o documento inteiro — remove o campo antigo "grupo"
    // unidades: só para o perfil registrador_despesas (códigos de unidade que ele pode lançar)
    salvar(email, perfis, unidades){
      return db().collection('usuarios').doc(email.toLowerCase()).set({
        perfis, unidades: perfis.includes('registrador_despesas') ? (unidades || []) : [],
        atualizadoPor: emailAtual(), atualizadoEm: agora(),
      });
    },
    excluir(email){
      return db().collection('usuarios').doc(email.toLowerCase()).delete();
    },
  };

  /* ---------------- unidades e origens ---------------- */
  const unidades = {
    observar(onDados, onErro){
      return observarColecao('unidades', (codigo, d) => ({ codigo, nome: d.nome, ativo: d.ativo !== false }), onDados, onErro);
    },
    async criar(codigo, nome){
      const ref = db().collection('unidades').doc(codigo);
      await db().runTransaction(async tx => {
        if((await tx.get(ref)).exists) throw new Error(`Já existe uma unidade com o código ${codigo}.`);
        tx.set(ref, { nome, ativo: true, atualizadoPor: emailAtual(), atualizadoEm: agora() });
      });
    },
    atualizar(codigo, dados){
      return db().collection('unidades').doc(codigo).update({ ...dados, atualizadoPor: emailAtual(), atualizadoEm: agora() });
    },
  };

  const origens = {
    observar(onDados, onErro){
      return observarColecao('origens', (sigla, d) => ({ sigla, codigo: d.codigo, ativo: d.ativo !== false }), onDados, onErro);
    },
    async criar(sigla, codigo){
      const col = db().collection('origens');
      const repetido = await col.where('codigo', '==', codigo).limit(1).get();
      if(!repetido.empty) throw new Error(`O código "${codigo}" já é usado pela origem ${repetido.docs[0].id}.`);
      const ref = col.doc(sigla);
      await db().runTransaction(async tx => {
        if((await tx.get(ref)).exists) throw new Error(`A origem ${sigla} já existe.`);
        tx.set(ref, { codigo, ativo: true, atualizadoPor: emailAtual(), atualizadoEm: agora() });
      });
    },
    atualizar(sigla, dados){
      return db().collection('origens').doc(sigla).update({ ...dados, atualizadoPor: emailAtual(), atualizadoEm: agora() });
    },
    // gravações individuais em paralelo (ver comentário em despesas.importar)
    async carregarIniciais(){
      const meta = () => ({ ativo: true, atualizadoPor: emailAtual(), atualizadoEm: agora() });
      await Promise.all([
        ...UNIDADES_INICIAIS.map(([codigo, nome]) =>
          db().collection('unidades').doc(codigo).set({ nome, ...meta() }, { merge: true })),
        ...ORIGENS_INICIAIS.map(([sigla, codigo]) =>
          db().collection('origens').doc(sigla).set({ codigo, ...meta() }, { merge: true })),
      ]);
    },
  };

  /* ---------------- financiadores ---------------- */
  const financiadores = {
    observar(onDados, onErro){
      return observarColecao('financiadores', (codigo, d) => ({ codigo, descricao: d.descricao, ativo: d.ativo !== false }), onDados, onErro);
    },
    async criar(codigo, descricao){
      const ref = db().collection('financiadores').doc(codigo);
      await db().runTransaction(async tx => {
        if((await tx.get(ref)).exists) throw new Error(`O código ${codigo} já está em uso por outro financiador.`);
        tx.set(ref, { descricao, ativo: true, atualizadoPor: emailAtual(), atualizadoEm: agora() });
      });
    },
    atualizar(codigo, dados){
      return db().collection('financiadores').doc(codigo).update({ ...dados, atualizadoPor: emailAtual(), atualizadoEm: agora() });
    },
  };

  /* ---------------- despesas ----------------
   * Fluxo: REGISTRO (status "pendente", sem ID) → ANÁLISE → "deferida" (ganha o ID,
   * entra nos Totais) ou "indeferida" (sem ID, fora dos Totais). Empenho e execução
   * virão depois, sobre as deferidas.
   *
   * O id do documento no Firestore é automático (a despesa nasce sem ID). A
   * unicidade do ID de negócio (#UU.NNNN.O.FFFF) por ano é garantida pela coleção
   * "ids": cada ID gerado cria ids/{ano}_{ID sem #} → { despesa: <docId> }.
   */
  const STATUS = { PENDENTE: 'pendente', DEFERIDA: 'deferida', INDEFERIDA: 'indeferida' };
  const docIdIndice = (ano, id) => `${ano}_${id.replace('#', '')}`;

  function mapearDespesa(docId, d){
    // compatibilidade com despesas gravadas antes do fluxo de análise (têm ID e não têm status)
    const status = d.status || (d.id ? STATUS.DEFERIDA : STATUS.PENDENTE);
    const a = d.analise || {};
    return {
      docId, id: d.id || null, ano: d.ano, unidade: d.unidade, descricao: d.descricao || '',
      valor: Number(d.valor) || 0, natureza: d.natureza || '',
      processo: d.processo || '', linkSuap: d.linkSuap || '',
      status, origem: d.origem || '', financiador: d.financiador || '',
      analise: { observacao: a.observacao || '', por: a.por || '', em: paraData(a.em) },
      situacaoLegado: d.situacaoLegado || d.situacao || '',
      ativo: d.ativo !== false,
      criadoPor: d.criadoPor || '', criadoEm: paraData(d.criadoEm),
      atualizadoPor: d.atualizadoPor || '', atualizadoEm: paraData(d.atualizadoEm),
    };
  }

  // campos preenchidos no registro
  function camposRegistro(dados){
    return {
      ano: Number(dados.ano),
      unidade: dados.unidade,
      descricao: String(dados.descricao).trim(),
      valor: arred2(dados.valor),
      natureza: dados.natureza,
      processo: String(dados.processo || '').trim(),
      linkSuap: String(dados.linkSuap || '').trim(),
    };
  }

  /* Reserva o próximo sequencial da unidade no ano, numa transação: se dois analistas
   * deferirem ao mesmo tempo, o Firestore repete uma das transações e cada despesa
   * recebe um número diferente. Números já ocupados (importação, despesas antigas)
   * são pulados. Devolve { id, seq, refs } para quem chamou gravar na mesma transação. */
  async function reservarId(tx, ano, unidade, origemCodigo, financiador){
    const contadorRef = db().collection('contadores').doc(`${ano}_${unidade}`);
    const cont = await tx.get(contadorRef);
    let seq = (cont.exists ? cont.data().ultimo : 0) + 1;
    for(let tentativas = 0; ; tentativas++){
      if(seq > 9999) throw new Error(`A unidade ${unidade} atingiu o limite de 9999 despesas em ${ano}.`);
      const id = montarId(unidade, seq, origemCodigo, financiador);
      const idxRef = db().collection('ids').doc(docIdIndice(ano, id));
      const legadoRef = db().collection('despesas').doc(docIdIndice(ano, id)); // despesas gravadas no formato antigo
      const [idx, legado] = await Promise.all([tx.get(idxRef), tx.get(legadoRef)]);
      if(!idx.exists && !legado.exists) return { id, seq, contadorRef, idxRef };
      if(tentativas > 50) throw new Error('Não foi possível reservar um número livre. Tente novamente.');
      seq++;
    }
  }

  const despesas = {
    STATUS,
    /* unidades: null = todas (leitores, analista, admin); lista = só essas (registrador) */
    observar(onDados, onErro, unidades){
      const col = db().collection('despesas');
      const mapear = snap => snap.docs.map(d => mapearDespesa(d.id, d.data()));
      const falha = err => { console.error('[repo] despesas:', err); if(onErro) onErro(err); };
      if(!Array.isArray(unidades)) return col.onSnapshot(snap => onDados(mapear(snap)), falha);
      // registrador: uma consulta "unidade == X" por unidade (formato que as regras
      // de segurança conseguem validar com certeza), resultados unidos
      if(!unidades.length){ onDados([]); return () => {}; }
      const partes = {};
      const unsubs = unidades.map(u => col.where('unidade', '==', u).onSnapshot(snap => {
        partes[u] = mapear(snap);
        if(Object.keys(partes).length === unidades.length) onDados([].concat(...Object.values(partes)));
      }, falha));
      return () => unsubs.forEach(f => f());
    },

    /* REGISTRO: dados = { ano, unidade, descricao, valor, natureza, processo, linkSuap } */
    async registrar(dados){
      const ref = db().collection('despesas').doc(); // id automático
      await ref.set({
        ...camposRegistro(dados), status: STATUS.PENDENTE, id: null, origem: null, financiador: null,
        ativo: true, criadoPor: emailAtual(), criadoEm: agora(), atualizadoPor: emailAtual(), atualizadoEm: agora(),
      });
      return ref.id;
    },
    // edição dos campos do registro (registrador enquanto pendente; analista a qualquer momento)
    atualizarRegistro(docId, dados){
      const campos = camposRegistro(dados);
      return db().collection('despesas').doc(docId).update({ ...campos, atualizadoPor: emailAtual(), atualizadoEm: agora() });
    },

    /* ANÁLISE · deferir: gera o ID e grava tudo numa transação.
     * analise = { origem, origemCodigo, financiador, observacao } */
    async deferir(docId, analise){
      const ref = db().collection('despesas').doc(docId);
      const financiador = analise.financiador || FINANCIADOR_NENHUM;
      return db().runTransaction(async tx => {
        const atual = await tx.get(ref);
        if(!atual.exists) throw new Error('Despesa não encontrada.');
        const d = atual.data();
        if(d.status === STATUS.DEFERIDA || d.id) throw new Error('Esta despesa já foi deferida.');
        const r = await reservarId(tx, d.ano, d.unidade, analise.origemCodigo, financiador);
        tx.set(r.contadorRef, { ultimo: r.seq });
        tx.set(r.idxRef, { despesa: docId });
        tx.update(ref, {
          status: STATUS.DEFERIDA, id: r.id, origem: analise.origem, financiador,
          analise: { resultado: STATUS.DEFERIDA, observacao: String(analise.observacao || '').trim(), por: emailAtual(), em: agora() },
          atualizadoPor: emailAtual(), atualizadoEm: agora(),
        });
        return r.id;
      });
    },
    // ANÁLISE · indeferir: sem ID; a justificativa é obrigatória
    indeferir(docId, observacao){
      return db().collection('despesas').doc(docId).update({
        status: STATUS.INDEFERIDA,
        analise: { resultado: STATUS.INDEFERIDA, observacao: String(observacao).trim(), por: emailAtual(), em: agora() },
        atualizadoPor: emailAtual(), atualizadoEm: agora(),
      });
    },
    // analista corrige origem/financiador de uma deferida — o ID NÃO muda
    atualizarAnalise(docId, dados){
      return db().collection('despesas').doc(docId).update({
        origem: dados.origem, financiador: dados.financiador || FINANCIADOR_NENHUM,
        analise: { resultado: STATUS.DEFERIDA, observacao: String(dados.observacao || '').trim(), por: emailAtual(), em: agora() },
        atualizadoPor: emailAtual(), atualizadoEm: agora(),
      });
    },
    definirAtivo(docId, ativo){
      return db().collection('despesas').doc(docId).update({
        ativo: !!ativo, atualizadoPor: emailAtual(), atualizadoEm: agora(),
      });
    },

    /* Importação em lote (administrador) de despesas JÁ ANALISADAS (deferidas).
     * linhas: [{ id|null, ano, unidade, descricao, valor, origem, origemCodigo, natureza,
     *            financiador, situacaoLegado, processo?, linkSuap? }]
     *   - com id: mantém o ID (se ainda não existir no ano) e ajusta o contador;
     *   - sem id: gera o ID, na ordem das linhas.
     * Gravações uma a uma (cada uma consulta o perfil nas regras de segurança). */
    async importar(linhas, onProgresso){
      const total = linhas.length;
      let feitos = 0;
      const resultado = { gravadas: 0, geradas: [], ignoradas: [] };
      const tick = () => { feitos++; if(onProgresso) onProgresso(feitos, total); };
      const base = (l) => ({
        ...camposRegistro(l), status: STATUS.DEFERIDA, origem: l.origem,
        financiador: l.financiador || FINANCIADOR_NENHUM, situacaoLegado: l.situacaoLegado || '',
        analise: { resultado: STATUS.DEFERIDA, observacao: 'Importada da planilha de despesas', por: emailAtual(), em: agora() },
        ativo: true, importado: true,
        criadoPor: emailAtual(), criadoEm: agora(), atualizadoPor: emailAtual(), atualizadoEm: agora(),
      });

      for(const l of linhas){
        const ano = Number(l.ano);
        await db().runTransaction(async tx => {
          if(l.id){
            const m = l.id.match(ID_REGEX);
            const idxRef = db().collection('ids').doc(docIdIndice(ano, l.id));
            const legadoRef = db().collection('despesas').doc(docIdIndice(ano, l.id));
            const contadorRef = db().collection('contadores').doc(`${ano}_${m[1]}`);
            const [idx, legado, cont] = await Promise.all([tx.get(idxRef), tx.get(legadoRef), tx.get(contadorRef)]);
            if(idx.exists || legado.exists){ resultado.ignoradas.push(l); return; }
            const ref = db().collection('despesas').doc();
            const seq = parseInt(m[2], 10);
            if(!cont.exists || cont.data().ultimo < seq) tx.set(contadorRef, { ultimo: seq });
            tx.set(idxRef, { despesa: ref.id });
            tx.set(ref, { ...base(l), id: l.id });
            resultado.gravadas++;
          } else {
            const ref = db().collection('despesas').doc();
            const r = await reservarId(tx, ano, l.unidade, l.origemCodigo, l.financiador || FINANCIADOR_NENHUM);
            tx.set(r.contadorRef, { ultimo: r.seq });
            tx.set(r.idxRef, { despesa: ref.id });
            tx.set(ref, { ...base(l), id: r.id });
            resultado.geradas.push({ linha: l, id: r.id });
            resultado.gravadas++;
          }
        });
        tick();
      }
      return resultado;
    },
  };

  return { usuarios, unidades, origens, financiadores, despesas, ID_REGEX, montarId,
           carregarTabelasIniciais: origens.carregarIniciais };
})();
