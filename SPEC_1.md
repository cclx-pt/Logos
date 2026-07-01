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

### Bootstrap do primeiro Super Admin (V2)

- **Primeiro Super Admin:** `joaocanelasribeiro@gmail.com`. Em cada ambiente (`logos-dev` primeiro, `logos-prod` depois), o seed faz-se assim: a pessoa faz login Google normalmente → o callback OAuth cria o `profiles` com `role='user'` (defesa em profundidade: Server Action + trigger DB, ver `architecture.md` §4) → corre-se manualmente o SQL versionado `supabase/seed/super-admin.sql.example` (cópia para `super-admin.sql` local, não versionada) que faz `update profiles set role='super_admin' where external_auth_id = (select id from auth.users where email = 'joaocanelasribeiro@gmail.com')`. Daí em diante, este utilizador promove os outros pela UI dedicada.
- **Entrada à área admin:** a área `/admin` é acessível via item dedicado no **dropdown do utilizador** (no Header, após o login). O item só é renderizado se `profile.role !== 'user'`. Não há link na nav principal. Não há sub-domain admin. Não há banner ou aviso para utilizadores normais — coerente com o princípio "conteúdo restrito é invisível, não bloqueado" (§5).

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

### Conteúdos: o nível de topo

O ensino da plataforma organiza-se sob um nível de topo chamado **Conteúdos**, com duas áreas:

- **Cursos** — a árvore de três níveis descrita abaixo (Curso → Módulo → Aula). É o foco das V1–V5.
- **Escola Bíblica** — as transmissões em direto da Escola Bíblica da CCLX. O esqueleto existe desde a V1 (placeholder "em construção"); a funcionalidade real (embeber YouTube Live) chega na **V6**.

A navegação principal expõe **Conteúdos** (não "Cursos") como item de topo. As duas áreas vivem em `/conteudos/cursos` e `/conteudos/escola-biblica`.

### Árvore de Cursos

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
| `video`      | Apenas um vídeo do YouTube embebido (sem sebenta)            |
| `video_pdf`  | Vídeo do YouTube embebido **mais** um PDF descarregável        |

O sistema deve ser desenhado para permitir adicionar novos modelos no futuro (por exemplo, `live_stream`, `quiz`, `text_only`) sem reescrever o modelo de dados. O modelo é guardado como campo de texto na aula; a lógica da aplicação decide que campos são obrigatórios para cada modelo.

### Campos de etiqueta no modelo de dados

- Em V3, o campo de etiquetas exigidas existe **apenas na entidade Curso**.
- Em V4, o campo de etiquetas exigidas existe também nas entidades **Módulo** e **Aula**.

A migração de V3 para V4 é aditiva (acrescenta colunas, não remove nem altera dados existentes).

### Sequência e pré-requisitos (V3.6)

Cada **curso** tem três controlos opcionais de progressão, geridos pelo admin no formulário do curso. As duas flags de sequência interna são **independentes**:

- **Aulas em sequência** (`courses.sequential_lessons`, boolean): dentro de cada módulo, as aulas têm de ser concluídas pela ordem (`lesson.position`) - a aula 2 exige a aula 1 do mesmo módulo. A primeira por concluir do módulo (a "fronteira") e as já concluídas ficam acessíveis; as restantes ficam **bloqueadas**.
- **Módulos em sequência** (`courses.sequential_modules`, boolean): um módulo só fica acessível depois de o módulo anterior (com aulas) estar **totalmente concluído**. Independente de `sequential_lessons` - dá para exigir ordem só das aulas, só dos módulos, ambas ou nenhuma.
- **Curso pré-requisito** (`courses.prerequisite_course_id`, auto-referência nullable): o curso só fica disponível depois de o curso apontado estar **concluído**. `NULL` = curso autónomo. Encadear cursos (A → B → C) cria uma **sequência de cursos**. Ciclos são impedidos (auto-referência por CHECK na BD; cadeias mais longas pela Server Action).

**Conteúdo bloqueado por sequência aparece com cadeado e dica** ("Conclui a aula anterior primeiro" / "Conclui [Curso A] primeiro"), **não é escondido** - ao contrário da restrição por etiqueta (§5), que é invisível. A diferença é intencional: a sequência é pedagógica (mostra o caminho), a etiqueta é controlo de acesso. A regra é aplicada **server-side** (a página de aula/módulo redirecciona para a fronteira; a inscrição recusa se o pré-requisito faltar), não em RLS - tal como a deteção de "curso concluído" (§8).

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
- Página *Conteúdos* — placeholder "em breve" em V1. V3 substitui pelo catálogo real de cursos com pesquisa textual (PR5: filtragem por título via `?q=`, badge "Em breve" para cursos sem aulas, RLS filtra por etiqueta). Escola Bíblica (transmissões em direto) entra em V6 como rota dedicada se o ministério fizer transmissões — não há sub-página dedicada em V3.
- Identidade visual aplicada em todo o site
- Disponível em `logos.cclx.pt`
- **Sem login, sem base de dados** — a V1 pode ser inteiramente estática.

### V2 — Autenticação e Utilizadores

- Login com **Google (OAuth)** via Supabase Auth — método único. Email/password está fora de âmbito V1-V9 (ver §17 e §18).
- Três papéis de sistema: Super Admin, Admin, Utilizador
- Super Admin pode promover/despromover admins
- Estrutura da UI de admin (esqueleto vazio, pronto para a V3)
- **Fundação do sistema de etiquetas:** admins podem criar etiquetas e atribuí-las a utilizadores (mas ainda não há cursos associados a etiquetas — as etiquetas existem, simplesmente ainda não restringem nada)

### V3 — Plataforma de Cursos *(prazo: 1 de julho de 2026)*

- CRUD de admin para Cursos → Módulos → Aulas
- Upload de PDFs e colagem de URLs do YouTube
- Modelos de aula: `pdf`, `video` e `video_pdf` (com possibilidade de adicionar mais no futuro)
- **Restrição apenas ao nível do curso:** ao criar um curso, o admin pode anexar etiquetas exigidas. Cursos sem etiquetas são públicos; cursos com etiquetas só aparecem a utilizadores autenticados que tenham pelo menos uma das etiquetas
- Catálogo público mostra cursos sem etiquetas a todos. Cursos restritos só aparecem após login a utilizadores com etiqueta correspondente
- Página de visualização de aula (corresponde ao mockup superior esquerdo; o **campo de perguntas** foi acrescentado em **V3.5** e virou **conversa ligada** em V3.6 - ver §V5): vídeo embebido, descarregar PDF, barra lateral de módulo com lista de aulas, botões "Próxima aula" e "Próximo módulo"
- "Marcar como concluída" por aula, com check ✓ visível
- Ecrã "Curso Concluído" com data de conclusão
- Pesquisa e navegação no catálogo
- **Contabilização leve de acessos:** botão "Aceder ao curso" / "Começar curso" regista um acesso. Estatísticas básicas visíveis ao admin (por exemplo: "X utilizadores começaram este curso")
- Vercel Analytics ativado (gratuito, automático)
- **(Puxado de V5 — 30-05-2026):** dashboard de estatísticas em `/admin/estatisticas` — totais, por curso (inscritos, finalizações, acessos, visitas a módulos/aulas) e por utilizador (super_admin). Inclui tracking de visitas a aulas (`lesson_views`). **Sem** taxas/percentagens de conclusão nem segmentação por etiqueta — essa parte continua em V5.

### V4 — Etiquetas Multi-Nível

- Etiquetas exigidas passam a existir também ao **nível do módulo** e ao **nível da aula**
- Independência total entre níveis (sem herança, sem validações de subconjunto)
- Itens-pai vazios desaparecem recursivamente
- UI do admin para anexar etiquetas a módulos e aulas durante a criação/edição
- Recálculo automático de visibilidade e do estado de "Curso Concluído" quando as etiquetas mudam
- **Sem mudanças no sistema de conclusão:** continua binário, sem percentagens
- **Pré-requisitos sequenciais (aula/módulo/curso) puxados para V3.6 (14-06-2026):** as flags por curso `sequential_lessons` (aulas em ordem dentro do módulo) e `sequential_modules` (módulos em ordem), independentes, mais o `prerequisite_course_id` (cadeia de cursos opcional) foram **antecipados** para o ciclo V3. Ver §6 (Sequência e pré-requisitos), §19 e `feature-docs/sequencing.md`. Migration `20260614140000` (só `logos-dev`).

### V5 — Perguntas & Respostas e Estatísticas

- **Q&A puxado para V3.5/V3.6 (13-06-2026):** o campo de perguntas por aula, a gravação em base de dados (`lesson_questions`), a vista de "caixa de entrada" para a equipa (`/admin/perguntas`) e a notificação por email (via Resend) foram **antecipados** para o ciclo V3 - tal como as estatísticas (30-05). Em **V3.6** puxou-se também o **thread bidirecional / inbox do aluno**: a equipa responde **dentro da app** (a resposta vai por email ao aluno), o aluno recebe cópia da pergunta e pode dar **seguimento** em `/perguntas`, tudo ligado por um código `LOGOS-XXXXXX`. Migrations `20260612220000` + `20260612230000` + `20260613120000` (só `logos-dev`). Ver `feature-docs/qa-perguntas.md`.
- **Fica para V5:** FAQ pública / agrupar os temas mais pedidos a partir das conversas guardadas. (As respostas estruturadas dentro da plataforma - thread bidirecional + inbox do aluno - foram entregues em V3.6.)
- **Dashboard de estatísticas mais profundo:** ~~conclusões por curso~~, **taxas de conclusão** e **segmentação por etiqueta**. *(As contagens — conclusões/inscrições/visitas por curso, módulo, aula e utilizador — foram puxadas para V3 em 30-05-2026, ver §9 V3 e `feature-docs/admin-estatisticas.md`. Ficam para V5 apenas as percentagens/taxas e a segmentação por etiqueta.)*

### V6 — Live Stream e Tema

- Suporte para embeber YouTube Live (vídeos não listados): admin cola um URL ao vivo e o player aparece na área **Escola Bíblica** (`/conteudos/escola-biblica`), cujo esqueleto foi entregue na V1
  - **Antecipado para V3.6 (13-06-2026), com âmbito ajustado:** entregue como entrada de nav **"Live"** + página `/live` (canal LOGOS), deteção automática live/offline via YouTube Data API no servidor (sem o admin colar URL), em vez de `/conteudos/escola-biblica`. Ver §19 e `feature-docs/live.md`.
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
| Modelos de aula (`pdf`, `video`, `video_pdf`)         | PDF P1B              |     P1     |   V3   |
| Restrição de cursos por etiqueta                      | PDF P1A              |     P1     |   V3   |
| Marcação binária de aulas concluídas                  | Especificação        |     —      |   V3   |
| Ecrã "Curso Concluído"                                | Especificação        |     —      |   V3   |
| Contabilização leve de acessos                        | PDF P1C              |     P1     |   V3   |
| Restrição de módulos e aulas por etiqueta             | PDF P1A              |     P1     |   V4   |
| Perguntas por aula → caixa de entrada da equipa       | PDF P2A              |     P2     |   V5   |
| Dashboard de estatísticas (contagens)                 | Novo                 |     —      | V3 (puxado 30-05) |
| Dashboard de estatísticas (taxas % + segmentação)     | Novo                 |     —      |   V5   |
| Live stream do YouTube embebido                       | PDF P3A              |     P3     |   V6   |
| Modo escuro / modo claro                              | PDF P4A              |     P4     |   V6   |
| Indicadores de progresso (barra, %)                   | A reavaliar          |     —      |   V7   |
| Sistema de testes / avaliação                         | PDF P4B              |     P4     |   V8   |

---

## 11. Stack Técnica

| Camada                                | Escolha                                  | Justificação                                                                              |
|---------------------------------------|------------------------------------------|-------------------------------------------------------------------------------------------|
| Framework (frontend + backend)        | **Next.js 16 + TypeScript** (`strict: true`) | Código único para UI e API; routing por ficheiros; SSR; nativo no Vercel. Versão 16 é a estável corrente a 05-05-2026 — App Router + Turbopack default. Inicial pre-V1 corria Next 15; bump documentado em `feature-docs/nextjs-init.md` §4.1 |
| Estilização                           | **Tailwind CSS**                         | Utility-first; rápido para humano e para Claude Code                                      |
| Componentes UI                        | **shadcn/ui**                            | Acessíveis, configuráveis para a paleta creme + laranja                                   |
| Base de dados                         | **Supabase (Postgres)** — 2 projetos: `logos-dev` e `logos-prod` | Auth da Supabase fixa-se ao schema `auth.users`; só projetos separados isolam contas. Plano gratuito acomoda 2 projetos |
| Autenticação                          | **Supabase Auth** (OAuth social: Google + email OTP) — ver §17 e §18 | Integrada com a base de dados; trata de papéis e sessões. Sem signup/recovery de palavra-passe (decisão de scope V2 para reduzir esforço e dependências externas). Microsoft (Entra/Azure) foi acrescentado em 04-06-2026 e removido em 10-06-2026 (decisão do líder: só Google + email); Apple adiado por exigir Apple Developer Program pago |
| Armazenamento de ficheiros (PDFs)     | **Supabase Storage**                     | Mesma conta Supabase; URLs assinados para descarregar                                     |
| Acesso à base de dados                | **Supabase JS client** (`@supabase/ssr` para SSR) | Sessão em Server Components/Actions via cookies httpOnly; migração para Drizzle adiada |
| Migrations                            | **Supabase CLI** (`supabase/migrations/*.sql` versionado) | Schema replicado entre `logos-dev` e `logos-prod` com `supabase db push`; ficheiros SQL no Git |
| Formulários e validação               | **react-hook-form + Zod**                | Combinação padrão para os formulários do admin                                            |
| Testes (unit / lógica)                | **Vitest** + **@testing-library/react**  | Cobertura obrigatória de visibilidade por etiquetas, conclusão de curso, papéis (`CLAUDE.md`) |
| Testes E2E *(a partir da V3)*         | **Playwright**                           | Verificação ponta-a-ponta de fluxos de auth e acesso por etiqueta. Adiado para V3: V1 é estático, V2 cobre-se com Vitest |
| Linting                               | **ESLint** (`next/core-web-vitals`)      | Default do `create-next-app`; impede `any` sem justificação                               |
| Formatação                            | **Prettier**                             | Configuração mínima                                                                       |
| Email                                 | **Resend**                               | **V5+**: notificações de Q&A para admins. SPF + DKIM no DNS Hostinger ficam adiados para essa altura (sem urgência V2 por o login ser apenas Google) |
| Alojamento                            | **Vercel**                               | Host nativo de Next.js; plano gratuito; deploy automático a partir do GitHub              |
| Controlo de versões + CI              | **GitHub** + **GitHub Actions**          | Repositório + deploy Vercel; Actions corre `pnpm lint && pnpm typecheck && pnpm test` em PR; `main` protegido contra push directo |
| Gestor de pacotes                     | **pnpm**                                 | Mais rápido e eficiente em disco que o npm                                                |
| Editor                                | **VS Code** (ou Cursor)                  | Ferramentas padrão                                                                        |
| DNS / domínio                         | **Hostinger DNS** (gerido pela conta da igreja) | CNAME `logos.cclx.pt` → Vercel; registos SPF + DKIM para Resend                            |
| Analytics                             | **Vercel Analytics**                     | Cookieless, gratuito, respeita privacidade                                                |
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

1. O código é escrito localmente no VS Code, executado em `localhost:3000` via `pnpm dev`. `.env.local` aponta para o projeto Supabase **`logos-dev`**.
2. As alterações são submetidas via **pull request** num repositório no GitHub. Push directo para `main` está bloqueado (regra `CLAUDE.md` + branch protection).
3. **GitHub Actions** corre `pnpm lint && pnpm typecheck && pnpm test` em cada PR. Sem checks verdes, não há merge. A partir da V3 acrescenta-se `pnpm test:e2e` (Playwright).
4. PRs aprovados são merged em `main`. O Vercel constrói e faz deploy contra o projeto Supabase **`logos-prod`** em ~60 segundos. Disponível em `logos.cclx.pt`.
5. Branches de pull request recebem deploys de pré-visualização em URLs únicos. **Preview aponta para `logos-dev`, não para `logos-prod`** — PRs incluem schema migrations e mutações de teste que não devem poluir produção; auth de teste em V2 vai para `logos-dev`. Trade-off aceite: PRs não apanham bugs "production-only state" (apanham-se em QA pós-merge). Detalhes em `feature-docs/vercel.md` §4.
6. **Migrations:** `supabase migration new <nome>` → SQL versionado no Git → `supabase db push` em `logos-dev` → após PR merged, `supabase db push` em `logos-prod` (passo manual e deliberado).

---

## 14. Branding e Referências Visuais

### Paleta (fixada)

| Token            | Hex       | Uso                                                  |
|------------------|-----------|------------------------------------------------------|
| `cream-bg`       | `#FAF4EA` | Fundo principal de todas as páginas                  |
| `cream-card`     | `#FBE6D4` | Cartão pêssego (variação 1 — ex.: *Fundamentos*)     |
| `sage-card`      | `#C6CDB1` | Cartão sálvia (variação 2 — ex.: *Discipulado*)      |
| `butter-card`    | `#F6E6C4` | Cartão amarelo suave (variação 3 — ex.: *Futuros*)   |
| `orange-primary` | `#E36A2C` | Marca, CTAs, links, ícones de destaque               |
| `orange-hover`   | `#C85A22` | Estado hover/active de elementos `orange-primary`    |
| `ink`            | `#1A1A1A` | Texto principal                                      |
| `muted`          | `#6B6B6B` | Texto secundário, *placeholders*, metadados          |

Os tokens são vinculativos: o tema do Tailwind e do shadcn/ui devem usá-los exactamente. Variações futuras (modo escuro V6) acrescentam tokens novos, sem alterar os existentes.

### Tipografia (fixada)

- **Display / títulos:** **Cormorant Garamond** (Google Fonts, gratuito) — pesos 500 e 600. Usado em `h1`–`h3`, hero, títulos de cartão de curso e no wordmark *LOGOS* quando renderizado em texto.
- **UI / corpo:** **Inter** (Google Fonts, gratuito) — pesos 400, 500, 600. Usado em corpo, navegação, formulários, botões, sidebars.
- Carregamento via `next/font/google` com `display: 'swap'` e `subsets: ['latin']`. Sem `latin-ext` — não é necessário para PT-PT e reduz o *bundle*.

### Logótipo

- O wordmark *LOGOS* + livro aberto estilizado (linha laranja) visível em `docs/branding/mockups-v3.jpeg` é a versão visual aprovada.
- **Pendente:** receber do ministério o ficheiro **SVG vetorial** (e versão monocroma para fundos escuros, futuros V6). Até lá, o wordmark é reproduzido em texto Cormorant Garamond a `orange-primary` como *fallback* aceitável para a V1.
- Em mobile o cabeçalho colapsa: o wordmark fica visível, navegação fecha em hambúrguer.

### Tom

Acolhedor, limpo, adequado a uma igreja. Não corporativo, não frio. A combinação creme + laranja vivo sustenta este tom; evitar acrescentar paletas frias (azuis, cinzas saturados) sem justificação.

### Referências visuais vinculativas

Os ficheiros em `docs/branding/` são a fonte de verdade visual:
- `placeholder-cclx-logos.png` — *placeholder* atual em `cclx.cclx.pt/logos`. Estabelece o tom geral; o laranja é mais terracota que o da plataforma final.
- `mockups-v3.jpeg` — quatro mockups da V3 (catálogo, detalhe de curso, aula, sebenta). **Vinculativos no nível da estrutura e da paleta, não ao pixel.**

### Referências de mockup

A equipa forneceu um conjunto de mockups a servir de referência visual de alto nível. Os mockups **não são vinculativos ao pixel**, mas estabelecem a linguagem visual e a estrutura da UI:

1. **Cabeçalho global** (todas as páginas): logótipo Logos à esquerda, navegação à direita com *Conhece-nos / Conteúdos / Fala connosco*. Menu hambúrguer em mobile.

2. **Catálogo de cursos**: grelha de cartões de curso. Cada cartão tem um ícone, o nome do curso e uma seta CTA. Cartões alternam fundo creme com variações com tonalidade.

3. **Detalhe de curso**: bloco hero com ícone do curso, título, descrição e botão "Iniciar". Abaixo, uma lista horizontal numerada dos módulos (1 → 2 → 3 → 4 → 5 → ...) com os títulos de módulo por baixo de cada número. **Esta numeração é navegação, não progresso.**

4. **Visualização de aula**: player de vídeo (área principal), barra lateral do módulo com lista de aulas, botão "Próxima aula", linha "Sebenta.pdf" com "Descarregar". A sidebar mostra as aulas com indicação visual mínima da aula atual e check ✓ nas concluídas. **A sidebar é navegação, não barra de progresso.** O campo "Deixa a tua pergunta" visível no mockup foi entregue em **V3.5** (Q&A puxado de V5, 13-06-2026): caixa "Pergunta aos professores" no leitor → guarda em `lesson_questions` + notificação por email à equipa (Reply-To = aluno) + inbox em `/admin/perguntas`. Em **V3.6** virou **conversa ligada**: a equipa responde dentro da app (resposta por email ao aluno) e o aluno acompanha e dá seguimento na sua conversa em `/perguntas`. Ver §V5 e `feature-docs/qa-perguntas.md`.

5. **Visualização de PDF**: título "Título Sebenta", botão "Descarregar" no canto superior direito, conteúdo do PDF renderizado em linha na página.

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
- **Branch protection em `main` está activa** (12-05-2026). Tornada elegível pela mudança de visibilidade do repositório para público (ver `feature-docs/vercel.md` §5) e aplicada via API GitHub no mesmo dia. Regra:
  - Pull request obrigatório (sem push directo).
  - Check `Lint · Typecheck · Test · Format` (GitHub Actions) tem de passar antes de merge.
  - Histórico linear obrigatório (alinhado com squash-merge usado em todos os PRs).
  - `allow_force_pushes: false`, `allow_deletions: false`.
  - `enforce_admins: false` — administradores podem fazer override em emergência. É salvaguarda; o uso continua disciplina honor-system reforçada por `CLAUDE.md` + `.claude/settings.json` `permissions.deny` (`git push --force`, `git reset --hard`, `git branch -D *main*`).
  - `required_approving_review_count: 0` — single dev faz self-merge dos próprios PRs sem aprovação. Reavaliar quando equipa crescer.

---

## 17. Questões em Aberto / Decisões Adiadas

- **Logótipo final em SVG** do ministério — em falta. A V1 pode arrancar com wordmark em texto (Cormorant Garamond a `orange-primary`); substitui-se quando o ficheiro chegar. Paleta e tipografia foram fixadas em §14.
- **Estratégia de backup no plano gratuito do Supabase** — aceitar o risco para a V1; rever quando houver utilizadores reais.
- **Identificar o contacto de DNS** na conta Hostinger da igreja — necessário antes da semana de lançamento (com bastante antecedência relativamente a 1 de julho).
- **Texto público final** (página inicial, *Conhece-nos*, etiquetas de botões) — redigido durante a V1 e revisto pelos responsáveis da igreja.
- **Decisão sobre adicionar Sentry, analytics ou Drizzle ORM** — adiar até V2+.
- **Design da funcionalidade de Q&A (V5)** — adiada na totalidade até a V4 estar estável.
- **Decisão sobre indicadores de progresso (V7)** — só após V3+V4 em produção e feedback real de utilizadores.
- **Integração futura com shell partilhada CCLX** — não implementada agora, mas a fronteira de identidade do Logos foi estruturada para a tornar uma substituição de camada (e não uma reescrita): identidade isolada em `src/lib/auth/` como única importadora de `@supabase/ssr`, FKs sempre para `profiles.id` (nunca para `auth.users`), RLS via função helper `current_profile_id()`. O contrato concreto com a shell será definido em documento próprio quando a shell for desenhada. Detalhes em `architecture.md` §4 e `feature-docs/auth-architecture.md`.
- **Email/password como método alternativo de autenticação** — fora do âmbito V1-V9. Decisão tomada em 09-05-2026 para reduzir esforço da V2 (de ~13h para ~3.5h), eliminar dependências externas em Resend e DNS Hostinger, e acelerar a entrega da V3 (01-07-2026). Reabrir apenas se o ministério explicitamente pedir. Detalhes em `architecture.md` §4 e `feature-docs/auth-architecture.md`.
- **Providers OAuth suportados** — **Google** (desde V2) é o único provider OAuth. Microsoft/Entra (Azure) foi acrescentado em 04-06-2026 e **removido em 10-06-2026** (decisão do líder do projeto: simplificar para Google + email OTP; o código Microsoft chegou a estar pronto mas o provider nunca foi configurado no Supabase). **Apple adiado**: "Sign in with Apple" exige Apple Developer Program (~99 USD/ano) + Services ID + chave de assinatura; reabrir quando justificado. O código está preparado para reintroduzir providers (um wrapper em `src/lib/auth/actions.ts` + uma entrada no registry `SIGN_IN_PROVIDERS` em `src/lib/auth/providers.ts`). As credenciais de cada provider vivem no painel Supabase Auth, nunca no repositório.
- **Login por email + código (OTP passwordless)** — **decidido avançar** em 04-06-2026 (líder do projeto): segundo método de login para quem não tem (ou não quer usar) Google, sem sistema de palavras-passe. Código de 6 dígitos via Supabase OTP, email entregue por **Resend (SMTP do Supabase)**. Reabre a dependência de email/DNS que a V2 tinha adiado (SPF/DKIM Hostinger). **OTP não é palavra-passe** — login com password continua fora de âmbito (§18). Plano completo + setup em `feature-docs/email-otp-login.md`.

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
- Login com email e **palavra-passe** (e respectivos fluxos: registo manual, recuperação de palavra-passe) — continua fora de âmbito. A autenticação faz-se por OAuth social (Google) e por **email + código OTP** (passwordless, sem gestão de palavras-passe); ver §17
- **Microsoft/Entra (Azure)** como provider OAuth — acrescentado em 04-06-2026 e removido em 10-06-2026 (ver §17). Reabrir só se o ministério pedir.

---

## 19. Estado do Documento

- **Versão:** 3.6
- **Última atualização:** 14 de junho de 2026
- **Alterações relativamente à v3.5:**
  - §6, §8, §9 (V3/V4) — **Pré-requisitos sequenciais puxados de V4 para V3.6** (decisão do líder, 14-06-2026; mesmo padrão da antecipação de Live, Q&A e estatísticas). Em `status.md` (V3.2) estes pré-requisitos estavam explicitamente "adiados para V4 (pós-01-07-2026)"; passam a entrar em V3.6. Três controlos, todos opcionais por curso: (1) **aulas em sequência** (`courses.sequential_lessons`) - ordem obrigatória das aulas dentro de cada módulo; (2) **módulos em sequência** (`courses.sequential_modules`) - um módulo só abre depois de o anterior estar concluído; as duas flags são independentes; (3) **curso pré-requisito** (`courses.prerequisite_course_id`, auto-referência nullable) - um curso só fica disponível depois de outro estar concluído, encadeável (A → B → C) para uma sequência de cursos, `NULL` = autónomo. Conteúdo bloqueado **aparece com cadeado + dica** (não escondido, ao contrário da restrição por etiqueta - §5). Aplicação **server-side** (Server Components + Server Actions), não em RLS, tal como a conclusão de curso (`architecture.md` §6). Migration `20260614140000_sequential_prerequisites.sql` (**só `logos-dev`**). Sem dependência nova, sem env nova. Detalhe em `feature-docs/sequencing.md`.
- **Alterações relativamente à v3.4:**
  - §V5, §9 (V3) — **Q&A simplifica para conversa de 2 estados + "não lido" do aluno** (V3.6 PR5; decisão do líder, 14-06-2026). O estado da conversa reduz-se a **`new` (Por responder) / `answered` (Respondida)** - o `archived` é removido (a limpeza de spam passa a ser **DELETE** pelo super_admin). **Qualquer resposta do aluno reabre** a conversa. **Toda a mensagem escrita** (resposta da equipa + seguimento do aluno) **avisa por email ambas as partes** (aluno + caixa da equipa) - o email é o arquivo de tudo. A lista do aluno ganha **destaque de "não lido"** (conversa respondida que o aluno ainda não abriu), suportado por `owner_seen_at` + RPC `mark_thread_seen` (SECURITY DEFINER, com o `now()` da BD para não haver desvio de relógio). DB: migration `20260614120000_question_two_states_and_seen.sql` (migra `archived`→`answered`, CHECK a 2 estados, coluna `owner_seen_at`, RPC), **só `logos-dev`**. Sem dependência nova, sem env nova. Detalhe em `feature-docs/qa-perguntas.md`.
- **Alterações relativamente à v3.3:**
  - §V5, §9 (V3), §13.5 (mockups §4) — **Q&A evolui de "resposta por email" para conversa ligada dentro da app** (V3.6; decisão do líder, 13-06-2026; mais uma fatia de V5 puxada). A equipa passa a **responder dentro da Logos** (a resposta vai por email ao aluno), o aluno recebe **cópia da pergunta** e pode dar **seguimento** sem sair da app, e pergunta + respostas + seguimentos ficam **ligados numa conversa** por um código `LOGOS-XXXXXX` partilhado no assunto e nos headers de thread dos emails. Nova vista do aluno em `/perguntas` (lista) e `/perguntas/[code]` (conversa, alvo dos links dos emails), com entrada de cabeçalho "As minhas conversas" (indicador quando a equipa respondeu). DB: migration `20260613120000_lesson_question_threads.sql` (`thread_code` em `lesson_questions` + tabela `lesson_question_messages` + RLS do aluno/equipa + trigger que conduz o `status`), **só `logos-dev`**. Sem dependência nova, sem env nova. Detalhe em `feature-docs/qa-perguntas.md`.
- **Alterações relativamente à v3.2:**
  - §V6, §13.5 — **Live Stream do canal LOGOS puxado de V6 para V3.6** (decisão do líder, 13-06-2026; mesmo padrão da antecipação das estatísticas em 30-05 e do Q&A em 12/13-06). Entregue: entrada de nav **"Live"** com badge de estado (ao vivo/offline/a carregar) e página `/live` com a transmissão do canal LOGOS embebida no portal (`youtube-nocookie`), mais botão "Subscrever canal" (`sub_confirmation=1`). O estado live/offline é determinado no servidor (Route Handler `/api/youtube/live-status`) com a `YOUTUBE_API_KEY` **nunca exposta ao cliente**; a quota da YouTube Data API é protegida por **janelas de transmissão** (`YOUTUBE_LIVE_WINDOWS`, Europe/Lisbon) + **Next.js Data Cache** (substitui a "cache em memória" do pedido original, que não funciona em Vercel serverless). **Fail-safe**: qualquer incerteza resolve para offline. Sem migration, sem dependência nova. Nota de âmbito: a área chama-se **"Live"** (rota `/live`), não "Escola Bíblica" — o nome `/conteudos/escola-biblica` do esqueleto V1 foi abandonado. Plano e detalhe em `feature-docs/live.md`.
  - §V5, §9 (V3), §13.5 (mockups §4) — **Q&A das aulas puxado de V5 para V3.5** (decisão do líder, 12/13-06-2026; mesmo padrão da antecipação das estatísticas em 30-05). Entregue: caixa "Pergunta aos professores" no leitor → grava em `lesson_questions` + notifica a equipa por email (Reply-To = aluno) + inbox de triagem em `/admin/perguntas` (estados new/answered/archived). **Sem** inbox do aluno na app (a resposta vai por email) - essa parte (thread bidirecional) fica para V5. DB: migrations `20260612220000` (tabela + RLS column-scoped) e `20260612230000` (snapshot `author_name`), **só `logos-dev`**. Sem dependência nova (email via `fetch` à API do Resend). Plano e detalhe em `feature-docs/qa-perguntas.md`.
- **Alterações relativamente à v3.1:**
  - §6 (Modelos de aula) e §9/§10 — novo modelo de aula **`video`** (só vídeo do YouTube, sem sebenta). Uma aula passa a poder ser `pdf` (só sebenta), `video` (só vídeo) ou `video_pdf` (ambos). É a extensibilidade prevista na própria secção "Modelos de aula"; sem mudança de âmbito de versão. DB: CHECK de `lessons` relaxado (sebenta deixa de ser sempre obrigatória; vídeo passa a exigir `youtube_url`) - migration `20260612120000` (V3.4 PR1, só `logos-dev`). O formulário de aula no admin mostra apenas os campos do modelo escolhido.
- **Alterações relativamente à v3.0:**
  - §9/§11, §17 e §18 — **Microsoft/Entra (Azure) removido** como provider OAuth (decisão do líder do projeto, 10-06-2026: simplificar para Google + email OTP). O código Microsoft chegou a estar pronto na branch da PR #49 mas o provider nunca foi configurado no Supabase; foi retirado antes do merge. Os métodos de login passam a ser **Google + email OTP**.
- **Alterações relativamente à v2.9:**
  - §9/§11 — célula Autenticação: de "Google OAuth (único método)" para "OAuth social: Google + Microsoft".
  - §17 — nova decisão: providers OAuth suportados (Google + Microsoft); Apple adiado por exigir Apple Developer Program pago. Código preparado para novos providers.
  - §17 — nova decisão: avançar com **login por email + código OTP** (passwordless via Resend) como terceiro método; plano em `feature-docs/email-otp-login.md`.
  - §18 — "fora de âmbito" reformulado: só login com **palavra-passe** fica de fora; OAuth (Google + Microsoft) e OTP por email estão dentro.
  - Pedido do líder do projeto em 04-06-2026.
- **Alterações relativamente à v2.8:**
  - §6 — nova sub-secção "Conteúdos: o nível de topo": o ensino passa a organizar-se sob um nível de topo **Conteúdos** com duas áreas (Cursos + Escola Bíblica). A árvore Curso → Módulo → Aula passou a sub-secção "Árvore de Cursos".
  - §9 V1 — "Página *Cursos* vazia" passa a "Página *Conteúdos*": hub com dois cartões (Cursos + Escola Bíblica), cada um a ligar a uma sub-página placeholder.
  - §9 V6 — clarificado que o YouTube Live embebido aterra na área **Escola Bíblica** (`/conteudos/escola-biblica`), cujo esqueleto é entregue já na V1.
  - §14 — a navegação principal passa de *Conhece-nos / Cursos / Fala connosco* para *Conhece-nos / Conteúdos / Fala connosco*.
  - Mudança de design do líder do projeto (14-05-2026): entregar o esqueleto "em construção" das duas áreas ao público para sinalizar o que virá.
- **Alterações relativamente à v2.7:**
  - §4 — nova sub-secção "Bootstrap do primeiro Super Admin (V2)": primeiro super_admin é `joaocanelasribeiro@gmail.com`; entrada à área `/admin` via item no dropdown do utilizador (apenas visível se `role !== 'user'`); processo de seed documentado em `supabase/seed/super-admin.sql.example` + `feature-docs/auth-architecture.md`.
- **Alterações relativamente à v2.6:**
  - §16 — branch protection em `main` passou de "elegível, activação pendente" para **activa**. Regra: PR obrigatório, check `Lint · Typecheck · Test · Format` verde, histórico linear, force-push e deletion bloqueados, admin pode override em emergência, 0 reviews exigidos (single dev). Aplicada via `gh api PUT /repos/.../branches/main/protection` em 12-05-2026.
- **Alterações relativamente à v2.5:**
  - §13.5 — Preview deploys formalizados a apontar para `logos-dev` (não para `logos-prod`). Razão: PRs incluem schema migrations e mutações de teste; Preview tem de correr contra DB descartável. Detalhes em `feature-docs/vercel.md` §4.
  - §16 — branch protection passa de "não elegível no plano free" para "elegível agora que o repo é público" (mudança de visibilidade do `cclx-pt/Logos` em 12-05-2026 para caber no plano Hobby do Vercel). Activação fica como tarefa próxima.
- **Alterações relativamente à v2.4:**
  - §9.2 — V2 auth simplificada para Google OAuth apenas (remoção de email/password e linha de recovery emails via Resend).
  - §11 — célula Autenticação atualizada (apenas Google OAuth); célula Email (Resend) move-se para "V5+ notificações Q&A" (sem urgência V2 por o login ser só Google).
  - §17 — nova decisão adiada explícita sobre email/password como método alternativo.
  - §18 — login com email e palavra-passe listado como fora de âmbito V1-V9.
- **Alterações relativamente à v2.3:**
  - §16 — restrição nova: branch protection no GitHub não está ativa (plano free de repositório privado não a disponibiliza). Regra "PR obrigatório" mantém-se honor-system em `CLAUDE.md` + `permissions.deny` no `.claude/settings.json`. Decisão consciente de não subscrever GitHub Pro.
- **Alterações relativamente à v2.2:**
  - §17 — entrada sobre "SSO com app da CCLX" reescrita: passa de "não viável agora" para "não implementada agora, mas estruturada para ser substituível" (camada `src/lib/auth/`, FKs para `profiles.id`, RLS via `current_profile_id()`). O desenho está em `architecture.md` §4 e `feature-docs/auth-architecture.md`.
- **Alterações relativamente à v2.1:**
  - §14 — paleta hexadecimal fixada (8 tokens), tipografia fixada (Cormorant Garamond + Inter), logo descrito com fallback de texto até chegar SVG, mockups vinculativos referenciados em `docs/branding/`
  - §17 — decisão "paleta + tipografia" resolvida; pendente apenas o SVG do logótipo
- **Alterações relativamente à v2.0:**
  - §11 — explicitada a tooling de qualidade: Vitest (unit) + Playwright (E2E, V3+), ESLint + Prettier, TS `strict: true`, Supabase CLI para migrations
  - §11 — Supabase passa a ser explicitamente **2 projetos** (`logos-dev` + `logos-prod`)
  - §13 — fluxo de dev formaliza pull requests + GitHub Actions + protecção de `main`
  - §17 — removida decisão "projeto Supabase único vs separados" (resolvida)
- **Alterações relativamente à v1.0 (ver v2.0):**
  - Etiquetas estendidas a três níveis (curso, módulo, aula), faseadas
  - Acompanhamento simplificado para conclusão binária por aula
  - Versões reorganizadas: V4 dedicada a etiquetas multi-nível
- **Responsável:** Líder do projeto
- **Próxima revisão:** Antes de iniciar o build da V1 (após conclusão da fase de Setup)
