# Guia de Ativação - Q&A das aulas ("Pergunta aos professores")

> **Para quê:** passos **operacionais** (fora do código) para ligar a feature de perguntas. O código já está pronto nos PRs #59/#60/#61. Faz isto quando quiseres ativar - de preferência testa primeiro no preview de `v3-cursos`, e repete em produção no lançamento.
>
> **Boa notícia:** a feature **degrada com elegância**. Mesmo sem nada configurado, a pergunta grava-se em base de dados e aparece na inbox `/admin/perguntas`. A configuração de email só acrescenta a **notificação** para a equipa. Por isso, se ficares a meio, nada se perde.

---

## ✅ Checklist rápida

- [ ] 1. Merge dos 3 PRs pela ordem #59 → #60 → #61
- [ ] 2. Resend: ter uma API key e confirmar o domínio verificado
- [ ] 3. Variáveis de ambiente no Vercel (e no `.env.local` se testares localmente)
- [ ] 4. Testar o fluxo no preview de `v3-cursos`
- [ ] 5. (No lançamento) aplicar as migrations a `logos-prod` + repetir as env vars em Production

---

## 1. Merge dos PRs

São **3 PRs empilhados** - tem de ser por ordem:

1. **#59** - schema (`v3-5-pr1-perguntas-schema` → `v3-cursos`)
2. **#60** - submissão + email (re-aponta para `v3-cursos` quando o #59 fechar)
3. **#61** - inbox de admin + docs (re-aponta quando o #60 fechar)

O GitHub re-aponta automaticamente a base de cada PR ao fechar o anterior. Nada mergea em `main` até ao lançamento (regra do projeto).

---

## 2. Resend (envio do email de notificação)

A pergunta é enviada para a caixa do Logos via **API REST do Resend** (`https://api.resend.com/emails`). Não há SDK nem dependência nova.

### 2.1. Confirmar o domínio (provavelmente já está feito)

O login por email (OTP) **já envia** de `logos.cclx.pt` através do Resend, por isso o domínio quase de certeza **já está verificado** na conta Resend (DKIM/SPF/MX no DNS - registos em [`email-otp-setup-guide.md`](email-otp-setup-guide.md) Parte B).

- Vai a **Resend → Domains** e confirma que `logos.cclx.pt` está **Verified**.
- Se estiver, **não há trabalho de DNS** - a verificação é por domínio, serve tanto SMTP (OTP) como API (perguntas).

### 2.2. API key

- **Resend → API Keys → Create** (permissão de envio chega).
- Copia o valor `re_...` - é o `RESEND_API_KEY`. (Pode ser a mesma conta do OTP.)

### 2.3. Remetente (From)

- O `RESEND_FROM_EMAIL` tem de estar **no domínio verificado**. Default já definido: `Logos <no-reply@logos.cclx.pt>`.

---

## 3. Variáveis de ambiente

Define no **Vercel → Settings → Environment Variables** (e no `.env.local` se testares na tua máquina). Já estão todas no `.env.example` como referência.

| Variável | Valor | Onde / scope | Se faltar |
|---|---|---|---|
| `LOGOS_QUESTIONS_TO_EMAIL` | `logos@cclx.pt` (por agora) | Production + Preview | **Não envia email** (mas a inbox funciona) |
| `RESEND_API_KEY` | `re_...` (passo 2.2) | Production + Preview | Não envia email (inbox funciona) |
| `RESEND_FROM_EMAIL` | `Logos <no-reply@logos.cclx.pt>` | Production + Preview | Não envia email (inbox funciona) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role do projeto (Supabase → Settings → API) | Production + Preview | **Rate-limit fica fail-open** (sem limite, mas tudo funciona) |

Notas:
- **Production** lê de `logos-prod`; **Preview** (incl. `v3-cursos`) lê de `logos-dev`. Para testar no preview, define as vars no scope **Preview**.
- A `SUPABASE_SERVICE_ROLE_KEY` é **só servidor** (não tem `NEXT_PUBLIC_`). Nunca a exponhas no cliente.
- Quando criares uma caixa dedicada (ex.: `perguntas@cclx.pt`), basta mudar `LOGOS_QUESTIONS_TO_EMAIL` - não é preciso tocar no código.

---

## 4. Migrations (só no lançamento, em `logos-prod`)

As duas migrations da feature estão aplicadas **só em `logos-dev`**:

- `20260612220000_lesson_questions.sql` (tabela + RLS)
- `20260612230000_lesson_questions_author_name.sql` (snapshot do nome)

Sobem a `logos-prod` **no dia do lançamento**, com o resto das migrations V3 (regra dura: nada toca em prod antes de 01-07). Lembra-te de registar a versão exata do ficheiro em `schema_migrations` para alinhar com prod - ver [`seguranca-port-v3.md`](seguranca-port-v3.md).

---

## 5. Smoke test (como validar)

Depois de mergear os PRs e pôr as env vars no scope **Preview**, no preview de `v3-cursos`:

1. **Como aluno** (conta inscrita num curso): abre uma aula → caixa "Pergunta aos professores" no lado esquerdo (ou abaixo do "Marcar como concluída" em mobile) → escreve → **Enviar**.
   - Deves ver o toast *"Pergunta enviada. A equipa responde-te por email."*
2. **Email:** confirma que chega um email a `logos@cclx.pt` com assunto `Pergunta · {curso} · {aula}` e **Reply-To = email do aluno**. Carrega em "Responder" e confirma que vai para o aluno.
3. **Como admin:** vai a **/admin/perguntas** → a pergunta aparece como **Nova** → testa **Marcar como respondida** / **Arquivar** / **Reabrir** e os filtros por estado.

Se o email não chegar mas a pergunta aparecer na inbox: é só configuração de Resend (ponto 2/3) - o núcleo funciona.

---

## 6. Troubleshooting

| Sintoma | Causa provável | Fix |
|---|---|---|
| Pergunta na inbox, mas sem email | `RESEND_API_KEY`/`RESEND_FROM_EMAIL`/`LOGOS_QUESTIONS_TO_EMAIL` em falta, ou domínio não verificado | Pontos 2 e 3 |
| Email cai no spam | DKIM/SPF do domínio | Confirmar domínio Verified no Resend (ponto 2.1) |
| Aluno não vê a caixa | Não está inscrito no curso (a caixa só aparece a inscritos) | Esperado - inscrever no curso |
| `/admin/perguntas` dá 404 | Conta sem papel admin/super_admin | Esperado (conteúdo restrito é invisível) |
| Inbox sem nomes nas perguntas antigas | Perguntas criadas antes da migration `...author_name` (testes em dev) | Esperado - novas perguntas mostram o nome; cai para "Aluno" nas antigas |

---

## 7. O que **não** precisas de fazer

- **Instalar pacotes** - zero dependências novas (email via `fetch`).
- **Configurar DNS** - se o OTP já envia de `logos.cclx.pt`, o domínio já está verificado.
- **Inbox do aluno** - não existe nesta versão (a resposta vai por email); a thread bidirecional fica para a V5.
- **Tocar em `logos-prod`** antes do lançamento.

---

**Referências:** [`qa-perguntas.md`](qa-perguntas.md) (plano e arquitetura) · [`email-otp-setup-guide.md`](email-otp-setup-guide.md) (DNS/Resend do OTP) · `SPEC_1.md` §V5 / §19 (v3.3).
