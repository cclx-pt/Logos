# Logos — Especificação do Projeto

> **Ler primeiro.** Este documento é a fonte de verdade do projeto Logos. É lido no início de cada sessão de Claude Code e revisto antes de qualquer decisão estrutural. Se a realidade divergir desta especificação, atualiza-se a especificação — não se deixa o projeto à deriva em silêncio.

---

## 1. Visão Geral do Projeto

**Logos** é a plataforma online de estudo bíblico da **CCLX**, uma igreja em Portugal. Funciona como sub-site da presença web principal da igreja, acessível através do logótipo do ministério de estudos.

A plataforma aloja conteúdo formativo estruturado — **cursos** compostos por **módulos**, cada um contendo **aulas**. Cada aula entrega o seu conteúdo através de um vídeo do YouTube embebido e/ou de um PDF descarregável. Utilizadores autenticados podem acompanhar o seu progresso; administradores constroem e mantêm a árvore de conteúdo.

- **Nome do projeto:** Logos
- **URL alvo:** `logos.cclx.pt` (subdomínio do domínio principal da igreja)
- **Idioma:** Português de Portugal (PT-PT)
- **Custo para utilizadores:** Sempre gratuito
- **Prazo da V3:** **1 de julho de 2026**

---

## 2. Problema a Resolver

A CCLX distribui atualmente material de estudo bíblico de forma informal — partilha de PDFs e ligações para vídeos via WhatsApp, em múltiplos grupos e entre várias pessoas. Este processo é exaustivo de manter, difícil de pesquisar, fácil de perder e não oferece qualquer noção de progressão.

Logos substitui esse fluxo por um portal único e estruturado onde:

- Os alunos encontram todo o material num só sítio, organizado por curso
- Os alunos veem o que já concluíram e o que se segue
- Os administradores publicam material uma única vez, num formato consistente, e este chega a toda a gente

---

## 3. Objetivos e Não-Objetivos

### Objetivos

- Disponibilizar uma porta de entrada limpa, acolhedora e pública para o conteúdo de estudo bíblico da CCLX
- Permitir que visitantes naveguem o catálogo público sem fricção (sem necessidade de login para explorar)
- Permitir que utilizadores autenticados marquem aulas como concluídas e vejam quando concluem um curso
- Dar aos administradores uma forma simples de construir e manter a árvore de conteúdo
- Permitir restrições de acesso a conteúdo específico (ministerial, formação, etc.) através de etiquetas
- Construir com o crescimento em mente, mas sem sobre-engenharia para uma escala que ainda não existe

### Não-Objetivos

- Pagamentos, subscrições ou conteúdo pago
- Alojamento direto de ficheiros de vídeo (o YouTube trata da entrega)
- Ficheiros de vídeo descarregáveis
- Certificados emitidos por email ou imprimíveis
- Barras de progresso, percentagens, gamificação ou qualquer cálculo visual de avanço (V3–V4 usam apenas estado binário concluído/não-concluído)
- Um portal de pesquisa pesado (esperam-se dezenas de cursos ao longo dos anos, não centenas)
- Funcionalidades em tempo real (chat ao vivo, notificações *push*, presença) nas V1–V5
- Funcionalidades de IA (fora de âmbito por agora)
- Internacionalização ou múltiplos idiomas

---

## 4. Audiência e Papéis

### Audiência

- **Primária:** Membros e visitantes da CCLX interessados em estudar a Bíblia através de cursos estruturados
- **Secundária:** Administradores (equipa e voluntários da igreja) que constroem e mantêm o conteúdo
- **Terciária:** Um Super Administrador (provavelmente uma ou duas pessoas) que gere a equipa de admins

### Papéis de sistema

| Papel             | Descrição                                                                                     |
|-------------------|-----------------------------------------------------------------------------------------------|
| **Super Admin**   | Gere a equipa de administradores. Cria e revoga contas de admin. Tem todos os poderes de admin. |
| **Admin**         | Constrói a árvore de conteúdo: cria e edita cursos, módulos e aulas; faz upload de PDFs; cola URLs do YouTube; cria etiquetas e atribui-as a utilizadores. Não pode promover ou despromover outros administradores. |
| **Utilizador**    | Papel por defeito de quem se regista. Navega, vê, descarrega e marca aulas como concluídas. |

**Os professores não são um papel do sistema.** São utilizadores normais por defeito. Se um Super Admin promover um professor a Admin, este passa a ter poderes de admin. Professores que não são admins criam o seu conteúdo fora da plataforma (gravam vídeos, escrevem PDFs) e entregam-no a um admin para upload.

---

## 5. Sistema de Etiquetas

Para além dos papéis de sistema, existe um sistema de **etiquetas** (referidas como *tags* no código e na base de dados). As etiquetas controlam **a que conteúdo cada utilizador tem acesso**.

> **Nota terminológica:** o termo "Grupos" foi deliberadamente evitado por colidir com vocabulário existente da igreja (Grupos de Esclarecimento, grupos pequenos, etc.). O termo oficial na UI é **"etiquetas"**.

### Princípios gerais (válidos em todas as versões)

- **Um utilizador pode ter zero ou mais etiquetas atribuídas.** É expectável que muitos utilizadores tenham várias (por exemplo, alguém pode ter as etiquetas `lider` e `worship-ministry`).
- **Lógica de correspondência: OU.** Um utilizador acede a um item de conteúdo se tiver **pelo menos uma** das etiquetas exigidas pelo item. Não existe lógica E.
- **Itens sem etiquetas são abertos.** Um item (curso, módulo ou aula) sem etiquetas exigidas é visível a quem quer que possa chegar até ele.
- **Criação de etiquetas:** Qualquer **Admin** pode criar etiquetas novas. O sistema não traz uma lista fixa — os admins definem a taxonomia conforme a igreja evolui.
- **Conteúdo restrito é invisível, não bloqueado.** Quem não tem a etiqueta exigida não vê o item — não aparece com cadeado nem mensagem de "acesso negado".
- **Itens-pai vazios desaparecem.** Se um utilizador não vê nenhum módulo de um curso, esse curso não aparece no catálogo dele. Se um utilizador não vê nenhuma aula de um módulo, esse módulo não aparece dentro do curso.

### Faseamento

O sistema de etiquetas é introduzido por fases:

- **V2:** Fundação técnica das etiquetas. Admins podem criar etiquetas e atribuí-las a utilizadores. Mas ainda não há cursos para restringir.
- **V3 *(prazo de 1 de julho)*:** Etiquetas aplicam-se **apenas ao nível do curso**. Um curso pode exigir etiquetas; sem elas é público no catálogo. Esta é a versão mínima viável.
- **V4:** Etiquetas estendem-se ao **nível do módulo e da aula**, com regras de independência total entre níveis (ver abaixo). Esta é a versão completa do sistema descrito pelo ministério.

### Regras das etiquetas multi-nível (a partir da V4)

- **Independência total entre níveis.** Curso, módulo e aula têm etiquetas geridas separadamente. Não há herança automática nem validação de subconjuntos. Um curso pode exigir `discipulador` e ter dentro um módulo sem etiquetas; o sistema não reclama.
- **Aplicação:** A visibilidade é avaliada item a item. O utilizador vê uma aula se tiver pelo menos uma etiqueta correspondente (ou se a aula não tiver etiquetas).
- **Itens-pai vazios desaparecem (recursivamente).** Um curso só aparece no catálogo se o utilizador conseguir ver pelo menos um módulo dentro. Um módulo só aparece se o utilizador conseguir ver pelo menos uma aula dentro.
- **Implicação para conteúdos paralelos:** Quando um curso (ex.: Discipulado) tem materiais para `discipulador` e `discipulado`, podem agora coexistir como aulas etiquetadas dentro do mesmo curso, módulo a módulo. O `discipulador` (que tipicamente tem ambas as etiquetas) vê todas as aulas; o `discípulo` vê apenas as suas. Não é necessário criar dois cursos paralelos.

### Mudanças de etiqueta no futuro

Quando um admin adiciona ou remove uma etiqueta de um utilizador, a visibilidade e o estado de conclusão recalculam-se automaticamente com base nas aulas atualmente visíveis. Não há tratamento especial — é o comportamento mais simples e mantém-se assim até existir uma razão clara para o mudar.

---

## 6. Modelo de Conteúdo

Uma árvore de três níveis:

```
Curso
 └── Módulo
      └── Aula
           ├── Vídeo do YouTube  (embebido, visto no site, nunca descarregável)
           └── PDF               (pequeno, legível, descarregável)
```

### Modelos de aula

Cada aula tem um **modelo** que define o tipo de conteúdo que entrega. Modelos iniciais:

| Modelo       | Conteúdo                                                       |
|--------------|----------------------------------------------------------------|
| `pdf`        | Apenas um PDF descarregável                                    |
| `video_pdf`  | Vídeo do YouTube embebido **mais** um PDF descarregável        |

O sistema deve ser desenhado para permitir adicionar novos modelos no futuro (por exemplo, `live_stream`, `quiz`, `text_only`) sem reescrever o modelo de dados. O modelo é guardado como campo de texto na aula; a lógica da aplicação decide que campos são obrigatórios para cada modelo.

### Campos de etiqueta no modelo de dados

- Em V3, o campo de etiquetas exigidas existe **apenas na entidade Curso**.
- Em V4, o campo de etiquetas exigidas existe também nas entidades **Módulo** e **Aula**.

A migração de V3 para V4 é aditiva (acrescenta colunas, não remove nem altera dados existentes).

### Outras regras de conteúdo

- Os vídeos estão alojados no YouTube e embebidos via `iframe`. Os utilizadores veem-nos dentro da página da Logos; nunca saem do site.
- Os PDFs estão alojados no Supabase Storage e servidos via URLs assinados.
- Cada curso, módulo e aula tem um **ID interno estável**. Renomear ou reordenar **não** afeta o estado de conclusão dos utilizadores.
- Eliminar uma aula remove-a do estado de conclusão de todos os utilizadores de forma graciosa (sem erro; apenas desaparece).

---

## 7. Modelo de Acesso

| Área                                                        | Público | Utilizador | Admin | Super Admin |
|-------------------------------------------------------------|:-------:|:----------:|:-----:|:-----------:|
| Página inicial                                              |   ✅    |     ✅     |  ✅   |     ✅      |
| Conhece-nos                                                 |   ✅    |     ✅     |  ✅   |     ✅      |
| Fala connosco                                               |   ✅    |     ✅     |  ✅   |     ✅      |
| Catálogo: cursos sem etiquetas                              |   ✅    |     ✅     |  ✅   |     ✅      |
| Catálogo: cursos com etiquetas                              |   ❌    | ✅ (se etiqueta corresponder) |  ✅   |     ✅      |
| Iniciar curso e ver aulas / descarregar PDFs                |   ❌    | ✅ (se acesso ao curso) |  ✅   |     ✅      |
| Ver módulos / aulas restritos por etiqueta *(V4+)*          |   ❌    | ✅ (se etiqueta corresponder) |  ✅   |     ✅      |
| Marcar aula como concluída                                  |   ❌    |     ✅     |  ✅   |     ✅      |
| Criar / editar / eliminar cursos, módulos, aulas            |   ❌    |     ❌     |  ✅   |     ✅      |
| Upload de PDFs / definir URLs do YouTube                    |   ❌    |     ❌     |  ✅   |     ✅      |
| Criar etiquetas                                             |   ❌    |     ❌     |  ✅   |     ✅      |
| Atribuir etiquetas a utilizadores                           |   ❌    |     ❌     |  ✅   |     ✅      |
| Atribuir etiquetas a módulos e aulas *(V4+)*                |   ❌    |     ❌     |  ✅   |     ✅      |
| Criar / revogar contas de admin                             |   ❌    |     ❌     |  ❌   |     ✅      |

**Princípios orientadores:**

- A navegação do catálogo público é livre, para atrair pessoas
- O envolvimento (iniciar curso, marcar conclusão) exige autenticação
- O acesso a conteúdo restrito por etiqueta é completamente invisível a quem não tem a etiqueta — não aparece sequer com aviso

---

## 8. Acompanhamento de Conclusão

O sistema de acompanhamento é **deliberadamente minimalista** em V3 e V4. Não há barras de progresso, percentagens, nem indicadores visuais sofisticados. Indicadores mais ricos podem ser adicionados em versões posteriores se houver razão clara.

### Estado por aula

- Cada aula tem um botão **"Marcar como concluída"**.
- O estado é binário: a aula está **concluída** ou **não-concluída** para cada utilizador.
- Aulas concluídas mostram um indicador visual mínimo (ex.: ✓) na lista de aulas.
- O utilizador pode desmarcar uma aula que tenha marcado por engano.

### Conclusão de curso

- Um curso considera-se **concluído** quando **todas as aulas atualmente visíveis ao utilizador** estão marcadas como concluídas.
- Quando isso acontece, o utilizador vê um ecrã **"Curso Concluído"** com a **data de conclusão** registada.
- A data é guardada permanentemente. Se o admin acrescentar uma aula nova ao curso depois, o utilizador volta a um estado em-curso até marcar a nova aula; a data original de conclusão é preservada como histórico.

### Sem percentagens nem cálculos progressivos

- Não há percentagem por curso ("60% concluído").
- Não há percentagem por módulo.
- Não há barra de progresso em lado nenhum.
- A sidebar do mockup serve apenas como **navegação visual** — lista de aulas com check nas concluídas e destaque na atual. Não representa progresso quantitativo.

### Mudanças de visibilidade

- Quando o conteúdo visível ao utilizador muda (admin adiciona aulas, remove aulas, ou atribui/remove etiquetas), o estado de "concluído" do curso é recalculado automaticamente com base nas aulas atualmente visíveis.
- Sem tratamento especial. Se um utilizador completou um curso e depois ganha uma etiqueta que torna mais aulas visíveis, o curso volta ao estado em-curso. Se perde uma etiqueta e a única aula que lhe faltava deixa de ser visível, o curso passa a concluído.

---

## 9. Âmbito por Versão

A estrutura de versões organiza o lançamento incremental. As prioridades do documento *Prioridades de Funcionalidades* da equipa do ministério (P1–P4) são mapeadas para as versões na **Secção 10**.

### V1 — Fundação *(site público)*

- Página inicial com o logótipo Logos e a marca da CCLX (paleta creme + laranja vivo)
- Página *Conhece-nos*
- Página *Fala connosco*
- Página *Cursos* vazia ou com placeholder "em breve"
- Identidade visual aplicada em todo o site
- Disponível em `logos.cclx.pt`
- **Sem login, sem base de dados** — a V1 pode ser inteiramente estática.

### V2 — Autenticação e Utilizadores

- Login com email e palavra-passe **e** com Google (OAuth) via Supabase Auth
- Três papéis de sistema: Super Admin, Admin, Utilizador
- Super Admin pode promover/despromover admins
- Estrutura da UI de admin (esqueleto vazio, pronto para a V3)
- Emails de recuperação de palavra-passe via Resend
- **Fundação do sistema de etiquetas:** admins podem criar etiquetas e atribuí-las a utilizadores (mas ainda não há cursos associados a etiquetas — as etiquetas existem, simplesmente ainda não restringem nada)

### V3 — Plataforma de Cursos *(prazo: 1 de julho de 2026)*

- CRUD de admin para Cursos → Módulos → Aulas
- Upload de PDFs e colagem de URLs do YouTube
- Modelos de aula: `pdf` e `video_pdf` (com possibilidade de adicionar mais no futuro)
- **Restrição apenas ao nível do curso:** ao criar um curso, o admin pode anexar etiquetas exigidas. Cursos sem etiquetas são públicos; cursos com etiquetas só aparecem a utilizadores autenticados que tenham pelo menos uma das etiquetas
- Catálogo público mostra cursos sem etiquetas a todos. Cursos restritos só aparecem após login a utilizadores com etiqueta correspondente
- Página de visualização de aula (corresponde ao mockup superior esquerdo, **sem** o campo de perguntas): vídeo embebido, descarregar PDF, barra lateral de módulo com lista de aulas, botões "Próxima aula" e "Próximo módulo"
- "Marcar como concluída" por aula, com check ✓ visível
- Ecrã "Curso Concluído" com data de conclusão
- Pesquisa e navegação no catálogo
- **Contabilização leve de acessos:** botão "Aceder ao curso" / "Começar curso" regista um acesso. Estatísticas básicas visíveis ao admin (por exemplo: "X utilizadores começaram este curso")
- Vercel Analytics ativado (gratuito, automático)

### V4 — Etiquetas Multi-Nível

- Etiquetas exigidas passam a existir também ao **nível do módulo** e ao **nível da aula**
- Independência total entre níveis (sem herança, sem validações de subconjunto)
- Itens-pai vazios desaparecem recursivamente
- UI do admin para anexar etiquetas a módulos e aulas durante a criação/edição
- Recálculo automático de visibilidade e do estado de "Curso Concluído" quando as etiquetas mudam
- **Sem mudanças no sistema de conclusão:** continua binário, sem percentagens

### V5 — Perguntas & Respostas e Estatísticas

- Campo de perguntas por aula (corresponde ao input visível no mockup)
- Perguntas guardadas em base de dados; vista de "caixa de entrada" para a equipa de admins
- Equipa responde inicialmente fora da plataforma (email manual ao aluno); respostas estruturadas dentro da plataforma podem vir mais tarde
- Notificação por email aos admins quando uma nova pergunta é submetida (via Resend)
- **Dashboard de estatísticas mais profundo:** conclusões por curso, taxas de conclusão, segmentação por etiqueta

### V6 — Live Stream e Tema

- Suporte para embeber YouTube Live (vídeos não listados): admin cola um URL ao vivo e o player aparece na página apropriada
- Alternância **modo escuro / modo claro**

### V7 — Indicadores de Progresso *(opcional)*

- A reavaliar quando V3 e V4 estiverem em produção e existirem utilizadores reais
- Pode incluir: barra de progresso por curso, percentagem por módulo, contagens visuais ("3 de 7 aulas")
- **Não é prioridade.** Só é construído se houver feedback claro de utilizadores a pedir

### V8 — Avaliação *(especulativa)*

- Testes por aula ou por módulo
- Tipos de pergunta, pontuação, condicionar a conclusão de módulo a uma nota mínima
- Funcionalidade grande; necessita fase de design antes do build

### V9+ — Funcionalidades futuras

- Dashboard administrativo profundo: tendências, taxas de conversão, exportações
- Outras funcionalidades a definir conforme a plataforma cresce

---

## 10. Mapeamento Prioridade ↔ Versão

A equipa do ministério organizou os pedidos por **prioridade** (P1 essencial → P4 mais tarde). A equipa de desenvolvimento organiza-se por **versão** (V1 → V9+). A tabela abaixo permite que ambas as equipas falem a sua própria linguagem.

| Funcionalidade                                        | Origem               | Prioridade | Versão |
|-------------------------------------------------------|----------------------|:----------:|:------:|
| Página pública + Conhece-nos + Fala connosco          | Especificação        |     —      |   V1   |
| Login com email/palavra-passe e Google                | PDF P1A              |     P1     |   V2   |
| Sistema de etiquetas (fundação)                       | PDF P1A              |     P1     |   V2   |
| CRUD de Cursos / Módulos / Aulas                      | PDF P1B              |     P1     |   V3   |
| Modelos de aula (`pdf`, `video_pdf`)                  | PDF P1B              |     P1     |   V3   |
| Restrição de cursos por etiqueta                      | PDF P1A              |     P1     |   V3   |
| Marcação binária de aulas concluídas                  | Especificação        |     —      |   V3   |
| Ecrã "Curso Concluído"                                | Especificação        |     —      |   V3   |
| Contabilização leve de acessos                        | PDF P1C              |     P1     |   V3   |
| Restrição de módulos e aulas por etiqueta             | PDF P1A              |     P1     |   V4   |
| Perguntas por aula → caixa de entrada da equipa       | PDF P2A              |     P2     |   V5   |
| Dashboard de estatísticas                             | Novo                 |     —      |   V5   |
| Live stream do YouTube embebido                       | PDF P3A              |     P3     |   V6   |
| Modo escuro / modo claro                              | PDF P4A              |     P4     |   V6   |
| Indicadores de progresso (barra, %)                   | A reavaliar          |     —      |   V7   |
| Sistema de testes / avaliação                         | PDF P4B              |     P4     |   V8   |

---

## 11. Stack Técnica

| Camada                                | Escolha                                  | Justificação                                                                              |
|---------------------------------------|------------------------------------------|-------------------------------------------------------------------------------------------|
| Framework (frontend + backend)        | **Next.js 15 + TypeScript**              | Código único para UI e API; routing por ficheiros; renderização no servidor; nativo no Vercel |
| Estilização                           | **Tailwind CSS**                         | Utility-first; rápido para humano e para Claude Code                                      |
| Componentes UI                        | **shadcn/ui**                            | Acessíveis, configuráveis para a paleta creme + laranja                                   |
| Base de dados                         | **Supabase (Postgres)**                  | Postgres real, plano gratuito generoso, sem aprisionamento                                |
| Autenticação                          | **Supabase Auth** (email + Google OAuth) | Integrada com a base de dados; trata de papéis, sessões, recuperação de palavra-passe     |
| Armazenamento de ficheiros (PDFs)     | **Supabase Storage**                     | Mesma conta Supabase; URLs assinados para descarregar                                     |
| Acesso à base de dados                | **Supabase JS client**                   | Ponto de partida mais simples que um ORM completo; migração para Drizzle possível mais tarde |
| Formulários e validação               | **react-hook-form + Zod**                | Combinação padrão para os formulários do admin                                            |
| Email                                 | **Resend**                               | Emails de recuperação de palavra-passe; integração com Supabase Auth                      |
| Alojamento                            | **Vercel**                               | Host nativo de Next.js; plano gratuito; deploy automático a partir do GitHub              |
| Controlo de versões                   | **GitHub**                               | Repositório + gatilho de deploy do Vercel                                                 |
| Gestor de pacotes                     | **pnpm**                                 | Mais rápido e eficiente em disco que o npm                                                |
| Editor                                | **VS Code** (ou Cursor)                  | Ferramentas padrão                                                                        |
| DNS / domínio                         | **Hostinger DNS** (gerido pela conta da igreja) | CNAME `logos.cclx.pt` aponta para o Vercel                                          |
| Analytics *(opcional)*                | **Vercel Analytics** ou **Plausible**    | Respeita privacidade, gratuito                                                            |
| Tracking de erros *(opcional, V2+)*   | **Sentry**                               | Captura erros em produção                                                                 |

**Custo mensal esperado:** **0 €** até crescimento significativo.

**Não usado / explicitamente fora de âmbito:**

- Pagamentos (sem Stripe)
- Funcionalidades de IA
- Backend separado (Next.js trata da API no mesmo código)
- Armazenamento próprio de vídeo (apenas YouTube embebido)

---

## 12. Arquitetura do Sistema

```
                        ┌──────────────────────────┐
                        │   Browser do utilizador  │
                        │     (logos.cclx.pt)      │
                        └──────────────┬───────────┘
                                       │ HTTPS
                                       ▼
                ┌──────────────────────────────────────────┐
                │              VERCEL                      │
                │  Aloja a aplicação Next.js               │
                │  ┌────────────────────────────────────┐  │
                │  │  Frontend Next.js (React)          │  │
                │  │  + API Routes / Server Actions     │  │
                │  └─────────────────┬──────────────────┘  │
                └────────────────────┼─────────────────────┘
                                     │
                                     │ Cliente Supabase (JS)
                                     ▼
                ┌──────────────────────────────────────────┐
                │              SUPABASE                    │
                │                                          │
                │  ┌────────────┐  ┌──────────────────┐    │
                │  │ Postgres   │  │ Auth             │    │
                │  │ (BD)       │  │ (login, papéis)  │    │
                │  └────────────┘  └──────────────────┘    │
                │  ┌────────────┐                          │
                │  │ Storage    │  ← PDFs                  │
                │  └────────────┘                          │
                └──────────────────────────────────────────┘

Serviços externos:
  • YouTube       → Vídeos embebidos (iframes; sem tráfego pelos nossos servidores)
  • Resend        → Emails transacionais (recuperação de palavra-passe, etc.)
  • GitHub        → Código-fonte; pushes despoletam deploys no Vercel
  • Hostinger DNS → CNAME logos.cclx.pt → Vercel
```

### Domínio e DNS

- O domínio `cclx.pt` está registado e gerido na conta Hostinger da igreja.
- O site principal da igreja (`cclx.pt`, `www.cclx.pt`) é construído e alojado no Hostinger por uma empresa externa. **Não faz parte deste projeto.**
- A aplicação Logos é alojada no **Vercel** e servida no subdomínio **`logos.cclx.pt`**.
- Os registos DNS que encaminham `logos.cclx.pt` para o Vercel são geridos no painel de DNS do Hostinger (configuração única, ~5 minutos).
- Os dois sites são **operacionalmente independentes**: código, deploy, alojamento e faturação separados.

---

## 13. Fluxo de Desenvolvimento

1. O código é escrito localmente no VS Code, executado em `localhost:3000` via `pnpm dev`.
2. A aplicação local liga-se a um projeto Supabase (projeto dedicado de desenvolvimento ou o de produção com cuidado — a decidir na fase de Setup).
3. As alterações são submetidas a um repositório no GitHub.
4. Push para o branch `main` despoleta automaticamente um deploy no Vercel. Disponível em `logos.cclx.pt` em ~60 segundos.
5. Branches de pull request recebem deploys de pré-visualização em URLs únicos (comportamento padrão do Vercel).

---

## 14. Branding e Referências Visuais

- **Logótipo:** Logótipo existente do ministério Logos / CCLX (a fornecer).
- **Paleta:** Creme + laranja vivo. Valores hexadecimais exatos a confirmar com a referência visual.
- **Tom:** Acolhedor, limpo, adequado a uma igreja. Não corporativo, não frio.
- **Tipografia:** A definir na fase de Setup com base na referência visual.

### Referências de mockup

A equipa forneceu um conjunto de mockups a servir de referência visual de alto nível. Os mockups **não são vinculativos ao pixel**, mas estabelecem a linguagem visual e a estrutura da UI:

1. **Cabeçalho global** (todas as páginas): logótipo Logos à esquerda, navegação à direita com *Conhece-nos / Cursos / Fala connosco*. Menu hambúrguer em mobile.

2. **Catálogo de cursos**: grelha de cartões de curso. Cada cartão tem um ícone, o nome do curso e uma seta CTA. Cartões alternam fundo creme com variações com tonalidade.

3. **Detalhe de curso**: bloco hero com ícone do curso, título, descrição e botão "Iniciar". Abaixo, uma lista horizontal numerada dos módulos (1 → 2 → 3 → 4 → 5 → ...) com os títulos de módulo por baixo de cada número. **Esta numeração é navegação, não progresso.**

4. **Visualização de aula**: player de vídeo (área principal), barra lateral do módulo com lista de aulas, botão "Próxima aula", linha "Apostila.pdf" com "Descarregar". A sidebar mostra as aulas com indicação visual mínima da aula atual e check ✓ nas concluídas. **A sidebar é navegação, não barra de progresso.** O campo "Deixa a tua pergunta" visível no mockup pertence à **V5** e **não** está incluído nem na V3 nem na V4.

5. **Visualização de PDF**: título "Título Apostila", botão "Descarregar" no canto superior direito, conteúdo do PDF renderizado em linha na página.

---

## 15. Princípios Orientadores

- **Construir para o futuro, mas apenas o que o presente justifica.** Hoje: zero cursos. Em 2–3 anos: dezenas. O modelo de dados e a UX são desenhados para crescer; a infraestrutura não é dimensionada para tráfego que ainda não existe.
- **Manter os fluxos de admin simples.** Os admins são voluntários, não engenheiros. Os formulários devem ser óbvios; os erros devem ser fáceis de desfazer.
- **Não impor barreiras à curiosidade.** Os utilizadores públicos podem ver o catálogo de cursos não restritos. O login é exigido apenas para envolvimento.
- **A conclusão pertence ao utilizador.** Nunca penalizar utilizadores invalidando aulas concluídas por causa de reorganizações de conteúdo.
- **Privilegiar a opção mais aborrecida e bem-documentada** sempre que possível. Este projeto tem um prazo curto e um developer junior; só se recorre a ferramentas novas quando há razão clara.
- **Construir progressivamente.** Quando uma funcionalidade adiciona complexidade significativa (por exemplo, etiquetas multi-nível), divide-se em fases. A V3 fica com o mínimo viável; a V4 acrescenta a complexidade.
- **A divergência da especificação é perigosa.** Quando uma decisão real altera o funcionamento do produto, este documento é atualizado.

---

## 16. Restrições e Suposições

- **Developer único** (junior, conhecimento médio em todo o stack), assistido por Claude Code.
- **Prazo absoluto de 1 de julho de 2026** para uma V3 funcional (V1, V2, V3 todas em produção). V4 e seguintes não têm prazo fixo.
- O **site principal da igreja está atualmente em manutenção**, mas regressará; os dois sites têm de coexistir sem interferir.
- A **empresa que constrói o site principal é independente** e não precisa de coordenar com este projeto além da configuração de DNS.
- **Acesso a DNS** tem de ser obtido junto de quem gere a conta Hostinger da igreja antes da semana de lançamento (a identificar; assinalado como dependência pré-lançamento).
- **Os limites do plano gratuito** assumem-se suficientes para o primeiro ano de operação. As primeiras eventuais subidas de plano seriam Supabase Pro (para *backups*) e Resend (para volume de email mais alto) — nenhuma necessária no lançamento.

---

## 17. Questões em Aberto / Decisões Adiadas

- **Valores hexadecimais exatos da paleta, tipografia e logótipo final** — a fornecer antes do início da V1.
- **Projeto Supabase único vs. projetos separados de dev/prod** — a decidir na fase de Setup.
- **Estratégia de backup no plano gratuito do Supabase** — aceitar o risco para a V1; rever quando houver utilizadores reais.
- **Identificar o contacto de DNS** na conta Hostinger da igreja — necessário antes da semana de lançamento (com bastante antecedência relativamente a 1 de julho).
- **Texto público final** (página inicial, *Conhece-nos*, etiquetas de botões) — redigido durante a V1 e revisto pelos responsáveis da igreja.
- **Decisão sobre adicionar Sentry, analytics ou Drizzle ORM** — adiar até V2+.
- **Design da funcionalidade de Q&A (V5)** — adiada na totalidade até a V4 estar estável.
- **Decisão sobre indicadores de progresso (V7)** — só após V3+V4 em produção e feedback real de utilizadores.
- **Possibilidade futura de SSO com a app da CCLX** — não viável agora; pode ser considerada em versão posterior se a app expuser uma API ou integração SSO.

---

## 18. Explicitamente Fora de Âmbito

Para manter as primeiras versões focadas, o seguinte está **explicitamente fora de âmbito** e não deve ser adicionado sem rever esta especificação:

- Pagamentos, donativos ou *tip jars*
- Múltiplos idiomas
- Aplicações móveis nativas (iOS/Android)
- Chat ao vivo ou mensagens em tempo real
- Funcionalidades sociais (likes, partilhas, comentários — exceto o Q&A da V5)
- Funcionalidades de IA
- Fóruns de discussão para além do Q&A por aula previsto na V5
- Newsletters por email ou marketing automation
- Certificados de conclusão de curso para além do simples ecrã "Curso Concluído"
- Ficheiros de vídeo alojados pelo próprio sistema
- Barras de progresso, percentagens ou cálculos visuais de avanço (até pelo menos a V7, e mesmo aí só se justificado)

---

## 19. Estado do Documento

- **Versão:** 2.0
- **Última atualização:** 28 de abril de 2026
- **Alterações relativamente à v1.0:**
  - Etiquetas estendidas a três níveis (curso, módulo, aula), faseadas: V3 só ao nível do curso, V4 acrescenta módulo e aula
  - Acompanhamento de progresso simplificado para conclusão binária por aula; eliminadas barras de progresso e percentagens
  - Versões reorganizadas: nova V4 dedicada a etiquetas multi-nível; antigas V4–V6 deslocaram-se para V5–V7; nova V7 reservada a indicadores de progresso opcionais
- **Responsável:** Líder do projeto
- **Próxima revisão:** Antes de iniciar o build da V1 (após conclusão da fase de Setup)
