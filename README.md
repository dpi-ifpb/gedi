# GEDI — Gestão Estratégica e Desenvolvimento Institucional

Ferramenta da Diretoria de Planejamento, Desenvolvimento Institucional e Interiorização (DPI/REITORIA) do **Instituto Federal da Paraíba (IFPB)** para planejar e acompanhar o orçamento: o que se pretende gastar, de onde vem o recurso, o que já foi formalizado e o que já foi executado.

🔗 **Site:** https://dpi-ifpb.github.io/gedi/ · **Integração prevista:** Tesouro Gerencial (dados do SIAFI)

---

## Sumário

1. [A ideia em uma página](#1-a-ideia-em-uma-página)
2. [Conceitos](#2-conceitos)
3. [Perfis de acesso](#3-perfis-de-acesso)
4. [Tutorial: o ciclo completo, passo a passo](#4-tutorial-o-ciclo-completo-passo-a-passo)
5. [Tela por tela](#5-tela-por-tela)
6. [Integração com o Tesouro Gerencial](#6-integração-com-o-tesouro-gerencial)
7. [Auditoria e histórico](#7-auditoria-e-histórico)
8. [Glossário](#8-glossário)
9. [Parte técnica](#9-parte-técnica)

---

## 1. A ideia em uma página

O GEDI é a **base do planejamento orçamentário**. Tudo o que a equipe de orçamento vai fazer no SIAFI deve nascer antes no GEDI. O SIAFI, lido pelo Tesouro Gerencial, confirma depois o que de fato aconteceu.

Cada valor é visto em dois momentos:

| | **Receita** (de onde vem o dinheiro) | **Despesa** (para onde vai) |
|---|---|---|
| **Planejado** | Previsão orçamentária (ex.: LOA de cada unidade) + transferências planejadas | Despesas registradas e deferidas |
| **Formalizado / executado** | Receita que chegou + NCs efetivamente emitidas | Empenhos e pagamentos |

Os **saldos** respondem às perguntas do dia a dia:

- **Para planejar** = receita prevista − despesa deferida → *quanto ainda posso comprometer?*
- **Para empenhar** = receita recebida − despesa empenhada → *quanto do que chegou ainda está livre?*
- **A pagar** = despesa empenhada − despesa paga → *quanto falta pagar do que já empenhei?*
- **A receber** = receita prevista − receita recebida → *quanto ainda falta chegar?*

---

## 2. Conceitos

### 2.1 Unidades e UG
Cada campus, a Reitoria e a pseudounidade **"- Institucional -"** (ações de alcance institucional) são **unidades**. Cada uma tem:
- **Sigla de 2 letras** (`AR` = Areia, `RE` = Reitoria), usada no ID das despesas;
- **UG** (código de 6 dígitos da unidade gestora no SIAFI), usada para cruzar os dados com o Tesouro Gerencial.

### 2.2 Origem do recurso
Indica **por onde o recurso veio**: `LOA`, `EFQ` (Eficiência e Qualidade), `RTC` (Reserva Técnica), `RP2`, `RP6` (emendas individuais), `RP7` (emendas de bancada), `PAC`…
- Cada origem tem um **código de 1 caractere** usado no ID (`RP2` → `2`, `EFQ` → `L`, `RTC` → `R`, `PAC` → `P`).
- Cada origem guarda o **resultado primário (RP) no SIAFI**. LOA, EFQ e RTC são todas RP 2: **essa distinção existe só no GEDI** e serve para rastrear a procedência do recurso.

### 2.3 Ação do orçamento e PTRES
- **Ação** (ex.: `20RL`, `2994`): a ação orçamentária do governo federal.
- **PTRES**: o programa de trabalho resumido do SIAFI. **Cada PTRES pertence a uma ação**; uma ação pode ter vários PTRES.
- Nos lançamentos escolhe-se o **PTRES**, e a ação vem junto. Isso permite relatórios por ação e por PTRES.

### 2.4 Natureza
**Custeio** (GND 3) ou **Investimento** (GND 4).

### 2.5 Financiador
Quem trouxe o recurso, quando for o caso: um parlamentar (emenda) ou uma empresa parceira. Código de **3 dígitos** (`001`…`999`); `000` = sem financiador.

### 2.6 Despesa: unidade executora, fonte e beneficiárias
- **Unidade executora**: quem **recebe e executa** o recurso. É a unidade informada no registro e a que aparece no ID.
- **Fonte do recurso**: de onde o dinheiro sai. Por padrão, a **Reitoria**. (No futuro, unidades poderão registrar despesas com recurso próprio.)
- **Unidades beneficiadas**: quem **usufrui** da despesa. Areia pode executar uma compra que beneficia Areia, Esperança e Picuí. É informativo; o valor fica todo na executora.

### 2.7 Fluxo da despesa
```
Registro ──► Análise ──┬──► Deferida  (ganha o ID; entra nos saldos) ──► Empenho ──► Pagamento
(sem ID)               └──► Indeferida (com justificativa; pode ser reanalisada)
```
- **Registro**: ano, unidade executora, descrição, valor, natureza, processo eletrônico e link do SUAP, e se a despesa é *acompanhada em percentual* (obras e serviços de engenharia).
- **Análise**: o analista define **origem, PTRES, financiador e beneficiárias** e **defere** ou **indefere**.
- **Execução** (só nas deferidas): empenhos (empenho, reforço, anulação), pagamentos parciais e, se for o caso, a evolução física de 0 a 100%. A fase é calculada: *Deferida → Empenhada → Em pagamento → Quitada*.
- Despesas **não são excluídas**: são **inativadas** e saem dos saldos.

### 2.8 O ID da despesa
Gerado **no deferimento**:

```
#AR.0001.2.000.840100
 │   │   │  │    └── unidades beneficiadas (hexadecimal) — só quando não é apenas a executora
 │   │   │  └─────── financiador (000 = nenhum)
 │   │   └────────── código da origem (2 = RP2)
 │   └────────────── sequencial da unidade no ano (reinicia a cada ano)
 └────────────────── unidade executora
```

- A **base** (`#AR.0001.2.000`) é a identidade permanente: **nunca muda**. Como o sequencial reinicia a cada ano, a identificação completa é **ano + ID**.
- O **bloco das beneficiárias** pode ser ajustado depois do deferimento (com histórico).

**Como ler o bloco das beneficiárias.** Cada ano tem uma **tabela de posições** (Administração → Unidades, Origens e Ações) que ordena as unidades. Cada caractere hexadecimal representa **4 unidades**, com os valores **8, 4, 2, 1**:

| Caractere | Bits | Unidades do grupo beneficiadas |
|---|---|---|
| `0` | 0000 | nenhuma |
| `8` | 1000 | a 1ª |
| `4` | 0100 | a 2ª |
| `C` | 1100 | 1ª e 2ª (8 + 4) |
| `9` | 1001 | 1ª e 4ª (8 + 1) |
| `F` | 1111 | as quatro (8 + 4 + 2 + 1) |

Exemplo `840100` (tabela de 2026: Areia = 1, Esperança = 6, Picuí = 16):
- `8` → 1º grupo (posições 1–4): bit 8 = posição 1 = **Areia**
- `4` → 2º grupo (5–8): bit 4 = posição 6 = **Esperança**
- `0` → 3º grupo: ninguém
- `1` → 4º grupo (13–16): bit 1 = posição 16 = **Picuí**

> As posições de um ano **não mudam** depois de criadas; unidades novas entram no fim. Para 2027 (18 unidades, após o IFSertãoPB), cria-se a tabela de 2027.

### 2.9 Receita: previsão e chegada
Cada **lançamento de receita** tem ano, unidade, PTRES (ação), origem, natureza e valor.
- **Previsão orçamentária** (caixa marcada): o orçamento esperado, como a LOA de cada unidade.
- **Chegada** (caixa desmarcada): receita que efetivamente chegou, com data.
- Revisões e estornos são **novos lançamentos**, inclusive com valor negativo. O histórico fica completo.

### 2.10 Transferências
Movimentação de recurso planejada no GEDI. Há **três tipos**, cada um com um **código** que deve constar na **observação do documento no SIAFI**:

| Tipo | Quando | Objeto | De → para | Código |
|---|---|---|---|---|
| **Automática (despesa)** | A Reitoria banca uma despesa de outra unidade | **Definido**: a despesa | Fonte → executora | A base do ID da despesa (`#AR.0001.2.000`) |
| **Repasse** (manual) | A Reitoria repassa recurso; a unidade prioriza os pagamentos | **Sem objeto** definido | Unidade A → unidade B | `#TR.0001` (sequencial do ano) |
| **Troca orçamentária** (manual) | Mudar PTRES/ação, origem ou natureza **na mesma unidade** | Remanejamento (exige **pedido formal**) | Unidade X → unidade X | `#TO.0001` (sequencial do ano) |

**Planejado × realizado.** O valor da transferência é o **planejado**. O **realizado** é a soma dos **lançamentos**:
- nas automáticas e nos repasses, as **notas de crédito (NC)**;
- na troca, o **documento da alteração orçamentária**;
- **anulação** = lançamento negativo: reduz o realizado e mantém o planejado. O saldo "falta realizar" fica visível.

**Situação**, calculada pelo GEDI:
- **Prevista**: nada lançado;
- **Parcial**: realizado diferente do planejado (uma despesa pode receber várias NCs);
- **Realizada**: a soma **bate** com o planejado;
- **Cancelada**.

**A automática acompanha a despesa**: mudar valor, PTRES, origem ou natureza atualiza o planejado. Inativar a despesa cancela a transferência; se já houver NC, a transferência fica e o GEDI pede a anulação.

**Efeito nos saldos**: a transferência tira da origem e soma no destino. O planejado entra na **receita prevista**; as NCs entram na **receita recebida**. No total do IFPB, as transferências se anulam.

---

## 3. Perfis de acesso

Os perfis são **acumuláveis** (uma pessoa pode ter vários). O acesso é pela conta Google **@ifpb.edu.br** cadastrada em Administração → Usuários.

| Perfil | O que pode fazer |
|---|---|
| **Administrador** | Tudo: usuários, tabelas (unidades/UG, origens, ações, PTRES, posições), financiadores, importação, além do que o gestor faz |
| **Gestor de Planejamento** | Analisa despesas (defere/indefere), registra e edita despesas, lança execução, receitas e transferências, vê o histórico |
| **Registrador de Despesas** | Registra despesas **das unidades marcadas no seu usuário** e as edita enquanto não forem analisadas |
| **Leitor Orçamentário-Financeiro** | Consulta o módulo Orçamento e as telas de Despesas |
| **Leitor de Recursos Humanos** | Consulta Estrutura Organizacional e Funções Gratificadas |

As permissões são aplicadas **no servidor** (regras do Firestore), não só escondidas na tela.

---

## 4. Tutorial: o ciclo completo, passo a passo

Exemplo: em 2026, a Reitoria vai bancar a estruturação de um laboratório em Areia que também atende Esperança e Picuí.

**Passo 0 · Tabelas (administrador, uma vez por ano)**
1. *Administração → Unidades, Origens e Ações*: confira as **UGs**, cadastre as **ações** e os **PTRES**.
2. Na mesma tela, **crie a tabela de posições** do ano.
3. *Administração → Financiadores*, se houver emendas.

**Passo 1 · Previsão orçamentária (gestor)**
*Orçamento → Receitas → + Lançar receita*, com a caixa **Previsão orçamentária** marcada: Reitoria · PTRES 169970 (20RL) · RP2 · Custeio · R$ 1.000.000,00. Faça o mesmo com a LOA de cada unidade.

**Passo 2 · Registro da demanda (registrador ou gestor)**
*Despesas → Lista → + Registrar despesa*: Areia · "Estruturação de laboratório" · R$ 100.000,00 · Custeio · processo e link do SUAP. A despesa entra em **Não analisadas** (o contador aumenta).

**Passo 3 · Análise (gestor)**
Clique em **Analisar**: escolha RP2, PTRES 169970, financiador 000 e marque **Esperança** e **Picuí** como beneficiárias. A prévia mostra `#AR.····.2.000.840100`. Clique em **Deferir e gerar ID**.
- O ID gerado é `#AR.0001.2.000.840100`.
- Como a fonte (Reitoria) é diferente da executora (Areia), nasce a **transferência automática** `#AR.0001.2.000`, *prevista*, Reitoria → Areia, R$ 100.000,00.

**Passo 4 · Emissão da NC no SIAFI (equipe de orçamento)**
A equipe emite a NC da Reitoria para a UG de Areia, com **`#AR.0001.2.000` na observação**.

**Passo 5 · Registro da NC no GEDI**
*Orçamento → Transferências → NCs*. Hoje o lançamento é manual: número, data e valor. Depois virá da importação do Tesouro Gerencial.
- NC de 60 mil → **parcial**; NC de mais 40 mil → **realizada**.
- Se uma NC for anulada, lance a **anulação**: o realizado cai, e o saldo a realizar reaparece.

**Passo 6 · Execução (gestor)**
*Despesas → Lista → Analisadas → Execução*: lance os empenhos (nº da NE) e os pagamentos. Em obras, informe a evolução física.

**Passo 7 · Acompanhamento**
*Orçamento → Painel do Orçamento*, agrupado por unidade: a Reitoria mostra a previsão reduzida pela transferência; Areia mostra a receita recebida (pela NC), a despesa deferida, a empenhada e a paga, com os saldos.

**Remanejamentos:**
- Para mandar recurso a uma unidade **sem objeto definido**, use *Transferências → **+ Repasse*** (código `#TR`).
- Para mudar **PTRES, origem ou natureza na mesma unidade** (após o pedido formal), use ***+ Troca orçamentária*** (código `#TO`), informando o processo. Ela fica *prevista* até a alteração aparecer no Tesouro Gerencial.

---

## 5. Tela por tela

**Orçamento**
- **Painel do Orçamento**: indicadores de receita, despesa e saldos, e tabela agrupada por origem, unidade, ação, PTRES ou natureza. Mostra também o total de transferências ainda a realizar. Saldos negativos aparecem em vermelho.
- **Receitas**: lançamentos de previsão e de chegada, com filtros por tipo, unidade, origem, ação e natureza.
- **Transferências**: automáticas, repasses e trocas. Botões: **NCs/Documentos** (lançamentos e anulações), **Ver**, **Editar** e **Cancelar** (só manuais e enquanto previstas).
- **Formação do Orçamento**: continua lendo a planilha "Bases e reforços orçamentários".

**Despesas**
- **Lista**: abas **Não analisadas** (com contador, também no menu) e **Analisadas** (com resultado, origem e fase). Ações: Registrar, Analisar, Editar, Execução, Ver (com histórico), Inativar/Reativar e Importar (administrador; planilha antiga → despesas já deferidas).
- **Totais**: tabela de unidade × origem × natureza, só com as despesas deferidas e ativas.

**Administração**
- **Financiadores**: código de 3 dígitos e descrição.
- **Unidades, Origens e Ações**: unidades (sigla, nome, UG), origens (sigla, código no ID, RP no SIAFI), ações, PTRES e a tabela de posições por ano.
- **Usuários**: e-mail, perfis e, para o registrador, as unidades em que pode registrar.

**No celular**: o menu vira ☰, as listas aparecem em cartões e os formulários ocupam a tela inteira.

---

## 6. Integração com o Tesouro Gerencial

O GEDI **planeja**; o SIAFI **executa**; o **Tesouro Gerencial** lê o SIAFI e devolve ao GEDI o que aconteceu.

**Regra de ouro:** nada se faz no SIAFI sem antes existir no GEDI. Na **observação** de cada documento, deve constar o código do GEDI:

| Documento no SIAFI | Código na observação |
|---|---|
| NC de despesa bancada pela Reitoria | Base do ID da despesa: `#AR.0001.2.000` |
| NC de repasse | `#TR.NNNN` |
| Documento da troca orçamentária | `#TO.NNNN` |
| Nota de empenho (futuro) | ID da despesa |

**Como o cruzamento vai funcionar** (importação em construção):

| GEDI | Tesouro Gerencial |
|---|---|
| Unidade | UG emitente / favorecida |
| PTRES / ação | PTRES / ação de governo |
| Natureza | GND 3 / 4 |
| Origem | Resultado primário (LOA/EFQ/RTC só no GEDI, identificadas pelo código na observação) |
| Transferência | NC (ou documento de alteração), reconhecida pelo código |

Documentos importados **com** código são vinculados automaticamente e atualizam o realizado. Documentos **sem** código vão para uma fila de **não conciliados**, para o gestor vincular. No futuro, a importação também trará **dotações** (previsão), **empenhos** e **pagamentos**.

---

## 7. Auditoria e histórico

- Todo cadastro guarda **quem criou, quando, quem alterou por último, quando** e o **número da versão**.
- Cada gravação gera um registro no **histórico** com o que mudou (*de → para*). O histórico nunca é alterado nem apagado.
- As regras de segurança **recusam** qualquer gravação sem esse registro.
- Gestor e administrador veem o histórico no detalhe de cada registro (botões **Ver** ou **Editar**).

---

## 8. Glossário

| Termo | Significado |
|---|---|
| **Anulação** | Lançamento negativo que reduz o realizado de uma transferência (anulação de NC) |
| **Beneficiárias** | Unidades que usufruem de uma despesa |
| **Deferir / indeferir** | Resultado da análise: aprova (gera o ID) ou recusa (com justificativa) |
| **Executora** | Unidade que recebe e executa o recurso da despesa |
| **Fonte do recurso** | Unidade de onde sai o recurso (Reitoria, por padrão) |
| **GND** | Grupo de natureza de despesa: 3 = custeio, 4 = investimento |
| **NC** | Nota de crédito: descentralização de crédito entre UGs no SIAFI |
| **NE** | Nota de empenho |
| **Origem** | Por onde o recurso veio (LOA, EFQ, RTC, RP2, RP6, RP7, PAC…) |
| **PTRES** | Programa de trabalho resumido; cada PTRES pertence a uma ação |
| **Repasse** | Transferência manual entre unidades, sem objeto definido (`#TR`) |
| **RP** | Resultado primário no SIAFI (2 = discricionária, 6 = emenda individual, 7 = emenda de bancada…) |
| **Tabela de posições** | Ordem das unidades no bloco hexadecimal das beneficiárias, por ano |
| **Tesouro Gerencial** | Ferramenta de consulta aos dados do SIAFI, usada na integração |
| **Troca orçamentária** | Mudança de PTRES/ação, origem ou natureza dentro da mesma unidade, por pedido formal (`#TO`) |
| **UG** | Unidade gestora no SIAFI (6 dígitos) |

---

## 9. Parte técnica

**Hospedagem**: site estático no GitHub Pages (repositório `dpi-ifpb/gedi`), sem build e sem framework.
**Banco e login**: Firebase, projeto `gedi-351e0` (Authentication com Google + Cloud Firestore). As chaves em `config.js` não são secretas; a proteção está em `firebase/firestore.rules`.

```
index.html                     estrutura da página, menu e portão de login
firebase/firestore.rules       regras de segurança (publicar no Console do Firebase)
IMPLANTACAO.md                 passo a passo da versão atual
assets/css/                    base, tabelas, modal, login, cadastros (painel lateral e celular)
assets/js/config.js            constantes, perfis, telas por perfil
assets/js/auth.js              login e perfis do usuário
assets/js/app.js               navegação
assets/js/data/repo.js         ÚNICA camada de acesso ao banco (gravação com auditoria + histórico)
assets/js/data/assinaturas.js  dados ao vivo do Firestore
assets/js/pages/lista-despesas.js   Despesas → Lista (registro, análise, execução, importação)
assets/js/pages/orcamento.js        Orçamento → Painel, Receitas, Transferências
assets/js/pages/administracao.js    Administração
assets/js/pages/cadastros-ui.js     painel lateral, histórico, utilidades
```

**Coleções do Firestore**: `usuarios`, `unidades`, `origens`, `acoes`, `ptres`, `posicoes`, `financiadores`, `receitas`, `transferencias`, `despesas`, `ids`, `contadores`, `historico`, `dados_estaticos`.

**Trocar de banco de dados**: reescreva só `assets/js/data/repo.js`, mantendo as funções e o formato dos objetos.

**Fontes de dados ainda em planilha**: Formação do Orçamento ("Bases e reforços orçamentários") e Nova Distribuição de Custeio.

Desenvolvido para a DPI/REITORIA do IFPB. Sugestões: dpi@ifpb.edu.br.
