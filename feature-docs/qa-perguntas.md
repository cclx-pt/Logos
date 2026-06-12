# Q&A — Perguntas às aulas ("Pergunta aos professores")

> **Estado:** entregue em 3 PRs empilhados em `v3-cursos` (#59, #60, PR3 - em revisão). **Nada mergea em `main` até 01-07-2026.**
> **Origem:** pedido do líder (12-06-2026). Funcionalidade de **V5** antecipada para o ciclo V3. SPEC bump 3.3.

## Contexto e decisão de scope

`SPEC_1.md` §V5 prevê: *"campo de perguntas por aula", "perguntas guardadas em base de dados", "vista de caixa de entrada para a equipa de admins", "notificação por email aos admins via Resend"*. As linhas §257 e §478 diziam explicitamente que a vista de aula da V3 era **sem** campo de perguntas.

Por decisão do líder (12-06-2026), esta fatia da V5 é **puxada para a frente** - tal como as estatísticas foram antecipadas de V5→V3 a 30-05-2026. Implica **bump na SPEC** (mover o bloco de Q&A para o âmbito V3, corrigir §257/§478). Registado no PR de docs.

### Âmbito desta entrega (o que é e o que NÃO é)

Decidido após explorar alternativas com o líder:

| Decisão | Resolução |
|---|---|
| Email-only vs. BD + inbox | **BD + inbox** (versão completa da V5). A pergunta é guardada; nada se perde se o email falhar. |
| Inbox do aluno dentro da app / respostas-em-thread | **Fora de âmbito.** O aluno recebe a resposta **por email** (Reply-To). Uma vista "as minhas perguntas" pode vir depois do lançamento. |
| Quem responde | A equipa, **por email** (Gmail), via Reply-To = email do aluno. Sem composer dentro da app. |

## Arquitetura

**Fluxo de confiança** - o cliente envia só `{ lessonId, mensagem }`; identidade e contexto são re-derivados no servidor:

```
Aluno (caixa no flanco esquerdo do leitor) → Dialog → submitQuestionAction
  1. getCurrentUser()            → profile_id (+ email lido da camada de identidade p/ Reply-To)
  2. getLessonDetailById(id)     → curso/módulo/aula re-derivados (não confia no cliente)
  3. validateQuestionBody (Zod)  + rate-limit por utilizador
  4. INSERT em lesson_questions  (snapshot dos títulos)  ← fonte de verdade
  5. Resend.send → inbox do Logos, Reply-To = aluno     ← best-effort (falha não perde a pergunta)
Admin (/admin/perguntas)         → lista + detalhe + marcar estado (UPDATE status)
```

### Modelo de dados — `lesson_questions` (migration `20260612220000`, só `logos-dev`)

| Coluna | Notas |
|---|---|
| `lesson_id` → `lessons.id` | `ON DELETE SET NULL` - a pergunta sobrevive à remoção da aula |
| `profile_id` → `profiles.id` | `ON DELETE CASCADE` (FK para profiles, nunca auth.users) |
| `course_title` / `module_title` / `lesson_title` | **snapshots** - inbox legível após rename/delete |
| `body` | CHECK `length between 10 and 2000` (espelha `validateQuestionBody`) |
| `status` | `new \| answered \| archived`, default `new` |
| `created_at` / `updated_at` | `updated_at` via trigger `set_updated_at()` |

**Email do aluno nunca é guardado** (regra dura: vive em `auth.users`; lido on-demand para o Reply-To).

### RLS (verificada via advisors + privilégios de coluna)

- **SELECT:** só `admin`/`super_admin` (a inbox). O aluno não lê.
- **INSERT:** `profile_id = current_profile_id()` **e** a aula tem de ser visível (`course_is_visible`) - não se pergunta sobre aulas escondidas por etiqueta.
- **UPDATE:** row-scoping a admin (policy) **+ column-scoping a `status`** (`revoke update ... ; grant update (status) to authenticated`). Mesmo um admin não reescreve `body`/identidade. Confirmado: único privilégio UPDATE de `authenticated` é `status`.
- **DELETE:** só `super_admin` (limpeza de spam).

## Plano de PRs (todos só em `v3-cursos`)

| PR | Conteúdo | Estado |
|----|----------|--------|
| **PR1** | Schema `lesson_questions` + RLS column-scoped + domínio partilhado (`src/lib/questions/`) + testes | em revisão (#59) |
| **PR2** | Infra de email (`fetch` ao Resend) + submissão do aluno (card + dialog + `submitQuestionAction` + rate-limit) + wiring no leitor + testes | **em revisão** (empilhado sobre PR1) |
| **PR3** | Inbox `/admin/perguntas` (lista + filtro + marcar estado) + `author_name` + nav + docs + testes | **em revisão** (empilhado sobre PR2) |
| **Docs** | SPEC bump 3.3 (Q&A V5→V3, §257/§478/§V5) + changelog + status | **incluídas no PR3** |

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

## Operacional / a confirmar (lado do líder)
- **Env no Vercel:** `LOGOS_QUESTIONS_TO_EMAIL` (=`logos@cclx.pt` por agora), `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Domínio no Resend:** confirmar que `logos.cclx.pt` está verificado para envio via **API** (o OTP usa SMTP do Supabase - é diferente) antes de testar a entregabilidade a sério.
- **Ordem de merge:** #59 → #60 → PR3 (o GitHub re-aponta a base ao fechar cada um).

## Notas
- Migration só em `logos-dev`. Sobe a prod no lançamento com o resto das migrations V3 (registar a versão exacta do ficheiro em `schema_migrations` - ver `feature-docs/seguranca-port-v3.md`).
- O cliente Supabase do projeto é **não-tipado** (row-types locais) - não há `database.types.ts` a regenerar.
