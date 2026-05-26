# V3.2 — Handoff de sessão (27-05-2026)

> **Estado:** PR1 (banner) ~70 % implementado, WIP commitado mas **não pushed**, **migrations não aplicadas a `logos-dev`**, **testes não corridos**, **typecheck não corrido**.
>
> **Sessão interrompida** por limite de tokens com a tarefa #1 (`V3.2 PR1`) ainda em `in_progress`. Este ficheiro existe para a próxima sessão pegar do mesmo ponto sem perder contexto.

## Decisões fechadas nesta sessão

1. **Banner por curso** — opcional, com **icon Lucide como fallback** (icon continua obrigatório). Não substitui o icon; coexistem só visualmente: se banner existir, é o que aparece; senão, mostra-se o icon.
2. **Storage** — bucket privado (`course-banners`), signed URL gerada server-side. Coerente com `lesson-pdfs`. **Não público.** Banners não são marketing aberto — visibilidade do curso (RLS + tags + futuro prerequisite) é que manda.
3. **Validação same-course** em pré-requisitos de aulas/módulos — **só Server Action + select filtrado**, sem trigger DB.
4. **UX de pré-requisitos** — modelo misto:
   - **Cursos** com prerequisite_course_id ⇒ **invisíveis** até o prerequisito ser cumprido (regra das tags via RLS).
   - **Aulas/módulos** com prerequisito ⇒ **visíveis mas locked** (cadeado + tooltip "Disponível depois de X").
   - Esta exceção quebra a regra actual do `CLAUDE.md` §🚫 ("conteúdo restrito é invisível"). Tem de ser documentada em PR2.
5. **Sequencialidade** — **opt-in por entidade** (cada aula/módulo/curso tem `prerequisite_<entity>_id` nullable). Mais flexível que "sempre sequencial dentro do pai".
6. **Path convention banner** — `<courseId>/banner` (sem extensão; MIME via Content-Type header).
7. **Signed URL TTL banner** — 30 min (vs 5 min do PDF), porque banners aparecem em listagens (worth caching mais tempo).

## O que está implementado em WIP nesta sessão

### Ficheiros novos (untracked → vão entrar no commit WIP)

| Caminho | Função |
|---|---|
| `supabase/migrations/20260527000000_courses_banner_and_storage.sql` | Coluna `banner_storage_path` em `courses` + bucket `course-banners` + storage policies (RLS by path: SELECT via `course_is_visible`, escrita admin-only) |
| `src/lib/courses/banner.ts` | `getBannerUrlsByPath(paths)` batched + `getBannerUrlForPath(path)` para single course. Falha graciosa → Map vazio |
| `src/lib/courses/course-image.tsx` | Componente `<CourseImage>` com `variant="card" \| "hero"`. Renderiza `<Image unoptimized>` se `bannerUrl`, senão `<CourseIcon>` em caixa estilizada |

### Ficheiros modificados

| Caminho | Mudança |
|---|---|
| `src/app/admin/conteudos/courses-actions.ts` | `createCourseAction` e `updateCourseAction` aceitam ficheiro `banner` (FormData). Helper interno `uploadCourseBanner` (5 MB, JPEG/PNG/WebP). `updateCourseAction` aceita checkbox `remove_banner`. `deleteCourseAction` faz cleanup do ficheiro no Storage (best-effort) |
| `src/app/admin/conteudos/course-form.tsx` | Form passa a `encType="multipart/form-data"`. Fieldset novo "Banner (opcional)" com preview se existir + checkbox "Remover" + file input. `CourseFormInitialData` agora exige `bannerUrl: string \| null` |
| `src/app/admin/conteudos/[courseId]/page.tsx` | Pull `banner_storage_path` do `courses`. Gera signed URL via `getBannerUrlForPath`. Constrói `courseFormData` separado com `bannerUrl` para passar ao CourseForm. Tipo `CourseRow` novo (separado do form data) |
| `src/lib/courses/visibility.ts` | `VisibleCourse` ganha `bannerUrl: string \| null`. Select inclui `banner_storage_path`. Batch sign via `getBannerUrlsByPath` |
| `src/lib/courses/started.ts` | Mesma adaptação: select com `banner_storage_path`, batch sign, mapping para `bannerUrl` |
| `src/lib/courses/detail.ts` | `CourseDetail` ganha `bannerUrl`. Select inclui `banner_storage_path`. Sign individual via `getBannerUrlForPath` |
| `src/app/conteudos/conteudos-content.tsx` | Cards trocam `<div>` com `<CourseIcon>` por `<CourseImage variant="card">` |
| `src/app/meus-cursos/meus-cursos-content.tsx` | Idem |
| `src/app/conteudos/[courseId]/page.tsx` | **Só** import de `CourseImage` foi adicionado. **Hero ainda usa o velho `CourseIcon`** (linha ~85) — **TODO neste ficheiro: trocar o `<div>` do icon pela versão `<CourseImage variant="hero">` no topo, acima do header** |

### Ficheiros do WIP anterior (não desta sessão, ficam no mesmo commit)

| Caminho | Origem |
|---|---|
| `supabase/migrations/20260521000000_lesson_pdfs_storage_rls_by_path.sql` | Hardening de RLS do `lesson-pdfs` por path (sessão anterior, confirmado legítimo). `architecture.md` § 7 já o descreve como aplicado, mas **não está confirmado em `logos-dev`** — verificar |
| `architecture.md` | Tabela de migrations actualizada para incluir as duas novas (`20260520140000` drop courses.slug + `20260521000000` lesson-pdfs RLS). Falta acrescentar a linha de `20260527000000` (banner) |
| `src/lib/courses/access-actions.ts` | Comentário do `getLessonPdfSignedUrlAction` actualizado para reflectir que a fronteira agora é dupla (RLS de lessons + RLS de storage por path) |

## O que está em falta para PR1 fechar

### Código

- [ ] **Hero banner em `/conteudos/[courseId]/page.tsx`** — só foi feito o import. Trocar o bloco do header que tem `<div>...<CourseIcon slug={course.icon}.../></div>` por algo como:
  ```tsx
  <CourseImage bannerUrl={course.bannerUrl} iconSlug={course.icon} alt={course.title} variant="hero" className="mb-6" />
  <header className="flex flex-col items-start gap-6">
    <div className="min-w-0 flex-1">
      <h1 ...>{course.title}</h1>
      ...
    </div>
  </header>
  ```
  Tirar o ícone "duplicado" no header — agora o banner/icon vive em cima como hero.
- [ ] **Listagem admin `/admin/conteudos/page.tsx`** — opcional: adicionar thumbnail na coluna esquerda da tabela (ou deixar como está; banners aparecem na página do curso individual). Decisão de UX para confirmar.
- [ ] **`/conteudos/[courseId]/loading.tsx`** — skeleton precisa de espaço para o banner (16:9 em cima). Verificar e ajustar.
- [ ] **`/conteudos/loading.tsx` e `/meus-cursos/loading.tsx`** — cards ganharam zona aspect-video em cima. Skeletons devem reflectir.

### TypeScript / runtime

- [ ] **Tipo `CourseFormInitialData` agora exige `bannerUrl`** — qualquer teste/fixture que construa este tipo vai partir. Procurar callers além de `[courseId]/page.tsx`:
  ```
  grep -r "CourseFormInitialData" src/
  ```
  e adicionar `bannerUrl: null` aos fixtures.
- [ ] **Testes de `visibility.test.ts` e `conteudos/page.test.tsx`** — mocks Supabase agora têm que devolver `banner_storage_path` no select e o spy de `createSignedUrls` tem de retornar dados ou `{data: null, error: null}`. Vai partir.
- [ ] **Testes de `started.test.ts`** — mesma coisa.
- [ ] **`detail.test.ts` / page de curso** — mesma coisa.

### Testes novos

- [ ] `courses-actions.test.ts` — adicionar casos:
  - banner ausente (continua a funcionar)
  - banner válido (JPEG ≤ 5 MB) → path correcto guardado
  - banner com MIME errado → erro
  - banner > 5 MB → erro
  - update com `remove_banner=on` → `banner_storage_path` vira null + storage remove chamado
- [ ] `course-image.test.tsx` — banner presente renderiza `data-testid="course-image-banner"`; null renderiza `data-testid="course-image-icon"`.
- [ ] `banner.test.ts` — opcional: `getBannerUrlsByPath([])` retorna Map vazio; erro do signing → Map vazio (não throw).

### DB

- [ ] **Aplicar migrations a `logos-dev`**. Há **2 migrations locais** que podem não estar em `logos-dev`:
  - `20260521000000_lesson_pdfs_storage_rls_by_path.sql` — status incerto (architecture.md diz aplicada, mas não confirmado nesta sessão; ver memory `logos-dev-pending-migrations`).
  - `20260527000000_courses_banner_and_storage.sql` — definitivamente não aplicada.

  Comando: `pnpm dlx supabase db push --linked`. Verificar primeiro `supabase migration list` para perceber o gap antes de fazer push.

### Doc

- [ ] **`CLAUDE.md` §🚫** — adicionar excepção da regra "conteúdo restrito é invisível": pré-requisitos de **aulas/módulos** mostram cadeado (visível mas locked). **Cursos** continuam invisíveis. PR2 introduz a primeira instância — bom ponto para fazer a edit.
- [ ] **`architecture.md`** — acrescentar linha na tabela de migrations:
  ```
  | Banner opcional em cursos + bucket `course-banners` | `20260527000000` | ⏳ aplicada em `logos-dev`; pendente em `logos-prod` |
  ```
  Actualizar §7 (Storage) para incluir o novo bucket.
- [ ] **`status.md`** — entrada nova para "V3.2 PR1 — Banner opcional em cursos".
- [ ] **`changelog.md`** — entrada datada `[27-05-2026]`.
- [ ] **`feature-docs/v3-2-iteration.md`** (criar quando esta sessão fechar) — plano consolidado de PR1-PR5 com decisões + estado.

### Validação final

- [ ] `pnpm test` — assumir muitas regressões nos mocks Supabase. Reparar.
- [ ] `pnpm lint --max-warnings 0`
- [ ] `pnpm typecheck`
- [ ] `pnpm format:check` (lembrar que CI exige os **4** checks — ver memory `ci-full-suite-before-milestone`).
- [ ] Smoke manual local: criar curso novo com banner, editar substituindo banner, editar removendo banner, ver no /conteudos.
- [ ] Push para `v3-cursos` + smoke no preview Vercel. **Pedir confirmação ao user antes de `git push`** (memory `testing-preview-vercel`).

## Plano consolidado V3.2 (5 PRs)

| # | PR | Migration | Estado | Próximos passos |
|---|---|---|---|---|
| 1 | Banner opcional em cursos | `20260527000000` ✅ escrita | **WIP ~70 %** | Acabar items acima, testes, commit/push |
| 2 | Pré-requisito por **aula** (locked + cadeado) | `+prerequisite_lesson_id` em `lessons` | ⏳ pendente | Helper `getLockedLessonIds`, select no LessonForm, redirect em `/conteudos/[id]/[lessonId]`, doc CLAUDE.md |
| 3 | Pré-requisito por **módulo** (locked) | `+prerequisite_module_id` em `modules` | ⏳ pendente | Helper `getLockedModuleIds`, select no ModuleForm |
| 4 | Pré-requisito por **curso** (invisível) | `+prerequisite_course_id` em `courses` + update `course_is_visible(courses)` | ⏳ pendente | Update RLS helper para incluir prerequisite check; select no CourseForm; **prevenir ciclos** no validador |
| 5 | "Meus cursos" na nav principal | — | ⏳ pendente | Acrescentar item a `navItems`; talvez só visível se `getCurrentUser()` retornar profile |

**Cleanup paralelo:** task #6 — commit standalone do hardening RLS de `lesson-pdfs` (migration `20260521000000` + diff de `architecture.md` + `access-actions.ts`). Foi decidido bundle no commit WIP desta sessão, mas pode-se separar depois se preferirem histórico mais limpo.

## Como começar a próxima sessão

1. Ler este ficheiro.
2. `git log -3 v3-cursos` para ver onde paraste.
3. Verificar tasks pendentes: tarefa #1 ainda em `in_progress`; #2-5 pending; #6 pending.
4. Decidir: continuar PR1 (fechar) ou saltar para PR2 e voltar a PR1 depois. Recomendação: **fechar PR1 primeiro** — o estado actual deixa o catálogo possivelmente partido em testes/typecheck até o hero estar feito e os fixtures actualizados.
5. Primeira acção concreta: correr `pnpm test --run` no Logos/ para ver o panorama de regressões e atacar uma a uma.

## Notas para o futuro João/Ricardo

- O bucket `course-banners` **ainda não existe em `logos-dev`** até a migration ser aplicada. Tentar fazer upload sem aplicar a migration vai dar 404 do bucket.
- A regra de `course-banners` RLS por path **só funciona com paths no formato `<uuid>/...`** (`split_part(name, '/', 1)`). Não inventar outros formatos.
- `<CourseImage>` usa `Image unoptimized` — banners servem-se directos do Supabase Storage CDN sem passar pelo optimizer do Next. Admins devem usar imagens já comprimidas (recomendar JPEG/WebP ≤ 500 KB). Limite hard 5 MB.
- O TTL de 30 min de signed URLs significa que renderizações server-side dentro dessa janela podem reusar a URL — mas cada `createSignedUrl` gera token novo, por isso na prática cada request faz signing fresco. Optimização futura possível: `unstable_cache` por path com TTL 25 min.
