# Handoff - pendentes pré-lançamento

> **Criado:** 11-06-2026, no fecho da sessão que mergeou as PRs #49/#50/#51.
> **Regra (CLAUDE.md):** ler isto no início de cada sessão antes de tocar em ficheiros. Quando tudo fechar, apagar este handoff - os registos definitivos já vivem em `feature-docs/`, `changelog.md` e `status.md`.

## Estado em uma linha

`v3-cursos` limpa e completa dev-side: **457 testes verdes, `pnpm audit` a zero, advisors arrumados** (`feature-docs/revisao-seguranca-v3.md`), login Google confirmado a funcionar no preview pelo líder, **zero PRs abertas** (só `main` e `v3-cursos` existem como branches).

## Pendentes (por ordem de proximidade)

### 1. OTP - validar end-to-end · bloqueado: rate limit do mailer interno

- Settings já corretos em `logos-dev`: templates **Magic Link + Confirm signup** com `{{ .Token }}` em PT-PT, **OTP length = 6**.
- 11-06 ~11:00: logs de auth com 8× `429: email rate limit exceeded` - o mailer interno do Supabase só envia 2-4 emails/hora e os testes esgotaram a quota. **Esperar e testar:** `/entrar` → email → código de 6 dígitos → entrar; primeiro login com email novo cria linha em `profiles`.
- Se aparecer "Não foi possível enviar o código...": é o envio (rate limit outra vez, ou falta de SMTP) - ver logs de auth do `logos-dev`.

### 2. Resend SMTP · bloqueado: acesso ao painel Hostinger (DNS de cclx.pt)

- Runbook completo passo-a-passo: **`feature-docs/email-otp-setup-guide.md`** (Partes A-D; checklist no topo). ~45-60 min + propagação DNS.
- Sem isto, o OTP não é viável para utilizadores reais (fica nos 2-4 emails/hora do mailer interno).
- **Turnstile** = Parte E do mesmo guia, opcional. A ordem importa: site key no deploy **antes** do secret no Supabase, senão o envio de OTP parte.

### 3. Lançamento `v3-cursos` → `main` · prazo absoluto 01-07-2026

- PR única `v3-cursos` → `main` no dia do lançamento - **nunca parciais** (regra CLAUDE.md).
- Migrations V3 → `logos-prod` via `db push`; atenção às **divergências de versão** documentadas (`feature-docs/seguranca-port-v3.md` §caveat + MEMORY "Divergência de migrações Supabase"). A `20260611120000_security_review_hardening` já está em `logos-dev` com o ledger alinhado ao nome do ficheiro.
- Repetir config externa em `logos-prod`: SMTP Resend + templates `{{ .Token }}` + OTP length 6 (+ secret Turnstile e `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no scope Production, se ativado). Checklist "Lançamento" no fim do `email-otp-setup-guide.md`.
- Confirmar Redirect URLs de `logos-prod` (`https://logos.cclx.pt/**`) e smoke final em `logos.cclx.pt`.

### 4. Cosmético (opcional, manual no dashboard Vercel)

- Vercel → Overview → Active Branches: apagar os deployments das branches mortas (`sec/revisao-seguranca-v3`, `feat/login-microsoft-testemunhos`, `docs/seguranca-port-migracoes-reconciliadas`) via menu `⋯`. **Não apagar `v3-cursos`** (preview principal de dev). Zero impacto funcional - só limpa a lista.

## Decisões fechadas nesta sessão (não reabrir)

- **Login = Google + email OTP apenas**; Microsoft removido (decisão do líder, 10-06). SPEC 3.1.
- **Início do OAuth = route handler** `/auth/login/[provider]` (307 HTTP real); botões de login são `<a>` simples; o "Entrar" do cabeçalho é um `<Link>` para `/entrar` (dropdown removido). Razão: `redirect()` para URL externo numa Server Action invocada pelo cliente rebenta no Next 16 ("Connection closed", 500) - **não voltar a Server Actions para iniciar OAuth**.
- Copy de `/entrar` sem "É sempre gratuito." (edição manual do líder).
- Site URL de `logos-dev` mantém-se `http://localhost:3000`; o wildcard de previews (`https://logos-*-jcrninjas-projects.vercel.app/**`) já está nas Redirect URLs.
- `course_access_log`: UPDATE de clientes limitado à **coluna `unenrolled_at`** (migration `20260611120000`). Se a app um dia precisar de escrever outra coluna desta tabela, alargar o GRANT numa migration nova - senão o erro será "permission denied".
