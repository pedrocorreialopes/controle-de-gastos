# Pedro & Glícia — Controle de Gastos Financeiros

> **Slogan:** Fazendo a economia acontecer
> **Categoria:** Ferramenta Online (Fintech pessoal)
> **Região de atuação:** Fortaleza, CE, Brasil
> **Criado e desenvolvido por:** Pedro Correia Lopes Filho

Ferramenta web premium para controle de gastos financeiros de **entrada (crédito)** e **saída (débito)**, com dashboard visual, calendário de vencimentos, upload de comprovantes e exportação de relatórios em PDF — pensada especificamente para o uso pessoal de Pedro e Glícia.

---

## 1. Funcionalidades implementadas

### Home (`index.html`)
- Header fixo responsivo com menu hambúrguer acessível (mobile) e navegação por âncoras.
- Hero premium com proposta de valor, CTAs, estatísticas e imagem ilustrativa gerada por IA.
- Seções: Proposta de valor, Funcionalidades, Como funciona (4 passos), Diferenciais, Depoimentos (carrossel Swiper.js), CTA final.
- Botão flutuante de WhatsApp e links de redes sociais no footer.
- Animações com **GSAP** (entrada do hero), **ScrollReveal.js** (revelação ao rolar) e **Swiper.js** (depoimentos), todas respeitando `prefers-reduced-motion`.
- SEO completo: meta tags, Open Graph, Twitter Cards, Schema.org (`WebSite`, `LocalBusiness`), textos otimizados para as palavras-chave *gastos*, *financeiro*, *controle de gastos*.

### Área do Cliente (`area-cliente.html`)
- Seleção de perfil (**Pedro** ou **Glícia**) salva em `localStorage` — personalização de navegação (não é autenticação/segurança).
- Cartões de acesso rápido para: novo lançamento, dashboard, calendário, exportação em PDF, WhatsApp e comprovantes.
- Banner de boas-vindas dinâmico após a seleção do perfil.

### Dashboard (`dashboard.html`)
- **KPIs**: total de entradas, total de saídas, saldo e quantidade de pendências, recalculados em tempo real conforme os filtros.
- **Formulário de lançamento** com:
  - Seletor visual Crédito/Débito (toggle);
  - Categorias dinâmicas por tipo (ex.: Crédito → Salário, Benefício, Restituição de IR, 13º, Férias; Débito → Cartão de Crédito, Água, Energia, Telefone/Internet, Faculdade, Imóvel, Dívidas etc.);
  - Campos: valor, descrição, data, forma de pagamento, responsável, status (pago/pendente), observações;
  - **Upload de comprovante** (drag-and-drop ou clique), com validação de tipo (PDF/JPG/PNG/WEBP) e tamanho (até 5MB);
  - Validação de campos em tempo real com mensagens de erro e feedback de sucesso/erro.
- **Tabela de lançamentos** com busca textual e filtros por tipo, responsável e status; ações de editar e excluir (com modal de confirmação acessível).
- **Gráficos (Chart.js)**: barras (entradas x saídas por mês), rosca (saídas por categoria) e linha (evolução do saldo acumulado) — todos reagem aos filtros aplicados.
- **Calendário de vencimentos**: navegação por mês, com indicadores visuais (verde = entrada, vermelho = saída) nos dias com lançamentos.
- **Exportação em PDF** (jsPDF + AutoTable): gera relatório com resumo financeiro e tabela detalhada dos lançamentos filtrados.
- **Compartilhamento via WhatsApp**: gera um resumo textual do período e abre o `wa.me` para envio.
- Toasts de feedback e estados de carregamento (spinner) em todas as operações assíncronas.

### Integrações
- **WhatsApp**: botão flutuante global + compartilhamento de resumo financeiro do dashboard.
- **Redes sociais**: links no footer (Instagram, Facebook, LinkedIn, WhatsApp) — ajustar URLs reais antes da publicação.
- **Calendário**: calendário mensal nativo (customizado) exibindo vencimentos de entradas e saídas.
- **Upload de arquivos**: anexação do nome do comprovante ao lançamento (ver limitação na seção 3).
- **Geração de PDF**: relatório financeiro completo, com resumo e tabela detalhada.

---

## 2. Estrutura de arquivos

```
index.html              → Página Home
area-cliente.html       → Área do Cliente (seleção de perfil)
dashboard.html           → Dashboard financeiro (CRUD + gráficos + calendário)
css/
  ├── style.css          → Design system, componentes e layout base
  └── responsive.css     → Regras mobile-first e breakpoints (480/768/1024/1440px)
js/
  ├── main.js            → Menu mobile, ScrollReveal, GSAP, Swiper (compartilhado)
  ├── area-cliente.js    → Seleção e persistência de perfil (Pedro/Glícia)
  └── dashboard.js        → CRUD via Table API, filtros, KPIs, gráficos, calendário, PDF, WhatsApp
images/
  ├── logo-pg.png         → Sugestão de logotipo (monograma P&G, gerado por IA)
  └── hero-dashboard.png  → Ilustração premium usada no hero da Home
README.md
```

### Entradas/URIs funcionais
| Página | Caminho | Parâmetros/Âncoras |
|---|---|---|
| Home | `index.html` | `#servicos`, `#depoimentos`, `#cta-final` |
| Área do Cliente | `area-cliente.html` | perfil salvo em `localStorage` (`pg_perfil_ativo`) |
| Dashboard | `dashboard.html` | `#form-lancamento`, `#tabela`, `#graficos`, `#calendario` |

---

## 3. Dados e armazenamento

Os lançamentos financeiros são persistidos através da **RESTful Table API** da plataforma, na tabela `transactions`, com o seguinte modelo de dados:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | texto (auto) | Identificador único |
| `tipo` | texto (Crédito / Débito) | Entrada ou saída |
| `categoria` | texto | Ex.: Salário, Cartão de Crédito, Água, Faculdade... |
| `descricao` | texto | Descrição do lançamento |
| `valor` | número | Valor em reais |
| `data` | datetime | Data de referência/vencimento |
| `forma_pagamento` | texto | Pix, Dinheiro, Cartão, Boleto, Transferência... |
| `responsavel` | texto | Pedro / Glícia / Ambos |
| `status` | texto | Pago / Pendente |
| `comprovante_nome` | texto | Nome do arquivo de comprovante anexado |
| `observacoes` | rich_text | Observações adicionais |

A tabela já é carregada com 10 lançamentos de exemplo para demonstração do dashboard.

**⚠️ Limitação técnica importante — Upload de arquivos:**
Este projeto é um site estático (frontend-only). Não há servidor de aplicação, backend Python nem banco de dados MySQL/Firebase realmente conectado — apenas a Table API disponibilizada pela plataforma (que armazena texto/números, não arquivos binários). Por isso, o "Upload de arquivos" registra o **nome do arquivo do comprovante** junto ao lançamento (para fins de organização/documentação), mas **não armazena o conteúdo binário do arquivo em um servidor**, pois isso exigiria backend próprio (upload endpoint, storage, etc.), o que está fora do escopo de um site estático. Caso seja necessário guardar os arquivos de fato, recomenda-se futuramente integrar um serviço de storage compatível com CORS e sem autenticação restritiva.

**Sobre as tecnologias solicitadas (Python, MySQL, Firebase):** como este ambiente entrega **sites estáticos** (HTML/CSS/JS), não é possível executar um backend Python nem conectar diretamente a um banco MySQL. Toda a persistência de dados foi implementada com a **Table API** fornecida pela plataforma (que cumpre o mesmo papel de um banco de dados para esta aplicação). Se desejar futuramente um backend Python + MySQL/Firebase dedicado, será necessário hospedar essa camada em um serviço externo compatível com chamadas `fetch` sem autenticação (CORS habilitado).

---

## 4. Tecnologias utilizadas

- **HTML5** semântico (`header`, `nav`, `main`, `section`, `article`, `footer`).
- **CSS3** com variáveis (design tokens), grid/flexbox, mobile-first.
- **JavaScript (ES6+)** vanilla, sem frameworks pesados.
- **Chart.js** — gráficos do dashboard.
- **jsPDF + jsPDF-AutoTable** — geração de relatórios em PDF.
- **Swiper.js** — carrossel de depoimentos.
- **GSAP** — animação de entrada do hero.
- **ScrollReveal.js** — revelação de elementos ao rolar a página.
- **Font Awesome** — ícones.
- **Google Fonts (Inter)** — tipografia.

> **Nota sobre Framer Motion:** por ser uma biblioteca de animação nativa do React, não é aplicável a um site estático em HTML/CSS/JS puro. Suas funções foram substituídas de forma equivalente por **GSAP + CSS Animations + ScrollReveal.js**, entregando o mesmo tipo de microinteração suave solicitada.

---

## 5. Acessibilidade e performance

- Skip link, `aria-label`, `aria-expanded`, `aria-current`, `role="dialog"`, foco visível (`:focus-visible`) e navegação completa por teclado (Tab/Enter/Escape).
- Contraste adequado entre texto e fundo (tema escuro com acentos em ciano `#06b6d4` e verde `#2d5128`).
- `prefers-reduced-motion` respeitado em todas as animações.
- Imagens com `alt` descritivo, `width`/`height` definidos e `loading` apropriado.
- CSS e JS organizados em arquivos externos (sem inline scripts arriscados).

---

## 6. Funcionalidades não implementadas / limitações

- **Autenticação real de usuários**: a "Área do Cliente" oferece apenas seleção de perfil por conveniência (via `localStorage`), sem login/senha seguro — sites estáticos não suportam autenticação server-side.
- **Armazenamento binário de comprovantes**: apenas o nome do arquivo é registrado (ver seção 3).
- **Backend Python / MySQL / Firebase dedicados**: substituídos pela Table API da plataforma, que cumpre a função de persistência de dados neste projeto.
- **Envio automático de notificações via WhatsApp**: o botão apenas abre uma conversa/mensagem pré-formatada (não há API oficial do WhatsApp Business integrada).

## 7. Próximos passos recomendados

1. Substituir os números de WhatsApp e links de redes sociais fictícios pelos reais de Pedro & Glícia.
2. Revisar e personalizar os textos de depoimentos/CTA conforme a realidade do casal.
3. Caso deseje armazenamento real de comprovantes, avaliar um serviço de storage externo com CORS liberado.
4. Ajustar o domínio nas tags `canonical`/Open Graph ao publicar (`https://pedroeglicia.com.br/` é um placeholder).
5. Publicar o projeto pela aba **Publish** para obter a URL pública definitiva.

---

## 8. Publicação

Para publicar este site e obter uma URL pública, utilize a aba **Publish** da plataforma — o processo de deploy é automático e fornecerá o link ativo do site.
