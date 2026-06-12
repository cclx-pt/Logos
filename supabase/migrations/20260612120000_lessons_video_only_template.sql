-- V3.4 PR1 — modelo de aula "video" (só vídeo, sem apostila).
--
-- Antes: template in ('pdf','video_pdf') e PDF SEMPRE obrigatório.
-- Agora: três modelos —
--   pdf       = só apostila (PDF)
--   video     = só vídeo do YouTube embebido (sem apostila)
--   video_pdf = vídeo + apostila
--
-- Todas as mudanças são RELAXAMENTOS dos CHECK existentes: as linhas
-- actuais (todas com pdf_storage_path not null) continuam válidas, sem
-- backfill.
--
-- REGRA DURA: migrations V3 só em `logos-dev`. Nunca aplicadas a
-- `logos-prod` antes de 01-07-2026 (lançamento).

-- 1) template aceita o novo valor 'video'.
alter table lessons drop constraint if exists lessons_template_check;
alter table lessons
  add constraint lessons_template_check
  check (template in ('pdf', 'video', 'video_pdf'));

-- 2) Vídeo (video ou video_pdf) exige youtube_url. Só 'pdf' o dispensa.
alter table lessons drop constraint if exists lessons_video_requires_youtube;
alter table lessons
  add constraint lessons_video_requires_youtube
  check (template = 'pdf' or youtube_url is not null);

-- 3) Apostila (pdf ou video_pdf) exige pdf_storage_path. Só 'video' o dispensa.
alter table lessons drop constraint if exists lessons_template_requires_pdf;
alter table lessons
  add constraint lessons_template_requires_pdf
  check (template = 'video' or pdf_storage_path is not null);

comment on column lessons.template is
  'Enum em texto (CHECK constraint, não enum nativo): pdf | video | video_pdf. pdf = só apostila; video = só vídeo YouTube embebido; video_pdf = ambos. Extensível em versões futuras sem migration breaking.';

comment on column lessons.pdf_storage_path is
  'Caminho relativo dentro do bucket lesson-pdfs (ex.: <courseId>/<lessonId>.pdf). Null permitido apenas quando template = video (aula sem apostila).';
