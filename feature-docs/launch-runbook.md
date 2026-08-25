# Runbook de Lançamento - Logos V3

> **Objetivo:** no dia (alvo **01-07-2026**), o lançamento é só "trocar o deploy".
> **Estratégia (decisão 19-06-2026):** promover o **`logos-dev` a produção**, em vez de aplicar migrations + recriar conteúdo no `logos-prod`. Poupa migrations, recriação do curso e toda a re-configuração de auth.

## Mapa de projetos Supabase - CONFIRMAR O REF antes de qualquer operação destrutiva
| Ref | Nome atual | Papel até ao lançamento | Papel depois |
|---|---|---|---|
| `dknrnqyqlojvnhspwjrd` | logos-dev | dev + previews | **PRODUÇÃO (live)** |
| `tirzriuabfwzqxtjsmfb` | logos-prod | live V2 (14 contas, teste) | dev / staging |

Porque funciona sem repetir setup: o `logos-dev` já tem **schema V3 completo + Resend SMTP/OTP/templates + Turnstile + callback Google** (os previews já o usam e está validado).

## Antes do dia (preparar com calma)
- [ ] **Wipe do `logos-dev`** (SQL no editor do projeto) - começar do zero.
- [ ] **Login** com o super_admin (`joaocanelasribeiro@gmail.com`) + criar 1 **admin** (login dele -> promover em `/admin/utilizadores`).
- [ ] O admin **cria o curso REAL** pela UI (módulos, aulas, PDFs, vídeos, etiquetas) e **publica**. Este conteúdo é o de produção.
- [ ] **Não poluir:** idealmente não testar no curso real depois de pronto. Se testares, fazer o "scrub de atividade" abaixo mesmo antes do lançamento.
- [ ] Reunir os valores de config (já existem no `logos-dev`): URL + publishable key + service-role do `logos-dev`; `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `LOGOS_QUESTIONS_TO_EMAIL`, Turnstile site key + secret, `YOUTUBE_API_KEY` (se Live).

### (Opcional) Scrub de atividade de teste mesmo antes do lançamento
Mantém cursos/módulos/aulas/etiquetas + os perfis admin; limpa só a atividade:
```sql
truncate
  public.lesson_question_messages, public.lesson_questions,
  public.lesson_completions, public.course_completions, public.lesson_views,
  public.course_access_log, public.rate_limit
cascade;
-- apagar perfis de aluno de teste, se existirem (mantém super_admin + admins reais):
-- delete from public.profiles where role = 'user';
-- delete from auth.users where id not in (select external_auth_id from public.profiles where external_auth_id is not null);
```

## Sequência do dia

### 1. Código -> Production
- [x] **(28-06-2026) Reconciliação `main` ↔ `v3-cursos` feita** - `main` tinha divergido (V2.5/RGPD PR #44/#45/#46 nunca apanhada por `v3-cursos`). Integrado `main` em `v3-cursos` (merge `7e3f552`); 699 testes verdes. Ver `changelog.md` [28-06-2026].
- [ ] **PR única `v3-cursos` -> `main` aberta - aguarda merge do líder** (nunca push direto). O merge dispara o deploy de Production. (`main` já é ancestral de `v3-cursos`, por isso a PR é limpa - usar squash para manter histórico linear.)

### 2. Trocar o env da Vercel (a "troca")
- [ ] **Production scope** -> apontar para o `logos-dev` (`dknrnqyqlojvnhspwjrd`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Confirmar app-level no mesmo scope: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `LOGOS_QUESTIONS_TO_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `YOUTUBE_API_KEY` (se Live), `NEXT_PUBLIC_SITE_URL=https://logos.cclx.pt`.
- [ ] Redeploy de Production.
- [ ] **Preview scope** -> só apontar para o antigo `logos-prod` **depois** de este ter schema V3 (ver Pós-lançamento). Até lá, deixar como está.

### 3. Auth no `logos-dev` (agora produção)
- [ ] Redirect URLs: adicionar `https://logos.cclx.pt/**`. Site URL -> `https://logos.cclx.pt`.
- [ ] Turnstile: adicionar `logos.cclx.pt` aos hostnames do widget (Cloudflare).

### 4. Smoke em `logos.cclx.pt`
- [ ] Login **Google** + **email OTP** (chega o código).
- [ ] Catálogo: visibilidade por etiqueta (restrito invisível a quem não tem etiqueta).
- [ ] Inscrever -> vídeo + PDF -> marcar concluída -> ecrã de curso concluído.
- [ ] Perguntar numa aula -> email chega + aparece em `/admin/perguntas` -> responder.
- [ ] (Se Live) `/admin/live` "Estamos no ar" -> `/live` mostra a emissão.
- [ ] Áreas de admin acessíveis ao super_admin.

### 5. Renomear + anunciar
- [ ] Painel Supabase: `logos-dev` -> "logos"; `logos-prod` -> "logos-staging" (os refs/keys não mudam). **Por fazer** - os nomes continuam trocados e a enganar; guiar-se sempre pelo ref.
- [ ] Anunciar à comunidade.

## Pós-lançamento (com calma, "off", enquanto desenvolves outras coisas)
- [x] **Migrations V3 aplicadas ao staging** (`tirzriuabfwzqxtjsmfb`) - 25-08-2026, via `supabase db push --include-all`. As 19 em falta, verificadas por `migration list` (0 por aplicar) e por `inspect db` (schema V3 completo). O `--include-all` foi preciso porque duas delas (`20260530120000`, `20260530130000`) ordenam **antes** de migrations ja aplicadas em 02-06; o resultado final esta correcto porque a `20260825120000` ordena em ultimo e repoe as duas garantias do trigger de role (confirmado por query ao `prosrc`).
- [ ] **Configurar a auth do staging** (Resend SMTP + templates com `{{ .Token }}` + Turnstile + confirmar Google). O Google ja la estava da era V2; o **OTP nao**, por ter entrado a 07-06, depois de este projecto congelar. Ver `feature-docs/email-otp-setup-guide.md` Parte D/E. **Ordem importa:** site key no deploy ANTES de ligar o CAPTCHA no Supabase, senao o envio de OTP parte.
- [ ] Apontar o **Preview scope** da Vercel para o staging - so `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (+ `LOGOS_QUESTIONS_TO_EMAIL`, para as perguntas de teste nao cairem na caixa real). A `NEXT_PUBLIC_TURNSTILE_SITE_KEY` **nao** muda: e um widget so, a servir os dois projectos.
- [ ] (Opcional) limpar as 14 contas antigas do staging.

> **Nota (25-08-2026): os previews estavam publicos E ligados a producao.** O item do Preview scope acima nunca foi feito, e o "deixar como esta" ficou a apontar para o `dknrnqyqlojvnhspwjrd` - que passou a ser producao no lancamento. Pior: a Deployment Protection do projecto Vercel estava **toda desligada** (`ssoProtection`, `passwordProtection`, `trustedIps` a `false`), ao contrario do que o `status.md` afirmava - qualquer URL de preview era uma app publica, sem login, a escrever na base de dados real. Nao havia segredo exposto (a publishable key e publica por desenho e a RLS e a mesma), mas era codigo por rever a correr contra dados reais. **Corrigido a 25-08-2026** ligando Vercel Authentication em `all_except_custom_domains` - protege previews e os aliases `.vercel.app`, deixa `logos.cclx.pt` publico. Verificado: preview passou de 200 a 302, producao mantem 200.

## Notas
- Plano grátis Supabase **sem backups**: a partir do lançamento, `dknrnqyqlojvnhspwjrd` tem dados reais - cuidado redobrado em qualquer operação.
- As 14 contas do antigo `logos-prod` ficam nesse projeto (teste/tuas, sem progresso a perder - o V2 não tem cursos).
- Migrations são forward-only (sem `down` destrutivo).
