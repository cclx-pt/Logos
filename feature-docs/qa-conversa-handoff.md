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

## Estado atual (13-06-2026)

**PR1, PR2 e PR3 entregues.** PR1+PR2 validados no preview pelo líder; PR3 fecha
a resposta no admin (testes verdes). A pilha vive em PRs empilhados (ainda **não
mergeados** em `v3-cursos`):

- `v3-cursos` ← **#62** (PR1, schema) ← **#63** (PR2, emails) ← **PR3** (resposta no
  admin, `v3-6-pr3-resposta-admin`). Mergeiam juntos no fim da fatia (padrão V3.5:
  validar no preview do topo e fechar a pilha).
- **PR3 já pushed** para `origin/v3-6-pr3-resposta-admin` (preview Vercel a construir
  em `https://logos-git-v3-6-pr3-resposta-admin-jcrninjas-projects.vercel.app/`). O
  **PR no GitHub fica por abrir à mão** (`gh`/integração do VS Code estão autenticados
  na conta EMU da Microsoft, que o GitHub bloqueia de criar PRs neste repo pessoal):
  abrir em `https://github.com/cclx-pt/Logos/pull/new/v3-6-pr3-resposta-admin` com
  base = `v3-6-pr2-copia-aluno-emails`.
- Migration `20260613120000_lesson_question_threads.sql` aplicada **só a
  `logos-dev`** (advisors: zero lints novos). Os 3 threads de teste já em dev
  apanharam `thread_code` válido. PR3 **sem migration nova**.
- Suite a **539** verdes. Zero env vars novas.

**Falta: PR4 (conversa do aluno + docs).**

## Plano de PRs (empilhados em `v3-cursos`; nada toca `main`/`logos-prod` até 01-07)

- ✅ **PR1 - Schema do thread + domínio + RLS** (`v3-6-pr1-conversa-schema`, #62).
  - Migration `20260613120000_lesson_question_threads.sql` (`logos-dev` apenas).
  - Domínio em `src/lib/questions/question.ts`: `MessageAuthorRole`,
    `validateMessageBody` (2..5000), `THREAD_CODE_RE`/`isThreadCode`.
  - Testes de domínio. Advisors limpos.
- ✅ **PR2 - Cópia ao aluno + código nos emails (Feature 2)** (`v3-6-pr2-copia-aluno-emails`, #63).
  - `email/send.ts`: aceita `headers` (`References`/`In-Reply-To`).
  - `email.ts`: `buildQuestionReceiptEmail()` (cópia ao aluno, assinada, com link),
    `buildQuestionEmail()` com `[CODE]` no assunto + linha de código + link da inbox,
    `threadHeaders()`.
  - `submitQuestionAction`: relê `thread_code` (`.insert().select().single()`,
    possível pela policy SELECT-own do PR1) e envia 2 emails (equipa + aluno).

- ✅ **PR3 - Conversa no admin: responder (Feature 1)** (`v3-6-pr3-resposta-admin`,
  a partir de `v3-6-pr2-copia-aluno-emails`). **Entregue (539 verdes).**

  Implementado tal como planeado abaixo:
  1. `getAuthEmailByProfileId(profileId)` na fronteira de identidade (service-role:
     `profiles.external_auth_id` → `auth.admin.getUserById` → email; nunca persistido).
  2. `buildAnswerEmail(...)` em `email.ts` (assunto `Re: A tua pergunta · <curso>
     [CODE]`, cita a pergunta, assina, `threadHeaders`; Reply-To = `logos@cclx.pt`).
  3. Vista de conversa `src/app/admin/perguntas/[id]/page.tsx` (+ `loading.tsx`):
     contexto + estado + `thread_code` + abertura + balões + composer; composer
     escondido em `archived`. Transições de estado reusam `setQuestionStatusAction`.
  4. `postAdminReplyAction` em `[id]/actions.ts`: guarda admin → valida → INSERT
     em `lesson_question_messages` (trigger põe `answered`) → email best-effort →
     `revalidatePath`. Toast `resposta_enviada`.
  5. Lista `page.tsx`: cada cartão liga a `/admin/perguntas/[id]` ("Ver conversa →").
  6. Flip do PR2: `buildQuestionEmail` (equipa) passa a "Responde dentro da Logos:
     <adminUrl>" (Reply-To = aluno mantido como rede de segurança).

  Sem migration, sem env nova.

- ⏳ **PR4 - Conversa do aluno + seguimentos + DOCS.** Branch `v3-6-pr4-conversa-aluno`.
  - Rota do aluno (lista + detalhe por `thread_code` + composer de seguimento;
    alvo dos links dos emails) + `postStudentFollowupAction` (só dono via RLS,
    rate-limit, email à equipa; `status` volta a `new` via trigger). Nav (ex.: em
    `/perfil` ou no menu do utilizador). Validar `thread_code` com `isThreadCode`.
  - **DOCS desta fatia:** SPEC bump 3.4 (mover "thread + inbox do aluno" V5→V3,
    `SPEC_1.md` §V5 + bloco Q&A), **reescrita da `qa-perguntas.md`** (modelo de
    conversa + corrigir "Gmail"→Hostinger), changelog, status, runbook
    (`qa-perguntas-setup-guide.md`). **Apagar este handoff** no fim.

## Operacional

- **Zero env vars novas.** Reutiliza `RESEND_*`, `LOGOS_QUESTIONS_TO_EMAIL`,
  `SUPABASE_SERVICE_ROLE_KEY` (já validadas em dev/preview).
- No lançamento (01-07) sobem só as migrations novas com o resto (registar a
  versão exacta do ficheiro em `schema_migrations` - ver divergências em
  `seguranca-port-v3.md`).
- Migration deste PR aplicada **só a `logos-dev`**.
