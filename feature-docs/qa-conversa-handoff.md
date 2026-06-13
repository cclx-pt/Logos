# Handoff - Q&A como conversa ligada (V3.6)

> **Criado:** 13-06-2026. Ler antes de tocar em ficheiros (regra CLAUDE.md).
> Quando os 4 PRs fecharem, **apagar este handoff** e dobrar o registo definitivo
> na `qa-perguntas.md` (reescrita) + SPEC + changelog + status.
>
> **Base:** assenta sobre a fatia V3.5 já mergeada em `v3-cursos` (#59/#60/#61,
> `lesson_questions` + inbox de admin + submissão + email). Ver `qa-perguntas.md`.

## Pedido do líder (13-06-2026)

Evoluir o Q&A de "a equipa responde por email fora da app" para uma **conversa
ligada**:
1. A equipa responde **dentro da Logos**; a resposta vai por **email ao aluno**.
2. Quando o aluno pergunta, **recebe cópia da pergunta no seu email**.
3. O aluno pode **responder/seguir** dentro da app; pergunta + respostas +
   seguimentos ficam **ligados numa conversa**, com um **código** partilhado nos
   emails para "saber que estão a falar do mesmo".
4. Tudo guardado para, no futuro, explorar temas mais pedidos / FAQ pública.

## Decisões fechadas (não reabrir)

1. **Entrega = email; resposta do aluno volta PELA APP.** Sem captura de email de
   entrada (rejeitámos o inbound: exigia provider + MX num subdomínio + webhook
   público + DNS/Hostinger + líder; não cabia até 01-07). O email é aviso + link
   para a conversa na app.
2. **Reply-To dos emails ao aluno = `logos@cclx.pt`** (rede de segurança se alguém
   responder por reflexo). Esse email é uma caixa **Hostinger** (NÃO Gmail - a
   `qa-perguntas.md` dizia "Gmail" por erro; corrigir na reescrita).
3. **Assinatura dos emails ao aluno = "Ministério LOGOS - CCLX"** (genérica; não
   expõe quem respondeu).
4. **Conversa em thread** (a ideia "one-shot/resposta definitiva" foi
   substituída por isto). Código de conversa `LOGOS-XXXXXX` no assunto + headers
   de thread de todos os emails.

## Modelo de dados

- `lesson_questions` = **cabeçalho** do thread. A pergunta de abertura continua
  aqui (`body`, `author_name`, snapshots de contexto, `status`). Ganhou
  `thread_code` (UNIQUE, default `gen_thread_code()`).
- `lesson_question_messages` = **ida-e-volta após a abertura**: `author_role`
  (`student`/`admin`), `author_profile_id` (→ profiles, SET NULL), `author_name`
  (snapshot), `body` (CHECK 2..5000), `created_at`. Imutável (sem UPDATE).
- **Status conduzido pela conversa** via trigger `sync_question_status_from_message`:
  mensagem de admin → `answered`; seguimento de aluno → `new`. Threads `archived`
  (à mão) não são ressuscitados por um seguimento (reabrir é manual).
- **RLS:** aluno LÊ o seu thread (nova policy `lesson_questions_select_own` +
  `lqm_select_admin_or_owner`) e INSERE seguimentos só no seu
  (`lqm_insert_student_own_thread`); admin lê/insere em qualquer
  (`lqm_insert_admin`); super_admin apaga. Mensagens sem UPDATE.
- Email do autor **nunca** guardado (regra dura). Lido on-demand da camada de
  identidade: na submissão = sessão (`getCurrentAuthEmail`); na resposta do admin
  = por `profile_id` via service-role (função nova `getAuthEmailByProfileId`, PR3).

## Plano de PRs (empilhados em `v3-cursos`; nada toca `main`/`logos-prod` até 01-07)

- **PR1 - Schema do thread + domínio + RLS** (`v3-6-pr1-conversa-schema`) - ESTE.
  - Migration `20260613120000_lesson_question_threads.sql` (`logos-dev` apenas).
  - Domínio em `src/lib/questions/question.ts`: `MessageAuthorRole`,
    `validateMessageBody` (2..5000), `THREAD_CODE_RE`/`isThreadCode`.
  - Testes de domínio. Advisors limpos.
- **PR2 - Cópia ao aluno + código nos emails (Feature 2).**
  - `email/send.ts`: suportar headers de thread (Message-ID/References).
  - `buildQuestionReceiptEmail()` (código + link); notificação à equipa ganha
    código + link; `submitQuestionAction` relê `thread_code` e envia cópia ao aluno.
- **PR3 - Conversa no admin: responder (Feature 1).**
  - `getAuthEmailByProfileId()` (identidade, service-role).
  - `buildAnswerEmail()` (cita pergunta + resposta; assinatura; Reply-To inbox).
  - `/admin/perguntas/[id]` (vista de conversa + composer) + `postAdminReplyAction`
    (guarda admin → insere mensagem admin → email ao aluno; status via trigger).
- **PR4 - Conversa do aluno + seguimentos + DOCS.**
  - Rota do aluno (lista + detalhe por `thread_code` + composer de seguimento;
    alvo dos links dos emails) + `postStudentFollowupAction` (só dono, rate-limit,
    email à equipa; status via trigger). Nav.
  - SPEC bump 3.4, reescrita `qa-perguntas.md`, changelog, status, runbook.

## Operacional

- **Zero env vars novas.** Reutiliza `RESEND_*`, `LOGOS_QUESTIONS_TO_EMAIL`,
  `SUPABASE_SERVICE_ROLE_KEY` (já validadas em dev/preview).
- No lançamento (01-07) sobem só as migrations novas com o resto (registar a
  versão exacta do ficheiro em `schema_migrations` - ver divergências em
  `seguranca-port-v3.md`).
- Migration deste PR aplicada **só a `logos-dev`**.
