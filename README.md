# GEDI — Gestão Estratégica e Desenvolvimento Institucional

Painel web para acompanhamento orçamentário e análise estratégica do **Instituto Federal da Paraíba (IFPB)**, desenvolvido para a Diretoria de Planejamento, Desenvolvimento Institucional e Interiorização (DPI/REITORIA).

🔗 **Site publicado:** https://dpi-ifpb.github.io/gedi/

---

## O que é

O GEDI reúne, em um só lugar, o acompanhamento de despesas das unidades do IFPB e ferramentas de análise baseadas na Matriz de Distribuição Orçamentária da Rede Federal (Portaria MEC nº 243/2026). Os dados de despesas são lidos **ao vivo** de planilhas Google Sheets mantidas pela DPI; os dados de indicadores e simulação usam bases já processadas a partir das planilhas oficiais da CONIF e da PNP.

## Estrutura do menu

O painel é organizado em três blocos:

- **📊 Despesas e Demandas** — dados operacionais lidos ao vivo das planilhas
  - **Totais**: visão consolidada (pivô por unidade × origem × situação × natureza)
  - **Detalhamento**: tabela linha a linha, com filtros e busca
  - **Nova Dist. de Custeio**: distribuição de recursos extraorçamentários às unidades
- **📌 Indicadores** — indicadores RFEPCT/PNP por unidade, com gráfico radar comparativo
- **📈 Análises Estratégicas** *(atualmente oculto no menu, pronto para reativar)*
  - **Análise dos Pares**: compara unidades de porte semelhante (matrícula ou orçamento)
  - **Simulador QE**: simula o efeito de mudanças nos indicadores do IFPB sobre o Bloco Qualidade e Eficiência (10% da Matriz Orçamentária), usando dados reais das 41 instituições da Rede Federal
  - **Simulador Funcionamento**: simula o efeito de mudanças no RAP de uma unidade sobre o Bloco Funcionamento (80% da Matriz)

## Autenticação

O acesso é protegido por login Google (Google Identity Services), restrito ao domínio **@ifpb.edu.br**. A sessão expira após 30 minutos de inatividade.

> ⚠️ **Limitação importante:** esta é uma checagem do lado do cliente (o painel é um site estático, sem servidor próprio). Ela bloqueia bem o acesso casual, mas **não impede** alguém com conhecimento técnico de acessar diretamente as planilhas do Google que alimentam o painel — elas hoje estão compartilhadas como "qualquer pessoa com o link". Ver seção [Limitações e próximos passos](#limitações-e-próximos-passos).

Para configurar seu próprio Client ID OAuth, veja `assets/js/auth.js` (constante `GOOGLE_CLIENT_ID`).

## Fontes de dados

| Dado | Fonte | Tipo de leitura |
|---|---|---|
| Despesas das unidades | Google Sheets ("Registro e acompanhamento de despesas") | Ao vivo (JSONP/gviz) |
| Distribuição extraorçamentária | Google Sheets ("Distribuição de recursos") | Ao vivo (JSONP/gviz) |
| Indicadores RFEPCT/PNP (IFPB) | Planilha PNP + Portal Nilo Peçanha | Estática, embutida em `assets/js/data/indicadores.js` |
| Indicadores da Rede Federal (41 instituições) | Planilha CONIF (5ª Fase — Matriz CONIF) | Estática, embutida em `assets/js/data/network.js` |
| Orçamento Funcionamento por campus | Planilha CONIF recalculada (LibreOffice) | Estática, embutida em `assets/js/data/funcionamento.js` |
| Matrícula 2024 / Orçamento 2026 por campus | Fornecido diretamente pelo usuário | Estática, embutida em `assets/js/data/matricula.js` |

As bases estáticas precisam ser atualizadas manualmente quando a Portaria da Matriz Orçamentária for republicada com novos dados (normalmente anual).

## Estrutura de arquivos

```
index.html                          — estrutura da página + portão de login
assets/
├── css/
│   ├── base.css                    — layout geral, barra lateral, filtros, KPIs
│   ├── tables.css                  — tabelas, painéis, pivô, indicadores
│   ├── modal.css                   — popups (detalhe, gráfico radar)
│   └── auth.css                    — tela de login/logout
├── img/                            — logos do IFPB, arte de fundo do login
└── js/
    ├── config.js                   — IDs das planilhas, constantes da Portaria
    ├── utils.js                    — formatação, helpers compartilhados
    ├── app.js                      — navegação entre telas, inicialização
    ├── auth.js                     — login Google, expiração de sessão
    ├── data/                       — bases de dados estáticas (ver tabela acima)
    └── pages/                      — uma tela por arquivo (totais, detalhamento, ...)
```

Os arquivos são carregados via `<script src="...">` simples (sem build, sem framework, sem dependências além das fontes do Google e da biblioteca de login do Google).

## Publicação

O site é publicado via **GitHub Pages** a partir da branch `main`. Qualquer alteração enviada ao repositório é publicada automaticamente em cerca de 1 minuto.

## Limitações e próximos passos

- **Leitura de dados sem autenticação real**: as planilhas de despesas são lidas por um endpoint público do Google, independente do login do painel. Alternativas para fechar essa lacuna (leitura autenticada via Google Sheets API, proxy via Google Apps Script) foram avaliadas e podem ser implementadas em uma próxima etapa.
- **Simuladores são estimativas**: o Simulador Funcionamento usa uma calibração aproximada por unidade (não reproduz 100% o mecanismo de correção pelo IPCA do ano anterior). O Simulador QE segue fielmente a fórmula da Portaria, mas depende de indicadores de referência que podem ser atualizados anualmente.
- **Bloco "Análises Estratégicas" oculto**: o código está pronto e funcional, só desativado temporariamente no menu (`index.html`) — reative removendo os atributos `style="display:none;"` dos itens correspondentes.
- **Popup de detalhamento de despesa**: desativado temporariamente (o código permanece em `assets/js/pages/detalhamento.js`, comentado).

## Créditos

Desenvolvido para a Diretoria de Planejamento, Desenvolvimento Institucional e Interiorização (DPI) do Instituto Federal da Paraíba.
