# Email OTP login - HANDOFF

> **Estado:** decisão fechada 04-06-2026. **Plano completo em `feature-docs/email-otp-login.md`** - ler primeiro. Implementação **por fazer**.
> **Quando fechar:** apagar este ficheiro e substituir pela entrada definitiva (estilo `v3-1-iteration.md`), mais o registo em changelog/status.

---

## Decisões já tomadas (não voltar a perguntar)

| Decisão | Escolha |
|---|---|
| Método | **Email OTP** (código de 6 dígitos), **não** magic link. |
| Envio de email | **Resend** via **SMTP do Supabase** (não a API Resend). Credenciais no painel Supabase, não na app. |
| Porquê passwordless | Evita construir/manter sistema de palavras-passe; reusa o trigger `on_auth_user_created` (zero mudanças de DB). |
| Anti-abuso | Rate limiter Postgres existente (`check_rate_limit`) + Captcha **Turnstile** no envio. |
| Expiração OTP | ~600s (10 min). |
| Âmbito | OTP entra em âmbito; **login com palavra-passe continua fora** (SPEC §18). |

## Pré-condições externas (o utilizador faz, fora do código)

1. Conta Resend + verificar domínio (`logos.cclx.pt`/`cclx.pt`).
2. DNS Hostinger: SPF + DKIM (+ DMARC) do Resend → "Verified".
3. SMTP custom no Supabase (`logos-dev` e depois `logos-prod`) com os dados do Resend.
4. Ativar Email provider + Turnstile no Supabase.

> Passos detalhados em `feature-docs/email-otp-login.md` §5/§6. **O código que vamos escrever fica inerte até isto estar feito** (igual ao caso do Microsoft).

## Passos de implementação (ordem sugerida)

1. **Server Actions** em `src/lib/auth/actions.ts`: `sendEmailOtpAction` (valida email + captcha + rate limit, `signInWithOtp`, devolve estado "enviado", resposta genérica anti-enumeration) e `verifyEmailOtpAction` (`verifyOtp` + `redirect(safeNextPath)`). NÃO usar o `signInWithProvider` (esse faz redirect imediato; OTP é 2 passos).
2. **Componente** `src/components/site/email-otp-sign-in.tsx` (Client, 2 passos via `useActionState`: email → código; reenviar; usar outro email; Turnstile no passo 1).
3. **Integração na UI:** decidir entre (a) juntar abaixo do `<ProviderSignIn>` com separador "ou", ou (b) rota dedicada `/entrar?next=`. Recomendado avaliar (b) para o fluxo de 2 passos não poluir os CTAs inline (hero, /meus-cursos, start-course, vista anónima do curso).
4. **Env/config:** Turnstile site key (pública) na UI; secret no Supabase. Sem novo segredo na app para o SMTP.
5. **Testes** (ver `email-otp-login.md` §10): unit das 2 actions + componente; manual no preview depois do SMTP.
6. **Docs/SPEC:** §17/§18/§11 + DNS (ver §9); changelog + status; apagar este handoff.

## Ficheiros prováveis

- `src/lib/auth/actions.ts` - 2 actions novas.
- `src/components/site/email-otp-sign-in.tsx` (novo) + teste.
- Possível `src/app/entrar/page.tsx` (+ content) se for rota dedicada.
- Possível `src/components/site/sign-in-panel.tsx` se juntar OAuth + OTP num painel.
- `.env.example` - Turnstile site key (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
- SPEC_1.md, CLAUDE.md (linha de auth), architecture.md §4, changelog, status.

## Contexto recente

- PR #49 (`feat/login-microsoft-testemunhos`) adicionou Microsoft (azure) + testemunhos anónimos + este plano. O padrão de providers (`signInWithProvider` + `<ProviderSignIn>`) é a base sobre a qual o OTP assenta.
- Microsoft também fica inerte até o provider Azure ser configurado no Supabase (`feature-docs/microsoft-oauth-setup.md`).
