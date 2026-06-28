-- V3.5 PR3 — snapshot do nome do autor em lesson_questions.
--
-- Porquê: a inbox de admin (/admin/perguntas) mostra "quem perguntou". A
-- policy SELECT de `profiles` é "próprio ou super_admin" (20260514022734), por
-- isso um `admin` normal NÃO consegue ler o display_name de outro utilizador
-- por JOIN - a inbox ficaria sem nomes para admins não-super.
--
-- Solução: snapshot do nome no momento do envio, igual aos snapshots de
-- título. Sobrevive a rename/delete do perfil e não depende de cross-profile
-- RLS. NÃO é email (o email continua só em auth.users - regra dura).
--
-- Nullable: linhas criadas antes desta migration (testes em dev) ficam a null;
-- a UI cai para um rótulo neutro. A Server Action passa a popular sempre.
--
-- REGRA DURA: só `logos-dev`. Nunca `logos-prod` antes de 01-07-2026.

alter table lesson_questions
  add column author_name text
    check (author_name is null or length(author_name) between 1 and 200);

comment on column lesson_questions.author_name is
  'Snapshot do display_name do aluno no momento do envio. Para a inbox de admin mostrar "quem perguntou" sem depender da RLS de profiles (só super_admin lê perfis de outros). Não é email.';
