-- V3.6 PR5 — Conversa: dois estados + marca de "nao lido" do aluno.
--
-- Contexto: a V3.5/V3.6 (migrations 20260612220000 -> 20260613120000) modelou a
-- triagem com tres estados (new -> answered -> archived). Decisao do lider
-- (14-06-2026): a Q&A passa a ser uma conversa de dois estados:
--   - 'new'      = Por responder (pergunta nova OU reaberta por resposta do aluno)
--   - 'answered' = Respondida (a equipa respondeu)
-- 'archived' deixa de existir: uma conversa respondida fica sempre acessivel e
-- QUALQUER resposta do aluno reabre-a (volta a 'new'). Spam continua a ser
-- removido por DELETE (super_admin), nao por um estado terminal.
--
-- Esta migration:
--   1. Converte conversas 'archived' existentes em 'answered' (ficam acessiveis).
--   2. Aperta o CHECK de status para ('new','answered').
--   3. Reescreve sync_question_status_from_message() sem a guarda 'archived'
--      (agora qualquer resposta do aluno reabre a conversa).
--   4. Acrescenta owner_seen_at: quando o aluno abriu a conversa pela ultima vez.
--      Alimenta o "highlight de nao lido" na vista do aluno (answered +
--      updated_at > owner_seen_at).
--
-- REGRA DURA: migrations V3 so em `logos-dev`. Nunca aplicadas a `logos-prod`
-- antes de 01-07-2026 (lancamento).

-- =============================================================================
-- 1. Migrar dados: 'archived' -> 'answered' (antes de apertar o CHECK)
-- =============================================================================
-- Uma conversa arquivada era uma conversa fechada/resolvida: 'answered' preserva
-- esse sentido e mantem-na acessivel. O trigger set_updated_at vai tocar
-- updated_at; sem impacto pratico (sao conversas sem actividade nova por ler).
update lesson_questions set status = 'answered' where status = 'archived';

-- =============================================================================
-- 2. CHECK de status: dois estados
-- =============================================================================
-- O CHECK inline da 20260612220000 chama-se lesson_questions_status_check
-- (nome auto-gerado <tabela>_<coluna>_check).
alter table lesson_questions drop constraint lesson_questions_status_check;
alter table lesson_questions
  add constraint lesson_questions_status_check check (status in ('new', 'answered'));

comment on column lesson_questions.status is
  'Estado da conversa: new (Por responder - pergunta nova ou reaberta por resposta do aluno) -> answered (Respondida pela equipa). Unico campo alteravel por UPDATE (column-scoped). Qualquer resposta do aluno repoe new.';

-- =============================================================================
-- 3. Sincronizacao de status: qualquer resposta do aluno reabre
-- =============================================================================
-- Igual a versao anterior, sem a guarda `status <> 'archived'` (esse estado
-- deixou de existir): mensagem de admin -> answered; seguimento de aluno -> new.
create or replace function sync_question_status_from_message() returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update lesson_questions
    set status = case when new.author_role = 'admin' then 'answered' else 'new' end
    where id = new.question_id;
  return new;
end;
$$;

comment on function sync_question_status_from_message() is
  'Trigger: sincroniza lesson_questions.status com a ultima mensagem (admin -> answered, aluno -> new). Qualquer resposta do aluno reabre a conversa. SECURITY DEFINER para ignorar o column-scoping/RLS do cabecalho.';

-- CREATE OR REPLACE preserva privilegios; re-revogar EXECUTE por clareza/defesa
-- em profundidade (trigger nunca chamado via RPC), como em 20260530150000.
revoke execute on function sync_question_status_from_message() from public, anon, authenticated;

-- =============================================================================
-- 4. owner_seen_at: marca de "nao lido" do aluno
-- =============================================================================
-- Quando o aluno abriu a conversa pela ultima vez. NULL = nunca aberta. A vista
-- do aluno marca como nao lida uma conversa 'answered' com updated_at >
-- owner_seen_at (ou owner_seen_at NULL). Escrito pela RPC mark_thread_seen
-- (seccao 5) quando o aluno abre /perguntas/CODE.
alter table lesson_questions add column owner_seen_at timestamptz;

comment on column lesson_questions.owner_seen_at is
  'Quando o dono (aluno) abriu a conversa pela ultima vez. NULL = nunca. Alimenta o highlight de "nao lido" (answered + updated_at > owner_seen_at). Escrito pela RPC mark_thread_seen na abertura da conversa pelo aluno.';

-- =============================================================================
-- 5. RPC mark_thread_seen: marca a conversa do proprio como vista
-- =============================================================================
-- O aluno nao tem grant de UPDATE em owner_seen_at (o column-scoping so da
-- `status` ao admin). Esta RPC SECURITY DEFINER escreve owner_seen_at = now()
-- e restringe-se ao dono via current_profile_id() (um codigo alheio nao toca
-- linhas). Importante: usa now() do lado da BD - o trigger set_updated_at poe
-- updated_at = now() no MESMO statement, por isso owner_seen_at == updated_at
-- exactamente e o "nao lido" (updated_at > owner_seen_at) fica falso ate haver
-- uma resposta nova da equipa (transacao posterior, now() maior).
create function mark_thread_seen(p_thread_code text) returns void
  language sql
  security definer
  set search_path = public
as $$
  update lesson_questions
    set owner_seen_at = now()
    where thread_code = p_thread_code
      and profile_id = current_profile_id();
$$;

comment on function mark_thread_seen(text) is
  'Marca a conversa do proprio (thread_code) como vista agora (owner_seen_at = now()). SECURITY DEFINER para escrever fora do column-scoping; restringe ao dono via current_profile_id(). Chamada quando o aluno abre /perguntas/CODE.';

-- So utilizadores com sessao chamam isto (self-scoped ao dono). Tirar o EXECUTE
-- por defeito a anon; manter a authenticated.
revoke execute on function mark_thread_seen(text) from public, anon;
grant execute on function mark_thread_seen(text) to authenticated;
