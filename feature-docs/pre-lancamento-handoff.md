# Handoff - pendentes pré-lançamento

> **Criado:** 11-06-2026, no fecho da sessão que mergeou as PRs #49/#50/#51.
> **Regra (CLAUDE.md):** ler isto no início de cada sessão antes de tocar em ficheiros. Quando tudo fechar, apagar este handoff - os registos definitivos já vivem em `feature-docs/`, `changelog.md` e `status.md`.

## Estado em uma linha

`v3-cursos` limpa e completa dev-side: **`pnpm audit` a zero, advisors arrumados** (`feature-docs/revisao-seguranca-v3.md`), **login Google + email OTP confirmados a funcionar ponta-a-ponta** no preview, **zero PRs/branches por mergear** (só `main` e `v3-cursos` existem; o draft #52 foi fechado).

## Pendentes (por ordem de proximidade)

### ✅ FECHADO (11-06): OTP + Resend SMTP + Turnstile

Login por email OTP validado ponta-a-ponta em `logos-dev`. Tudo resolvido nesta sessão:
- **Resend SMTP** ligado no Supabase: domínio `logos.cclx.pt` Verified (`eu-west-1`), DKIM/SPF/MX confirmados (valores em `email-otp-setup-guide.md` Parte B), rate limit de email a 30/h. Templates Magic Link + Confirm signup com `{{ .Token }}`, OTP length 6.
- **Turnstile** ativo e a resolver - exigiu fix de CSP (`challenges.cloudflare.com` em falta no `connect-src`; commit `3a5a527`). Hostnames do widget incluem `localhost` + alias da branch; ⚠️ testar sempre pelo **alias da branch** (`logos-git-v3-cursos-...`), não pelo URL único do deployment (fora dos hostnames → "não foi possível conectar ao site").
- Fluxo `/entrar` → email → código → entrar OK; primeiro login cria linha em `profiles`.
- **Para o lançamento**, repetir esta config em `logos-prod` (ver secção 1 abaixo). Decisão em aberto: usar `vercel.app` largo no widget de dev vs widget separado e apertado (`logos.cclx.pt`) para prod - recomendado o segundo.

### 1. Lançamento `v3-cursos` → `main` · prazo absoluto 01-07-2026

- PR única `v3-cursos` → `main` no dia do lançamento - **nunca parciais** (regra CLAUDE.md).
- Migrations V3 → `logos-prod` via `db push`; atenção às **divergências de versão** documentadas (`feature-docs/seguranca-port-v3.md` §caveat + MEMORY "Divergência de migrações Supabase"). A `20260611120000_security_review_hardening` já está em `logos-dev` com o ledger alinhado ao nome do ficheiro.
- Repetir config externa em `logos-prod`: SMTP Resend + templates `{{ .Token }}` + OTP length 6 (+ secret Turnstile e `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no scope Production, se ativado). Checklist "Lançamento" no fim do `email-otp-setup-guide.md`.
- Confirmar Redirect URLs de `logos-prod` (`https://logos.cclx.pt/**`) e smoke final em `logos.cclx.pt`.

### 2. Cosmético (opcional, manual no dashboard Vercel)

- As branches mortas já foram apagadas no GitHub (remoto só tem `main` + `v3-cursos`). Falta só, se incomodar visualmente, apagar os **deployments** dessas branches em Vercel → Overview → Active Branches via menu `⋯`. **Não apagar `v3-cursos`** (preview principal de dev). Zero impacto funcional.

## Decisões fechadas nesta sessão (não reabrir)

- **Login = Google + email OTP apenas**; Microsoft removido (decisão do líder, 10-06). SPEC 3.1.
- **Início do OAuth = route handler** `/auth/login/[provider]` (307 HTTP real); botões de login são `<a>` simples; o "Entrar" do cabeçalho é um `<Link>` para `/entrar` (dropdown removido). Razão: `redirect()` para URL externo numa Server Action invocada pelo cliente rebenta no Next 16 ("Connection closed", 500) - **não voltar a Server Actions para iniciar OAuth**.
- Copy de `/entrar` sem "É sempre gratuito." (edição manual do líder).
- Site URL de `logos-dev` mantém-se `http://localhost:3000`; o wildcard de previews (`https://logos-*-jcrninjas-projects.vercel.app/**`) já está nas Redirect URLs.
- `course_access_log`: UPDATE de clientes limitado à **coluna `unenrolled_at`** (migration `20260611120000`). Se a app um dia precisar de escrever outra coluna desta tabela, alargar o GRANT numa migration nova - senão o erro será "permission denied".
