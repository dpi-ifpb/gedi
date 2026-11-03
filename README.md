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
- Cada origem tem um **código de 1 caractere** usado no ID (`LOA` → `L`, `EFQ` → `Q`, `RTC` → `R`, `RP2` → `2`, `PAC` → `P`).
- LOA, EFQ e RTC não se distinguem no SIAFI: **essa distinção existe só no GEDI** e serve para rastrear a procedência do recurso.

### 2.3 Ação do orçamento
- **Ação** (ex.: `20RL`, `2994`): a ação orçamentária do governo federal.
- Receitas, despesas e transferências são identificadas pela **ação**, que é estável de um ano para o outro.
- O **PTRES** (programa de trabalho resumido do SIAFI) **não é usado**, porque pode mudar a cada exercício. A origem, a natureza e a UG já distinguem o que importa (emenda ou discricionária, custeio ou investimento, unidade).

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
- **Análise**: o analista define **origem, ação, financiador e beneficiárias** e **defere** ou **indefere**.
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

**Como ler o bloco das beneficiárias.** Cada ano tem uma **tabela de posições** (Administração → Cadastros → Posições no ID) que ordena as unidades. Cada caractere hexadecimal representa **4 unidades**, com os valores **8, 4, 2, 1**:

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
Cada **lançamento de receita** tem ano, unidade, ação, origem, natureza e valor.
- **Previsão orçamentária** (caixa marcada): o orçamento esperado, como a LOA de cada unidade.
- **Chegada** (caixa desmarcada): receita que efetivamente chegou, com data.
- Revisões e estornos são **novos lançamentos**, inclusive com valor negativo. O histórico fica completo.

### 2.10 Transferências
Movimentação de recurso planejada no GEDI. Há **três tipos**, cada um com um **código** que deve constar na **observação do documento no SIAFI**:

| Tipo | Quando | Objeto | De → para | Código |
|---|---|---|---|---|
| **Automática (despesa)** | A Reitoria banca uma despesa de outra unidade | **Definido**: a despesa | Fonte → executora | A base do ID da despesa (`#AR.0001.2.000`) |
| **Repasse** (manual) | A Reitoria repassa recurso; a unidade prioriza os pagamentos | **Sem objeto** definido | Unidade A → unidade B | `#TR.0001` (sequencial do ano) |
| **Troca orçamentária** (manual) | Mudar ação, origem ou natureza **na mesma unidade** | Remanejamento (exige **pedido formal**) | Unidade X → unidade X | `#TO.0001` (sequencial do ano) |

**Planejado × realizado.** O valor da transferência é o **planejado**. O **realizado** é a soma dos **lançamentos**:
- nas automáticas e nos repasses, as **notas de crédito (NC)**;
- na troca, o **documento da alteração orçamentária**;
- **anulação** = lançamento negativo: reduz o realizado e mantém o planejado. O saldo "falta realizar" fica visível.

**Situação**, calculada pelo GEDI:
- **Prevista**: nada lançado;
- **Parcial**: realizado diferente do planejado (uma despesa pode receber várias NCs);
- **Realizada**: a soma **bate** com o planejado;
- **Cancelada**.

**A automática acompanha a despesa**: mudar valor, ação, origem ou natureza atualiza o planejado. Inativar a despesa cancela a transferência; se já houver NC, a transferência fica e o GEDI pede a anulação.

**Efeito nos saldos**: a transferência tira da origem e soma no destino. O planejado entra na **receita prevista**; as NCs entram na **receita recebida**. No total do IFPB, as transferências se anulam.

---

## 3. Perfis de acesso

Os perfis são **acumuláveis** (uma pessoa pode ter vários). O acesso é pela conta Google **@ifpb.edu.br** cadastrada em Administração → Usuários.

| Perfil | O que pode fazer |
|---|---|
| **Administrador** | Tudo: usuários, cadastros (unidades/UG, origens, ações, financiadores, posições), importação, além do que o gestor faz |
| **Gestor de Planejamento** | Analisa despesas (defere/indefere), registra e edita despesas, lança execução, receitas e transferências, consulta o histórico (página `#auditoria`) |
| **Registrador de Despesas** | Registra despesas **das unidades marcadas no seu usuário** e as edita enquanto não forem analisadas |
| **Leitor Orçamentário-Financeiro** | Consulta o módulo Orçamento e as telas de Despesas |
| **Leitor de Recursos Humanos** | Consulta Estrutura Organizacional e Funções Gratificadas |

As permissões são aplicadas **no servidor** (regras do Firestore), não só escondidas na tela.

---

## 4. Tutorial: o ciclo completo, passo a passo

Exemplo: em 2026, a Reitoria vai bancar a estruturação de um laboratório em Areia que também atende Esperança e Picuí.

**Passo 0 · Tabelas (administrador, uma vez por ano)**
0. Logo após a implantação, no primeiro acesso de um administrador, o GEDI **carrega sozinho os valores padrão**: as unidades, as origens (LOA = L, EFQ = Q…) e as 17 ações do orçamento do IFPB. Só cria o que falta e não altera nada do que já existe. Se algo faltar depois, o botão **Carregar valores padrão** aparece em *Administração → Cadastros*.
1. *Administração → Cadastros*: confira as **UGs** (aba Unidades) e cadastre as **ações** (aba Ações do orçamento, uma a uma ou pelo botão **Importar lista**: veja a seção 5).
2. Na aba **Posições no ID**, crie a tabela de posições do ano.
3. Na aba **Financiadores**, cadastre os financiadores, se houver emendas.

**Passo 1 · Previsão orçamentária (gestor)**
*Orçamento → Receitas → + Lançar receita*, com a caixa **Previsão orçamentária** marcada: Reitoria · ação 20RL · RP2 · Custeio · R$ 1.000.000,00. Faça o mesmo com a LOA de cada unidade.

**Passo 2 · Registro da demanda (registrador ou gestor)**
*Orçamento → Despesas → + Registrar despesa*: Areia · "Estruturação de laboratório" · R$ 100.000,00 · Custeio · processo e link do SUAP. A despesa entra em **Não analisadas** (o contador aumenta).

**Passo 3 · Análise (gestor)**
Clique em **Analisar**: escolha RP2, ação 20RL, financiador 000 e marque **Esperança** e **Picuí** como beneficiárias. A prévia mostra `#AR.····.2.000.840100`. Clique em **Deferir e gerar ID**.
- O ID gerado é `#AR.0001.2.000.840100`.
- Como a fonte (Reitoria) é diferente da executora (Areia), nasce a **transferência automática** `#AR.0001.2.000`, *prevista*, Reitoria → Areia, R$ 100.000,00.

**Passo 4 · Emissão da NC no SIAFI (equipe de orçamento)**
A equipe emite a NC da Reitoria para a UG de Areia, com **`#AR.0001.2.000` na observação**.

**Passo 5 · Registro da NC no GEDI**
*Orçamento → Transferências → NCs*. Hoje o lançamento é manual: número, data e valor. Depois virá da importação do Tesouro Gerencial.
- NC de 60 mil → **parcial**; NC de mais 40 mil → **realizada**.
- Se uma NC for anulada, lance a **anulação**: o realizado cai, e o saldo a realizar reaparece.

**Passo 6 · Execução (gestor)**
*Orçamento → Despesas → Analisadas → Execução*: lance os empenhos (nº da NE) e os pagamentos. Em obras, informe a evolução física.

**Passo 7 · Acompanhamento**
*Orçamento → Painel do Orçamento*, agrupado por unidade: a Reitoria mostra a previsão reduzida pela transferência; Areia mostra a receita recebida (pela NC), a despesa deferida, a empenhada e a paga, com os saldos.

**Remanejamentos:**
- Para mandar recurso a uma unidade **sem objeto definido**, use *Transferências → **+ Repasse*** (código `#TR`).
- Para mudar **ação, origem ou natureza na mesma unidade** (após o pedido formal), use ***+ Troca orçamentária*** (código `#TO`), informando o processo. Ela fica *prevista* até a alteração aparecer no Tesouro Gerencial.

---

## 5. Tela por tela

**Orçamento** (receitas e despesas no mesmo módulo)
- **Painel do Orçamento**: indicadores de receita, despesa e saldos, e tabela agrupada por origem, unidade, ação ou natureza. Mostra também o total de transferências ainda a realizar. Saldos negativos aparecem em vermelho. Substitui a antiga tela de Totais.
- **Receitas**: lançamentos de previsão e de chegada, com filtros por tipo, unidade, origem, ação e natureza.
- **Despesas**: abas **Não analisadas** (com contador, também no menu) e **Analisadas** (com resultado, origem e fase). Ações: Registrar, Analisar, Editar, Execução, Ver, Inativar/Reativar e Importar (administrador; planilha antiga → despesas já deferidas).
- **Transferências**: automáticas, repasses e trocas. Botões: **NCs/Documentos** (lançamentos e anulações), **Ver**, **Editar** e **Cancelar** (só manuais e enquanto previstas).
- **Formação do Orçamento**: continua lendo a planilha "Bases e reforços orçamentários".

**Administração**
- **Cadastros**, em abas: **Unidades** (sigla, nome, UG), **Origens** (sigla e código no ID), **Ações do orçamento**, **Financiadores** (código de 3 dígitos) e **Posições no ID** (tabela por ano).
  - **Importar lista de ações**: cole linhas de planilha. Servem a exportação do **Painel do Orçamento Federal (SIOP)** (`20RL - Funcionamento…`) ou o CSV de despesas do **Portal da Transparência** filtrado pelo órgão 26417 (o GEDI acha as colunas de código e nome da ação e remove repetições). As duas fontes são públicas.
    Também serve uma planilha com as colunas "Código da ação" e "Descrição da ação".
- **Usuários**: e-mail, perfis e, para o registrador, as unidades em que pode registrar.

**Histórico de alterações** (gestor e administrador): página fora do menu, aberta pelo endereço do GEDI terminado em **`#auditoria`** (ex.: `https://dpi-ifpb.github.io/gedi/#auditoria`). Mostra, por entidade, cada gravação com data, usuário, operação e o que mudou.

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
| Ação | Ação de governo |
| Natureza | GND 3 / 4 |
| Origem | Só no GEDI (LOA/EFQ/RTC…), identificada pelo código do GEDI na observação do documento |
| Transferência | NC (ou documento de alteração), reconhecida pelo código |

Documentos importados **com** código são vinculados automaticamente e atualizam o realizado. Documentos **sem** código vão para uma fila de **não conciliados**, para o gestor vincular. No futuro, a importação também trará **dotações** (previsão), **empenhos** e **pagamentos**.

---

## 7. Auditoria e histórico

- Todo cadastro guarda **quem criou, quando, quem alterou por último, quando** e o **número da versão**.
- Cada gravação gera um registro no **histórico** com o que mudou (*de → para*). O histórico nunca é alterado nem apagado.
- As regras de segurança **recusam** qualquer gravação sem esse registro.
- As telas não mostram quem cadastrou ou alterou. Gestor e administrador consultam essas informações na página **Histórico de alterações**, aberta pelo endereço terminado em `#auditoria` (não aparece no menu), organizada por entidade e com busca.

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
| **PTRES** | Programa de trabalho resumido do SIAFI; não é usado no GEDI porque pode mudar a cada exercício |
| **Repasse** | Transferência manual entre unidades, sem objeto definido (`#TR`) |
| **Tabela de posições** | Ordem das unidades no bloco hexadecimal das beneficiárias, por ano |
| **Tesouro Gerencial** | Ferramenta de consulta aos dados do SIAFI, usada na integração |
| **Troca orçamentária** | Mudança de ação, origem ou natureza dentro da mesma unidade, por pedido formal (`#TO`) |
| **UG** | Unidade gestora no SIAFI (6 dígitos) |

---

## 9. Parte técnica

**Hospedagem**: site estático no GitHub Pages (repositório `dpi-ifpb/gedi`), sem build e sem framework.
**Banco e login**: Firebase, projeto `gedi-351e0` (Authentication com Google + Cloud Firestore). As chaves em `config.js` não são secretas; a proteção está em `firebase/firestore.rules`.

```
index.html                     estrutura da página, menu e portão de login
versao.json                    número da versão publicada (controle de cache)
ferramentas/nova-versao.py     marca uma versão nova antes de publicar
firebase/firestore.rules       regras de segurança (publicar no Console do Firebase)
IMPLANTACAO.md                 passo a passo da versão atual
assets/css/                    base, tabelas, modal, login, cadastros (painel lateral e celular)
assets/js/config.js            constantes, perfis, telas por perfil
assets/js/auth.js              login e perfis do usuário
assets/js/app.js               navegação
assets/js/data/repo.js         ÚNICA camada de acesso ao banco (gravação com auditoria + histórico)
assets/js/data/assinaturas.js  dados ao vivo do Firestore
assets/js/pages/lista-despesas.js   Orçamento → Despesas (registro, análise, execução, importação)
assets/js/pages/orcamento.js        Orçamento → Painel, Receitas, Transferências
assets/js/pages/administracao.js    Administração
assets/js/pages/auditoria.js        histórico de alterações (#auditoria)
assets/js/pages/cadastros-ui.js     painel lateral e utilidades
```

**Coleções do Firestore**: `usuarios`, `unidades`, `origens`, `acoes`, `posicoes`, `financiadores`, `receitas`, `transferencias`, `despesas`, `ids`, `contadores`, `historico`, `dados_estaticos`.

**Versão e cache**: cada publicação tem um número (`window.GEDI_VERSAO` no `index.html` e `versao.json`). Todos os arquivos são pedidos com `?v=<versão>`, e a página recarrega sozinha se o `versao.json` indicar uma versão mais nova. Para marcar uma versão nova: `python3 ferramentas/nova-versao.py 5.6`.

**Trocar de banco de dados**: reescreva só `assets/js/data/repo.js`, mantendo as funções e o formato dos objetos.

**Fontes de dados ainda em planilha**: Formação do Orçamento ("Bases e reforços orçamentários") e Nova Distribuição de Custeio.

Desenvolvido para a DPI/REITORIA do IFPB. Sugestões: dpi@ifpb.edu.br.
