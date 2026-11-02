/* ================= Repositório de dados (camada única de acesso ao banco) =================
 * TODA leitura e gravação passa por aqui. As telas nunca chamam o Firebase diretamente.
 * Para migrar de banco, reescreva só este arquivo mantendo as mesmas funções e o mesmo
 * formato dos objetos devolvidos.
 *
 * AUDITORIA E HISTÓRICO (todas as entidades)
 *   Todo documento guarda criadoPor/criadoEm/atualizadoPor/atualizadoEm e um número de
 *   versão. Cada gravação cria, na MESMA transação, um registro em "historico"
 *   ({coleção}_{id}_{versão}) com quem fez, quando, a ação e o que mudou (de → para).
 *   As regras de segurança recusam qualquer gravação sem esse registro.
 *
 * ID DA DESPESA (gerado no deferimento)
 *   #UU.NNNN.O.FFF[.HHHHH]
 *   UU    unidade executora (quem recebe o recurso)
 *   NNNN  sequencial da unidade no ano
 *   O     código da origem
 *   FFF   financiador (000 = sem financiador)
 *   HHHHH unidades beneficiadas em hexadecimal — só quando as beneficiárias não são
 *         apenas a executora. Cada caractere = 4 unidades, na ordem da tabela de
 *         posições do ano (1ª unidade = bit mais à esquerda do 1º caractere).
 *   A identidade permanente é a "base" (#UU.NNNN.O.FFF); o bloco de beneficiárias
 *   pode ser ajustado depois, com histórico.
 */
const Repo = (() => {
  const db = () => firebase.firestore();
  const agora = () => firebase.firestore.FieldValue.serverTimestamp();
  const emailAtual = () => ((firebase.auth().currentUser || {}).email || '').toLowerCase();
  const paraData = (ts) => (ts && typeof ts.toDate === 'function') ? ts.toDate() : null;
  const arred2 = (v) => Math.round(Number(v) * 100) / 100;
  const META = ['criadoPor', 'criadoEm', 'atualizadoPor', 'atualizadoEm', 'versao'];

  /* ---------------- ID ---------------- */
  const montarIdBase = (unidade, seq, origemCodigo, financiador) =>
    `#${unidade}.${String(seq).padStart(4, '0')}.${origemCodigo}.${financiador}`;
  const ID_REGEX = /^#([A-Z]{2})\.(\d{4})\.([0-9A-Z])\.(\d{3})(?:\.([0-9A-F]{1,8}))?$/;
  const ID_LEGADO_REGEX = /^#([A-Z]{2})\.(\d{4})\.([0-9A-Z])\.(\d{4})$/; // planilha antiga (financiador com 4 dígitos)

  // beneficiárias → hexadecimal, pela tabela de posições (lista ordenada de códigos)
  function codificarBeneficiarias(beneficiarias, posicoes){
    const largura = Math.ceil(posicoes.length / 4);
    const bits = posicoes.map(c => beneficiarias.includes(c) ? '1' : '0').join('').padEnd(largura * 4, '0');
    let hex = '';
    for(let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16).toUpperCase();
    return hex;
  }
  function decodificarBeneficiarias(hex, posicoes){
    const bits = hex.split('').map(c => parseInt(c, 16).toString(2).padStart(4, '0')).join('');
    return posicoes.filter((_, i) => bits[i] === '1');
  }
  // ID completo: base + bloco de beneficiárias (se não for só a executora)
  function idCompleto(idBase, executora, beneficiarias, posicoes){
    const bens = (beneficiarias || []).filter(Boolean);
    const soExecutora = !bens.length || (bens.length === 1 && bens[0] === executora);
    if(soExecutora) return idBase;
    if(!posicoes || !posicoes.length) throw new Error('Cadastre a tabela de posições das unidades deste ano (Administração → Unidades e Origens) para indicar beneficiárias.');
    const fora = bens.filter(c => !posicoes.includes(c));
    if(fora.length) throw new Error(`Unidade(s) fora da tabela de posições do ano: ${fora.join(', ')}.`);
    return `${idBase}.${codificarBeneficiarias(bens, posicoes)}`;
  }

  /* ---------------- gravação com auditoria + histórico ----------------
   * escrever() roda DENTRO de uma transação, depois de todas as leituras.
   * antes = dados atuais do documento (null se não existe). */
  function semMeta(o){ const r = {}; Object.keys(o || {}).forEach(k => { if(!META.includes(k)) r[k] = o[k]; }); return r; }
  function limpar(v){ return v === undefined ? null : v; }
  function diferencas(antes, mudancas){
    const alt = {};
    Object.keys(semMeta(mudancas)).forEach(k => {
      const de = antes ? limpar(antes[k]) : null;
      const para = limpar(mudancas[k]);
      if(JSON.stringify(de) !== JSON.stringify(para)) alt[k] = { de, para };
    });
    return alt;
  }
  function escrever(tx, ref, antes, mudancas, acao){
    const col = ref.parent.id;
    const versao = ((antes && antes.versao) || 0) + 1;
    const hist = db().collection('historico').doc(`${col}_${ref.id}_${versao}`);
    if(acao === 'excluir'){
      tx.set(hist, { entidade: col, docId: ref.id, versao, acao, por: emailAtual(), em: agora(), alteracoes: { _documento: { de: semMeta(antes), para: null } } });
      tx.delete(ref);
      return;
    }
    const meta = { atualizadoPor: emailAtual(), atualizadoEm: agora(), versao };
    if(antes){
      tx.update(ref, { ...mudancas, ...meta });
    } else {
      tx.set(ref, { ...mudancas, ...meta, criadoPor: emailAtual(), criadoEm: agora() });
    }
    tx.set(hist, { entidade: col, docId: ref.id, versao, acao: acao || (antes ? 'alterar' : 'criar'),
      por: emailAtual(), em: agora(), alteracoes: diferencas(antes, mudancas) });
  }
  async function ler(tx, ref){ const s = await tx.get(ref); return s.exists ? s.data() : null; }
  // gravação simples de um documento
  async function salvar(ref, mudancas, opcoes){
    const o = opcoes || {};
    return db().runTransaction(async tx => {
      const antes = await ler(tx, ref);
      if(o.criar && antes) throw new Error(o.msgExiste || 'Registro já existe.');
      if(o.exigirExistente && !antes) throw new Error('Registro não encontrado.');
      escrever(tx, ref, antes, mudancas, o.acao);
    });
  }
  const auditoria = d => ({
    criadoPor: d.criadoPor || '', criadoEm: paraData(d.criadoEm),
    atualizadoPor: d.atualizadoPor || '', atualizadoEm: paraData(d.atualizadoEm), versao: d.versao || 0,
  });

  function observarColecao(nome, mapear, onDados, onErro, consulta){
    return (consulta || db().collection(nome)).onSnapshot(
      snap => onDados(snap.docs.map(d => mapear(d.id, d.data()))),
      err => { console.error(`[repo] ${nome}:`, err); if(onErro) onErro(err); }
    );
  }

  /* ---------------- histórico (consulta) ---------------- */
  const historico = {
    async listar(entidade, docId){
      const snap = await db().collection('historico').where('entidade', '==', entidade).where('docId', '==', docId).get();
      return snap.docs.map(d => { const x = d.data(); return { ...x, em: paraData(x.em) }; }).sort((a, b) => b.versao - a.versao);
    },
  };

  /* ---------------- usuários ---------------- */
  function perfisDe(dados){
    if(!dados) return [];
    if(Array.isArray(dados.perfis)) return dados.perfis;
    return PERFIS_LEGADO[dados.grupo] || [];
  }
  const usuarios = {
    async acessoDoUsuario(email){
      const doc = await db().collection('usuarios').doc(email.toLowerCase()).get();
      if(!doc.exists) return null;
      const d = doc.data();
      return { perfis: perfisDe(d), unidades: Array.isArray(d.unidades) ? d.unidades : [] };
    },
    observar(onDados, onErro){
      return observarColecao('usuarios', (email, d) => ({
        email, perfis: perfisDe(d), unidades: Array.isArray(d.unidades) ? d.unidades : [],
        legado: !Array.isArray(d.perfis) && d.grupo ? d.grupo : null, ...auditoria(d),
      }), onDados, onErro);
    },
    // unidades: só para o perfil registrador_despesas
    salvar(email, perfis, unidadesLista, novo){
      const ref = db().collection('usuarios').doc(email.toLowerCase());
      const dados = { perfis, unidades: perfis.includes('registrador_despesas') ? (unidadesLista || []) : [] };
      return db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        if(novo && antes) throw new Error('Este e-mail já está cadastrado.');
        escrever(tx, ref, antes, dados);
      });
    },
    excluir(email){
      const ref = db().collection('usuarios').doc(email.toLowerCase());
      return db().runTransaction(async tx => { escrever(tx, ref, await ler(tx, ref), null, 'excluir'); });
    },
  };

  /* ---------------- tabelas de apoio ---------------- */
  const unidades = {
    observar(onDados, onErro){
      return observarColecao('unidades', (codigo, d) => ({ codigo, nome: d.nome, ug: d.ug || '', ativo: d.ativo !== false, ...auditoria(d) }), onDados, onErro);
    },
    criar(codigo, nome, ug){
      return salvar(db().collection('unidades').doc(codigo), { nome, ug: ug || '', ativo: true }, { criar: true, msgExiste: `Já existe uma unidade com o código ${codigo}.` });
    },
    atualizar(codigo, dados){ return salvar(db().collection('unidades').doc(codigo), dados, { exigirExistente: true, acao: 'ativo' in dados ? (dados.ativo ? 'reativar' : 'inativar') : 'alterar' }); },
  };
  const origens = {
    observar(onDados, onErro){
      return observarColecao('origens', (sigla, d) => ({ sigla, codigo: d.codigo, rp: d.rp || '', ativo: d.ativo !== false, ...auditoria(d) }), onDados, onErro);
    },
    async criar(sigla, codigo, rp){
      const repetido = await db().collection('origens').where('codigo', '==', codigo).limit(1).get();
      if(!repetido.empty) throw new Error(`O código "${codigo}" já é usado pela origem ${repetido.docs[0].id}.`);
      return salvar(db().collection('origens').doc(sigla), { codigo, rp: rp || '', ativo: true }, { criar: true, msgExiste: `A origem ${sigla} já existe.` });
    },
    atualizar(sigla, dados){ return salvar(db().collection('origens').doc(sigla), dados, { exigirExistente: true, acao: 'ativo' in dados ? (dados.ativo ? 'reativar' : 'inativar') : 'alterar' }); },
  };
  const acoes = {
    observar(onDados, onErro){
      return observarColecao('acoes', (codigo, d) => ({ codigo, descricao: d.descricao || '', ativo: d.ativo !== false, ...auditoria(d) }), onDados, onErro);
    },
    criar(codigo, descricao){
      return salvar(db().collection('acoes').doc(codigo), { descricao, ativo: true }, { criar: true, msgExiste: `A ação ${codigo} já existe.` });
    },
    atualizar(codigo, dados){ return salvar(db().collection('acoes').doc(codigo), dados, { exigirExistente: true, acao: 'ativo' in dados ? (dados.ativo ? 'reativar' : 'inativar') : 'alterar' }); },
  };
  // PTRES: ptres/{código} → { acao, descricao, ativo } (um PTRES pertence a uma ação)
  const ptres = {
    observar(onDados, onErro){
      return observarColecao('ptres', (codigo, d) => ({ codigo, acao: d.acao || '', descricao: d.descricao || '', ativo: d.ativo !== false, ...auditoria(d) }), onDados, onErro);
    },
    criar(codigo, acao, descricao){
      return salvar(db().collection('ptres').doc(codigo), { acao, descricao: descricao || '', ativo: true }, { criar: true, msgExiste: `O PTRES ${codigo} já existe.` });
    },
    atualizar(codigo, dados){ return salvar(db().collection('ptres').doc(codigo), dados, { exigirExistente: true, acao: 'ativo' in dados ? (dados.ativo ? 'reativar' : 'inativar') : 'alterar' }); },
  };
  // tabela de posições das unidades no bloco de beneficiárias, por ano: posicoes/{ano} → { unidades: [...] }
  const posicoes = {
    observar(onDados, onErro){
      return observarColecao('posicoes', (ano, d) => ({ ano: Number(ano), unidades: d.unidades || [], ...auditoria(d) }), onDados, onErro);
    },
    criar(ano, lista){
      return salvar(db().collection('posicoes').doc(String(ano)), { unidades: lista }, { criar: true, msgExiste: `A tabela de ${ano} já existe.` });
    },
    // só acrescenta ao final: posições já usadas em IDs nunca mudam
    acrescentar(ano, codigo){
      const ref = db().collection('posicoes').doc(String(ano));
      return db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        if(!antes) throw new Error('Tabela não encontrada.');
        if(antes.unidades.includes(codigo)) throw new Error('A unidade já está na tabela.');
        escrever(tx, ref, antes, { unidades: [...antes.unidades, codigo] });
      });
    },
  };
  // carga inicial: só cria o que ainda não existe
  async function carregarTabelasIniciais(){
    for(const [codigo, nome] of UNIDADES_INICIAIS){
      await salvar(db().collection('unidades').doc(codigo), { nome, ativo: true }, { criar: true }).catch(() => {});
    }
    for(const [sigla, codigo, rp] of ORIGENS_INICIAIS){
      await salvar(db().collection('origens').doc(sigla), { codigo, rp: rp || '', ativo: true }, { criar: true }).catch(() => {});
    }
  }

  const financiadores = {
    observar(onDados, onErro){
      return observarColecao('financiadores', (codigo, d) => ({ codigo, descricao: d.descricao, ativo: d.ativo !== false, ...auditoria(d) }), onDados, onErro);
    },
    criar(codigo, descricao){
      return salvar(db().collection('financiadores').doc(codigo), { descricao, ativo: true }, { criar: true, msgExiste: `O código ${codigo} já está em uso por outro financiador.` });
    },
    atualizar(codigo, dados){ return salvar(db().collection('financiadores').doc(codigo), dados, { exigirExistente: true, acao: 'ativo' in dados ? (dados.ativo ? 'reativar' : 'inativar') : 'alterar' }); },
  };

  /* ---------------- receitas (previsão e chegada) ----------------
   * receitas/{auto} → { ano, unidade, ptres, acao, origem, natureza, valor, previsao (bool),
   *                     data, documento, observacao, ativo }
   * Ajustes de previsão: novo lançamento com valor negativo ou positivo. */
  const receitas = {
    observar(onDados, onErro){
      return observarColecao('receitas', (docId, d) => ({
        docId, ano: d.ano, unidade: d.unidade, ptres: d.ptres || '', acao: d.acao || '', origem: d.origem, natureza: d.natureza,
        valor: Number(d.valor) || 0, previsao: !!d.previsao, data: d.data || '', documento: d.documento || '',
        observacao: d.observacao || '', ativo: d.ativo !== false, ...auditoria(d),
      }), onDados, onErro);
    },
    campos(x){
      return { ano: Number(x.ano), unidade: x.unidade, ptres: x.ptres || '', acao: x.acao, origem: x.origem, natureza: x.natureza,
        valor: arred2(x.valor), previsao: !!x.previsao, data: x.data || '', documento: String(x.documento || '').trim(),
        observacao: String(x.observacao || '').trim() };
    },
    criar(x){ return salvar(db().collection('receitas').doc(), { ...receitas.campos(x), ativo: true }); },
    atualizar(docId, x){ return salvar(db().collection('receitas').doc(docId), receitas.campos(x), { exigirExistente: true }); },
    definirAtivo(docId, ativo){ return salvar(db().collection('receitas').doc(docId), { ativo: !!ativo }, { exigirExistente: true, acao: ativo ? 'reativar' : 'inativar' }); },
  };

  /* ---------------- transferências ----------------
   * Três tipos (campo "tipo"):
   *   despesa  automática: a fonte (Reitoria) banca uma despesa de outra unidade. Objeto definido.
   *            id "auto_{docId da despesa}", código = base do ID da despesa (#AR.0001.2.000).
   *   repasse  manual: recurso repassado a outra unidade, que prioriza os pagamentos. Sem objeto.
   *            código #TR.NNNN (sequencial do ano).
   *   troca    troca orçamentária: mesma unidade, muda PTRES/ação, origem ou natureza. Exige pedido
   *            formal (processo). Código #TO.NNNN.
   * de / para = { unidade, ptres, acao, origem, natureza }; valor = PLANEJADO.
   * lancamentos = documentos que realizam a transferência (NC no Tesouro Gerencial; para a troca,
   *   o documento da alteração). Anulação = valor negativo. realizado = soma dos lançamentos.
   * status (calculado): prevista (nada lançado) · parcial (realizado ≠ planejado) · realizada (bate) · cancelada.
   */
  const TIPOS_TRANSF = ['despesa', 'repasse', 'troca'];
  function statusTransferencia(t){
    if(t.cancelada) return 'cancelada';
    const realizado = (t.lancamentos || []).reduce((s, l) => s + (Number(l.valor) || 0), 0);
    if(Math.abs(realizado) < 0.005) return 'prevista';
    return Math.abs(realizado - t.valor) < 0.005 ? 'realizada' : 'parcial';
  }
  const ponta = p => ({ unidade: p.unidade, ptres: p.ptres || '', acao: p.acao || '', origem: p.origem, natureza: p.natureza });
  const transferencias = {
    observar(onDados, onErro){
      return observarColecao('transferencias', (docId, d) => {
        const lanc = Array.isArray(d.lancamentos) ? d.lancamentos : [];
        return {
          docId, ano: d.ano, tipo: d.tipo || (d.automatica ? 'despesa' : 'repasse'), codigo: d.codigo || '',
          de: d.de || {}, para: d.para || {}, valor: Number(d.valor) || 0, status: d.status || 'prevista',
          lancamentos: lanc, realizado: arred2(lanc.reduce((s, l) => s + (Number(l.valor) || 0), 0)),
          justificativa: d.justificativa || '', processo: d.processo || '', documento: d.documento || '',
          automatica: d.tipo === 'despesa' || !!d.automatica, despesa: d.despesa || null, cancelada: !!d.cancelada,
          ativo: d.ativo !== false, ...auditoria(d),
        };
      }, onDados, onErro);
    },
    campos(x){
      return { ano: Number(x.ano), de: ponta(x.de), para: ponta(x.para), valor: arred2(x.valor),
        justificativa: String(x.justificativa || '').trim(), processo: String(x.processo || '').trim(),
        documento: String(x.documento || '').trim() };
    },
    // repasse ou troca (manuais), com código sequencial do ano
    async criar(x){
      if(!['repasse', 'troca'].includes(x.tipo)) throw new Error('Tipo de transferência inválido.');
      const ano = Number(x.ano);
      const contRef = db().collection('contadores').doc(`${ano}_${x.tipo === 'troca' ? 'TO' : 'TR'}`);
      const ref = db().collection('transferencias').doc();
      return db().runTransaction(async tx => {
        const c = await tx.get(contRef);
        const seq = (c.exists ? c.data().ultimo : 0) + 1;
        const codigo = `#${x.tipo === 'troca' ? 'TO' : 'TR'}.${String(seq).padStart(4, '0')}`;
        const dados = { ...transferencias.campos(x), tipo: x.tipo, codigo, lancamentos: [], cancelada: false, automatica: false, despesa: null, ativo: true };
        dados.status = statusTransferencia(dados);
        tx.set(contRef, { ultimo: seq });
        escrever(tx, ref, null, dados, 'criar');
        return codigo;
      });
    },
    async atualizar(docId, x){
      const ref = db().collection('transferencias').doc(docId);
      return db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        if(!antes) throw new Error('Transferência não encontrada.');
        if(antes.tipo === 'despesa') throw new Error('A transferência automática acompanha a despesa e não é editada aqui.');
        const mud = transferencias.campos(x);
        mud.status = statusTransferencia({ ...antes, ...mud });
        escrever(tx, ref, antes, mud);
      });
    },
    // lançamento de NC / anulação / documento de alteração: l = { tipo, numero, data, valor (negativo na anulação) }
    async adicionarLancamento(docId, l){
      const ref = db().collection('transferencias').doc(docId);
      return db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        if(!antes) throw new Error('Transferência não encontrada.');
        if(antes.cancelada) throw new Error('Transferência cancelada.');
        const lanc = [...(antes.lancamentos || []), { ...l, valor: arred2(l.valor), id: Math.random().toString(36).slice(2, 10), por: emailAtual(), registradoEm: new Date().toISOString() }];
        escrever(tx, ref, antes, { lancamentos: lanc, status: statusTransferencia({ ...antes, lancamentos: lanc }) }, l.valor < 0 ? 'lançar anulação' : 'lançar documento');
      });
    },
    async removerLancamento(docId, lancId){
      const ref = db().collection('transferencias').doc(docId);
      return db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        const lanc = (antes.lancamentos || []).filter(x => x.id !== lancId);
        escrever(tx, ref, antes, { lancamentos: lanc, status: statusTransferencia({ ...antes, lancamentos: lanc }) }, 'excluir lançamento');
      });
    },
    async definirCancelada(docId, cancelada){
      const ref = db().collection('transferencias').doc(docId);
      return db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        if(antes.tipo === 'despesa') throw new Error('A transferência automática é cancelada pela despesa (inativando-a).');
        if(cancelada && (antes.lancamentos || []).length) throw new Error('Há documentos lançados. Lance a anulação antes de cancelar.');
        escrever(tx, ref, antes, { cancelada: !!cancelada, status: statusTransferencia({ ...antes, cancelada: !!cancelada }) }, cancelada ? 'cancelar' : 'reativar');
      });
    },
  };

  /* ---------------- despesas ---------------- */
  const STATUS = { PENDENTE: 'pendente', DEFERIDA: 'deferida', INDEFERIDA: 'indeferida' };
  const FONTE_PADRAO = 'RE';
  const SEM_TRANSFERENCIA = ['RE', 'IF']; // Reitoria e "- Institucional -" usam o recurso da própria Reitoria

  function mapearDespesa(docId, d){
    const status = d.status || (d.id ? STATUS.DEFERIDA : STATUS.PENDENTE);
    const a = d.analise || {};
    return {
      docId, id: d.id || null, idBase: d.idBase || d.id || null, ano: d.ano, unidade: d.unidade,
      fonte: d.fonte || FONTE_PADRAO, descricao: d.descricao || '',
      valor: Number(d.valor) || 0, natureza: d.natureza || '', processo: d.processo || '', linkSuap: d.linkSuap || '',
      status, origem: d.origem || '', ptres: d.ptres || '', acao: d.acao || '', financiador: d.financiador || '',
      beneficiarias: Array.isArray(d.beneficiarias) ? d.beneficiarias : (d.unidade ? [d.unidade] : []),
      transferencia: d.transferencia || null,
      analise: { observacao: a.observacao || '', por: a.por || '', em: paraData(a.em) },
      situacaoLegado: d.situacaoLegado || '', percentual: !!d.percentual,
      empenhos: Array.isArray(d.empenhos) ? d.empenhos : [],
      pagamentos: Array.isArray(d.pagamentos) ? d.pagamentos : [],
      execucao: Array.isArray(d.execucao) ? d.execucao : [],
      ativo: d.ativo !== false, ...auditoria(d),
    };
  }
  function camposRegistro(x){
    return {
      ano: Number(x.ano), unidade: x.unidade, fonte: x.fonte || FONTE_PADRAO,
      descricao: String(x.descricao).trim(), valor: arred2(x.valor), natureza: x.natureza,
      processo: String(x.processo || '').trim(), linkSuap: String(x.linkSuap || '').trim(), percentual: !!x.percentual,
    };
  }
  const precisaTransferencia = d => d.status === STATUS.DEFERIDA && d.ativo !== false
    && d.unidade !== d.fonte && !(SEM_TRANSFERENCIA.includes(d.unidade) && SEM_TRANSFERENCIA.includes(d.fonte || FONTE_PADRAO));

  /* Mantém a transferência automática coerente com a despesa (mesma transação).
   * O PLANEJADO acompanha sempre a despesa (valor, PTRES, origem, natureza). Se já houver NC
   * lançada e as pontas mudarem, o GEDI avisa para conferir as NCs. Inativar a despesa cancela
   * a transferência só se não houver NC; havendo, ela fica e o GEDI pede a anulação. */
  function sincronizarTransferencia(tx, docId, despesaDepois, transfAntes, avisos){
    const ref = db().collection('transferencias').doc(`auto_${docId}`);
    const deveExistir = precisaTransferencia(despesaDepois);
    const pt = u => ({ unidade: u, ptres: despesaDepois.ptres || '', acao: despesaDepois.acao, origem: despesaDepois.origem, natureza: despesaDepois.natureza });
    const alvo = {
      ano: despesaDepois.ano, codigo: despesaDepois.idBase, de: pt(despesaDepois.fonte || FONTE_PADRAO), para: pt(despesaDepois.unidade),
      valor: despesaDepois.valor, justificativa: `Despesa ${despesaDepois.id}: ${despesaDepois.descricao}`,
    };
    if(!transfAntes){
      if(!deveExistir) return null;
      const dados = { ...alvo, tipo: 'despesa', lancamentos: [], cancelada: false, processo: '', documento: '', automatica: true, despesa: docId, ativo: true };
      dados.status = statusTransferencia(dados);
      escrever(tx, ref, null, dados, 'criar (deferimento)');
      return ref.id;
    }
    const temLanc = (transfAntes.lancamentos || []).length > 0;
    if(!deveExistir){
      if(temLanc){ avisos.push('A transferência desta despesa já tem NC lançada e não foi cancelada. Registre a anulação da NC na tela Transferências.'); return ref.id; }
      if(!transfAntes.cancelada) escrever(tx, ref, transfAntes, { cancelada: true, status: 'cancelada' }, 'cancelar (despesa)');
      return ref.id;
    }
    const mud = { ...alvo, cancelada: false };
    mud.status = statusTransferencia({ ...transfAntes, ...mud });
    if(temLanc && (JSON.stringify(alvo.de) !== JSON.stringify(transfAntes.de) || JSON.stringify(alvo.para) !== JSON.stringify(transfAntes.para)))
      avisos.push('A transferência já tem NC lançada e PTRES, origem ou natureza mudaram: confira as NCs.');
    if(temLanc && alvo.valor !== transfAntes.valor)
      avisos.push(`O valor planejado da transferência passou a ${alvo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}; ela fica parcial até as NCs somarem esse valor.`);
    if(JSON.stringify(diferencas(transfAntes, mud)) !== '{}') escrever(tx, ref, transfAntes, mud, 'alterar (despesa)');
    return ref.id;
  }

  async function reservarId(tx, ano, unidade, origemCodigo, financiador){
    const contadorRef = db().collection('contadores').doc(`${ano}_${unidade}`);
    const cont = await tx.get(contadorRef);
    let seq = (cont.exists ? cont.data().ultimo : 0) + 1;
    for(let tentativas = 0; ; tentativas++){
      if(seq > 9999) throw new Error(`A unidade ${unidade} atingiu o limite de 9999 despesas em ${ano}.`);
      const idBase = montarIdBase(unidade, seq, origemCodigo, financiador);
      const idxRef = db().collection('ids').doc(`${ano}_${idBase.replace('#', '')}`);
      if(!(await tx.get(idxRef)).exists) return { idBase, seq, contadorRef, idxRef };
      if(tentativas > 50) throw new Error('Não foi possível reservar um número livre. Tente novamente.');
      seq++;
    }
  }
  const lerPosicoes = async (tx, ano) => {
    const p = await ler(tx, db().collection('posicoes').doc(String(ano)));
    return p ? p.unidades : null;
  };

  const despesas = {
    STATUS, FONTE_PADRAO,
    observar(onDados, onErro, unidadesLista){
      const col = db().collection('despesas');
      const mapear = snap => snap.docs.map(d => mapearDespesa(d.id, d.data()));
      const falha = err => { console.error('[repo] despesas:', err); if(onErro) onErro(err); };
      if(!Array.isArray(unidadesLista)) return col.onSnapshot(snap => onDados(mapear(snap)), falha);
      if(!unidadesLista.length){ onDados([]); return () => {}; }
      const partes = {};
      const unsubs = unidadesLista.map(u => col.where('unidade', '==', u).onSnapshot(snap => {
        partes[u] = mapear(snap);
        if(Object.keys(partes).length === unidadesLista.length) onDados([].concat(...Object.values(partes)));
      }, falha));
      return () => unsubs.forEach(f => f());
    },

    // REGISTRO: pendente, sem ID
    registrar(x){
      return salvar(db().collection('despesas').doc(), {
        ...camposRegistro(x), status: STATUS.PENDENTE, id: null, idBase: null, origem: null, acao: null,
        financiador: null, beneficiarias: [x.unidade], ativo: true,
      }, { acao: 'registrar' });
    },
    // edição dos campos do registro; em deferida, sincroniza a transferência automática
    async atualizarRegistro(docId, x){
      const ref = db().collection('despesas').doc(docId);
      const tRef = db().collection('transferencias').doc(`auto_${docId}`);
      const avisos = [];
      await db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        if(!antes) throw new Error('Despesa não encontrada.');
        const campos = camposRegistro(x);
        if(antes.status === STATUS.DEFERIDA){ delete campos.ano; delete campos.unidade; } // ano e executora fazem parte do ID
        const transfAntes = antes.status === STATUS.DEFERIDA ? await ler(tx, tRef) : null;
        escrever(tx, ref, antes, campos);
        if(antes.status === STATUS.DEFERIDA) sincronizarTransferencia(tx, docId, { ...antes, ...campos }, transfAntes, avisos);
      });
      return avisos;
    },

    /* ANÁLISE · deferir: gera o ID, grava a análise e cria a transferência automática.
     * a = { origem, origemCodigo, acao, financiador, beneficiarias:[], observacao } */
    async deferir(docId, a){
      const ref = db().collection('despesas').doc(docId);
      const tRef = db().collection('transferencias').doc(`auto_${docId}`);
      const financiador = a.financiador || FINANCIADOR_NENHUM;
      return db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        if(!antes) throw new Error('Despesa não encontrada.');
        if(antes.status === STATUS.DEFERIDA || antes.idBase) throw new Error('Esta despesa já foi deferida.');
        const pos = await lerPosicoes(tx, antes.ano);
        const transfAntes = await ler(tx, tRef);
        const r = await reservarId(tx, antes.ano, antes.unidade, a.origemCodigo, financiador);
        const id = idCompleto(r.idBase, antes.unidade, a.beneficiarias, pos);
        const mud = {
          status: STATUS.DEFERIDA, idBase: r.idBase, id, origem: a.origem, ptres: a.ptres || '', acao: a.acao, financiador,
          beneficiarias: a.beneficiarias && a.beneficiarias.length ? a.beneficiarias : [antes.unidade],
          analise: { resultado: STATUS.DEFERIDA, observacao: String(a.observacao || '').trim(), por: emailAtual(), em: agora() },
        };
        const depois = { ...antes, ...mud };
        const tid = sincronizarTransferencia(tx, docId, depois, transfAntes, []);
        if(tid) mud.transferencia = tid;
        tx.set(r.contadorRef, { ultimo: r.seq });
        tx.set(r.idxRef, { despesa: docId });
        escrever(tx, ref, antes, mud, 'deferir');
        return id;
      });
    },
    indeferir(docId, observacao){
      return salvar(db().collection('despesas').doc(docId), {
        status: STATUS.INDEFERIDA,
        analise: { resultado: STATUS.INDEFERIDA, observacao: String(observacao).trim(), por: emailAtual(), em: agora() },
      }, { exigirExistente: true, acao: 'indeferir' });
    },
    /* analista corrige origem, ação, financiador e beneficiárias de uma deferida.
     * A base do ID não muda; o bloco de beneficiárias acompanha a correção. */
    async atualizarAnalise(docId, a){
      const ref = db().collection('despesas').doc(docId);
      const tRef = db().collection('transferencias').doc(`auto_${docId}`);
      const avisos = [];
      await db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        if(!antes) throw new Error('Despesa não encontrada.');
        const pos = await lerPosicoes(tx, antes.ano);
        const transfAntes = await ler(tx, tRef);
        const beneficiarias = a.beneficiarias && a.beneficiarias.length ? a.beneficiarias : [antes.unidade];
        const mud = {
          origem: a.origem, ptres: a.ptres || '', acao: a.acao, financiador: a.financiador || FINANCIADOR_NENHUM, beneficiarias,
          id: idCompleto(antes.idBase || antes.id, antes.unidade, beneficiarias, pos),
          analise: { resultado: STATUS.DEFERIDA, observacao: String(a.observacao || '').trim(), por: emailAtual(), em: agora() },
        };
        const tid = sincronizarTransferencia(tx, docId, { ...antes, ...mud }, transfAntes, avisos);
        if(tid) mud.transferencia = tid;
        escrever(tx, ref, antes, mud, 'alterar análise');
      });
      return avisos;
    },
    async definirAtivo(docId, ativo){
      const ref = db().collection('despesas').doc(docId);
      const tRef = db().collection('transferencias').doc(`auto_${docId}`);
      const avisos = [];
      await db().runTransaction(async tx => {
        const antes = await ler(tx, ref);
        const transfAntes = antes && antes.status === STATUS.DEFERIDA ? await ler(tx, tRef) : null;
        escrever(tx, ref, antes, { ativo: !!ativo }, ativo ? 'reativar' : 'inativar');
        if(antes.status === STATUS.DEFERIDA) sincronizarTransferencia(tx, docId, { ...antes, ativo: !!ativo }, transfAntes, avisos);
      });
      return avisos;
    },

    /* EXECUÇÃO: lista = empenhos | pagamentos | execucao */
    async adicionarMovimento(docId, lista, item){
      const ref = db().collection('despesas').doc(docId);
      await db().runTransaction(async tx => {
        const d = await ler(tx, ref);
        if(!d || d.status !== STATUS.DEFERIDA) throw new Error('Só despesas deferidas recebem empenho, pagamento ou evolução.');
        const itens = Array.isArray(d[lista]) ? d[lista].slice() : [];
        itens.push({ ...item, id: Math.random().toString(36).slice(2, 10), por: emailAtual(), registradoEm: new Date().toISOString() });
        escrever(tx, ref, d, { [lista]: itens }, `lançar ${lista}`);
      });
    },
    async removerMovimento(docId, lista, itemId){
      const ref = db().collection('despesas').doc(docId);
      await db().runTransaction(async tx => {
        const d = await ler(tx, ref);
        escrever(tx, ref, d, { [lista]: (Array.isArray(d[lista]) ? d[lista] : []).filter(x => x.id !== itemId) }, `excluir ${lista}`);
      });
    },

    /* Importação (administrador) de despesas JÁ ANALISADAS (deferidas), uma por transação.
     * l = { id|null, ano, unidade, descricao, valor, origem, origemCodigo, acao, natureza, financiador, situacaoLegado } */
    async importar(linhas, onProgresso){
      const total = linhas.length;
      let feitos = 0;
      const resultado = { gravadas: 0, geradas: [], ignoradas: [] };
      for(const l of linhas){
        const ano = Number(l.ano);
        await db().runTransaction(async tx => {
          const ref = db().collection('despesas').doc();
          const tRef = db().collection('transferencias').doc(`auto_${ref.id}`);
          let idBase, seq, contadorRef, idxRef;
          if(l.id){
            const m = l.id.match(ID_REGEX);
            idBase = l.id; seq = parseInt(m[2], 10);
            idxRef = db().collection('ids').doc(`${ano}_${idBase.replace('#', '')}`);
            contadorRef = db().collection('contadores').doc(`${ano}_${m[1]}`);
            const [idx, cont] = await Promise.all([tx.get(idxRef), tx.get(contadorRef)]);
            if(idx.exists){ resultado.ignoradas.push(l); return; }
            if(cont.exists && cont.data().ultimo >= seq) contadorRef = null;
          } else {
            const r = await reservarId(tx, ano, l.unidade, l.origemCodigo, l.financiador || FINANCIADOR_NENHUM);
            ({ idBase, seq, contadorRef, idxRef } = r);
          }
          const dados = {
            ...camposRegistro(l), status: STATUS.DEFERIDA, idBase, id: idBase, origem: l.origem, ptres: l.ptres || '', acao: l.acao || null,
            financiador: l.financiador || FINANCIADOR_NENHUM, beneficiarias: [l.unidade], situacaoLegado: l.situacaoLegado || '',
            analise: { resultado: STATUS.DEFERIDA, observacao: 'Importada da planilha de despesas', por: emailAtual(), em: agora() },
            ativo: true, importado: true,
          };
          const tid = sincronizarTransferencia(tx, ref.id, dados, null, []);
          if(tid) dados.transferencia = tid;
          if(contadorRef) tx.set(contadorRef, { ultimo: seq });
          tx.set(idxRef, { despesa: ref.id });
          escrever(tx, ref, null, dados, 'importar');
          if(l.id) resultado.gravadas++; else { resultado.geradas.push({ linha: l, id: idBase }); resultado.gravadas++; }
        });
        feitos++; if(onProgresso) onProgresso(feitos, total);
      }
      return resultado;
    },
  };

  return {
    usuarios, unidades, origens, acoes, ptres, posicoes, financiadores, receitas, transferencias, despesas, historico,
    carregarTabelasIniciais, ID_REGEX, ID_LEGADO_REGEX, montarIdBase, idCompleto, codificarBeneficiarias,
    decodificarBeneficiarias, precisaTransferencia, statusTransferencia, TIPOS_TRANSF,
  };
})();
