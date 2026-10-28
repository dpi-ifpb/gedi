/* ================= Repositório de dados (camada única de acesso ao banco) =================
 * TODA leitura e gravação de despesas, financiadores, tabelas de apoio e usuários
 * passa por aqui. As telas nunca chamam o Firebase diretamente.
 *
 * Para migrar para outro banco (PostgreSQL via API, Supabase etc.), reescreva só
 * este arquivo mantendo as mesmas funções e o mesmo formato dos objetos
 * devolvidos — o resto do painel não precisa mudar.
 *
 * Formato de uma despesa devolvida pelo repositório:
 *   { docId, id, ano, unidade (código, ex. "AR"), descricao, valor (número),
 *     origem (sigla, ex. "RP2"), natureza, situacao, financiador ("0000"…),
 *     ativo, criadoPor, criadoEm (Date|null), atualizadoPor, atualizadoEm (Date|null) }
 */
const Repo = (() => {
  const db = () => firebase.firestore();
  const agora = () => firebase.firestore.FieldValue.serverTimestamp();
  const emailAtual = () => ((firebase.auth().currentUser || {}).email || '').toLowerCase();
  const paraData = (ts) => (ts && typeof ts.toDate === 'function') ? ts.toDate() : null;

  const arred2 = (v) => Math.round(Number(v) * 100) / 100;
  const pad4 = (n) => String(n).padStart(4, '0');

  // "#AR.0001.2.0000" + 2026 -> "2026_AR.0001.2.0000" (id do documento no Firestore)
  const docIdDespesa = (ano, id) => `${ano}_${id.replace('#', '')}`;
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
    async perfisDoUsuario(email){
      const doc = await db().collection('usuarios').doc(email.toLowerCase()).get();
      return doc.exists ? perfisDe(doc.data()) : null; // null = não cadastrado
    },
    observar(onDados, onErro){
      return observarColecao('usuarios', (email, d) => ({
        email, perfis: perfisDe(d), legado: !Array.isArray(d.perfis) && d.grupo ? d.grupo : null,
        atualizadoPor: d.atualizadoPor || '', atualizadoEm: paraData(d.atualizadoEm),
      }), onDados, onErro);
    },
    // set() substitui o documento inteiro — remove o campo antigo "grupo"
    salvar(email, perfis){
      return db().collection('usuarios').doc(email.toLowerCase()).set({
        perfis, atualizadoPor: emailAtual(), atualizadoEm: agora(),
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

  /* ---------------- despesas ---------------- */
  function mapearDespesa(docId, d){
    return {
      docId, id: d.id, ano: d.ano, unidade: d.unidade, descricao: d.descricao || '',
      valor: Number(d.valor) || 0, origem: d.origem || '', natureza: d.natureza || '',
      situacao: d.situacao || '', financiador: d.financiador || FINANCIADOR_NENHUM,
      ativo: d.ativo !== false,
      criadoPor: d.criadoPor || '', criadoEm: paraData(d.criadoEm),
      atualizadoPor: d.atualizadoPor || '', atualizadoEm: paraData(d.atualizadoEm),
    };
  }

  function camposDespesa(dados){
    return {
      unidade: dados.unidade,
      descricao: String(dados.descricao).trim(),
      valor: arred2(dados.valor),
      origem: dados.origem,
      natureza: dados.natureza,
      situacao: dados.situacao,
      financiador: dados.financiador || FINANCIADOR_NENHUM,
    };
  }

  /* Reserva o próximo sequencial da unidade no ano e grava a despesa, tudo numa
   * transação: se duas pessoas salvarem ao mesmo tempo, o Firestore repete uma
   * das transações e cada uma recebe um número diferente. Se o número já estiver
   * ocupado (ex.: veio de uma importação), pula para o seguinte. */
  async function criarComIdGerado(dados, origemCodigo, extras){
    const ano = Number(dados.ano);
    const campos = camposDespesa(dados);
    const contadorRef = db().collection('contadores').doc(`${ano}_${campos.unidade}`);
    return db().runTransaction(async tx => {
      const cont = await tx.get(contadorRef);
      let seq = (cont.exists ? cont.data().ultimo : 0) + 1;
      let id, ref;
      for(let tentativas = 0; ; tentativas++){
        if(seq > 9999) throw new Error(`A unidade ${campos.unidade} atingiu o limite de 9999 despesas em ${ano}.`);
        id = montarId(campos.unidade, seq, origemCodigo, campos.financiador);
        ref = db().collection('despesas').doc(docIdDespesa(ano, id));
        if(!(await tx.get(ref)).exists) break;
        if(tentativas > 50) throw new Error('Não foi possível reservar um número livre. Tente novamente.');
        seq++;
      }
      tx.set(contadorRef, { ultimo: seq });
      tx.set(ref, {
        id, ano, ...campos, ativo: true, ...(extras || {}),
        criadoPor: emailAtual(), criadoEm: agora(),
        atualizadoPor: emailAtual(), atualizadoEm: agora(),
      });
      return id;
    });
  }

  const despesas = {
    observar(onDados, onErro){
      return observarColecao('despesas', mapearDespesa, onDados, onErro);
    },
    /* dados: { ano, unidade, descricao, valor, origem, natureza, situacao, financiador }
     * origemCodigo: caractere da origem (ex. "2" para RP2). Devolve o ID gerado. */
    criar(dados, origemCodigo){
      return criarComIdGerado(dados, origemCodigo);
    },
    // ID e ano nunca são alterados — só os demais campos
    atualizar(docId, dados){
      return db().collection('despesas').doc(docId).update({
        ...camposDespesa(dados), atualizadoPor: emailAtual(), atualizadoEm: agora(),
      });
    },
    definirAtivo(docId, ativo){
      return db().collection('despesas').doc(docId).update({
        ativo: !!ativo, atualizadoPor: emailAtual(), atualizadoEm: agora(),
      });
    },

    /* Importação em lote (administrador).
     * linhas: [{ id|null, ano, unidade, descricao, valor, origem, natureza, situacao, financiador, origemCodigo }]
     *   - com id: grava com o ID informado (se ainda não existir) e ajusta o contador;
     *   - sem id: gera o ID normalmente, na ordem em que as linhas vieram.
     * onProgresso(feitos, total). Devolve { gravadas, geradas:[{linha,id}], ignoradas:[...] }. */
    async importar(linhas, onProgresso){
      const total = linhas.length;
      let feitos = 0;
      const resultado = { gravadas: 0, geradas: [], ignoradas: [] };
      const tick = () => { feitos++; if(onProgresso) onProgresso(feitos, total); };

      // 1) linhas que já têm ID: gravadas uma a uma (10 em paralelo). Não usamos
      //    "batch" porque cada gravação consulta o perfil do usuário nas regras de
      //    segurança, e um lote grande estouraria o limite de consultas por requisição.
      const comId = linhas.filter(l => l.id);
      const maiores = {}; // "2026_AR" -> maior sequencial visto
      for(let i = 0; i < comId.length; i += 10){
        const fatia = comId.slice(i, i + 10);
        await Promise.all(fatia.map(async l => {
          const m = l.id.match(ID_REGEX);
          const chave = `${l.ano}_${m[1]}`;
          maiores[chave] = Math.max(maiores[chave] || 0, parseInt(m[2], 10));
          const ref = db().collection('despesas').doc(docIdDespesa(l.ano, l.id));
          if((await ref.get()).exists){ resultado.ignoradas.push(l); tick(); return; }
          await ref.set({
            id: l.id, ano: Number(l.ano), ...camposDespesa(l), ativo: true, importado: true,
            criadoPor: emailAtual(), criadoEm: agora(), atualizadoPor: emailAtual(), atualizadoEm: agora(),
          });
          resultado.gravadas++;
          tick();
        }));
      }

      // 2) contadores: só sobem (nunca voltam para trás)
      for(const [chave, maior] of Object.entries(maiores)){
        const ref = db().collection('contadores').doc(chave);
        await db().runTransaction(async tx => {
          const c = await tx.get(ref);
          const atual = c.exists ? c.data().ultimo : 0;
          if(maior > atual) tx.set(ref, { ultimo: maior });
        });
      }

      // 3) linhas sem ID: geração normal, uma a uma, na ordem da lista
      for(const l of linhas.filter(l => !l.id)){
        const id = await criarComIdGerado(l, l.origemCodigo, { importado: true });
        resultado.geradas.push({ linha: l, id });
        resultado.gravadas++;
        tick();
      }
      return resultado;
    },
  };

  return { usuarios, unidades, origens, financiadores, despesas, ID_REGEX, docIdDespesa, montarId,
           carregarTabelasIniciais: origens.carregarIniciais };
})();
