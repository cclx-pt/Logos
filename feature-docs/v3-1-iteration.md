# V3.1 — Iteração de feedback (pós-V3 fechada)

> **Status:** planeada 20-05-2026, em execução. Toda a V3.1 vive em `v3-cursos`; nada mergea em `main` até ao lançamento (01-07-2026).

## Contexto

Depois da V3 estar fechada dev-side (PR1-PR8 + PR9a + iteração PR7+, 289/289 testes), o user (João) reviu o produto e listou 7 mudanças. Esta doc é o plano de execução.

## Decisões fechadas (20-05-2026)

| Tema | Decisão |
|---|---|
| Slug dos cursos | **Drop column `courses.slug`** + URLs públicas passam a `/conteudos/<uuid>`. Coerente com `tags` (já sem slug). Sem custo de redirects porque V3 ainda não está em prod. |
| Cor "Área admin" no header | **Verde sage** (token `sage-card` da paleta). Distintivo do laranja primário sem competir. |
| Feedback de save/cancel | **Toast (sonner)** — instalar `sonner@latest`, `<Toaster />` no root layout, `toast.success("Alterações guardadas")` em cada Server Action que muta. |
| Login-gate em "Começar curso" | CTA muda para **"Inicia sessão para começar"** + `signInWithGoogleAction` com `next=` para o curso. Mesma UX do hero "Meus cursos". |
| "Os meus cursos" — fonte | Reaproveitar **`course_access_log`** (DISTINCT por user_id, course_id). Evita migration nova; já é populada quando se clica "Começar curso" (PR8). |

## Tarefas

### T1 — Link "Área admin" no header (sage) para admins
- `src/components/site/header.tsx`: passar `user` para um novo `<AdminBadgeLink>` quando `user.role !== 'user'`.
- Cor: `bg-sage-card` (background) + `text-ink` (texto). Hover: borda laranja. Tamanho: pill com ícone `Shield`.
- `MobileNav`: também ganha o link no menu hambúrguer.
- **Mantém** o item "Área admin" no `UserMenu` dropdown (redundância OK — é a navegação principal para super_admin).
- Testes: 2 novos (header com user role=admin renderiza badge; role=user não renderiza).

### T2 — Drop `courses.slug` + URLs `/conteudos/<uuid>`
- **Migration** `20260520140000_drop_courses_slug.sql` aplicada a `logos-dev`. (Prod só no merge final 01-07-2026.)
- **Routes:** renomear `src/app/conteudos/[slug]/` → `src/app/conteudos/[courseId]/`. Lo mesmo para `[lessonId]` dentro.
- **Helpers:** `getCourseDetailBySlug` → `getCourseDetailById`. `getVisibleCoursesForUser` deixa de devolver `slug`.
- **Admin UI:** `CourseForm` perde o campo "Slug" (form: só title + description + icon + required_tags + publicado). `courses-actions.ts` perde `validateSlug` e o tratamento 23505 do slug. URLs admin (`/admin/conteudos/[courseId]`) já usam UUID — sem mudança.
- **Testes:** actualizar todos os mocks/expects que mencionem slug. Remover testes de validação de slug.

### T3 — Toasts em todas as acções (sonner)
- `pnpm add sonner` + `pnpm dlx shadcn@latest add sonner` (registra wrapper `<Sonner />` em `src/components/ui/sonner.tsx`).
- `<Toaster />` em `src/app/layout.tsx` (root) — `position="top-right"`, `richColors`.
- Convenção: cada Server Action que muta passa a devolver `{ ok: true, message: string }`. Client Components que disparam acção via `startTransition` apanham o retorno e chamam `toast.success(message)` ou `toast.error(...)`. Para `<form action={action}>` sem JS (server-renderizado), passamos a `useActionState` em wrapper Client + `useEffect` que dispara o toast.
- Aplicar a: `CourseForm`, `ModuleList` (edit/save/cancel/reorder/apagar), `LessonList`, `TagsTable`, `UserTagsCell`, role mutations em `/admin/utilizadores`, `markLessonCompleteAction`, `unmarkLessonCompleteAction`.
- Testes: 4-6 novos (toast aparece após acção bem-sucedida; erro mostra `toast.error`).

### T4 — Rota `/meus-cursos`
- `src/app/meus-cursos/page.tsx` (server component).
- Helper `getStartedCoursesForUser()` em `src/lib/courses/started.ts`:
  ```sql
  -- pseudocódigo
  select courses.* from courses
  inner join course_access_log on course_access_log.course_id = courses.id
  where course_access_log.user_id = current_profile_id()
  group by courses.id
  order by max(course_access_log.accessed_at) desc
  ```
- Cards iguais aos de `/conteudos` mas com:
  - Badge "Concluído ✓" se está em `course_completions`.
  - Badge "Em curso" caso contrário.
  - Link directo para a primeira aula incompleta (ou para o curso se já concluiu).
- Sem sessão: mostra mensagem "Inicia sessão para ver os teus cursos" + botão Google.
- Testes: 4-6 novos (cards de cursos começados, badge concluído, sem sessão mostra login).

### T5 — CTA "Meus cursos" do hero aponta para /meus-cursos
- `home-hero.tsx`: `ctaHref` muda de `/conteudos` para `/meus-cursos`.
- `UserMenu` dropdown "Os meus cursos" também muda para `/meus-cursos`.
- Testes: actualizar 1-2 que verificam o `ctaHref`.

### T6 — Indicadores em /conteudos (catálogo)
- Cards passam a mostrar:
  - **Concluído ✓** (sage badge) se está em `course_completions` do user.
  - **Começado** (laranja claro) se está em `course_access_log` mas não em `course_completions`.
  - Nada se nunca foi iniciado.
- Helper novo em `src/lib/courses/visibility.ts` (ou nova file): enriquecer `getVisibleCoursesForUser` com `{ started, completed }` flags.
- Sem sessão: nenhum badge (anónimos não têm progresso).
- Testes: 4 novos (anónimo sem badges, user com started, user com completed).

### T7 — Login-gate em "Começar curso" + proteger rota de aula
- `/conteudos/[courseId]/page.tsx`:
  - Se `isAuthenticated`: CTA mantém-se (form + Server Action + redirect).
  - Se NÃO: substituir por `<form action={signInWithGoogleAction}>` com `<input type="hidden" name="next" value={/conteudos/${id}/${firstLessonId}}>` e botão "Inicia sessão para começar →".
- `/conteudos/[courseId]/[lessonId]/page.tsx`: 
  - No top, `getCurrentUser()`. Se null → `redirect(/?next=/conteudos/${id}/${lessonId})` (ou similar). Anonimos nunca vêem aulas.
- Testes: 4 novos (CTA anónimo vs autenticado; rota de aula faz redirect para anónimo).

## Ordem de execução

1. **T1** ✅ (20-05-2026, commit `18dd82b`) — header admin sage.
2. **T3** ✅ (20-05-2026, commit `4e99d44`) — toasts sonner.
3. **T2** ✅ (21-05-2026, commit `83a3d06`) — drop slug + URLs UUID.
4. **T7** ✅ (26-05-2026) — login-gate em "Começar curso" + redirect anónimo na rota de aula. `StartCourseCta` extraído; 5 testes novos (296 → 301). Detalhes no `changelog.md` `[26-05-2026]`.
5. **T4** ✅ (26-05-2026) — rota `/meus-cursos`: helper `getStartedCoursesForUser` + `MeusCursosContent` com 3 estados (anónimo / vazio / com cursos) + migration `20260526180000_course_access_log_select_own.sql` (pending push a `logos-dev`). 15 testes novos (301 → 316).
6. **T5** ✅ (26-05-2026) — `<HomeHero ctaHref>` e dropdown "Os meus cursos" apontam agora a `/meus-cursos`. Sem testes novos (contrato do HomeHero já era coberto; 5 occurrences em `page.test.tsx` actualizadas).
7. **T6** ✅ (26-05-2026) — badges "Em curso" / "Concluído ✓" nos cards de `/conteudos`. Novo helper `getCourseProgressForUser` (separado de `getStartedCoursesForUser` para evitar acoplamento). 11 testes novos (316 → 327).

**V3.1 fechada do lado do código.** Restantes pré-merge (executável fora desta task): aplicar migration `20260526180000` a `logos-dev` (pede `pnpm dlx supabase login`); smoke test manual no preview Vercel; quando testemunhos do ministério chegarem, abrir PR `v3-cursos → main`.

Cada tarefa termina com `pnpm test + lint + typecheck + format:check` verdes e commit separado.

## Não-âmbito

- **Optimistic UI em "Marcar concluída"** já existe (PR7) — não vamos tocar.
- **Stats admin** já existem (PR8) — não tocar.
- **Vercel Analytics** já está activo (PR9a) — não tocar.
- **Push para `origin/v3-cursos`** só depois de o user validar localmente.
