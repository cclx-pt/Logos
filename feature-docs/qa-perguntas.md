# Q&A — Perguntas às aulas ("Pergunta aos professores")

> **Estado:** entregue em **7 PRs empilhados** em `v3-cursos` - V3.5 (#59, #60, #61: schema + submissão + inbox de admin) e V3.6 (#62, #63, PR3, PR4: thread + cópia ao aluno + resposta no admin + conversa do aluno). V3.5 validada ponta-a-ponta no preview de #61 (13-06-2026). **Nada mergea em `main` até 01-07-2026.**
> **Origem:** pedido do líder (12/13-06-2026). Funcionalidade de **V5** antecipada para o ciclo V3 (primeiro a inbox da equipa, depois a conversa ligada). SPEC bump 3.3 → 3.4.
> **Runbook operacional:** [`qa-perguntas-setup-guide.md`](qa-perguntas-setup-guide.md) (env vars, Resend, migrations, smoke test, troubleshooting).

## Contexto e decisão de scope

`SPEC_1.md` §V5 prevê: *"campo de perguntas por aula", "perguntas guardadas em base de dados", "vista de caixa de entrada para a equipa de admins", "notificação por email aos admins via Resend"*. As linhas §257 e §478 diziam explicitamente que a vista de aula da V3 era **sem** campo de perguntas.

Por decisão do líder (12-06-2026), esta fatia da V5 é **puxada para a frente** - tal como as estatísticas foram antecipadas de V5→V3 a 30-05-2026. Implica **bump na SPEC** (mover o bloco de Q&A para o âmbito V3, corrigir §257/§478). Registado no PR de docs.

### Âmbito (o que é e o que NÃO é)

Decidido após explorar alternativas com o líder. A V3.5 entregou a inbox da equipa (resposta por email, fora da app); a **V3.6 puxou o resto da V5** e transformou tudo numa **conversa ligada**:

| Decisão | Resolução |
|---|---|
| Email-only vs. BD + inbox | **BD + inbox** (versão completa da V5). A pergunta é guardada; nada se perde se o email falhar. |
| Inbox do aluno dentro da app / respostas-em-thread | **Entregue em V3.6.** O aluno tem `/perguntas` (lista) e `/perguntas/[code]` (conversa); a equipa responde dentro da app e o aluno dá **seguimento** sem sair. O email é **aviso + link** para a conversa. |
| Quem responde | A equipa, **dentro da Logos** (`/admin/perguntas/[id]`). A resposta vai por **email ao aluno** (assinada "Ministério LOGOS - CCLX"); o Reply-To é a caixa da equipa `logos@cclx.pt` (**Hostinger**, não Gmail), só como rede de segurança. |
| Captura de email de entrada (o aluno responder ao email) | **Fora de âmbito.** Rejeitado o inbound (exigia provider + MX num subdomínio + webhook público + DNS): o aluno responde **pela app**. |
| FAQ pública / temas mais pedidos | **Fica para V5.** As conversas ficam guardadas para o permitir mais tarde. |

## Arquitetura

Uma **conversa** = um cabeçalho (`lesson_questions`, a pergunta de abertura) + um ida-e-volta (`lesson_question_messages`, respostas da equipa e seguimentos do aluno). Todos os emails da conversa partilham um **código** `LOGOS-XXXXXX` no assunto e uma âncora em `References`/`In-Reply-To` (os clientes de email agrupam-nos).

**Fluxo de confiança** - o cliente envia o mínimo; identidade e contexto são sempre re-derivados no servidor.

**1. Aluno pergunta** (caixa "Pergunta aos professores" no leitor → Dialog → `submitQuestionAction`):

```
1. getCurrentUser()            → profile_id (+ email da camada de identidade, on-demand)
2. getLessonDetailById(id)     → curso/módulo/aula re-derivados (não confia no cliente)
3. validateQuestionBody        + rate-limit por utilizador (5/h)
4. INSERT lesson_questions     (snapshot dos títulos; thread_code gerado na BD)  ← fonte de verdade
5. email à equipa (aviso + link p/ a conversa no admin) + cópia ao aluno         ← best-effort
```

**2. Equipa responde** (`/admin/perguntas/[id]` → composer → `postAdminReplyAction`):

```
1. guarda admin (regra dura: recusa user/sem-sessão)
2. validateMessageBody
3. INSERT lesson_question_messages (author_role='admin')   ← trigger põe status='answered'
4. email ao aluno (buildAnswerEmail, assinado, com link p/ a conversa)  ← best-effort
   (email do aluno lido por profile_id via service-role; nunca persistido)
```

**3. Aluno dá seguimento** (`/perguntas/[code]` → composer → `postStudentFollowupAction`):

```
1. getCurrentUser() (login obrigatório)
2. valida thread_code (isThreadCode) + corpo (validateMessageBody)
3. resolve thread_code → conversa do PRÓPRIO (filtro .eq('profile_id') + RLS own)
4. rate-limit por utilizador (chave followup:, 5/h, fail-open)
5. INSERT lesson_question_messages (author_role='student')  ← trigger põe status='new' (a não ser 'archived')
6. email à equipa (buildFollowupEmail, Reply-To = aluno)    ← best-effort
```

O `status` do cabeçalho é conduzido pela conversa via trigger `sync_question_status_from_message`: mensagem de admin → `answered`; seguimento de aluno → `new`. Conversas `archived` (fechadas à mão) **não** ressuscitam com um seguimento - o seguimento grava e avisa a equipa, mas reabrir é uma acção manual de admin.

### Modelo de dados (só `logos-dev`)

**`lesson_questions`** = cabeçalho do thread (migration `20260612220000`; `thread_code` em `20260613120000`):

| Coluna | Notas |
|---|---|
| `lesson_id` → `lessons.id` | `ON DELETE SET NULL` - a pergunta sobrevive à remoção da aula |
| `profile_id` → `profiles.id` | `ON DELETE CASCADE` (FK para profiles, nunca auth.users) |
| `course_title` / `module_title` / `lesson_title` | **snapshots** - inbox legível após rename/delete |
| `author_name` | snapshot do nome (a RLS de `profiles` só deixa super_admin ler perfis alheios) |
| `body` | a pergunta de abertura. CHECK `length between 10 and 2000` (espelha `validateQuestionBody`) |
| `status` | `new \| answered \| archived`, default `new`; conduzido pelo trigger |
| `thread_code` | `LOGOS-XXXXXX`, UNIQUE, default `gen_thread_code()` (alfabeto sem ambíguos). Partilhado nos emails; alvo do link "ver conversa" |
| `created_at` / `updated_at` | `updated_at` via trigger `set_updated_at()` |

**`lesson_question_messages`** = ida-e-volta após a abertura (migration `20260613120000`):

| Coluna | Notas |
|---|---|
| `question_id` → `lesson_questions.id` | `ON DELETE CASCADE` |
| `author_role` | `student` (seguimento) \| `admin` (resposta). Forçado no servidor + RLS |
| `author_profile_id` → `profiles.id` | `ON DELETE SET NULL` (a conversa sobrevive à remoção do perfil) |
| `author_name` | snapshot do nome |
| `body` | CHECK `length between 2 and 5000` (espelha `validateMessageBody`) |
| `created_at` | sem `updated_at`: mensagens são **imutáveis** (não se edita o que já foi por email) |

**Email do aluno nunca é guardado** (regra dura: vive em `auth.users`; lido on-demand - na submissão e no seguimento, da sessão via `getCurrentAuthEmail`; na resposta do admin, por `profile_id` via service-role `getAuthEmailByProfileId`).

### RLS (verificada via advisors + privilégios de coluna)

**`lesson_questions`:**
- **SELECT:** `admin`/`super_admin` (toda a inbox) **OU** o dono (`lesson_questions_select_own`, para a vista do aluno). Permissiva (OR) - por isso as queries pessoais filtram explicitamente `profile_id = current_profile_id()`, senão um admin a ver a sua própria lista veria tudo.
- **INSERT:** `profile_id = current_profile_id()` **e** a aula tem de ser visível (`course_is_visible`).
- **UPDATE:** row-scoping a admin **+ column-scoping a `status`** (`grant update (status)`). Nem um admin reescreve `body`/identidade. O trigger de status corre `SECURITY DEFINER` (é assim que um seguimento de aluno, sem grant de UPDATE no cabeçalho, faz na mesma o `status` voltar a `new`).
- **DELETE:** só `super_admin` (limpeza de spam).

**`lesson_question_messages`:**
- **SELECT:** admin/super_admin **ou** o dono do thread (`lqm_select_admin_or_owner`).
- **INSERT (aluno):** `lqm_insert_student_own_thread` - `author_role='student'`, autor = caller, e o thread é dele. Sem checagem de visibilidade do curso de propósito: já tem o thread; o seguimento não deve partir-se se a aula for escondida depois.
- **INSERT (equipa):** `lqm_insert_admin` - `author_role='admin'` + caller é admin. Policies de INSERT são OR; nenhum caminho deixa forjar o papel do outro.
- **Sem UPDATE** (mensagens imutáveis). **DELETE** só super_admin.

## Plano de PRs — V3.5 (inbox da equipa, todos só em `v3-cursos`)

| PR | Conteúdo | Estado |
|----|----------|--------|
| **PR1** | Schema `lesson_questions` + RLS column-scoped + domínio partilhado (`src/lib/questions/`) + testes | em revisão (#59) |
| **PR2** | Infra de email (`fetch` ao Resend) + submissão do aluno (card + dialog + `submitQuestionAction` + rate-limit) + wiring no leitor + testes | **em revisão** (empilhado sobre PR1) |
| **PR3** | Inbox `/admin/perguntas` (lista + filtro + marcar estado) + `author_name` + nav + docs + testes | entregue (#61); validado no preview (13-06-2026) |
| **Docs** | SPEC bump 3.3 (Q&A V5→V3, §257/§478/§V5) + changelog + status + runbook operacional | entregue (#61) |

### PR1 — entregue (`v3-5-pr1-perguntas-schema`, #59)
- `supabase/migrations/20260612220000_lesson_questions.sql` (aplicada a `logos-dev`; **não** a prod).
- `src/lib/questions/question.ts` - `QuestionStatus`, `QUESTION_STATUS_LABEL`, limites do corpo, `validateQuestionBody()`. Partilhado por PR2 (action) e PR3 (inbox).
- `src/lib/questions/question.test.ts`.
- Advisors de segurança: zero lints novos para `lesson_questions`.

### PR2 — entregue (`v3-5-pr2-perguntas-submissao`, empilhado sobre PR1)
- **Sem dependência nova:** `src/lib/email/send.ts` faz `fetch` à API REST do Resend.
- `src/lib/auth/service-client.ts` - cliente service-role (server-only, fronteira de identidade) para o `check_rate_limit()`.
- `src/lib/auth/index.ts` - `getCurrentAuthEmail()` (lê o email de `auth.users` on-demand, para o Reply-To).
- `src/lib/questions/email.ts` - `buildQuestionEmail()` (composição pura, testável).
- `src/lib/questions/actions.ts` - `submitQuestionAction`: valida → inscrição → rate-limit (5/h) → INSERT → email best-effort.
- `src/components/ui/dialog.tsx` (Base UI) + `src/components/ui/textarea.tsx`.
- `src/app/conteudos/[courseId]/[lessonId]/ask-question-card.tsx` - caixa + dialog; ligada no leitor (flanco esquerdo xl+, e no fluxo do artigo em mobile).
- Env nova: `LOGOS_QUESTIONS_TO_EMAIL` (`logos@cclx.pt` por agora).
- Testes: `email`, `send` (fetch mock), `actions` (9 - validação/inscrição/rate-limit/insert/email best-effort), `ask-question-card` (trigger). Suite: 496 ✓.

### PR3 — entregue (`v3-5-pr3-perguntas-inbox`, empilhado sobre PR2)
- Migration `20260612230000_lesson_questions_author_name.sql` - snapshot `author_name` (a inbox mostra "quem perguntou" sem depender da RLS de `profiles`, que só deixa super_admin ler perfis de outros). `submitQuestionAction` passa a popular `author_name`. **Só `logos-dev`**.
- `src/app/admin/perguntas/page.tsx` - inbox: cartões com badge de estado, data, autor, contexto e corpo; **tabs de filtro por estado** (Todas/Novas/Respondidas/Arquivadas + contagens) e pesquisa (`ListSearch`). Estado vazio tratado.
- `src/app/admin/perguntas/actions.ts` - `setQuestionStatusAction` (recusa não-admin; muda só `status`). `loading.tsx` skeleton.
- `src/app/admin/layout.tsx` - entrada "Perguntas" na nav (nível admin). `save-toast-listener.tsx` - mensagem `pergunta_atualizada`.
- Docs: SPEC 3.3 (§257/§478/§V5/§19), changelog, status, este ficheiro.
- Testes: `setQuestionStatusAction` (7 - inclui recusa de `user`/sem-sessão = regra dura). Suite: **503 ✓**.

## Plano de PRs — V3.6 (conversa ligada, todos só em `v3-cursos`)

Empilhados sobre a fatia V3.5. Migration nova só em `logos-dev`; nada toca `main`/`logos-prod` até 01-07.

| PR | Conteúdo | Estado |
|----|----------|--------|
| **PR1** | Schema do thread (`thread_code` + `lesson_question_messages`) + RLS aluno/equipa + trigger de status + domínio (`MessageAuthorRole`, `validateMessageBody`, `THREAD_CODE_RE`) | entregue (#62) |
| **PR2** | Cópia ao aluno (`buildQuestionReceiptEmail`) + código `[LOGOS-XXXXXX]` no assunto + `References`/`In-Reply-To` (`threadHeaders`); `email/send.ts` aceita `headers` | entregue (#63) |
| **PR3** | Conversa no admin: vista `/admin/perguntas/[id]` + composer + `postAdminReplyAction` + `buildAnswerEmail` + `getAuthEmailByProfileId`; flip do email à equipa para "Responde dentro da Logos" | entregue |
| **PR4** | Conversa do aluno: `/perguntas` (lista) + `/perguntas/[code]` (detalhe) + `postStudentFollowupAction` + `buildFollowupEmail` + entrada de cabeçalho "As minhas conversas" (indicador) + **estes docs** | entregue |

### PR4 — conversa do aluno (`v3-6-pr4-conversa-aluno`)
- `src/app/perguntas/page.tsx` - lista das conversas do aluno (cartões com estado, código, contexto, data; ordenada por `updated_at`). Estado vazio liga a `/conteudos`.
- `src/app/perguntas/[code]/page.tsx` - a conversa: pergunta de abertura + balões (aluno à direita "Tu", equipa à esquerda "Equipa LOGOS" - nunca expõe qual admin) + composer de seguimento. Auth-guard com `redirect('/entrar?next=...')`; `thread_code` validado com `isThreadCode` (senão `notFound()`). A query filtra `profile_id` (a RLS de admin é permissiva).
- `src/app/perguntas/[code]/actions.ts` - `postStudentFollowupAction`: login → valida código/corpo → resolve a conversa do próprio → rate-limit (`followup:`, fail-open) → INSERT `author_role='student'` → email à equipa best-effort. Composer disponível mesmo em `archived` (grava + avisa; não reabre).
- `src/components/site/conversation-bubble.tsx` - balão partilhado (extraído da vista de admin).
- `src/components/site/conversas-link.tsx` + `header.tsx`/`mobile-nav.tsx` - entrada "As minhas conversas" (só com sessão), com ponto laranja quando há conversa em `answered` (a equipa respondeu).
- `QUESTION_STATUS_LABEL_OWNER` (etiquetas viradas ao aluno: "Em espera"/"Respondida"/"Arquivada").
- Testes: `buildFollowupEmail`, `postStudentFollowupAction` (login/código/corpo/não-dono/rate-limit/insert/email), `ConversasLink`. **Sem migration, sem env nova.**

## Operacional

> Runbook completo (passo-a-passo) em [`qa-perguntas-setup-guide.md`](qa-perguntas-setup-guide.md).

### ✅ Feito e validado para dev/preview (13-06-2026)
- **Domínio no Resend:** `logos.cclx.pt` já **Verified** (reutilizado do login OTP - a verificação é por domínio e serve SMTP e API). Sem trabalho de DNS.
- **Env no scope Preview da Vercel** (lêem de `logos-dev`) + `.env.local`: `LOGOS_QUESTIONS_TO_EMAIL` (=`logos@cclx.pt` por agora), `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPABASE_SERVICE_ROLE_KEY`. A `SUPABASE_SERVICE_ROLE_KEY` (chave `sb_secret_...` nova de `logos-dev`) foi validada com um teste real (RPC `check_rate_limit` respondeu `true`).
- **Smoke test no preview de #61:** com o curso "Oficina EB - Apocalipse" (publicado, 2 módulos, 3 aulas), o aluno submeteu uma pergunta → toast de sucesso → pergunta na inbox `/admin/perguntas` → **email de notificação chegou com Reply-To = email do aluno**. Tudo a funcionar.

### ⏳ Falta no lançamento (01-07-2026, lado do líder)
- **Repetir as 4 env vars no scope Production** com os valores de **`logos-prod`** (as mesmas da V3.5; a V3.6 não acrescenta env).
- **Subir as migrations** `lesson_questions` / `lesson_questions_author_name` / `lesson_question_threads` a `logos-prod` (regra dura: nada toca em prod antes do lançamento).

### Ordem de merge (já fechada nos PRs)
- V3.5: #59 → #60 → #61. V3.6: #62 → #63 → PR3 → PR4, empilhados por cima (o GitHub re-aponta a base ao fechar cada um). Toda a pilha mergeia em `v3-cursos`.

## Notas
- Migrations só em `logos-dev`. Sobem a prod no lançamento com o resto das migrations V3 (registar a versão exacta de cada ficheiro em `schema_migrations` - ver `feature-docs/seguranca-port-v3.md`).
- O cliente Supabase do projeto é **não-tipado** (row-types locais) - não há `database.types.ts` a regenerar.
