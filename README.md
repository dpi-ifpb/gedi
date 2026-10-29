# GEDI — Gestão Estratégica e Desenvolvimento Institucional

Painel web para acompanhamento orçamentário e análise estratégica do **Instituto Federal da Paraíba (IFPB)**, desenvolvido para a Diretoria de Planejamento, Desenvolvimento Institucional e Interiorização (DPI/REITORIA).

🔗 **Site publicado:** https://dpi-ifpb.github.io/gedi/

---

## O que é

O GEDI reúne, em um só lugar, o acompanhamento de despesas das unidades do IFPB e ferramentas de análise baseadas na Matriz de Distribuição Orçamentária da Rede Federal (Portaria MEC nº 243/2026). Os dados de despesas são lidos **ao vivo** de planilhas Google Sheets mantidas pela DPI; os dados de indicadores e simulação usam bases já processadas a partir das planilhas oficiais da CONIF e da PNP.

## Estrutura do menu (módulos)

- **Início**
- **Orçamento** — Formação do Orçamento (lida da planilha "Bases e reforços orçamentários")
- **Despesas** — **Lista** (abas *Não analisadas*, com contador de pendências, e *Analisadas*) e **Totais** (só deferidas)
- **Organização e Pessoal** — Estrutura Organizacional, Funções Gratificadas
- **Indicadores** — Base, Série Histórica
- **Análises Estratégicas** *(oculto no menu, pronto para reativar)* — Análise dos Pares, Simulador QE, Simulador Funcionamento
- **Administração** *(só administrador)* — Financiadores, Unidades e Origens, Usuários

## Autenticação e perfis

O acesso é protegido por login Google (Firebase Auth), restrito ao domínio **@ifpb.edu.br** e aos e-mails cadastrados em **Usuários**. A sessão expira após 30 minutos de inatividade.

Perfis (acumuláveis — um usuário pode ter vários):

| Perfil | O que pode |
|---|---|
| Administrador | Tudo: usuários, financiadores, unidades e origens, importação e despesas |
| Gestor de Planejamento | Analisar despesas (deferir ou indeferir), registrar e editar; ver as telas orçamentárias |
| Registrador de Despesas | Registrar despesas das suas unidades e editá-las enquanto não forem analisadas |
| Leitor Orçamentário-Financeiro | Consultar Formação do Orçamento, Totais e Detalhamento |
| Leitor de Recursos Humanos | Consultar Estrutura Organizacional e Funções Gratificadas |

Início e Indicadores (Base e Série Histórica) ficam visíveis para todos os perfis. As permissões são aplicadas no servidor pelas regras em `firebase/firestore.rules`, não só escondidas no menu.

## Fluxo das despesas

1. **Registro** (registrador, analista ou administrador): ano, unidade, descrição, valor, natureza, nº do processo eletrônico e link do SUAP. A despesa fica em *Não analisadas*, sem ID.
2. **Análise** (analista ou administrador): define origem e financiador e **defere** (gera o ID) ou **indefere** (com justificativa, sem ID). Indeferidas podem ser reanalisadas.
3. **Empenho e execução**: próximas etapas, sobre as despesas deferidas.

ID no formato **`#UU.NNNN.O.FFFF`**, gerado no deferimento:

| Parte | Significado |
|---|---|
| `UU` | código da unidade (tabela Unidades) |
| `NNNN` | sequencial da unidade **no ano** — reinicia a cada ano de referência |
| `O` | código da origem (tabela Origens): RP2→2, RP6→6, RP7→7, RTC→R, PAC→P, EFQ→L |
| `FFFF` | código do financiador (parlamentar, empresa parceira…); `0000` = sem financiador |

Depois de gerado, o ID **nunca muda**, mesmo que origem ou financiador sejam corrigidos. A unicidade por ano é garantida pela coleção `ids` do Firestore, numa transação. Despesas não são excluídas: são **inativadas**. Totais considera só despesas deferidas e ativas.

Toda leitura e gravação passa por `assets/js/data/repo.js`. Para migrar para outro banco de dados, basta reescrever esse arquivo mantendo as mesmas funções.

> ⚠️ **Limitação importante:** esta é uma checagem do lado do cliente (o painel é um site estático, sem servidor próprio). Ela bloqueia bem o acesso casual, mas **não impede** alguém com conhecimento técnico de acessar diretamente as planilhas do Google que alimentam o painel — elas hoje estão compartilhadas como "qualquer pessoa com o link". Ver seção [Limitações e próximos passos](#limitações-e-próximos-passos).


## Fontes de dados

| Dado | Fonte | Tipo de leitura |
|---|---|---|
| Despesas das unidades | Firestore (Registro de Despesas) | Tempo real |
| Formação do orçamento | Google Sheets ("Bases e reforços orçamentários") | Ao vivo (JSONP/gviz) |
| Distribuição extraorçamentária | Google Sheets ("Distribuição de recursos") | Ao vivo (JSONP/gviz) |
| Indicadores RFEPCT/PNP (IFPB) | Planilha PNP + Portal Nilo Peçanha | Estática, embutida em `assets/js/data/indicadores.js` |
| Indicadores da Rede Federal (41 instituições) | Planilha CONIF (5ª Fase — Matriz CONIF) | Estática, embutida em `assets/js/data/network.js` |
| Orçamento Funcionamento por campus | Planilha CONIF recalculada (LibreOffice) | Estática, embutida em `assets/js/data/funcionamento.js` |
| Matrícula 2024 / Orçamento 2026 por campus | Fornecido diretamente pelo usuário | Estática, embutida em `assets/js/data/matricula.js` |

As bases estáticas precisam ser atualizadas manualmente quando a Portaria da Matriz Orçamentária for republicada com novos dados (normalmente anual).

## Estrutura de arquivos

```
index.html                          — estrutura da página + portão de login
firebase/firestore.rules            — regras de segurança do Firestore (publicar no Console)
IMPLANTACAO.md                      — passo a passo para colocar esta versão no ar
assets/
├── css/
│   ├── base.css                    — layout geral, barra lateral, filtros, KPIs
│   ├── tables.css                  — tabelas, painéis, pivô, indicadores
│   ├── modal.css                   — popups (detalhe, gráfico radar)
│   ├── auth.css                    — tela de login/logout
│   └── cadastros.css               — telas de cadastro, formulários, importação
├── img/                            — logos do IFPB, arte de fundo do login
└── js/
    ├── config.js                   — IDs das planilhas, constantes da Portaria
    ├── utils.js                    — formatação, helpers compartilhados
    ├── app.js                      — navegação entre telas, inicialização
    ├── auth.js                     — login Google, expiração de sessão
    ├── data/repo.js                — ÚNICA camada de acesso ao banco (despesas, cadastros, usuários)
    ├── data/assinaturas.js         — dados ao vivo do Firestore + perfis do usuário logado
    ├── data/                       — demais carregadores de dados
    └── pages/                      — uma tela por arquivo (totais, detalhamento, ...)
```

Os arquivos são carregados via `<script src="...">` simples (sem build, sem framework, sem dependências além das fontes do Google e da biblioteca de login do Google).

## Publicação

O site é publicado via **GitHub Pages** a partir da branch `main`. Qualquer alteração enviada ao repositório é publicada automaticamente em cerca de 1 minuto.

## Limitações e próximos passos

- **Leitura de dados sem autenticação real**: as despesas agora vêm do Firestore, protegidas pelos perfis. As planilhas que ainda alimentam Formação do Orçamento e Nova Dist. de Custeio continuam lidas por um endpoint público do Google, independente do login do painel. Alternativas para fechar essa lacuna (leitura autenticada via Google Sheets API, proxy via Google Apps Script) foram avaliadas e podem ser implementadas em uma próxima etapa.
- **Simuladores são estimativas**: o Simulador Funcionamento usa uma calibração aproximada por unidade (não reproduz 100% o mecanismo de correção pelo IPCA do ano anterior). O Simulador QE segue fielmente a fórmula da Portaria, mas depende de indicadores de referência que podem ser atualizados anualmente.
- **Bloco "Análises Estratégicas" oculto**: o código está pronto e funcional, só desativado temporariamente no menu (`index.html`) — reative removendo os atributos `style="display:none;"` dos itens correspondentes.
- **Popup de detalhamento de despesa**: desativado temporariamente (o código permanece em `assets/js/pages/detalhamento.js`, comentado).

## Créditos

Desenvolvido para a Diretoria de Planejamento, Desenvolvimento Institucional e Interiorização (DPI) do Instituto Federal da Paraíba.
