# changelog.md — Logos

> **Quando atualizar:** após cada feature, fix ou mudança relevante.
> **Formato:** [data DD-MM-YYYY] — descrição curta no infinitivo, agrupada por tipo.
> **Tipos:** `add` (nova feature), `update` (melhoria), `fix` (correção), `docs` (documentação), `infra` (CI/CD, deploy, dependências).

---

## [Unreleased]

### infra
- add: repositório GitHub privado inicial
- add: estrutura de documentação (`CLAUDE.md`, `architecture.md`, `status.md`, `feature-docs/`)
- add: `.env.example` com placeholders Supabase + Resend
- add: `.gitignore` para Next.js + Supabase

---

## [19-05-2026] — V3 PR4b: Admin CRUD de Aulas — local em `v3-cursos`

Quinto passo de V3 (PR4 sub-iteração b, depois de PR4a e PR4-IA). Sem migrations novas: a página de aulas vive em cima do schema da PR2 e do storage `lesson-pdfs`. Server Actions com upload PDF, validação YouTube URL e coerência de template entre `pdf` ↔ `video_pdf`. Continua só em `logos-dev`; nada vai a `main`/`logos-prod` antes de 01-07-2026.

### add
- add: `src/app/admin/conteudos/lessons-actions.ts` com 5 Server Actions — `createLessonAction`, `updateLessonAction`, `deleteLessonAction`, `moveLessonUpAction`, `moveLessonDownAction`. Triple defesa: role admin+super_admin, RLS em `lessons`, CHECK constraints DB. Upload PDF para `lesson-pdfs/<courseId>/<lessonId>.pdf` (MIME `application/pdf`, ≤ 20 MB, `upsert: true`). Insert primeiro com placeholder em `pdf_storage_path` para satisfazer o NOT NULL; substituído pelo path real após upload. Em falha de upload faz rollback do row inserido.
- add: regra de coerência de template — `pdf → video_pdf` exige `youtube_url` no mesmo submit; `video_pdf → pdf` limpa o `youtube_url`. PDF mantém-se sempre. Validador `validateYoutubeUrl` aceita `youtu.be/<id>` e `youtube.com/watch?v=<id>`.
- add: `src/app/admin/conteudos/[courseId]/[moduleId]/page.tsx` — drill-down de aulas dentro de um módulo (admin+super_admin). Breadcrumb mobile `Cursos › Curso › Módulo`, voltar ao curso via link no header. Form "Nova aula" no topo (`encType="multipart/form-data"`) com radios de template, URL do YouTube opcional, file input `accept="application/pdf"`. Listagem ordenada por `position` com pill do template + URL YouTube linkado. Edit inline via `?editar=<lessonId>` (PDF opcional — vazio mantém o actual), confirm delete inline via `?apagar=<lessonId>`, setas ↑↓ para reordenar.
- update: `ConteudosBreadcrumb` ganha `moduleTitle` + `courseId` para suportar três níveis (Cursos / Curso / Módulo); curso passa a link quando há módulo selecionado.
- update: lista de módulos em `/admin/conteudos/[courseId]` ganha botão **Aulas →** (CTA primário em borda laranja) a apontar para o drill-down. Descrição da secção actualizada (já não diz "PR4b").

### test
- add: `src/app/admin/conteudos/lessons-actions.test.ts` com 17 testes — 9 em `createLessonAction` (role guard, template inválido, video_pdf sem URL, URL fora do formato, PDF em falta, MIME errado com rollback, > 20 MB com rollback, happy path full, falha de storage com rollback), 3 em `updateLessonAction` (role, coerência pdf→video_pdf sem URL, coerência video_pdf→pdf limpa URL, novo PDF anexado), 1 em `deleteLessonAction` (apaga DB + bucket + revalida), 3 em `moveLessonUpAction` (swap, no-op no primeiro, rejeita module_id que não bate).
- 124/124 testes verdes (107 → 124, +17 nesta PR).

### docs
- update: `status.md` move "V3 PR4b" de "Em progresso" para "Concluído"; "V3 PR5 — Catálogo público" passa a próxima.
- update: `feature-docs/v3-plan.md` tabela e §4b ticadas para PR4b.

---

## [19-05-2026] — V3 PR3: Admin CRUD de Cursos — local em `v3-cursos`

Terceira PR de V3. Primeira UI por cima do schema da PR2: a área admin ganha o painel `/admin/cursos` para criar, editar e apagar cursos. Aplicada apenas a `logos-dev` (sem migrations novas — só UI). Continua sem mergear em `main` conforme estratégia de 3 camadas.

### add
- add: `/admin/cursos` listagem (admin + super_admin) com estado Publicado/Rascunho, etiquetas necessárias resolvidas para labels, botão "Novo curso".
- add: `/admin/cursos/novo` form de criação (server component) com `title`, `slug` (kebab-case regex), `description` (textarea texto puro), `icon` (Lucide name livre, opcional), `required_tags` (checkboxes alimentados por `tags` da PR1), toggle "Publicado". Após sucesso faz `redirect` para `/admin/cursos/<id>` para o utilizador continuar a editar.
- add: `/admin/cursos/[id]` form de edição com o mesmo `CourseForm` partilhado. UUID inválido ou curso inexistente → `notFound()`.
- add: Zona de perigo na página de edição com hard delete confirmado via `?confirmar=apagar` (mesmo padrão server-side de `/admin/etiquetas`, sem Client Components). Apagar usa o CASCADE da FK em modules/lessons/completions.
- add: Server Actions `createCourseAction`/`updateCourseAction`/`deleteCourseAction` em `src/app/admin/cursos/actions.ts` com validação inline (slug regex 2-80, title 1-120, description ≤ 4000, icon ≤ 64, required_tags UUID-checked, dedup), defesa de role admin+super_admin, mensagem clara para slug duplicado (Postgres 23505). Sem Zod — manter convenção das actions existentes.
- add: regra `published_at` "primeira publicação preservada" — toggle off ⇒ NULL; toggle on com `published_at` actual ⇒ mantém data; toggle on com NULL anterior ⇒ `now()`. Decisão para minimizar churn da data publicada em re-edições.
- add: link "Cursos" na navegação admin (`src/app/admin/layout.tsx`) visível a admin **e** super_admin (diferente de Etiquetas/Utilizadores que ficam só super_admin).
- add: `src/app/admin/cursos/course-form.tsx` (server component) partilhado entre create/edit para reduzir duplicação.

### test
- add: `src/app/admin/cursos/actions.test.ts` com 13 testes — 7 para `createCourseAction` (sessão, role, slug regex, título vazio, required_tags UUID, rascunho vs publicado, slug duplicado 23505), 5 para `updateCourseAction` (role, id inválido, preservação de `published_at`, despublicar, primeira publicação, curso inexistente), 1 para `deleteCourseAction`.
- update: `src/app/admin/layout.test.tsx` ajustado para verificar que `role=admin` vê link Cursos mas não vê Utilizadores/Etiquetas.
- 89/89 testes verdes (73 → 89, +16 incluindo 13 novos em cursos + 3 ajustes no layout).

### docs
- update: `status.md` move "V3 PR3" de "Em progresso" para "Concluído"; aponta "V3 PR4" como próxima.
- update: `feature-docs/v3-plan.md` tabela e §3 ticadas para PR3.

---

## [19-05-2026] — V3 PR2: Schema base + storage (cursos, módulos, aulas, conclusões, bucket lesson-pdfs) — local em `v3-cursos`

Segunda PR de V3, puramente SQL/infra (sem UI; ship-able sozinha sem mudar nada visível). PRs 3-7 vão construir UI por cima deste schema. Aplicada apenas a `logos-dev`; `logos-prod` continua schema V2 conforme estratégia de 3 camadas (`feature-docs/branch-strategy.md`).

### add
- add: migration `supabase/migrations/20260519020000_v3_courses_schema_and_storage.sql` aplicada a `logos-dev`.
  - **Helper** `set_updated_at()` trigger function genérica para gerir `updated_at`.
  - **`courses`**: id, slug unique (kebab-case CHECK 2-80), title (1-120), description, icon (nome Lucide ou texto livre), `required_tags uuid[] default '{}'`, `published_at` nullable (NULL = draft), created_by → profiles restrict, updated_at via trigger. Índice parcial `courses_published_at_idx` em published_at IS NOT NULL para catálogo público rápido.
  - **`modules`**: course_id CASCADE, position int >= 0, title, description, updated_at via trigger. Índice composto `(course_id, position)`.
  - **`lessons`**: module_id CASCADE, position, title, description, template CHECK in ('pdf','video_pdf'), youtube_url nullable, pdf_storage_path **not** nullable (V3 exige apostila), CHECK `video_pdf → youtube_url IS NOT NULL`. Índice composto `(module_id, position)`.
  - **`lesson_completions`**: PK composta (user_id, lesson_id), CASCADE em ambos. Idempotente por design.
  - **`course_completions`**: PK composta (user_id, course_id), CASCADE. Imutável (sem policy UPDATE/DELETE).
  - **`course_access_log`**: id uuid, user/course CASCADE, accessed_at — sem unique. Índices em course_id e accessed_at desc para stats em PR8.
  - **Helper** `course_is_visible(courses) → boolean` STABLE + SECURITY DEFINER unifica a regra de visibilidade: admin/super_admin tudo; user só published_at NOT NULL E (required_tags vazio OR overlap via `current_profile_has_tag`). Reutilizado nas policies de courses, modules e lessons.
  - **RLS** activa em todas as 6 tabelas:
    - `courses`/`modules`/`lessons` SELECT via `course_is_visible`; INSERT/UPDATE/DELETE admin+super_admin.
    - `lesson_completions` SELECT próprias ou admin/super_admin; INSERT/DELETE só o próprio (conclusão é acto pessoal — admin não marca por outros).
    - `course_completions` SELECT próprias ou admin/super_admin; INSERT só o próprio; sem UPDATE/DELETE (imutável).
    - `course_access_log` SELECT só admin/super_admin (auditoria); INSERT só o próprio.
  - **Storage**: bucket `lesson-pdfs` privado (public=false), `file_size_limit` 20 MB, `allowed_mime_types: ['application/pdf']`. Policies em `storage.objects`: SELECT authenticated qualquer profile (acesso fino fica na Server Action de PR6 que verifica `course_is_visible` antes de `createSignedUrl`); INSERT/UPDATE/DELETE admin+super_admin.

### testing
- Suite continua 73/73 (esperado — sem código novo). RLS validada manualmente em PR3-PR7 quando a UI existir.

### docs
- docs: `status.md` move V3 PR2 para concluído; muda "Em progresso" para PR3.

---

## [19-05-2026] — V3 PR1: Etiquetas (fundação) — local em `v3-cursos`

Primeira PR de V3, executada localmente. V2.5 fica em hold em preview a aguardar testemunhos do ministério; V3 desenvolve em paralelo em `v3-cursos` sem tocar `main` (V3 sobe ao Production só no merge final, prazo 01-07-2026). Decisão: V2 PR4 (etiquetas planeada em `feature-docs/v2-auth.md` §4) absorvida directamente em V3 PR1, conforme `feature-docs/v3-plan.md` §1.

### add
- add: migration `supabase/migrations/20260518120000_tags_and_user_tags.sql` aplicada a `logos-dev` via `pnpm dlx supabase db push`. Cria `tags` (id, slug unique kebab-case CHECK 2-64 chars, label 1-80, created_by → profiles `on delete restrict`, created_at) e `user_tags` (PK composta `(user_id, tag_id)`, assigned_by → profiles `on delete restrict`, assigned_at, cascade em user_id/tag_id). Índice em `user_tags(tag_id)` para queries reversas. Helper SQL `current_profile_has_tag(uuid[]) → boolean` STABLE + SECURITY DEFINER (padrão anti-recursão RLS estabelecido em V2). RLS: `tags` SELECT admin/super_admin tudo + user só as próprias (subquery a `user_tags`), escrita só super_admin; `user_tags` SELECT próprias ou admin/super_admin, INSERT/DELETE admin + super_admin (sem UPDATE — atribuição binária).
- add: `src/app/admin/etiquetas/{page,actions,actions.test}.tsx|ts` — CRUD de etiquetas super_admin-only. Form de criar (label + slug, ambos com regex/length validation matching DB constraints). Edição inline via query param `?editar=<id>`, confirmação de delete via `?apagar=<id>` (server-side puro, sem Client Components novos). Mensagens claras para slug duplicado (Postgres 23505).
- add: `src/app/admin/utilizadores/actions.ts` — `assignTagAction` + `unassignTagAction` (admin + super_admin). Upsert idempotente com `onConflict: 'user_id,tag_id', ignoreDuplicates: true` para evitar 409 em cliques duplos. Defesas em profundidade: caller role, UUID regex em ambos os IDs, RLS no servidor.

### update
- update: `src/app/admin/layout.tsx` — adiciona link "Etiquetas" no aside (super_admin only).
- update: `src/app/admin/utilizadores/page.tsx` — gating relaxa para admin + super_admin (antes era super_admin only). Coluna "Etiquetas" nova com pills das etiquetas atribuídas (botão `×` por pill → unassign) + `<select>` nativo + botão Adicionar para atribuir as ainda não atribuídas. Coluna "Papel" (acção) condicional só para super_admin; admin vê página focada em etiquetas. Cabeçalho cresce com link "Criar uma etiqueta" quando não há etiquetas e o caller é super_admin.

### testing
- 21 testes novos (52 → 73 a passar): 12 em `etiquetas/actions.test.ts` (create/update/delete com defesas + slug regex + label vazia + dup 23505), 8 em `utilizadores/actions.test.ts` (assign/unassign com defesas + idempotência), 1 ajuste em `admin/layout.test.tsx` (novo link "Etiquetas" aparece a super_admin, ausente a admin).

### docs
- docs (a fazer): `status.md` move V3 PR1 para concluído e regista a estratégia "V3 só sobe ao Production no fim".

---

## [18-05-2026] — V2.5: rebase + fix do 404 + branch de preview

Ronda V2.x (PR-A a PR-F) re-aplicada em cima de `main` após terem aterrado PR #27 (V2 PR3 roles UI), PR #32 (Cursos→Conteúdos hub) e PR #33 (copy do ministério). Conflitos resolvidos a favor do trabalho V2.x: `/conteudos` volta a ser página flat (intro justificada + bloco "Em breve" único), os sub-routes `/conteudos/cursos` e `/conteudos/escola-biblica` do hub anterior são eliminados. Branch `v2.5-copy-ux` pushed para preview-only — **não merge em `main`** enquanto os testemunhos forem placeholder.

### add
- add: `feature-docs/accounts.md` — mapa de *ownership* de todas as contas externas (GitHub, Vercel, Supabase, Google Cloud, Hostinger, Resend) sob `joaocanelasribeiro@gmail.com`. Esclarece a fronteira entre *ownership* (João, ministério) e acesso operacional (developer actual). Decisão para *bus factor* + sucessão centralizada no líder do ministério.

### fix
- fix: `src/app/not-found-content.tsx` — `Base UI: A component that acts as a button expected a native <button>` quando se carregava num 404. `Button render={<Link/>}` substituído por `<Link className={buttonVariants(...)}>` (mesmo padrão já usado em `home-hero.tsx`). Erro só aparecia no client porque a primitiva valida o contexto de render no browser.

### update
- update: `src/app/conteudos/{page,page.test,conteudos-content}.tsx` — versão flat da rota (alinhada com `feature-docs/v2-copy-and-conteudos.md` §3), com intro justificada + cartão "Em breve" único. Os ficheiros do hub anterior (`/conteudos/cursos/*` e `/conteudos/escola-biblica/*`) são eliminados.
- update: `src/app/cursos/page.tsx` — fica como `permanentRedirect('/conteudos')`, agora no caminho final (recriado após o rename de `main` que tinha movido para `/conteudos/cursos/`).

### infra
- infra: branch `v2.5-copy-ux` push para `origin`. Vercel cria preview deploy automático em `https://logos-l4nq6ppd8-jcrninjas-projects.vercel.app/` (URL protegida por Vercel Authentication — só *signed in* na conta Vercel do João). Production em `logos.cclx.pt` continua intocada.

### docs
- docs: `status.md` actualizada para reflectir o estado de V2.5 (preview-only, à espera de testemunhos do ministério).

---

## [16-05-2026] — V2.x: Copy & UX (LOGOS, hero, /conteudos, testemunhos, /perfil)

Ronda só de copy + UX (sem DB, sem auth) executada em 6 PRs locais (PR-A a PR-F). Plano e mapeamento das 19 pedidas do ministério em `feature-docs/v2-copy-and-conteudos.md`.

### add
- add: `src/components/site/home-motto.tsx` — lema do ministério em três linhas em itálico (`<aside>` com `aria-label="Lema do ministério LOGOS"`, bordas laranja subtis). Renderizado no `page.tsx` abaixo do hero.
- add: `src/components/site/home-testimonials.tsx` — carrossel com 5 testemunhos placeholder PT-PT. embla-carousel-react@8.6.0 instalado como dep directa; carrossel custom shadcn-style (não copiado do CLI shadcn por hang) com loop infinito, 1/2/3 slides por breakpoint, setas prev/next acessíveis e dots tab-list com `aria-selected`. Sync inicial via `queueMicrotask` para evitar `react-hooks/set-state-in-effect`.
- add: `src/app/conteudos/` (page + content + test) — nova rota pública que substitui `/cursos`. Parágrafo intro justificado com texto final do ministério, 3 cards placeholder "Em preparação" (badge laranja). H1 "Conteúdos".
- add: `src/app/perfil/page.tsx` — placeholder de perfil para utilizadores autenticados. Avatar (Google `avatar_url` ou iniciais), nome, email (lido de `auth.users`, não duplicado em `profiles`), papel em PT-PT, data de criação. `notFound()` quando sem sessão.
- add: `feature-docs/v2-copy-and-conteudos.md` — doc de planeamento das 6 PRs com escopo, verificações e mapeamento da checklist do ministério.

### update
- update: `src/components/site/home-hero.tsx` — logo `size="xl"` (`h-32 sm:h-44 md:h-52`, `priority`); h1 "Estudo Bíblico para uma Fé Enraizada." com capitalizações pedidas; CTA único centrado "Meus cursos"; comportamento depende de sessão (server resolve via `getCurrentUser()` e passa `isAuthenticated` + `ctaHref`): autenticado abre `<Link href={ctaHref}>`, sem sessão abre `<form action={signInWithGoogleAction}>` com hidden `next`. Parágrafo justificado.
- update: `src/components/site/user-menu.tsx` — items finais: "Os meus cursos" (→ /conteudos), "Perfil" (→ /perfil), "Área admin" (condicional), separador, "Terminar sessão". Label "Sessão de X" agora envolvida em `<DropdownMenuGroup>` (corrige bug Base UI residual de PR3).
- update: `src/lib/auth/actions.ts` — `signInWithGoogleAction(formData?)` aceita FormData opcional com campo `next`; valida com `safeNext` (mesma defesa anti-open-redirect do callback) e injecta `?next=` no `redirectTo`.
- update: `src/lib/auth/index.ts` — re-exporta `SupabaseUser` (alias de `User` do `@supabase/supabase-js`) para que código fora de `lib/auth/**` possa tipar sem violar `no-restricted-imports`.
- update: `src/lib/site-config.ts` — `name: 'LOGOS'`, descrição sem em dash, nav passa a ter `{ href: '/conteudos', label: 'Conteúdos' }` e `{ href: '/fala-connosco', label: 'Fala Connosco' }`.
- update: `src/app/cursos/page.tsx` — passa a `permanentRedirect('/conteudos')` (308). `cursos-content.tsx` e `cursos/page.test.tsx` eliminados.
- update: `src/app/conhece-nos/conhece-nos-content.tsx` — `Logos` → `LOGOS`, `fé` → `Fé`, `fala connosco` → `fala Connosco`. Todos os em dashes (—) em copy substituídos por vírgulas / ponto-e-vírgula / dois pontos. Três parágrafos longos com `text-justify hyphens-auto`. Frase "Sem prazos, sem barras de progresso, sem distrações" removida (tom IA).
- update: `src/app/fala-connosco/fala-connosco-content.tsx` — título "Fala Connosco" (C maiúsculo), parágrafo intro substituído pelo texto novo do ministério com "Connosco" maiúsculo, justificado. Nota "Horários e morada da igreja em breve" eliminada. Subject email "Contacto LOGOS".
- update: `src/components/site/logo.tsx` — novo tamanho `xl`; aria-label "LOGOS" (era "Logos"); em dash fora.
- update: `src/app/admin/page.tsx`, `src/app/admin/utilizadores/page.tsx`, `src/app/fala-connosco/page.tsx`, `src/app/cursos/page.tsx`, `src/app/layout.tsx`: metadata title/description com `LOGOS`. UI em dashes substituídos por pontuação alternativa.
- update: `src/app/not-found-content.tsx` + `not-found.test.tsx` — CTA "Ver conteúdos" → `/conteudos`.

### infra
- infra: `embla-carousel-react@^8.6.0` adicionado como dependência directa para suportar o carrossel de testemunhos.
- infra: `src/test/setup.ts` ganha stubs mínimos de `matchMedia`, `ResizeObserver` e `IntersectionObserver` (jsdom não os tem; embla e motion tocam neles à montagem).

### fix
- fix: `src/components/site/user-menu.tsx` — `<DropdownMenuLabel>` agora envolvido em `<DropdownMenuGroup>` (fix do `MenuGroupRootContext is missing` reportado na PR3 em preview Vercel).

---

## [14-05-2026] — V2 PR3: Roles UI (dropdown user + área /admin + promoção super_admin)

### add
- add: `src/components/site/user-menu.tsx` — dropdown do utilizador no Header (base-ui via shadcn `DropdownMenu`). Items: label "Sessão de {displayName}", "Área admin" (só se `role !== 'user'`, link para `/admin`), "Terminar sessão" (Server Action `signOutAction`). Trigger acessível com `aria-label` completo, indicador `<ChevronDown />`.
- add: `src/components/ui/dropdown-menu.tsx` — shadcn `DropdownMenu` instalado via `pnpm dlx shadcn@latest add dropdown-menu`. Wrapper de `@base-ui/react/menu`.
- add: `src/app/admin/layout.tsx` — server component gating: chama `getCurrentUser()`; se `role === 'user'` ou sem sessão, devolve `notFound()` (coerente com "conteúdo restrito é invisível", CLAUDE.md §🚫). Shell com `<aside>` nav (Painel + Utilizadores apenas se super_admin) + `<main>`.
- add: `src/app/admin/page.tsx` — landing da área admin: saudação, descrição PT-PT, parágrafo extra para super_admin a apontar para Utilizadores.
- add: `src/app/admin/utilizadores/page.tsx` — listagem de profiles (super_admin only — `notFound()` caso contrário). Tabela com nome, papel, data de criação, e botão "Promover a admin" / "Despromover a utilizador" inline via Server Action wrapped (`'use server'` inline para retorno void exigido por `<form action={}>`). Próprio caller e super_admins existentes aparecem sem botão.
- add: `src/app/admin/utilizadores/actions.ts` — `setUserRoleAction(formData)`: gating (caller=super_admin, alvo ≠ caller, alvo ≠ super_admin), validação manual de uuid + enum `user|admin`, lookup do alvo, update, `revalidatePath('/admin/utilizadores')`. Devolve `SetUserRoleResult` para testes; consumido como void no form da página.
- add: `supabase/migrations/20260514030344_profiles_role_mutation_authority.sql` — policy `profiles_update_super_admin` (super_admin pode update em qualquer profile, necessário para a UI) + função `enforce_profiles_role_mutation_authority()` + trigger BEFORE UPDATE que bloqueia (a) mudanças de role por não-super_admin, (b) mudanças que afectem super_admins, (c) valores fora de `{user, admin}`. Defesa em profundidade ao Server Action; cobre service-role-bypass também (trigger corre sempre).
- add: `src/components/site/user-menu.test.tsx` — 2 testes para o trigger (nome no botão + aria-label). Nota in-line: items do menu não testados em jsdom porque base-ui `Menu` não monta o conteúdo sem APIs de browser (ResizeObserver, etc.); cobertura via testes do admin layout (mesma lógica `role !== 'user'`) + E2E manual.
- add: `src/app/admin/layout.test.tsx` — 4 testes: `notFound()` quando sem sessão e quando role=user; renderização normal para admin (sem link Utilizadores) e super_admin (com link).
- add: `src/app/admin/utilizadores/actions.test.ts` — 9 testes do Server Action: caller sem sessão / não super_admin; targetId inválido; newRole inválido; alvo é o próprio; alvo é super_admin; no-op quando role já é o pedido; promoção feliz com revalidatePath; erro de DB ao update.

### update
- update: `src/components/site/header.tsx` — substitui `<span>Olá, {nome}</span>` por `<UserMenu user={user} />`. Helper `firstName()` movido para dentro de `UserMenu`.

### infra
- infra: 1 migration aplicada a `logos-dev` (`20260514030344_profiles_role_mutation_authority`). A aplicar a `logos-prod` antes do merge desta PR em produção.

---

## [14-05-2026] — copy do ministério: Conhece-nos, home e Fala connosco

### update
- update: `Conhece-nos` substitui o texto placeholder (tag "Em construção" + secções "O que aqui encontras"/"Quem está por trás") pelo manifesto definitivo do ministério Logos — propósito, significado de «Logos», a igreja que se quer construir, a tríade "Mais do que… queremos…" e a assinatura. Fecha com um cartão-CTA que liga ao site da CCLX (`cclx.pt`, nova aba, `rel` seguro).
- update: parágrafo do hero da home passa a abrir com "O ministério Logos é o espaço…" (antes "A plataforma Logos…"), alinhando o vocabulário com o do ministério.
- update: `Fala connosco` — intro deixa cair "viste um erro num curso"; fica "Tens uma sugestão ou queres saber mais sobre a CCLX?".
- update: `conhece-nos/page.test.tsx` reescrito para o novo conteúdo (propósito + tríade + link CCLX). 25/25 testes a passar.

---

## [14-05-2026] — "Cursos" passa a "Conteúdos" (hub com Cursos + Escola Bíblica)

### update
- update: o item de topo da navegação deixa de ser **Cursos** e passa a **Conteúdos**. A página `/cursos` deu lugar a `/conteudos`, um hub com dois cartões — **Cursos** e **Escola Bíblica** — que prepara o site para os dois tipos de conteúdo previstos. Decisão de produto do líder do projeto: entregar o esqueleto ao público numa versão "em construção", para sinalizar o que virá.
- update: `home-hero.tsx` e `not-found-content.tsx` — o CTA "Ver cursos" passa a "Ver conteúdos" e aponta para `/conteudos`.
- update: o hub `/conteudos` recebe a copy definitiva do ministério — parágrafo de abertura ("Os nossos conteúdos foram desenvolvidos…") e linha de contacto com `logos@cclx.pt` a substituir a tag placeholder "Em construção". Teste novo para o mailto (29/29 a passar).

### add
- add: `src/app/conteudos/` — hub (`conteudos-content.tsx`) com dois cartões em grelha (tonalidades `cream-card` e `sage-card`), cada um a ligar à respetiva sub-página.
- add: `src/app/conteudos/cursos/` — a antiga página `/cursos` (placeholder "Em breve" + 3 pilares) movida para `/conteudos/cursos`, sem alteração de conteúdo.
- add: `src/app/conteudos/escola-biblica/` — nova sub-página placeholder "Em construção / Em breve" para as futuras transmissões da Escola Bíblica da CCLX (live streams, trabalho de uma versão futura — ver `SPEC_1.md` §6/§9).
- add: 4 testes novos (hub: heading, dois cartões com destinos certos, badge "Em breve"; Escola Bíblica: heading + nota). 28/28 a passar.

### docs
- docs: `SPEC_1.md` atualizada — modelo de conteúdo passa a falar de "Conteúdos" como nível de topo com duas áreas (Cursos + Escola Bíblica); `sitemap.ts` ganha as duas sub-rotas de Conteúdos.

---

## [14-05-2026] — favicon maior (logótipo de margem a margem)

### update
- update: `src/app/favicon.ico` e `src/app/icon.png` regenerados com o logótipo de margem a margem (~2% de margem em vez de ~16%) — fica o maior possível no separador do browser. A legibilidade do texto "LOGOS" a 16–32px continua limitada pelo formato largo do logótipo (decisão de produto: manter o logótipo completo).

---

## [14-05-2026] — favicon e ícone com fundo transparente

### fix
- fix: `src/app/favicon.ico` e `src/app/icon.png` tinham fundo creme — passa a transparente, para o logótipo flutuar no separador do browser sem caixa à volta. O `og-image.png` mantém o fundo creme de propósito (PNG transparente renderiza como preto no WhatsApp/Facebook).

---

## [14-05-2026] — Open Graph + favicon com o logótipo completo Logos

### fix
- fix: partilhar `logos.cclx.pt` no WhatsApp/redes mostrava um cartão genérico da Vercel — a app não definia nenhuma `og:image` nem bloco `openGraph`, e sem imagem própria os scrapers caíam para o fallback do alojador.
- fix: o separador do browser mostrava o favicon por omissão do Next.js — substituído pelo logótipo Logos.

### add
- add: `public/og-image.png` — cartão Open Graph 1200×630, logótipo completo (livro + letras "LOGOS") centrado em fundo creme (`#faf4ea`). Imagem estática composta com `sharp`, sem código em runtime.
- add: `src/app/icon.png` — ícone 512×512 com o logótipo centrado em fundo creme (browsers modernos, via `<link rel="icon">` gerado pelo App Router).
- add: bloco `openGraph` + `twitter` (`summary_large_image`) + `metadataBase` em `src/app/layout.tsx`, apontando para `/og-image.png` com `width`/`height`/`alt`.

### update
- update: `src/app/favicon.ico` passa a ser o logótipo Logos (PNG 48×48 embebido num contentor ICO montado à mão — o `sharp` não escreve `.ico`).

### docs
- docs: `feature-docs/og-image.md` — porquê dos bugs, decisões e como regenerar os assets.

> Nota: uma iteração intermédia (PR #28) usou só o livro do logótipo no cartão; revertido para o logótipo completo por decisão de produto. O `public/logo-cclx-book.svg` desse PR foi removido.

---

## [14-05-2026] — V2 PR2: login flow Google OAuth + callback + trigger profile sync + RLS fixes

### add
- add: `src/lib/auth/index.ts` — implementação real de `getServerClient()` (cria cliente `@supabase/ssr` com cookies do request, para Server Components/Actions); `getRouteHandlerClient(response)` (variante para Route Handlers — escreve cookies directamente na `NextResponse` em vez do `cookieStore`, padrão canónico Supabase Next.js); `getCurrentUser()` (lookup `auth.uid() → profiles.external_auth_id → Profile camelCase`). Substitui stubs de PR1.
- add: `src/lib/auth/actions.ts` — Server Actions `signInWithGoogleAction` (chama `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: ${origin}/auth/callback })` e redirecciona) + `signOutAction`. Helper `getOrigin()` lê `origin`/`x-forwarded-proto`+`x-forwarded-host`/`host` por ordem de robustez.
- add: `src/lib/auth/proxy.ts` — `updateSession()` que refresca o token Supabase em cada request. Sem isto, sessões expiravam silenciosamente após ~1h.
- add: `src/proxy.ts` — shim raiz que invoca `updateSession`. Matcher exclui assets estáticos. **Convenção Next.js 16:** `proxy.ts` (não `middleware.ts` — depreciado).
- add: `src/app/auth/callback/route.ts` — GET handler do callback OAuth: `exchangeCodeForSession(code)` → redirect para `?next=` (validado como caminho relativo interno, defesa anti-open-redirect) ou `/`. Erros viram `?auth_error=missing_code|exchange_failed`. Usa `getRouteHandlerClient(response)` para os cookies de sessão chegarem ao redirect.
- add: `src/components/site/sign-in-button.tsx` — `<form action={signInWithGoogleAction}>` com `Button` shadcn (`size="sm"`, label "Entrar"). Renderizado pelo Header quando não há sessão.
- add: `supabase/migrations/20260514015528_profiles_insert_trigger.sql` — função `handle_new_auth_user()` (`SECURITY DEFINER`, `coalesce(name, full_name, email)` para `display_name`) + trigger `on_auth_user_created AFTER INSERT ON auth.users`. Idempotente via `on conflict (external_auth_id) do nothing`.
- add: `supabase/migrations/20260514022124_current_profile_id_security_definer.sql` — fix #1 descoberto no E2E: `current_profile_id()` passa de `SECURITY INVOKER` a `SECURITY DEFINER` para quebrar recursão RLS (a função era chamada pela policy de `profiles` e queryava `profiles`).
- add: `supabase/migrations/20260514022734_profiles_select_policy_no_recursion.sql` — fix #2 descoberto no E2E: a policy `profiles_select_own_or_super_admin` ainda continha `or exists (select 1 from profiles me ...)`, sub-select que re-disparava a policy. Nova função `current_profile_role()` `SECURITY DEFINER` + reescrita da policy para `id = current_profile_id() or current_profile_role() = 'super_admin'`. Sem queries em `profiles` dentro da policy.
- add: `src/app/auth/callback/route.test.ts` — 6 testes (sucesso, `?next` válido, rejeição de `next` absoluto e protocol-relative, código em falta, exchange falhado).

### update
- update: `src/components/site/header.tsx` — passa a `async` server component, lê `getCurrentUser()`, renderiza `<SignInButton />` ou `<span aria-live="polite">Olá, {primeiroNome}</span>` (placeholder; dropdown real fica para PR3).
- update: `src/lib/auth/index.test.ts` — reescrito: cobre `getCurrentUser()` em 4 ramos (sem sessão, sessão sem profile, erro RLS, sucesso com mapeamento camelCase).
- update: `src/components/site/home-hero.tsx` — CTAs migram de `<Button render={<Link/>}>` para `<Link className={buttonVariants(...)}>`. Razão: o uso anterior disparava warning Base UI ("`nativeButton=true` mas elemento renderizado não é `<button>`") e tentar silenciar com `nativeButton={false}` partia testes (mudava o role acessível). O padrão `Link + buttonVariants` é idiomático shadcn, mantém `role="link"` correcto e elimina o warning.

### infra
- infra: 3 migrations aplicadas a `logos-dev` via `pnpm dlx supabase db push` — `20260514015528` (trigger), `20260514022124` (function security definer), `20260514022734` (policy sem recursão). Confirmadas em `migration list`. Repetir todas em `logos-prod` antes do primeiro merge V2 visível em produção.

### why
- **Trigger DB sozinho** (em vez de "Server Action + trigger" da spec original) — Server Action a inserir em `profiles` exigia service role (RLS sem `for insert` policy, decisão deliberada de PR1). Trigger `SECURITY DEFINER` cobre 100% dos caminhos (callback OAuth, criação por SQL admin, dashboard) sem introduzir novo segredo (`SUPABASE_SERVICE_ROLE_KEY`).
- **Proxy + cliente para Route Handlers separado** — `cookieStore.set()` do `next/headers` **não** propaga cookies para uma `NextResponse.redirect()`. Sem `getRouteHandlerClient(response)`, a sessão exchangeada no callback não persistia no redirect → `getCurrentUser()` no Header seguinte devolvia `null`. Descoberto no E2E manual via logs `[auth/diag]` temporários (já removidos).
- **2 fixes RLS** — descobertos por experimentação no E2E. A função e a policy ambas tocavam `profiles`, criando dois pontos de recursão. Documentado em comentários SQL detalhados das migrations.
- **Validação de `?next`** — recusar URLs absolutos e protocol-relative (`//evil.com`) é defesa contra open redirect. Aceita apenas caminhos `/<algo>` internos.

### segue
- 🔜 Após primeiro login Google de `joaocanelasribeiro@gmail.com` em `logos-dev` (já feito durante este E2E): correr `supabase/seed/super-admin.sql.example` (cópia local) contra `logos-dev` para promover. Necessário antes de PR3.
- 🔜 PR3 — Roles UI + área `/admin` esqueleto.

---

## [14-05-2026] — V2 PR1: foundation auth (DB + skeleton lib/auth/ + ESLint guard)

### add
- add: `supabase/migrations/20260514002002_profiles_and_current_profile_id.sql` — cria `profiles` (id, external_auth_id, display_name, role, created_at; check em role para `user|admin|super_admin`; FK `auth.users` com `on delete restrict`), função SQL `current_profile_id()` (STABLE, security invoker) e 2 RLS policies em `profiles` (select próprio ou super_admin; update apenas próprio). Sem `for insert` policy — Server Action no callback OAuth (PR2) faz o insert via service role.
- add: `src/lib/auth/index.ts` — tipo `Profile` + `Role` + 4 stubs (`getCurrentUser` devolve `null`, `getServerClient`/`signInWithGoogle`/`signOut` atiram erro com mensagem "chega em V2 PR2"). Fixa o contrato público da camada de identidade.
- add: `src/lib/auth/index.test.ts` — 4 testes que verificam o comportamento dos stubs.
- add: `@supabase/ssr@0.10.3` + `@supabase/supabase-js@2.105.4` em dependências (uso real só em PR2; instaladas agora para validar o ESLint guard).

### update
- update: `eslint.config.mjs` — regra `no-restricted-imports` bloqueia `@supabase/ssr` e `@supabase/supabase-js` fora de `src/lib/auth/**`. Override por ficheiro reactiva-os dentro dessa pasta. Mensagem de erro aponta consumidores para `@/lib/auth`.

### segue
- ✅ Migration aplicada a `logos-dev` em 14-05-2026 (CLI + `SUPABASE_ACCESS_TOKEN`). `list_migrations` confirma `20260514002002` em local + remoto. Repetir em `logos-prod` antes do primeiro merge V2 PR2 em produção.
- 🚧 `feature-docs/google-oauth-setup.md` em execução pelo utilizador (~20 min). Pré-condição para PR2.

### fix (doc)
- fix: `feature-docs/google-oauth-setup.md` §5.5 — Google **não aceita wildcards** em "Authorized JavaScript origins" (`*.vercel.app` é rejeitado com erro "Origem inválida"). Doc passa a indicar apenas hosts concretos (`localhost:3000` em dev, `logos.cclx.pt` em prod). Login em Vercel Preview fica sem suporte por design.
- fix: `feature-docs/google-oauth-setup.md` §8.2 — clarificar que "Redirect URLs" é uma **secção separada do Site URL** na mesma página (não um campo único); aqui wildcards **são** aceites pelo Supabase, mas adicionar Preview wildcards não vale a pena (Google já bloqueia antes).
- add: `feature-docs/google-oauth-setup.md` §9 + §10 — nota sobre não guardar o JSON com Client Secret em pastas sincronizadas + 2 linhas novas na tabela de troubleshooting (erro de wildcard + "não vejo Redirect URLs").

### why
- Estabelece a **fronteira de identidade** em código antes de a fronteira ser exercitada por código real. A regra ESLint torna desvios automáticos de detectar logo no PR seguinte.
- A migration aplica-se a Production sem efeito visível (tabela vazia até primeiro login real em prod, pós-PR2).
- Stubs com mensagem clara evitam que outros desenvolvedores (ou Claude noutra sessão) chamem a API antes de PR2 e fiquem confusos com o porquê.

---

## [14-05-2026] — V2 planeada: 2 docs novos em feature-docs/

### docs
- add: `feature-docs/google-oauth-setup.md` — passo-a-passo para criar OAuth App no Google Cloud Console (consent screen + 2 Web Clients, um por ambiente Supabase) e ligar ao provider Google de `logos-dev` (`dknrnqyqlojvnhspwjrd`) e `logos-prod` (`tirzriuabfwzqxtjsmfb`). Inclui tabela de troubleshooting e nota sobre `Publish app` para evitar bloqueio em "Testing".
- add: `feature-docs/v2-auth.md` — sequência de 4 PRs para V2 (PR1 foundation sem OAuth, PR2 login + callback + profile sync, PR3 roles UI + área `/admin` esqueleto, PR4 etiquetas). Cada PR lista ficheiros tocados, testes pensados e checkpoints operacionais (ex.: correr seed super_admin pós-PR2).

### update
- update: `status.md` — secção "Próximas tarefas" reescrita: SVG do ministério marcado como resolvido (continuamos com `logo-cclx-interiors.svg`); tarefa genérica de OAuth substituída por referência directa a `google-oauth-setup.md`; V2 PR1-PR4 listadas como próximos passos com ponteiros para `v2-auth.md`.

### why
- V2 é o salto técnico maior do projecto (4 PRs, mexe em DB + auth + RLS + UI admin). Antes de escrever migrations, valer a pena fechar o desenho num documento que define **o que cada PR entrega**, **o que ainda não entrega**, e **a ordem operacional** (ex.: seed super_admin só pode correr depois de a pessoa fazer login pela primeira vez).
- O documento de OAuth setup é necessário porque o utilizador escreveu explicitamente "não sei como começar" — passo-a-passo no painel Google reduz fricção e elimina decisões em runtime.

---

## [14-05-2026] — V1 conteúdo: copy placeholder em Conhece-nos, Cursos e Fala connosco

### update
- update: `src/app/conhece-nos/conhece-nos-content.tsx` — copy substantivo em 3 secções: identificação ("Somos a CCLX — Comunidade Cristã Lisboa"), "O que aqui encontras" (vídeo + PDF + sem prazos, sempre gratuito), "Quem está por trás" (equipa de voluntários). Marcado como "Em construção — texto definitivo em breve".
- update: `src/app/cursos/cursos-content.tsx` — passa de placeholder simples a layout com intro + secção "O que vais encontrar" (3 cards: vídeo embebido, apostila PDF, ritmo próprio — icons `BookOpen`, `FileDown`, `CheckCircle2`). Mantém tag "Em breve".
- update: `src/app/fala-connosco/fala-connosco-content.tsx` — passa a oferecer 2 cards de contacto: email (`mailto:logos@cclx.pt?subject=Contacto Logos`) e site da CCLX (`https://cclx.pt`, abre em nova aba com `rel="noopener noreferrer"`). Nota inferior "Horários e morada da igreja em breve".

### add
- add: `src/app/conhece-nos/page.test.tsx`, `cursos/page.test.tsx`, `fala-connosco/page.test.tsx` — smoke tests por página (h1 + ancoras de copy + mailto/target/rel para Fala connosco). 14/14 testes a passar.

### why
- **Desbloquear V1 sem esperar pelo ministério.** Decisão consciente: copy nas 3 páginas é placeholder mas concreto o suficiente para servir em Production. Quando o ministério mandar texto final, é substituição de strings em ficheiros isolados (sem mexer em layout/animações/testes — exceto para actualizar matchers de copy se necessário).
- **3 pilares dos cursos coerentes com SPEC §6/§8:** vídeo YouTube embebido + PDF descarregável + estado de conclusão binário sem barras de progresso (`SPEC_1.md` proíbe percentagens até V7). Os 3 cards na página Cursos já comunicam isto.
- **Fala connosco com algo útil hoje:** `mailto:` com subject prefill ajuda triagem; link CCLX com nova aba para utilizadores continuarem no Logos depois. Morada/horários da igreja explicitamente pendentes do ministério.

### segue
- Substituir copy de Conhece-nos e Fala connosco por texto final do ministério (sem alteração de estrutura).
- Acrescentar morada + horários a Fala connosco quando o ministério os fornecer.

---

## [13-05-2026] — V1 a11y: skip-link "Saltar para o conteúdo"

### add
- add: `src/components/site/skip-link.tsx` — link "Saltar para o conteúdo" como **primeiro elemento focável** do body. `sr-only` por defeito, `focus:not-sr-only` quando recebe foco — aparece em cima-esquerda. Aponta para `#main-content`.
- add: `src/components/site/skip-link.test.tsx` — 2 testes (link tem `href="#main-content"` + texto PT-PT; classes `sr-only` + `focus:not-sr-only` presentes).

### update
- update: `src/app/layout.tsx` — `<SkipLink />` antes do `<Header />`; `<main>` ganha `id="main-content"` + `tabIndex={-1}` + `focus:outline-none` (alvo do salto, focável programaticamente sem ring visível).

### why
- Utilizadores de teclado e de leitor de ecrã têm hoje de tabular toda a Header (logo + hambúrguer/nav) antes de chegarem ao conteúdo principal. WCAG 2.4.1 ("Bypass Blocks") pede uma forma de saltar. Esta é a opção mais simples e bem-documentada — um `<a>` que aparece no foco.
- 7/7 testes locais a passar; sem novas dependências.

---

## [13-05-2026] — V1 UX: stagger nas páginas + interiores das letras do logo transparentes

### add
- add: `src/lib/motion-variants.ts` — `staggerContainer` + `staggerItem` partilhados. Substituem variants duplicados que viviam só em `home-hero.tsx`.
- add: `src/app/conhece-nos/conhece-nos-content.tsx`, `cursos/cursos-content.tsx`, `fala-connosco/fala-connosco-content.tsx`, `not-found-content.tsx` — client components com `motion.section` + stagger. Cada `page.tsx` mantém-se server para preservar `export const metadata`.
- add: `public/logo-cclx-interiors.svg` — variante do logo com **interiores das letras transparentes**. Gerado a partir de `logo-cclx-clean.svg` via análise programática: bbox de cada path comparado com bboxes das 5 letras (L, O, G, O, S — extraídas dos paths laranja `#E38258`); paths creme **fully contained** dentro de uma letra ficam `fill="none"`. Resultado: 247 paths modificados, 198 mantidos (livro + gaps entre letras). Diff de tamanho: −0.4% (189904 → 189163 bytes).

### update
- update: `src/components/site/home-hero.tsx` — importa variants do novo módulo partilhado. Comportamento idêntico.
- update: `src/components/site/logo.tsx` — `src` aponta para `/logo-cclx-interiors.svg`.
- update: páginas `conhece-nos`, `cursos`, `fala-connosco` e `not-found` passam a delegar render ao client component co-localizado.

### why
- **Stagger consistente:** Home tinha entrada animada (logo → h1 → parágrafo → CTAs); restantes páginas saltavam directo. Resolve a falta de coerência. Pages curtas (2-3 elementos) também beneficiam — feedback de "página acabou de carregar" sem ruído.
- **Interiores das letras:** o SVG do ministério tem paths creme a preencher o bowl dos O e do G, dando aspecto de "branco" contra `bg-background` (`#FAF4EA`). Solução cirúrgica: só paths cuja bbox cai inteiramente dentro de uma letra ficam `fill="none"`. Livro fica intacto (paths em `y=509-757`), gaps entre letras também.
- **Cliente vs servidor:** `motion/react` exige client component. `metadata` exige server component. Padrão Next 15 limpo: `page.tsx` é fino, delega ao `<name>-content.tsx`. Fica `'use client'` localizado, não polui o root.

### limites
- Análise feita às cegas — Claude não tem browser. O utilizador valida em Preview Vercel se: (a) interior das letras agora mostra a cor do fundo da página, (b) livro mantém detalhe creme, (c) gaps entre letras não têm halo visível indesejado. Se houver halo, iterar — abrir bbox para incluir paths que cruzam a fronteira da letra.

---

## [13-05-2026] — Decisões pré-V2: bootstrap do Super Admin + entrada admin

### docs
- update: `SPEC_1.md` §4 — nova sub-secção "Bootstrap do primeiro Super Admin (V2)". Primeiro super_admin é `joaocanelasribeiro@gmail.com`. Entrada à área `/admin` via item no dropdown do utilizador (visível apenas se `role !== 'user'`). Sem link na nav principal, sem sub-domain, sem aviso para utilizadores normais.
- update: `SPEC_1.md` §19 — versão bumped para 2.8.
- update: `architecture.md` §4 — dois bullets novos: seed do primeiro super_admin via SQL versionado depois do primeiro login Google; entrada admin via dropdown coerente com "conteúdo restrito é invisível".
- update: `feature-docs/auth-architecture.md` — nova §5.1 "Bootstrap do primeiro Super Admin" com processo passo-a-passo, justificação ("porquê SQL versionado e não migration"), e nota de que `display_name` continua a vir do provider.

### add
- add: `supabase/seed/super-admin.sql.example` — SQL versionado em `DO $$ ... $$` idempotente. Lança `EXCEPTION` se a pessoa ainda não fez login; faz no-op se já é super_admin; reporta `row_count` via `RAISE NOTICE`. Não é corrido automaticamente — operador copia para `super-admin.sql` (gitignored) e executa contra o ambiente após o primeiro login.
- add: `.gitignore` — `supabase/seed/*.sql` (cópias locais) + `!supabase/seed/*.sql.example` (manter exemplos versionados).

### why
- Pre-V2 alignment: os três pontos abertos do design admin estavam por decidir (quem é o primeiro super_admin, como se entra na área admin, como se faz o seed). Sem isto, V2 PR1 (implementação da camada `lib/auth/` + migration `profiles`) começaria com decisões em runtime.
- Mantém-se a regra "boring, well-documented option" do `CLAUDE.md`: SQL versionado em vez de automação opaca; cópia local em vez de credenciais em CI.

---

## [13-05-2026] — V1 polimento: 404 PT-PT + robots/sitemap + limpeza

### add
- add: `src/app/not-found.tsx` — página 404 global em PT-PT, dentro do shell (`Header`/`Footer` herdados do layout). Heading "Página não encontrada" + CTAs `Voltar ao início` e `Ver cursos`. `metadata.robots = { index: false, follow: false }`.
- add: `src/app/robots.ts` — `MetadataRoute.Robots` permissivo (`allow: '/'`) com `sitemap` e `host` a apontar para `siteConfig.url` (`https://logos.cclx.pt`).
- add: `src/app/sitemap.ts` — `MetadataRoute.Sitemap` gerado a partir de `siteConfig.url` + `navItems`. Home com `priority: 1`, restantes com `0.7`. `changeFrequency: 'monthly'`. `lastModified = new Date()` (build-time).
- add: `src/app/not-found.test.tsx` — 2 testes (heading 404 em PT-PT + CTAs com `href` correctos).

### update
- update: site deixa de servir o 404 default em inglês do Next em qualquer rota inválida.

### remove
- remove: `src/app/debug-logo/` — rota de scaffolding usada durante a decisão "logo textual vs SVG" (`feature-docs/v1-shell.md` §3.2). Decisão fechada em V1 PR1, rota não pertence a produção.

### why
- Higiene técnica antes de partilhar `logos.cclx.pt` publicamente: SEO básico (`robots`/`sitemap`), erro 404 consistente com o resto do site (em PT-PT, dentro do shell), e remoção de rotas debug acessíveis em produção.
- Não bloqueia em copy do ministério (que é o que trava V1 PR2 e PR3).

---

## [12-05-2026] — Production: domínio `logos.cclx.pt` activo

### infra
- add: domínio custom `logos.cclx.pt` adicionado ao projeto Vercel `logos` (Production scope). CNAME `logos.cclx.pt` → `00f4337193415fe7.vercel-dns-017.com` (formato novo do Vercel, hash único por domínio).
- update: zona DNS Hostinger de `cclx.pt` — registos antigos do sub-domínio `logos` (A `147.79.119.210` + `193.58.105.154`, AAAA `2a02:4780:...`) removidos para libertar o nome; CNAME único adicionado a apontar para o target Vercel. Conflito CNAME+A é rejeitado pelo protocolo DNS, portanto a limpeza era pré-condição.
- add: certificado HTTPS emitido automaticamente pelo Vercel (Let's Encrypt) após validação. `https://logos.cclx.pt` responde 200.
- add: env var `NEXT_PUBLIC_SITE_URL=https://logos.cclx.pt` no scope **Production** via `vercel env add`. Era deliberadamente unset durante o Setup à espera de DNS (`feature-docs/vercel.md` §7).
- update: redeploy de Production forçado após o `env add` — `NEXT_PUBLIC_*` é inlined em build-time, portanto o deploy anterior (do merge PR #17, ~1 min antes) não trazia o valor novo.

### docs
- update: `feature-docs/vercel.md` §9 — DNS deixa de estar "pendente"; passa a "activo" com o CNAME concreto (`00f4337193415fe7.vercel-dns-017.com`) e nota sobre conflito CNAME+A.
- update: `feature-docs/vercel.md` §10 — "Pendente" perde os bullets de DNS e `NEXT_PUBLIC_SITE_URL`.
- update: `status.md` — bullets de DNS Hostinger e checkpoint do `NEXT_PUBLIC_SITE_URL` movem-se para ✅ Concluído; risco "DNS Hostinger" removido.
- update: `changelog.md` — esta entrada.

### why
- Fecha a última dependência externa que travava a V1 em Production (até aqui Production estava em `logos-<hash>.vercel.app`).
- Desbloqueia metadata absoluta (`<link rel="canonical">`, OG tags, sitemap) para qualquer feature V1/V2 que precise de URL fixo.

---

## [12-05-2026] — V1 PR1 mergeado para `main` (PR #17)

### infra
- update: PR #17 (`feat/v1-shell` → `main`) squash-merged via `gh pr merge --squash --delete-branch`. CI verde, Vercel Preview verde, `mergeStateStatus: CLEAN`. Branch `feat/v1-shell` apagada local e remotamente. Primeiro PR a passar pela regra de branch protection (PR #15 / #16 foram os que a activaram).
- add: deploy Production do shell de navegação iniciado automaticamente pelo push em `main`. Aliased a `https://logos.cclx.pt` após DNS+env var (entrada acima).

### why
- Production deixa de servir a página "Em construção" do Setup e passa a servir o shell V1 (Header + Footer + Home + stubs).
- Conteúdo das PRs V1 seguintes (Conhece-nos, Cursos placeholder, Fala-connosco) será mergeado em cima deste shell.

---

## [12-05-2026] — V1 PR1: shell de navegação (Header + Footer + Home + stubs)

### add
- add: `src/components/site/header.tsx` — cabeçalho global sticky, `bg-background/95` com backdrop blur, logo à esquerda + nav à direita em desktop (`md+`), hambúrguer em mobile.
- add: `src/components/site/footer.tsx` — rodapé com Logo `size="sm"` + descrição do projeto, link à página da CCLX e copyright dinâmico.
- add: `src/components/site/logo.tsx` — wordmark "LOGOS" em Cormorant Garamond a `text-orange` + ícone `BookOpen` da `lucide-react`. Tamanhos `sm`/`md`/`lg`. Renderiza como `<Link href="/">` por defeito; `asStatic` para uso em hero/rodapé. Decisão de usar fallback de texto em vez do SVG de `docs/branding/logo-cclx-logos.svg` documentada em `feature-docs/v1-shell.md` §3.2 (SVG tem fundo `#F7F7F7` opaco que cobriria a paleta creme).
- add: `src/components/site/nav-links.tsx` — `'use client'`, lê `usePathname()` para aplicar `aria-current="page"` + sublinhado em rota activa. Reutilizado em desktop (`orientation="horizontal"`) e mobile (`orientation="vertical"`).
- add: `src/components/site/mobile-nav.tsx` — `'use client'`, hambúrguer + painel `fixed inset-x-0 top-16 bottom-0` com `role="dialog" aria-modal="true"`. Fecha com Escape, bloqueia scroll do body enquanto aberto. Sem dependência shadcn `Sheet` (não está na roadmap V1 do `feature-docs/shadcn-ui.md`).
- add: `src/lib/site-config.ts` — `siteConfig` (nome, descrição, organização) + `navItems` centralizados (single source of truth para nav).
- add: `src/app/conhece-nos/page.tsx`, `src/app/cursos/page.tsx`, `src/app/fala-connosco/page.tsx` — **stubs** com "em breve" para que o nav não dê 404 entre PRs. PR2 e PR3 substituem.
- add: `feature-docs/v1-shell.md` — estrutura, decisões (sem `Sheet`, logo textual, `Button render={<Link/>}` em vez de `asChild`), a11y, validação local.

### update
- update: `src/app/layout.tsx` — passa a envolver `children` em `<Header />` + `<main className="flex-1">` + `<Footer />`. Body com `bg-background text-foreground flex min-h-full flex-col`. Metadata `default` e `template` consomem `siteConfig`.
- update: `src/app/page.tsx` — "Em construção" reescrita como hero V1: Logo `size="lg" asStatic`, h1 "Estudo bíblico para uma fé enraizada.", parágrafo de intro PT-PT, dois CTAs (`Button render={<Link href="/cursos" />}` para "Ver cursos" + variant `ghost` para "Conhece o projeto").
- update: `src/app/page.test.tsx` — 3 testes: heading presente + wordmark visível + CTAs com `href` correctos. Removido o teste de "Em construção" (substituído por hero).

### why
- Primeira PR da V1; o site deixa de ser "Em construção" e passa a ter shell pronto para receber conteúdo nas PRs seguintes.
- Stubs em vez de rotas missing evitam 404 do nav durante revisão de PR2/PR3.
- Copy em PT-PT rascunhada pelo agent; revisão final pelo ministério antes de Production (decisão em chat — `status.md`).

### gotchas (documentados em `feature-docs/v1-shell.md`)
- Base UI (não Radix) — `Button` não tem `asChild`; usa `render` prop.
- SVG do logo de `docs/branding/` não é usável em runtime; fallback textual ao abrigo da `SPEC_1.md` §14.
- Tokens shadcn `--muted` (`#f4ead8`, background) vs `--muted-foreground` (`#6b6b6b`, texto): texto secundário usa `text-muted-foreground`.

---

## [12-05-2026] — Setup: branch protection em `main` activa

### infra
- add: regra de branch protection aplicada via `gh api PUT /repos/cclx-pt/Logos/branches/main/protection`. Configuração:
  - `required_pull_request_reviews: { required_approving_review_count: 0 }` — PR obrigatório, sem exigência de aprovação (single dev).
  - `required_status_checks: { strict: false, contexts: ["Lint · Typecheck · Test · Format"] }` — CI tem de passar antes de merge.
  - `required_linear_history: true` — alinhado com squash-merge usado em todos os PRs.
  - `allow_force_pushes: false`, `allow_deletions: false`.
  - `enforce_admins: false` — admin pode override em emergência; disciplina honor-system continua em `CLAUDE.md` + `.claude/settings.json` `permissions.deny`.

### docs
- update: `SPEC_1.md` §16 — branch protection passa de "elegível, activação pendente" para **activa** com a regra completa documentada.
- update: `SPEC_1.md` §19 — v2.6 → v2.7.
- update: `feature-docs/ci.md` §1 — admonition reescrita: regra activa, com a configuração concreta listada.
- update: `status.md` — bullet "Activar branch protection em `main`" movido para ✅ Concluído; entrada em ⚠️ Riscos actualizada (risco residual = override de admin).
- update: `changelog.md` — esta entrada.

### why
- Fecha o último item de fundação que dependia da mudança de visibilidade do repo (PR #15).
- Estabelece salvaguarda server-side para a regra "nunca push directo para `main`" que era apenas honor-system.
- Este próprio PR valida a regra na prática (primeiro a passar pelo gate).

---

## [12-05-2026] — Setup: Vercel bootstrap (deploy + env vars + repo público)

### infra
- add: projeto Vercel `logos` (`prj_V0Kp9TZj5QHdAkwBMoPenKlA1TJj`) no scope `jcrninjas-projects` (conta pessoal — CCLX sem Vercel team, adiar até Pro justificável). Framework auto-detectado Next.js. Install/build resolvidos via `packageManager: pnpm@10.33.2` do `package.json`.
- add: Vercel GitHub App instalado em `cclx-pt` org com acesso restrito a `Logos` (Only select repositories). `push origin main` → Production deploy; PRs → Preview com URL único; webhook GitHub → Vercel.
- add: env vars nos 3 scopes (Production / Preview / Development) via `vercel env add`:
  - **Production**: `NEXT_PUBLIC_SITE_NAME=Logos` (Supabase prod env vars deliberadamente unset até checkpoint V2).
  - **Preview**: `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SUPABASE_URL` (logos-dev), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (logos-dev). Preview aponta para `logos-dev`, não `logos-prod` (segurança de mutação, schema testing, auth testing, custo zero).
  - **Development**: mesmo conjunto do Preview + `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Espelha `.env.local` para `vercel env pull` quando alguém clonar o repo.
- update: visibilidade do repo `cclx-pt/Logos` privada → pública (12-05-2026). Restrição do plano Hobby: repo de organização privado requer Pro (~20€/mês). Mudança aceite após verificação de segurança (nenhum `.env` jamais commitado; refs Supabase são identificadores públicos por design; publishable key é client-side; service role nunca em ficheiro versionado).

### add
- add: `.gitignore` — entrada `.vercel` (ficheiros gerados por `vercel link`: `.vercel/project.json` contém `projectId` + `orgId`, não deve ser versionado).
- add: `feature-docs/vercel.md` — bootstrap completo: recursos provisionados, ligação GitHub↔Vercel, env vars por scope (com decisão Preview→logos-dev), razão da mudança de visibilidade do repo (com checklist de segurança), CLI install/login, gotcha do `vercel env add` em Claude Code (auto-deteção de agent + workaround `env -u CLAUDECODE`), validação do primeiro deploy, DNS pendente, troubleshooting.

### docs
- update: `SPEC_1.md` §13.5 — Preview deploys formalizados a apontar para `logos-dev` (decisão prévia em `feature-docs/supabase.md` PR #12 promovida à SPEC).
- update: `SPEC_1.md` §16 e `feature-docs/ci.md` §1 — branch protection passa de "não elegível no plano free" para "elegível agora que o repo é público"; activação fica como tarefa nova.
- update: `architecture.md` §8 — tabela de ambientes inclui Vercel scopes (Production/Preview/Development) e referência a `feature-docs/vercel.md`.
- update: `status.md` — bullet "Criar conta Vercel e ligar ao repositório" movido para ✅ Concluído; tarefa nova "Activar branch protection em `main`" em ⏭️ (agora elegível); risco antigo sobre branch protection actualizado.

### why
- Pré-condição V1 (site público estático precisa de host com deploy automático).
- Preview deploys por PR aceleram review (URL único, comentário automático no PR, valida build antes de merge).
- 0€/mês mantido como `SPEC_1.md §11` exige; trade-off da visibilidade do repo aceite após auditoria.

---

## [09-05-2026] — Setup: auth scope reduzido para Google OAuth apenas (V1-V9)

### docs
- update: `SPEC_1.md` §9.2 (V2) — login passa a Google OAuth apenas; remoção da linha de recovery emails via Resend.
- update: `SPEC_1.md` §11 — célula Autenticação atualizada (apenas Google OAuth, com referência a §17/§18); célula Email (Resend) passa para "V5+ notificações Q&A" (sem urgência V2).
- update: `SPEC_1.md` §17 — nova decisão adiada explícita sobre email/password como método alternativo (reabrir apenas se o ministério pedir inclusão de utilizadores sem Google).
- update: `SPEC_1.md` §18 — login com email e palavra-passe listado como fora de âmbito V1-V9.
- update: `SPEC_1.md` §19 — versão 2.4 → 2.5.
- update: `CLAUDE.md` 🏗️ Arquitetura — descrição auth ajustada (Google OAuth apenas).
- update: `architecture.md` cabeçalho — data atualizada para 09-05-2026.
- update: `architecture.md` §4 — primeira linha reescrita; nota sobre shell futura potencialmente oferecer email/password sem condicionar a decisão V2.
- update: `architecture.md` §11 (RGPD) — origens de email e display_name actualizadas para "Google OAuth (claim)".
- update: `feature-docs/auth-architecture.md` §3.1 — `signInWithGoogle()` listado como única função de sign-in da API pública.
- update: `feature-docs/auth-architecture.md` §5 — sincronização clarificada como callback OAuth do Google.
- update: `feature-docs/auth-architecture.md` §7 — tabela de email/display_name actualizada para refletir claim do Google.
- update: `feature-docs/auth-architecture.md` §10 — fluxos de email/password listados como fora deste documento.
- update: `feature-docs/supabase.md` §7 — secção Auth simplificada (só Google).
- update: `status.md` — Resend movido para tarefa adiada V5+; tarefa Google Cloud OAuth acrescentada como pré-condição V2; nova entrada em ⚠️ Riscos sobre exclusão de utilizadores sem Google.

### why
- Esforço V2 auth desce de ~13h para ~3.5h.
- Elimina duas dependências externas em V2 (Resend account + DNS Hostinger SPF/DKIM).
- Acelera entrega da V3 (prazo: 01-07-2026).
- Trade-off aceite: utilizadores sem Google ficam fora até decisão contrária.

---

## [09-05-2026] — Setup: pipeline Supabase migrations validado em logos-dev

### infra
- run: `pnpm dlx supabase link --project-ref dknrnqyqlojvnhspwjrd` — autenticação CLI via PAT (`SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` apenas nas env vars da sessão Bash; nada commitado).
- run: `pnpm dlx supabase db push` — primeira migration `20260509175745_initial.sql` aplicada à DB remota de `logos-dev`. Confirmado via MCP `list_migrations`: `[{"version":"20260509175745","name":"initial"}]`. Pipeline end-to-end (gerar → linkar → push) validado antes de existir schema real (V2).

### docs
- update: `status.md` — bullets "Configurar `.env.local`" e "Linkar Supabase CLI a `logos-dev` + primeira `db push`" movidos para ✅ Concluído. "Última atualização" estendida.

---

## [09-05-2026] — Setup: Supabase bootstrap (2 projetos + CLI + primeira migration)

### infra
- add: projeto Supabase `logos-dev` (ref `dknrnqyqlojvnhspwjrd`) em `eu-west-3` (Paris). Free tier ($0/mês). Provisionado via MCP `mcp__plugin_supabase_supabase__create_project`. Status `ACTIVE_HEALTHY`.
- add: projeto Supabase `logos-prod` (ref `tirzriuabfwzqxtjsmfb`) em `eu-west-3` (Paris). Free tier ($0/mês). `ACTIVE_HEALTHY`.

### add
- add: `supabase/config.toml` — gerado por `pnpm dlx supabase init`. Define `project_id = "Logos"`, ports locais (API 54321, DB 54322), schemas `public` + `graphql_public`. Sem instalação global da CLI; `pnpm dlx` é a forma canónica.
- add: `supabase/migrations/20260509175745_initial.sql` — primeira migration placeholder com comentários. Schema real chega na V2 (profiles, tags, user_tags, função `current_profile_id()`) e V3 (courses, modules, lessons, conclusões).

### docs
- add: `feature-docs/supabase.md` — bootstrap dos 2 projetos, env vars (com troca de `anon` legacy para `publishable_key`), CLI workflow (link + db push), strategy de migrations dev → prod, gotchas do plano free (sem backups, sem Docker local), referências.
- update: `.env.example` — `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formato moderno `sb_publishable_*` recomendado pela Supabase). `SUPABASE_SERVICE_ROLE_KEY` mantido (legacy enquanto Supabase não migra a UI). Comentário com refs dos 2 projetos para referência rápida.
- update: `status.md` — bullets "Criar projetos Supabase" e "Configurar Supabase CLI + primeira migration vazia" movidos para ✅ Concluído. Acrescentadas duas tarefas em ⏭️ (configurar `.env.local` e linkar CLI a `logos-dev`).

---

## [09-05-2026] — Setup: shadcn/ui instalado e mapeado à paleta CCLX

### add
- add: scaffold `pnpm dlx shadcn@latest init -d`. CLI v4 detetou Next.js 16 + Tailwind v4 + alias `@/*` automaticamente. Criou `components.json`, `src/lib/utils.ts` (`cn()` helper), e `src/components/ui/button.tsx` (incluído no scaffold em CLI v4).
- add: deps em `dependencies` — `@base-ui/react ^1.4.1` (primitive library default em CLI v4; substitui Radix), `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `lucide-react ^1.14.0`, `shadcn ^4.7.0` (package que disponibiliza `@import "shadcn/tailwind.css"`), `tailwind-merge ^3.5.0`, `tw-animate-css ^1.4.0`.

### update
- update: `components.json` — `baseColor: neutral` → `stone` (mais quente; alinha com tom creme da paleta).
- update: `src/app/globals.css` — paleta CCLX preservada em `@theme` (fonte de verdade); tokens semânticos shadcn (`--background`, `--primary`, `--foreground`, `--muted`, `--accent`, `--border`, `--ring`, etc.) mapeados em `:root` para os hex CCLX; `@theme inline` mapeia tokens Tailwind v4 (`--color-*`) para as CSS vars; `--font-heading: var(--font-display)` para que componentes shadcn que usem font-heading apliquem Cormorant. Bloco `.dark` mantém defaults shadcn (placeholder até V6).
- update: `src/app/layout.tsx` — restaurado para versão original Cormorant + Inter; removida tentativa do CLI v4 de injectar Geist como `--font-sans` (gotcha conhecido).
- update: `feature-docs/branding.md` §1 e §2 — secções obsoletas reescritas para Tailwind v4 (sem `tailwind.config.ts`). §1 mostra agora `@theme` em `globals.css` para tokens CCLX + `:root`/`@theme inline` para tokens semânticos shadcn. §2 troca `tailwind.config.ts → extend.fontFamily` por `@theme` em CSS. §7 historial estendido.

### docs
- add: `feature-docs/shadcn-ui.md` — comando, configuração final, mapeamento token-a-token CCLX → shadcn, decisões (style `base-nova`, `baseColor: stone`, Base UI vs Radix, lucide), 4 gotchas (layout corrompido, font-sans circular, prettier reformat após `add`, format:check local em Windows), roadmap por versão (V1: card/input/textarea/label/form; V2: dropdown-menu/avatar/dialog/alert/separator/badge; V3: accordion/skeleton/scroll-area; **sem progress até V7**).

---

## [08-05-2026] — Setup: branch protection adiada (plano free) → regra honor-system

### docs
- update: `SPEC_1.md` §16 — restrição nova: branch protection do GitHub não está ativa (plano gratuito não a disponibiliza em repositórios privados; decisão consciente de não subscrever Pro). Regra "PR obrigatório, nunca push directo para `main`" fica honor-system em `CLAUDE.md`, reforçada por `git push --force`, `git reset --hard` e `git branch -D *main*` em `.claude/settings.json` `permissions.deny`.
- update: `SPEC_1.md` §19 — versão 2.3 → 2.4.
- update: `feature-docs/ci.md` — nota sobre branch protection reescrita: passa de "ainda não está ativa" (com expectativa de ativar a seguir) para "não vai ser ativada com o plano atual"; explica trade-off e ligação a `SPEC_1.md` §16.
- update: `status.md` — bullet "Ativar branch protection em `main`" removido de ⏭️ Próximas tarefas; nova entrada em ⚠️ Riscos / bloqueios; "Última atualização" estendida.

---

## [08-05-2026] — Setup: GitHub Actions CI (lint + typecheck + test + format:check)

### infra
- add: `.github/workflows/ci.yml` — job único `quality` em `pull_request` e `push` para `main`. Steps sequenciais: checkout → `pnpm/action-setup@v4` (versão lida do `packageManager`) → `actions/setup-node@v4` com `cache: pnpm` → `pnpm install --frozen-lockfile` → `pnpm exec eslint --max-warnings 0` → `pnpm typecheck` → `pnpm test` → `pnpm format:check`. `concurrency` com `cancel-in-progress: true` (poupa minutos em pushes consecutivos). `permissions: contents: read` (princípio do menor privilégio). `timeout-minutes: 10` (rede de segurança contra flakes). Tempo típico de execução: ~30s.
- add: `.gitattributes` — normaliza line endings (`* text=auto eol=lf`) com listas explícitas para binários e SVGs. Resolve avisos `LF will be replaced by CRLF` em Windows e impede drift entre dev local (Windows) e CI (Linux).

### docs
- add: `feature-docs/ci.md` — pipeline canónica documentada (triggers, concurrency, decisão de job único, passo a passo dos steps, secção de troubleshooting, roadmap V2 com coverage thresholds e V3 com Playwright contra preview deploys).
- update: `architecture.md` §10 — passos da pipeline atualizados (5 passos em vez de 4 + E2E V3) e remete para `feature-docs/ci.md`.
- update: `eslint.config.mjs` — `globalIgnores` inclui `coverage/**`.

---

## [08-05-2026] — Setup: fronteira de identidade vs autorização Logos

### docs
- add: `feature-docs/auth-architecture.md` — desenho da fronteira: camada `src/lib/auth/` como única importadora de `@supabase/ssr`; tabela `profiles` com `id` (FK universal Logos) e `external_auth_id` (única ligação ao sistema de identidade externo); sincronização `auth.users → profiles` em defesa em profundidade (Server Action + trigger DB); RLS via função SQL `current_profile_id()`; `display_name` no Logos vs email não duplicado; lista do que muda e do que **não** muda quando uma shell partilhada CCLX vier substituir a identidade. Implementação fica para V2.
- update: `SPEC_1.md` §17 — entrada sobre "SSO com app da CCLX" reescrita: passa de "não viável agora" para "não implementada agora, mas estruturada para ser substituível"; remete para `architecture.md` §4 e `feature-docs/auth-architecture.md`.
- update: `SPEC_1.md` §19 — versão 2.2 → 2.3.
- update: `architecture.md` §2 — FKs `auth.users` migradas para `profiles` em `tags.created_by`, `user_tags.user_id`, `user_tags.assigned_by`, `lesson_completions.user_id`, `course_completions.user_id`, `course_access_log.user_id`; schema de `profiles` reescrito (`id` PK, `external_auth_id` UNIQUE, `display_name`, `role`, `created_at`); nota explicativa da fronteira de identidade.
- update: `architecture.md` §3 — camada de identidade (`src/lib/auth/`) listada com responsabilidade explícita; `getVisibleCoursesForUser` passa a aceitar `profileId`.
- update: `architecture.md` §4 — reescrita: identidade isolada em `lib/auth/`; RLS via `current_profile_id()` em vez de JWT custom claim direto; sincronização `auth.users → profiles` em defesa em profundidade documentada; ligação a `feature-docs/auth-architecture.md`.
- update: `CLAUDE.md` — três regras duras novas em "🚫 Regras (não negociáveis)": (1) identidade isolada em `src/lib/auth/`; (2) FKs nunca para `auth.users`, sempre para `profiles.id`; (3) email não duplicado em tabelas Logos.
- update: `status.md` — bullet em ✅ Concluído sobre fronteira de identidade documentada; data atualizada.

---

## [05-05-2026] — Setup: Vitest + Testing Library + primeiro smoke test

### add
- add: **Vitest 4.1.5** + **`@vitest/coverage-v8` 4.1.5** — runner com env `jsdom`, `globals: true`, alias `@/*` via Vite 7 nativo (`resolve.tsconfigPaths: true`)
- add: **`@testing-library/react` 16.3.2** + **`@testing-library/jest-dom` 6.9.1** + **`@testing-library/user-event` 14.6.1** — primeira major a suportar React 19
- add: **`@vitejs/plugin-react` 6.0.1** + **`jsdom` 29.1.1**
- add: `vitest.config.ts` — env jsdom, globals, setup file, exclude `node_modules`/`.next`/`e2e`, coverage V8 (text + html), exclui `layout.tsx`/`fonts.ts` (sem ROI sem mock de `next/font`)
- add: `src/test/setup.ts` — `import '@testing-library/jest-dom/vitest'` + `cleanup()` automático em `afterEach`
- add: `src/app/page.test.tsx` — primeiro smoke test (2 asserções: heading `aria-label="Logos"` com texto "LOGOS"; legenda "Em construção" presente). 2/2 a passar
- add: scripts `test`, `test:watch`, `test:coverage` em `package.json`
- add: `vitest/globals` + `@testing-library/jest-dom` em `tsconfig.json` `compilerOptions.types`
- add: `feature-docs/testing.md` — estratégia de testes (stack, decisões, padrões para regras duras de CLAUDE.md, anti-padrões, troubleshooting)

### update
- update: `status.md` — Vitest item movido para ✅; data atualizada
- update: `package.json` — bump deps + scripts (sem `vite-tsconfig-paths`, removido após aviso do Vitest 4 sobre suporte nativo)

---

## [05-05-2026] — Setup: Next.js 16 + Tailwind v4 + TS strict + ESLint 9 + Prettier (pnpm)

### add
- add: Next.js **16.2.4** com App Router, `src/`, alias `@/*`, Turbopack default — scaffold via `pnpm create next-app@latest --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbopack`
- add: TypeScript 5.9 em `strict: true` (config `tsconfig.json` default do scaffold)
- add: Tailwind **v4** (`tailwindcss@^4`, `@tailwindcss/postcss@^4`) com tokens de branding em `@theme` no `src/app/globals.css` (paleta de 8 cores + famílias `--font-sans` Inter / `--font-display` Cormorant Garamond)
- add: ESLint **9** flat config (`eslint.config.mjs`) com `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- add: Prettier 3.8 com `prettier-plugin-tailwindcss` (ordem canónica de classes) e `eslint-config-prettier/flat` (desliga regras conflituosas no ESLint)
- add: `.prettierrc.json` (single quote, semi true, trailingComma all, printWidth 100, LF) e `.prettierignore` (build, lockfile, `.claude/`, docs versionados manualmente)
- add: `src/app/fonts.ts` — Cormorant Garamond (500/600) + Inter (400/500/600) via `next/font/google` com subset `latin`
- add: `src/app/layout.tsx` — `<html lang="pt-PT">`, fontes injetadas, metadata com template `'%s · Logos'`
- add: `src/app/page.tsx` — wordmark "LOGOS" (Cormorant + `text-orange`) + "Em construção" sobre `bg-cream-bg`, `aria-label` no h1 para screen readers
- add: scripts `lint:fix`, `typecheck`, `format`, `format:check` em `package.json`
- add: `engines` (`node >=20`, `pnpm >=10`) e `packageManager: pnpm@10.33.2` em `package.json`
- add: `feature-docs/nextjs-init.md` — documentação exaustiva (comando exato, flags, decisões, troubleshooting)

### update
- update: `CLAUDE.md` — Framework de "Next.js 15" para "Next.js 16"
- update: `architecture.md` — diagrama e cabeçalho passam a Next.js 16; data de última atualização
- update: `SPEC_1.md` §11 — célula Framework atualizada para Next.js 16 (justificação ajustada)
- update: `feature-docs/branding.md` — secção "Carregamento (Next.js X App Router)" passa a 16
- update: `.claude/agents/test-runner.md` — mensagem de erro refere Next.js 16
- update: `status.md` — Next.js init movido para ✅; remoção do bullet "Inicializar projeto Next.js 15..." da lista de próximas tarefas

### housekeeping
- remove: SVGs boilerplate em `public/` (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`)
- add: `AGENTS.md` no root — aviso do Next 16 sobre breaking changes vs versões anteriores

---

## [05-05-2026] — Branding: SVG oficial do logótipo

### add
- add: `docs/branding/logo-cclx-logos.svg` — SVG oficial entregue pelo ministério (1600×913, 452 paths, wordmark "LOGOS" + livro aberto estilizado a linha laranja)

### docs
- update: `feature-docs/branding.md` — secção §3 Logótipo flipada de pendente → recebido; fallback de texto reclassificado como `aria-label`; histórico de 05-05-2026 estendido
- update: `status.md` — SVG do logótipo movido de 🚧 para ✅; risco "logótipo bloqueia V1" removido

### infra
- update: `.gitignore` — ignorar `.claude/worktrees/` (estado interno do Claude Code) e `claude-code-psb-guide.md` (notas pessoais soltas)

---

## [05-05-2026] — Setup: configuração transversal do Claude Code

### infra
- add: `.claude/settings.json` versionado — 7 plugins ativos (`github`, `vercel`, `supabase`, `typescript-lsp`, `commit-commands`, `frontend-design`, `engineering-skills`), marketplace `claude-code-skills` declarado, modelo `opus`
- add: permissões partilhadas `permissions.allow` para pnpm, supabase CLI, vercel CLI, git, gh, shadcn — reduz prompts em qualquer máquina
- add: permissões `permissions.deny` para operações destrutivas (`rm -rf`, `git push --force`, `git reset --hard`, `git branch -D *main*`, `supabase projects delete`, `vercel remove`, `gh repo delete`)

### docs
- add: `feature-docs/claude-code-setup.md` — guia para configurar Claude Code numa máquina nova (clone → `claude` → instalar plugins → autenticar serviços), explicação das camadas de configuração, lista de plugins, política de permissões

---

## [05-05-2026] — Setup: identidade visual fixada (paleta + tipografia)

### docs
- update: `SPEC_1.md` §14 — paleta hex fixada com 8 tokens (`cream-bg`, `cream-card`, `sage-card`, `butter-card`, `orange-primary`, `orange-hover`, `ink`, `muted`); tipografia fixada (Cormorant Garamond + Inter via `next/font/google`); descrição de logótipo com fallback de texto até chegar SVG; mockups vinculativos referenciados
- update: `SPEC_1.md` §17 — decisão "paleta + tipografia" resolvida; pendente apenas SVG do logótipo
- update: `SPEC_1.md` §19 — versão 2.1 → 2.2
- add: `feature-docs/branding.md` — spec completa de tokens (mapeamento Tailwind + shadcn HSL), regras de uso, escala tipográfica, integração Next.js 15, regras do logótipo, mockups vinculativos
- update: `status.md` — paleta + tipografia movidas para ✅; SVG do logo é o único item em 🚧; risco de "logótipo bloqueia V1" removido (fallback em texto)
- add: `docs/branding/placeholder-cclx-logos.png` — *placeholder* atual em `cclx.cclx.pt/logos` como referência de tom
- add: `docs/branding/mockups-v3.jpeg` — quatro mockups V3 (catálogo, aula, módulo, apostila) — referência vinculativa de paleta e estrutura

---

## [04-05-2026] — Setup: agents e slash commands para Claude Code

### infra
- add: sub-agent `doc-updater` (`.claude/agents/doc-updater.md`) — sincroniza `changelog.md`, `status.md`, `architecture.md` e `feature-docs/`
- add: sub-agent `pt-pt-reviewer` (`.claude/agents/pt-pt-reviewer.md`) — audita strings user-facing em busca de PT-BR e inglês
- add: sub-agent `test-runner` (`.claude/agents/test-runner.md`) — corre `pnpm lint && pnpm typecheck && pnpm test` (+ `test:e2e` a partir da V3)
- add: sub-agent `spec-guardian` (`.claude/agents/spec-guardian.md`) — valida âmbito de versão e regras duras antes de implementar
- add: slash command `/update-docs` — invoca `doc-updater` com slug opcional
- add: slash command `/version-check` — invoca `spec-guardian` com descrição da tarefa
- add: slash command `/pr-ready` — checklist pré-PR (branch ≠ main, testes, PT-PT, docs)

---

## [02-05-2026] — Auditoria de docs pré-Setup

### docs
- update: `SPEC_1.md` §11 — adicionar Vitest, Playwright (V3+), ESLint, Prettier, TypeScript `strict`, Supabase CLI; clarificar 2 projetos Supabase (`logos-dev`/`logos-prod`)
- update: `SPEC_1.md` §13 — fluxo de dev formalizado (PR + GitHub Actions + branch protection + passos de migration)
- update: `SPEC_1.md` §17 — remover decisão "Supabase único vs separados" (resolvida = 2 projetos)
- update: `SPEC_1.md` §19 — versão 2.0 → 2.1
- add: `architecture.md` §10 — secção CI/CD (GitHub Actions + Vercel)
- add: `architecture.md` §11 — secção Privacidade e RGPD
- update: `architecture.md` §5 — nota sobre estado "rascunho" via etiqueta WIP (sem coluna nova)
- update: `architecture.md` §8 — tabela de ambientes inclui projeto Supabase + DNS para Resend + procedimento de migrations
- update: `architecture.md` §9 — remover decisão Supabase env (resolvida)
- update: `status.md` — concluído + tarefas de Setup expandidas (testes, CI, SPF/DKIM, 2 projetos Supabase)

---

## [28-04-2026] — Setup inicial

### docs
- add: `SPEC_1.md` v2.0 (especificação canónica)
- add: `CLAUDE.md` com objetivos, arquitetura, estilo e regras
- add: `architecture.md` com modelo de dados V3/V4
- add: `status.md` para milestones
- add: `feature-docs/` para documentação por feature
