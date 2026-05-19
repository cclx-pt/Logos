-- V3 PR2 — Schema base + storage (cursos, módulos, aulas, conclusões, log,
-- bucket de PDFs).
--
-- Objectivo:
--   Introduzir todo o modelo de dados de V3 num único passo, sem UI. As PRs
--   3-7 constroem a UI por cima deste schema; ship-able sozinha (CI verde,
--   sem impacto em V2 live). Em conformidade com SPEC_1.md §9 (V3) e
--   architecture.md §2 (modelo) / §5 (visibilidade) / §6 (conclusão).
--
-- Decisões fechadas (v3-plan.md §2, confirmadas com user em 19-05-2026):
--   - Tabelas em EN (courses/modules/lessons/...); UI em PT-PT.
--   - `required_tags uuid[]` apenas em `courses` (V3); módulos/aulas
--     ganham etiquetas em V4 (architecture.md §5).
--   - Conclusão binária (sem percentagens) — `lesson_completions` é o
--     facto, `course_completions` é o derivado registado *on-read* na PR7.
--   - PDF storage: bucket `lesson-pdfs` privado, URL assinada de 5 min na
--     Server Action de PR6. Aqui só schema/policies; geração de URL fica
--     para PR6 onde mora a lógica de acesso por curso.
--   - Hard delete (sem `deleted_at`); admin avisado em UI via AlertDialog
--     na PR3-PR4.
--   - `course_access_log` sem unique para permitir contar acessos repetidos
--     (PR8 fará count distinct on user_id).
--
-- Padrões herdados (CLAUDE.md §🚫 + V2 RLS):
--   - FKs apontam para profiles.id (nunca auth.users).
--   - Policies usam current_profile_id() / current_profile_role() /
--     current_profile_has_tag() — todos SECURITY DEFINER, sem recursão RLS.
--   - on delete restrict em FKs de autoria/criação (preserva auditoria);
--     on delete cascade em FKs de containment (course → modules → lessons).
--   - updated_at gerido por trigger comum.

-- =============================================================================
-- 1. Helper: trigger genérico para updated_at
-- =============================================================================

create or replace function set_updated_at() returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function set_updated_at() is
  'Trigger function: actualiza updated_at = now() em qualquer UPDATE. Anexado a courses, modules, lessons.';

-- =============================================================================
-- 2. courses
-- =============================================================================

create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 80),
  title text not null check (length(title) between 1 and 120),
  description text,
  icon text,
  required_tags uuid[] not null default '{}',
  published_at timestamptz,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table courses is
  'Cursos LOGOS. Visibilidade depende de published_at IS NOT NULL e da intersecção required_tags ↔ tags do utilizador (V3). Em V4 módulos/aulas ganham as suas próprias required_tags.';

comment on column courses.required_tags is
  'Array de UUIDs de tags. Vazio = curso público (visível a todos os autenticados). Não-vazio = visível apenas a quem tiver pelo menos uma das tags (intersecção). Avaliado pelo helper current_profile_has_tag().';

comment on column courses.published_at is
  'Nullable. Cursos com NULL são draft (invisíveis para users; visíveis para admin/super_admin). Set para now() ao publicar; voltar a NULL para despublicar.';

create index courses_published_at_idx on courses (published_at)
  where published_at is not null;

create trigger courses_set_updated_at
  before update on courses
  for each row execute function set_updated_at();

-- =============================================================================
-- 3. modules
-- =============================================================================

create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  position int not null check (position >= 0),
  title text not null check (length(title) between 1 and 120),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table modules is
  'Módulos de um curso. CASCADE em course_id porque um módulo não existe sem curso. position é inteiro >= 0; reordenar acontece via UPDATE na UI admin (PR4).';

create index modules_course_id_position_idx on modules (course_id, position);

create trigger modules_set_updated_at
  before update on modules
  for each row execute function set_updated_at();

-- =============================================================================
-- 4. lessons
-- =============================================================================

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  position int not null check (position >= 0),
  title text not null check (length(title) between 1 and 120),
  description text,
  template text not null check (template in ('pdf', 'video_pdf')),
  youtube_url text,
  pdf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Coerência template ↔ campos obrigatórios. Defesa em profundidade — a
  -- Server Action de PR4 também valida antes de inserir.
  constraint lessons_video_requires_youtube
    check (template <> 'video_pdf' or youtube_url is not null),
  constraint lessons_template_requires_pdf
    check (pdf_storage_path is not null)
);

comment on table lessons is
  'Aulas de um módulo. template controla que campos a UI mostra: pdf = só apostila, video_pdf = vídeo YouTube embebido + apostila descarregável. pdf_storage_path aponta para um objecto em storage:lesson-pdfs/.';

comment on column lessons.template is
  'Enum em texto (CHECK constraint, não enum nativo): pdf | video_pdf. Extensível em versões futuras sem migration breaking — V3 só usa estes dois.';

comment on column lessons.youtube_url is
  'URL pública YouTube (formato youtu.be/* ou youtube.com/watch?v=*). Server Action de PR4 valida o formato. Nullable porque template=pdf não usa.';

comment on column lessons.pdf_storage_path is
  'Caminho relativo dentro do bucket lesson-pdfs (ex.: <courseId>/<lessonId>.pdf). Não nullable — V3 exige apostila em todas as aulas.';

create index lessons_module_id_position_idx on lessons (module_id, position);

create trigger lessons_set_updated_at
  before update on lessons
  for each row execute function set_updated_at();

-- =============================================================================
-- 5. lesson_completions
-- =============================================================================

create table lesson_completions (
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

comment on table lesson_completions is
  'Marca uma aula como concluída por um utilizador. PK composta torna a conclusão idempotente (clicar duas vezes não duplica). CASCADE em ambos os FKs — se aula ou utilizador desaparecem, o registo perde sentido.';

create index lesson_completions_lesson_id_idx on lesson_completions (lesson_id);

-- =============================================================================
-- 6. course_completions
-- =============================================================================

create table course_completions (
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

comment on table course_completions is
  'Curso concluído por utilizador. Inserido on-read na PR7 quando todas as aulas visíveis estão em lesson_completions e ainda não há registo. Preserva data (SPEC_1.md §9 V3); reordenar/renomear aulas não afecta este registo.';

create index course_completions_course_id_idx on course_completions (course_id);

-- =============================================================================
-- 7. course_access_log
-- =============================================================================

create table course_access_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  accessed_at timestamptz not null default now()
);

comment on table course_access_log is
  'Audit log de acessos ao curso (clique em "Começar"/"Continuar" na PR6, escrita na PR8). Sem unique — múltiplos acessos pela mesma pessoa são esperados. PR8 calcula count(distinct user_id) para stats.';

create index course_access_log_course_id_idx on course_access_log (course_id);
create index course_access_log_accessed_at_idx on course_access_log (accessed_at desc);

-- =============================================================================
-- 8. RLS — helper de visibilidade de courses
-- =============================================================================

-- Helper unificado para "curso visível ao utilizador actual". Usado pelas
-- policies de courses, modules e lessons. STABLE + SECURITY DEFINER pelo
-- mesmo motivo dos outros helpers (V2 fixes anti-recursão).
--
-- Regra (SPEC_1.md §13.5 + architecture.md §5):
--   admin/super_admin vê tudo (incluindo drafts).
--   user autenticado vê apenas cursos published_at IS NOT NULL E
--     (required_tags vazio OR intersecção não-vazia com as suas tags).
--   anon NÃO vê nada (RLS bloqueia por defeito).
create or replace function course_is_visible(course_row courses) returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select
    current_profile_role() in ('admin', 'super_admin')
    or (
      course_row.published_at is not null
      and (
        cardinality(course_row.required_tags) = 0
        or current_profile_has_tag(course_row.required_tags)
      )
    )
$$;

comment on function course_is_visible(courses) is
  'Decide se o utilizador autenticado pode ver um curso. admin/super_admin: tudo. user: published_at not null E (sem required_tags OR overlap). Usado nas policies de courses/modules/lessons.';

-- =============================================================================
-- 9. RLS — courses
-- =============================================================================

alter table courses enable row level security;

create policy "courses_select_visible"
  on courses
  for select
  using (course_is_visible(courses));

create policy "courses_insert_admin"
  on courses
  for insert
  with check (current_profile_role() in ('admin', 'super_admin'));

create policy "courses_update_admin"
  on courses
  for update
  using (current_profile_role() in ('admin', 'super_admin'))
  with check (current_profile_role() in ('admin', 'super_admin'));

create policy "courses_delete_admin"
  on courses
  for delete
  using (current_profile_role() in ('admin', 'super_admin'));

-- =============================================================================
-- 10. RLS — modules
-- =============================================================================

alter table modules enable row level security;

-- SELECT: derivada do curso (subquery defendida por RLS de courses).
-- Importante: usar EXISTS em vez de IN para deixar o planner usar o índice.
create policy "modules_select_visible"
  on modules
  for select
  using (
    exists (
      select 1 from courses c
      where c.id = modules.course_id
        and course_is_visible(c)
    )
  );

create policy "modules_insert_admin"
  on modules
  for insert
  with check (current_profile_role() in ('admin', 'super_admin'));

create policy "modules_update_admin"
  on modules
  for update
  using (current_profile_role() in ('admin', 'super_admin'))
  with check (current_profile_role() in ('admin', 'super_admin'));

create policy "modules_delete_admin"
  on modules
  for delete
  using (current_profile_role() in ('admin', 'super_admin'));

-- =============================================================================
-- 11. RLS — lessons
-- =============================================================================

alter table lessons enable row level security;

create policy "lessons_select_visible"
  on lessons
  for select
  using (
    exists (
      select 1
      from modules m
      join courses c on c.id = m.course_id
      where m.id = lessons.module_id
        and course_is_visible(c)
    )
  );

create policy "lessons_insert_admin"
  on lessons
  for insert
  with check (current_profile_role() in ('admin', 'super_admin'));

create policy "lessons_update_admin"
  on lessons
  for update
  using (current_profile_role() in ('admin', 'super_admin'))
  with check (current_profile_role() in ('admin', 'super_admin'));

create policy "lessons_delete_admin"
  on lessons
  for delete
  using (current_profile_role() in ('admin', 'super_admin'));

-- =============================================================================
-- 12. RLS — lesson_completions
-- =============================================================================

alter table lesson_completions enable row level security;

-- SELECT: próprias ou admin/super_admin (admin precisa para stats e debug).
create policy "lesson_completions_select_own_or_admin"
  on lesson_completions
  for select
  using (
    user_id = current_profile_id()
    or current_profile_role() in ('admin', 'super_admin')
  );

-- INSERT: só o próprio user para si mesmo. Admin não marca aulas por outros
-- (decisão de UX: conclusão é acto pessoal).
create policy "lesson_completions_insert_self"
  on lesson_completions
  for insert
  with check (user_id = current_profile_id());

-- DELETE: só o próprio. Permite "desmarcar" se a UI vier a oferecer isso
-- (não exposto em V3, mas RLS deixa preparado).
create policy "lesson_completions_delete_self"
  on lesson_completions
  for delete
  using (user_id = current_profile_id());

-- =============================================================================
-- 13. RLS — course_completions
-- =============================================================================

alter table course_completions enable row level security;

create policy "course_completions_select_own_or_admin"
  on course_completions
  for select
  using (
    user_id = current_profile_id()
    or current_profile_role() in ('admin', 'super_admin')
  );

-- INSERT: utilizador para si mesmo (escrita feita pela Server Action de PR7
-- com a sessão do utilizador). Não-actualizável (curso concluído fica).
create policy "course_completions_insert_self"
  on course_completions
  for insert
  with check (user_id = current_profile_id());

-- Sem policy de UPDATE/DELETE — conclusões de curso são imutáveis para
-- preservar histórico (SPEC_1.md §9 V3: "ecrã Curso Concluído preserva
-- data"). Apagar só via SQL directo se necessário.

-- =============================================================================
-- 14. RLS — course_access_log
-- =============================================================================

alter table course_access_log enable row level security;

-- SELECT: só admin/super_admin (utilizador não tem necessidade de ver o
-- próprio log; é uma tabela de auditoria/stats).
create policy "course_access_log_select_admin"
  on course_access_log
  for select
  using (current_profile_role() in ('admin', 'super_admin'));

-- INSERT: utilizador para si mesmo (escrito pela Server Action de PR8
-- quando abre um curso).
create policy "course_access_log_insert_self"
  on course_access_log
  for insert
  with check (user_id = current_profile_id());

-- Sem UPDATE/DELETE — log é imutável.

-- =============================================================================
-- 15. Storage — bucket lesson-pdfs
-- =============================================================================

-- Bucket privado. `public = false` significa que objectos só são acessíveis
-- via URLs assinadas (geradas pela Server Action de PR6) ou directamente
-- por quem tiver SELECT em storage.objects (sob RLS).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-pdfs',
  'lesson-pdfs',
  false,
  20 * 1024 * 1024,  -- 20 MB por PDF; ajustar se ministério pedir aulas maiores
  array['application/pdf']
)
on conflict (id) do nothing;

-- Storage policies em storage.objects (a tabela onde os ficheiros vivem).
-- A política SELECT é "authenticated qualquer profile pode listar/ler
-- objectos deste bucket" — fronteira de segurança fina (saber se o user
-- pode descarregar este PDF específico) fica na Server Action de PR6, que
-- verifica `course_is_visible` antes de chamar `createSignedUrl`. Esta
-- divisão mantém RLS simples (sem joins para path) e protege via URL
-- assinada de curta duração.

create policy "lesson_pdfs_select_authenticated"
  on storage.objects
  for select
  using (
    bucket_id = 'lesson-pdfs'
    and current_profile_id() is not null
  );

create policy "lesson_pdfs_insert_admin"
  on storage.objects
  for insert
  with check (
    bucket_id = 'lesson-pdfs'
    and current_profile_role() in ('admin', 'super_admin')
  );

create policy "lesson_pdfs_update_admin"
  on storage.objects
  for update
  using (
    bucket_id = 'lesson-pdfs'
    and current_profile_role() in ('admin', 'super_admin')
  )
  with check (
    bucket_id = 'lesson-pdfs'
    and current_profile_role() in ('admin', 'super_admin')
  );

create policy "lesson_pdfs_delete_admin"
  on storage.objects
  for delete
  using (
    bucket_id = 'lesson-pdfs'
    and current_profile_role() in ('admin', 'super_admin')
  );
