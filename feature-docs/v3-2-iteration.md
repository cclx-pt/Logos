# V3.2 — Iteração de UI/UX e prerequisitos

> **Status:** planeada 27-05-2026, em execução. Toda a V3.2 vive em `v3-cursos`; nada mergea em `main` até ao lançamento (01-07-2026).

## Contexto

V3.1 fechada em 26-05-2026 (T1-T7, 327/327 testes). Esta iteração adiciona uma camada de polimento visual (banner por curso) e o sistema de pré-requisitos em três níveis (curso/módulo/aula), além de pequenas afinações de navegação.

## Decisões fechadas (27-05-2026)

| Tema | Decisão |
|---|---|
| Banner por curso | **Opcional, com icon Lucide como fallback**. Icon continua obrigatório. Não substitui; coexistem só visualmente: se banner existir, é o que aparece; senão, mostra-se o icon. |
| Storage do banner | **Bucket privado `course-banners`**, signed URL gerada server-side. Coerente com `lesson-pdfs`. Banners não são marketing aberto — a visibilidade do curso (RLS + tags + futuro prerequisite) é que manda. |
| Path do banner | `<courseId>/banner` (sem extensão; MIME via Content-Type header). Security-sensitive: a RLS por path depende deste formato. |
| TTL do signed URL | **30 min** (vs 5 min do PDF), porque banners aparecem em listagens — worth caching mais tempo. RLS por path mantém o controlo na próxima rotação. |
| Validação same-course em prerequisites | **Server Action + select filtrado** (PR2/3/4), sem trigger DB. |
| UX de pré-requisitos | **Modelo misto**: cursos com prerequisite ⇒ **invisíveis** até cumprir (regra das tags); aulas/módulos com prerequisite ⇒ **visíveis mas locked** (cadeado + tooltip "Disponível depois de X"). Quebra a regra actual `CLAUDE.md §🚫 "conteúdo restrito é invisível"` para aulas/módulos — documentar no PR2. |
| Sequencialidade | **Opt-in por entidade** (cada aula/módulo/curso tem `prerequisite_<entity>_id` nullable). Mais flexível que "sempre sequencial dentro do pai". |

## Plano de PRs

### PR1 — Banner opcional em cursos ⏳ (27-05-2026)

**Migration:** `20260527000000_courses_banner_and_storage.sql`

- Coluna `courses.banner_storage_path text` (nullable).
- Bucket privado `course-banners` (5 MB, JPEG/PNG/WebP).
- Policy SELECT `course_banners_select_visible`: `split_part(name, '/', 1)` → `courseId` → `course_is_visible(courses)`.
- Policies INSERT/UPDATE/DELETE: admin/super_admin.

**Código:**

- `src/lib/courses/banner.ts` — `getBannerUrlsByPath(paths)` batched + `getBannerUrlForPath(path)` single (TTL 30 min). Falha graciosa.
- `src/lib/courses/course-image.tsx` — `<CourseImage variant="card"|"hero">` com banner `next/image unoptimized` ou icon fallback (test ids `course-image-banner` / `course-image-icon`).
- `src/lib/courses/visibility.ts`, `started.ts`, `detail.ts` — `bannerUrl` em todos os tipos; selects incluem `banner_storage_path`; batch sign nas listagens, single sign na landing.
- `src/app/admin/conteudos/course-form.tsx` — `multipart/form-data`, fieldset "Banner (opcional)" com preview + checkbox "Remover" + file input.
- `src/app/admin/conteudos/courses-actions.ts` — create/update aceitam ficheiro `banner` (validação MIME + 5 MB); update aceita `remove_banner=on` (nova upload tem prioridade); delete faz cleanup best-effort do ficheiro.
- `src/app/admin/conteudos/[courseId]/page.tsx` — sign individual + passa `bannerUrl` ao form.
- Listagens `/conteudos`, `/meus-cursos` e landing `/conteudos/[courseId]` — `<CourseImage>` em cima dos cards / hero.
- Skeletons `loading.tsx` — aspect-video no topo dos cards e do hero.

**Testes:** 18 novos (331 → 349). `course-image.test.tsx` (5), `banner.test.ts` (7), `courses-actions.test.ts` (6 casos de banner: ausente / válido / MIME errado / >5MB / remove_banner / nova-upload-tem-prioridade).

**Falta para fechar:**
- [ ] Aplicar migration a `logos-dev` (`supabase db push --linked`).
- [ ] Smoke manual local: criar curso com banner, editar substituindo, editar removendo, ver no /conteudos.
- [ ] Push para preview Vercel + confirmar com user antes do `git push`.

### PR2 — Pré-requisito por aula (visível + cadeado)

**Migration:** `+prerequisite_lesson_id uuid REFERENCES lessons(id)` em `lessons` (nullable).

- Helper `getLockedLessonIds(courseId, completedLessonIds)`: dado o set de aulas concluídas, devolve o set de aulas com `prerequisite_lesson_id NOT IN (completed)`.
- `LessonForm` ganha select de aula-prerequisito (filtrado ao mesmo curso, exclui a própria aula; validação server-side em `lessons-actions.ts`).
- `/conteudos/[courseId]` — aulas locked renderizam com cadeado Lucide + tooltip "Disponível depois de '<X>'". Cliques não navegam.
- `/conteudos/[courseId]/[lessonId]` — server redirect a `/conteudos/[courseId]` se a aula está locked.
- **Doc:** `CLAUDE.md §🚫` ganha excepção da regra "conteúdo restrito é invisível" para aulas/módulos (cursos continuam invisíveis).

### PR3 — Pré-requisito por módulo (visível + cadeado)

**Migration:** `+prerequisite_module_id uuid REFERENCES modules(id)` em `modules` (nullable).

- Helper `getLockedModuleIds(courseId, completedLessonIds)`. Um módulo locked tem todas as suas aulas implicitamente locked.
- `ModuleForm` ganha select de módulo-prerequisito (filtrado ao mesmo curso, exclui o próprio).
- `/conteudos/[courseId]` — módulos locked não abrem (`<details>` sem open + cadeado).

### PR4 — Pré-requisito por curso (invisível)

**Migration:** `+prerequisite_course_id uuid REFERENCES courses(id)` em `courses` (nullable) + update do helper RLS `course_is_visible(courses)`.

- A policy passa a exigir `prerequisite_course_id IS NULL OR EXISTS (SELECT 1 FROM course_completions WHERE user_id = current_profile_id() AND course_id = prerequisite_course_id)`.
- `CourseForm` ganha select de curso-prerequisito (exclui o próprio).
- **Prevenir ciclos** no validador da Server Action (DFS no DB ou check de profundidade ≤ 5).

### PR5 — "Meus cursos" no nav + duas secções + catálogo limpo ✅ (28-05-2026)

**Decidido:** item sempre visível (anónimos caem no CTA de login já existente). Bumped ahead dos PRs 2-4 por ser puramente UI e desbloquear validação no preview.

- `src/lib/site-config.ts` — `{ href: '/meus-cursos', label: 'Meus cursos' }` entre "Conteúdos" e "Fala Connosco". `NavLinks` / `MobileNav` herdam automaticamente.
- `/meus-cursos` passa a duas secções: **"Em progresso"** (não-completed) e **"Terminados"** (completed). Cards terminados ganham `opacity-60` (hover restaura). Quando o user só tem terminados, a secção "Em progresso" mostra mensagem + link para `/conteudos`.
- **Catálogo `/conteudos` limpo** — cards já não exibem badges "Começado"/"Concluído"; estado pessoal vive exclusivamente em `/meus-cursos`. Mantém-se "Em breve" para `hasLessons=false`. `page.tsx` deixa de chamar `getCourseProgressForUser`; helper `progress.ts` (+ test) removido por ficar órfão.
- Testes: 5 novos em `meus-cursos-content.test.tsx` (secções, mensagem com link, opacity); `conteudos/page.test.tsx` bloco "badges de progresso" reduzido a asserção negativa + "Em breve" preservado.

## Notas para futuras sessões

- O bucket `course-banners` **não existe em `logos-dev` até a migration `20260527000000` ser aplicada**. Upload sem migration → 404 do bucket.
- A RLS por path **só funciona com paths no formato `<uuid>/...`** (`split_part(name, '/', 1)`).
- `<CourseImage>` usa `Image unoptimized` — banners servem-se directos do Supabase Storage CDN sem passar pelo optimizer do Next. Admins devem usar imagens já comprimidas (recomendar JPEG/WebP ≤ 500 KB; limite hard 5 MB).
- Optimização futura possível: `unstable_cache` por path com TTL 25 min (signing fresco a cada request actualmente).

## Cleanup paralelo

- Migration `20260521000000_lesson_pdfs_storage_rls_by_path.sql` (hardening RLS Storage de `lesson-pdfs`) ficou bundled no commit WIP do PR1 desta iteração. Se preferir histórico mais limpo, separar em commit standalone (`feat(security): RLS by path em storage.objects para lesson-pdfs`).
