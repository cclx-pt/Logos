-- V3.6 PR1 — Conversa ligada: thread de mensagens nas perguntas às aulas.
--
-- Contexto: a fatia V3.5 (lesson_questions, migrations 20260612220000/230000)
-- entregou uma caixa de entrada interna onde a equipa respondia FORA da app
-- (por email, Reply-To). Por decisão do líder (13-06-2026) puxa-se mais da V5:
--   1. O aluno responder à própria pergunta DENTRO da app (seguimentos).
--   2. A equipa responder DENTRO da app; a resposta vai por email ao aluno.
--   3. Pergunta + respostas + seguimentos ficam LIGADOS numa conversa, com um
--      código curto e estável partilhado nos emails (assunto + headers de thread).
-- A entrega da resposta continua a ser SÓ por email (não há captura de email de
-- entrada): o aluno lê e responde pela app (rota "as minhas perguntas", PR4).
-- SPEC bump a registar no PR de docs (move o bloco "thread + inbox do aluno" da
-- V5 para a V3).
--
-- Esta migration entrega só o schema do thread (sem UI):
--   - thread_code em lesson_questions (código de conversa, gerado na BD).
--   - tabela lesson_question_messages (a pergunta de abertura continua no
--     cabeçalho lesson_questions; esta tabela guarda o ida-e-volta a seguir).
--   - RLS: aluno passa a LER o seu próprio thread e a INSERIR seguimentos só no
--     seu; admin lê/insere em qualquer; super_admin apaga.
--   - trigger que sincroniza lesson_questions.status com a actividade da
--     conversa (mensagem de admin → answered; seguimento de aluno → new).
-- A submissão (cópia ao aluno, PR2), o composer de admin (PR3) e a vista do
-- aluno (PR4) vêm a seguir. Ship-able sozinha (CI verde).
--
-- Padrões herdados (CLAUDE.md §🚫 + RLS V3):
--   - FK para profiles.id (nunca auth.users).
--   - Policies via current_profile_id() / current_profile_role().
--   - Funções SECURITY DEFINER de trigger com EXECUTE revogado (mesmo padrão da
--     migration 20260530150000).
--
-- REGRA DURA: migrations V3 só em `logos-dev`. Nunca aplicadas a `logos-prod`
-- antes de 01-07-2026 (lançamento).

-- =============================================================================
-- 1. Código de conversa (thread_code) em lesson_questions
-- =============================================================================

-- Gerador de código curto, estável e legível: 'LOGOS-' + 6 chars de um alfabeto
-- sem ambíguos (sem I, L, O, 0, 1). ~31^6 ≈ 887M combinações — colisão
-- desprezável ao volume de uma Q&A de igreja; a UNIQUE abaixo é a rede de
-- segurança (a Server Action relê o código após o INSERT). NÃO é SECURITY
-- DEFINER (só gera texto), por isso o EXECUTE por defeito a authenticated, que a
-- avaliação do DEFAULT no INSERT precisa, mantém-se.
create function gen_thread_code() returns text
  language sql
  volatile
  set search_path = public
as $$
  select 'LOGOS-' || string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', (floor(random() * 31)::int + 1), 1),
    ''
  )
  from generate_series(1, 6);
$$;

comment on function gen_thread_code() is
  'Gera um código de conversa LOGOS-XXXXXX (alfabeto sem ambíguos). DEFAULT de lesson_questions.thread_code; usado nos emails para ligar pergunta/respostas/seguimentos.';

-- DEFAULT volátil: ao adicionar a coluna, é avaliado por linha existente
-- (preenche os threads já criados em dev). NOT NULL + UNIQUE garantem que cada
-- conversa tem um código próprio.
alter table lesson_questions
  add column thread_code text not null unique default gen_thread_code();

comment on column lesson_questions.thread_code is
  'Código de conversa estável (LOGOS-XXXXXX). Partilhado no assunto e nos headers de thread dos emails para ligar a pergunta às respostas e seguimentos. Alvo do link "ver conversa" enviado ao aluno.';

-- =============================================================================
-- 2. Tabela lesson_question_messages (o ida-e-volta após a pergunta de abertura)
-- =============================================================================

create table lesson_question_messages (
  id uuid primary key default gen_random_uuid(),
  -- Thread a que pertence. CASCADE: apagar a conversa apaga as mensagens.
  question_id uuid not null references lesson_questions(id) on delete cascade,
  -- Quem fala: 'student' (seguimento do aluno) ou 'admin' (resposta da equipa).
  -- Forçado no servidor + RLS (o cliente nunca escolhe livremente o papel).
  author_role text not null check (author_role in ('student', 'admin')),
  -- Autor. SET NULL (não CASCADE): a conversa sobrevive à remoção do perfil; o
  -- author_name abaixo preserva quem foi.
  author_profile_id uuid references profiles(id) on delete set null,
  -- Snapshot do nome (mesmo motivo de lesson_questions.author_name: a RLS de
  -- profiles só deixa super_admin ler perfis alheios). NÃO é email.
  author_name text check (author_name is null or length(author_name) between 1 and 200),
  -- Corpo. CHECK espelha validateMessageBody (defesa em profundidade).
  body text not null check (length(body) between 2 and 5000),
  created_at timestamptz not null default now()
);

comment on table lesson_question_messages is
  'Mensagens de uma conversa de pergunta (lesson_questions). A pergunta de abertura fica no cabeçalho; esta tabela guarda respostas da equipa (author_role=admin) e seguimentos do aluno (author_role=student). Aluno lê/insere só no seu thread; admin em qualquer. Email do autor NÃO vive aqui (auth.users).';

comment on column lesson_question_messages.author_role is
  'student = seguimento do aluno; admin = resposta da equipa. Forçado pela Server Action e pela RLS — o cliente não o escolhe livremente.';

create index lesson_question_messages_question_id_created_idx
  on lesson_question_messages (question_id, created_at);

-- =============================================================================
-- 3. RLS de lesson_question_messages
-- =============================================================================

alter table lesson_question_messages enable row level security;

-- SELECT: admin/super_admin (toda a inbox) OU o dono do thread (a sua conversa,
-- para a vista "as minhas perguntas"). O EXISTS lê lesson_questions sob a sua
-- RLS — a policy "own" abaixo deixa o dono ver a sua linha.
create policy "lqm_select_admin_or_owner"
  on lesson_question_messages
  for select
  using (
    current_profile_role() in ('admin', 'super_admin')
    or exists (
      select 1 from lesson_questions q
      where q.id = lesson_question_messages.question_id
        and q.profile_id = current_profile_id()
    )
  );

-- INSERT (aluno): seguimento no SEU thread. author_role tem de ser 'student' e o
-- autor tem de ser ele. Sem visibilidade do curso aqui de propósito: já tem o
-- thread (perguntou quando a aula era visível) — o seguimento não deve partir-se
-- se a aula for escondida depois.
create policy "lqm_insert_student_own_thread"
  on lesson_question_messages
  for insert
  with check (
    author_role = 'student'
    and author_profile_id = current_profile_id()
    and exists (
      select 1 from lesson_questions q
      where q.id = lesson_question_messages.question_id
        and q.profile_id = current_profile_id()
    )
  );

-- INSERT (equipa): resposta em qualquer thread. author_role 'admin' e o autor é
-- o próprio admin. Policies de INSERT são OR — aluno e admin têm caminhos
-- distintos, nenhum permite forjar o papel do outro.
create policy "lqm_insert_admin"
  on lesson_question_messages
  for insert
  with check (
    author_role = 'admin'
    and current_profile_role() in ('admin', 'super_admin')
    and author_profile_id = current_profile_id()
  );

-- Sem policy de UPDATE: mensagens são imutáveis (não se edita o que já foi
-- enviado por email). Revogar o grant default por clareza/defesa em profundidade.
revoke update on table lesson_question_messages from anon, authenticated;

-- DELETE: só super_admin (limpeza de spam), como em lesson_questions.
create policy "lqm_delete_super_admin"
  on lesson_question_messages
  for delete
  using (current_profile_role() = 'super_admin');

-- =============================================================================
-- 4. Aluno passa a ler o SEU próprio thread (cabeçalho)
-- =============================================================================
-- A migration 20260612220000 deixou o SELECT só a admin e antecipou esta policy
-- ("se uma vista 'as minhas perguntas' for entregue mais tarde, acrescenta-se
-- uma policy own"). É agora. Permissiva (OR com a de admin): o dono vê as suas
-- perguntas; o admin continua a ver todas.
create policy "lesson_questions_select_own"
  on lesson_questions
  for select
  using (profile_id = current_profile_id());

-- =============================================================================
-- 5. Sincronização de status com a actividade da conversa
-- =============================================================================
-- O status vive no cabeçalho mas é conduzido pela conversa:
--   - mensagem de admin  → 'answered' (respondida)
--   - seguimento de aluno → 'new' (volta a precisar da equipa)
-- Threads 'archived' (encerrados à mão) ficam — um seguimento não os ressuscita
-- automaticamente; reabrir é uma acção manual de admin.
--
-- SECURITY DEFINER de propósito: corre como dono (postgres), por isso ignora o
-- column-scoping de lesson_questions (authenticated só pode escrever `status`) e
-- a RLS — é assim que um seguimento de aluno, que NÃO tem grant de UPDATE no
-- cabeçalho, consegue na mesma fazer o status voltar a 'new'. O trigger
-- set_updated_at já existente trata do updated_at.
create function sync_question_status_from_message() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update lesson_questions
    set status = case when new.author_role = 'admin' then 'answered' else 'new' end
    where id = new.question_id
      and status <> 'archived';
  return new;
end;
$$;

comment on function sync_question_status_from_message() is
  'Trigger: sincroniza lesson_questions.status com a última mensagem (admin → answered, aluno → new). Não toca threads archived. SECURITY DEFINER para ignorar o column-scoping/RLS do cabeçalho.';

-- Trigger function (nunca chamada via RPC): fechar EXECUTE por completo, como em
-- 20260530150000. A execução do trigger não depende do EXECUTE do invocador.
revoke execute on function sync_question_status_from_message() from public, anon, authenticated;

create trigger lesson_question_messages_sync_status
  after insert on lesson_question_messages
  for each row execute function sync_question_status_from_message();
