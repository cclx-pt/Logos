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
- [ ] Merge `v3-cursos` -> `main` (PR; nunca push direto). Dispara o deploy de Production.

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
- [ ] Painel Supabase: `logos-dev` -> "logos"; `logos-prod` -> "logos-staging" (os refs/keys não mudam).
- [ ] Anunciar à comunidade.

## Pós-lançamento (com calma, "off", enquanto desenvolves outras coisas)
- [ ] Aplicar migrations V3 ao novo dev (`tirzriuabfwzqxtjsmfb`) + configurar a sua auth (Resend/Turnstile/Google) para voltar a ter ambiente de testes completo.
- [ ] Apontar o **Preview scope** da Vercel para o novo dev.
- [ ] (Opcional) limpar as 14 contas antigas do novo dev.

## Notas
- Plano grátis Supabase **sem backups**: a partir do lançamento, `dknrnqyqlojvnhspwjrd` tem dados reais - cuidado redobrado em qualquer operação.
- As 14 contas do antigo `logos-prod` ficam nesse projeto (teste/tuas, sem progresso a perder - o V2 não tem cursos).
- Migrations são forward-only (sem `down` destrutivo).
