# Login por email + código (OTP passwordless via Resend)

> **Estado:** **código implementado em 07-06-2026** (V3.3). Fica **inerte até** configurares o SMTP/Resend + Email provider no Supabase (passos §5/§6). O handoff (`email-otp-handoff.md`) foi apagado ao fechar este trabalho.
> **Objetivo:** dar um terceiro método de login a quem não tem Google nem Microsoft, sem construir nem manter um sistema de palavras-passe.

## 0. Estado da implementação (07-06-2026)

**Feito (código):**
- Server Actions `sendEmailOtpAction` / `verifyEmailOtpAction` em `src/lib/auth/actions.ts` (padrão `useActionState`, 2 passos; `verifyOtp` → `redirect(safeNextPath)`).
- Componente `src/components/site/email-otp-sign-in.tsx` (2 passos: email → código de 6 dígitos; reenviar; usar outro email).
- `src/components/site/turnstile-widget.tsx` (captcha gated por `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; inerte se ausente).
- Rota dedicada `src/app/entrar/page.tsx` (`?next=`): `<ProviderSignIn>` (Google/Microsoft) + separador "ou" + `<EmailOtpSignIn>`. Já-autenticado redireciona.
- Item "Email (código)" no dropdown "Entrar" (`sign-in-button.tsx`) → `/entrar`.
- `.env.example`: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Testes: `email-otp-actions.test.ts` (9) + `email-otp-sign-in.test.tsx` (3).

**Por fazer (config externa, tu):** §5 (Resend + DNS) e §6 (Email provider + OTP length/expiração + Turnstile) no Supabase. Sem isto, o envio de código falha (mensagem genérica na UI).

**Decisão divergente do plano:** o rate-limiting via `check_rate_limit` (§8) **não foi ligado** — o RPC só dá EXECUTE a `service_role` e a app ainda não instancia um cliente service-role. A proteção ativa é o **Turnstile** + o rate-limiting nativo do Supabase para OTP. Ligar o `check_rate_limit` fica como follow-up (exige um helper de cliente service-role).

## 1. O que é

Login **passwordless por código de uso único** (OTP - one-time passcode): o utilizador escreve o email, recebe um código de 6 dígitos, escreve o código e entra. Não há palavra-passe para criar, guardar ou recuperar.

O Supabase Auth tem isto nativo. A app só chama:
- `signInWithOtp({ email })` - gera e envia o código.
- `verifyOtp({ email, token, type: 'email' })` - valida o código e cria a sessão.

O Supabase trata da geração do código, expiração, contagem de tentativas e criação do utilizador em `auth.users`.

## 2. Porque encaixa nas restrições do projeto

- **Sem palavras-passe** - nada de armazenar segredos, fluxos de registo ou recuperação. Era esta a razão pela qual email/password foi cortado na V2.
- **Zero mudanças no backend do Logos.** O trigger `on_auth_user_created` já cria a linha em `profiles` em qualquer insert de `auth.users`, portanto utilizadores OTP ganham profile + papel + RLS de graça. A fronteira de identidade em `src/lib/auth/` não muda.
- Mesmo padrão de UX de Notion, Substack e o login por email do Slack.

## 3. O custo real: entrega de email

OTP = enviar email. O mailer interno do Supabase está limitado a poucos emails/hora (só dev). Para produção é preciso ligar um SMTP próprio.

**Decisão: usar o Resend** (já no stack, previsto na SPEC para notificações V5). Implica finalmente configurar **SPF + DKIM no DNS da Hostinger** para entregabilidade - a dependência que a V2 adiou. É a única pré-condição pesada (~1-2h, uma vez).

> Nota: as credenciais SMTP vivem **no painel Supabase**, não na app. O `RESEND_API_KEY` em `.env.example` é para o uso direto da API Resend (notificações V5); o OTP vai por **SMTP do Supabase**, não pela API. Não é preciso novo segredo na app.

## 4. Código vs magic link

Avançamos com **código de 6 dígitos** (não magic link):
- Escreve-se na mesma página → funciona cross-device.
- Sobrevive a scanners de email corporativos que "pré-clicam" links (que invalidariam um magic link).
- É exatamente o que o líder pediu ("põe um email e envia um código").

## 5. Pré-requisitos externos (o utilizador executa)

1. **Conta Resend** + verificar o domínio `cclx.pt` (ou `logos.cclx.pt`) em Resend → Domains.
2. **DNS na Hostinger:** adicionar os registos que o Resend indica - SPF (TXT), DKIM (CNAME/TXT) e, se pedido, DMARC. Esperar propagação + "Verified" no Resend.
3. **SMTP no Supabase:** Authentication → Settings → SMTP Settings → ativar custom SMTP com os dados de SMTP do Resend (`smtp.resend.com`, porta 465/587, user `resend`, password = API key do Resend). `Sender email` = `no-reply@logos.cclx.pt`, `Sender name` = `Logos`.
4. Repetir o SMTP em **ambos** os projetos Supabase (`logos-dev` e, no lançamento, `logos-prod`).

## 6. Setup Supabase (provider + OTP)

1. Authentication → Providers → **Email** → ativar.
2. **Não** expor fluxos de palavra-passe na app - só chamamos a API de OTP. (Se o painel tiver a opção, desativar "Enable email signups" com password e manter só OTP/confirm; o que controla o método é o que a app chama.)
3. Authentication → Settings:
   - **Email OTP expiration:** 3600s default; reduzir para ~600s (10 min) por segurança.
   - **Email OTP length:** 6.
   - **Enable email confirmations:** com OTP o próprio código serve de confirmação.
4. **Bot/abuse:** ativar **Captcha protection** (Cloudflare Turnstile, gratuito) - protege o endpoint de envio. Guardar a site key (pública, vai na UI) e secret key (no Supabase).

## 7. Design de código

### Server Actions (`src/lib/auth/actions.ts`)
Seguir o padrão dos providers OAuth já existentes:

```ts
export async function sendEmailOtpAction(formData: FormData): Promise<...> {
  // valida email (zod/inline), captcha token, chama supabase.auth.signInWithOtp({
  //   email, options: { shouldCreateUser: true, captchaToken, emailRedirectTo: ... }
  // })
  // devolve estado "código enviado" (NÃO redirect - é fluxo de 2 passos)
}

export async function verifyEmailOtpAction(formData: FormData): Promise<void> {
  // chama supabase.auth.verifyOtp({ email, token, type: 'email' })
  // em sucesso: redirect para `next` (mesma validação safeNextPath)
}
```

Notas:
- Estas ações **não** seguem o `signInWithProvider` (esse faz `redirect` imediato para o URL do OAuth). OTP é um fluxo de 2 passos com estado no cliente.
- Usar `useActionState` para passar o estado "código enviado" + erros entre os dois passos sem perder o email.
- Reaproveitar `safeNextPath` para o `next`.

### UI (`src/components/site/email-otp-sign-in.tsx`, novo)
Client Component de 2 passos:
1. Passo "email": input email + Turnstile + botão "Enviar código".
2. Passo "código": input de 6 dígitos (inputMode numeric) + botão "Entrar" + link "Reenviar" (respeitando rate limit) + "Usar outro email".

Integrar **abaixo** do `<ProviderSignIn>` (Google/Microsoft) com um separador "ou", num componente comum de autenticação (considerar extrair `<SignInPanel>` que junta os dois). Avaliar uma rota dedicada `/entrar?next=` para o fluxo de 2 passos não poluir os CTAs inline - decisão na implementação.

### Backend
- **Nada a mudar** em `profiles`, RLS ou triggers. O insert em `auth.users` via OTP dispara o mesmo `on_auth_user_created`.

## 8. Abuso e segurança

- **Rate limiting:** reutilizar o `check_rate_limit` Postgres (portado no hardening V2.5) no `sendEmailOtpAction`, por email + por IP. Evita spam de envios (custo de email + chateia utilizadores).
- **Captcha (Turnstile):** segunda camada no envio (passo 6.4).
- **OTP:** expiração curta (passo 6.3) + Supabase limita tentativas de verificação.
- **Email enumeration:** com `shouldCreateUser: true` a resposta é igual para email novo/existente - resposta genérica "Se o email for válido, enviámos um código." Não revelar se a conta existe.
- **Custo:** Resend tem tier gratuito (~3k emails/mês); rate limiter + captcha mantêm o volume controlado.

## 9. Impacto na SPEC

Reabre a decisão "email/password fora de âmbito" (§17/§18) - mas **OTP não é palavra-passe**. Atualizar:
- §17: registar a decisão (avançar com email OTP via Resend) - **já registado** ao fechar este plano.
- §18: clarificar que continua fora de âmbito **login com palavra-passe**; OTP por email passa a estar dentro.
- §11: célula Email (Resend) deixa de ser só "V5+" - passa a dependência de auth.
- DNS: SPF/DKIM Hostinger deixam de estar adiados.

## 10. Plano de testes

- **Unit (Vitest, mocks):** `sendEmailOtpAction` (valida email, rate limit, captcha em falta, resposta genérica), `verifyEmailOtpAction` (código certo → redirect, código errado/expirado → erro, `next` validado). Componente `email-otp-sign-in` (transição passo 1 → passo 2, reenviar, usar outro email).
- **Manual (preview, depois do SMTP configurado):** email real → recebe código → entra; código errado falha; código expirado falha; reenvio; criação de `profiles` no primeiro login; login Google/Microsoft continuam a funcionar lado a lado.

## 11. Trade-offs / riscos

- **Entregabilidade** é o maior risco: SPF/DKIM mal configurados → códigos na spam. Mitigar verificando o domínio no Resend e testando com Gmail/Outlook/iCloud reais.
- **Latência percebida:** email demora segundos a chegar. UX deve deixar claro "verifica o email" e ter reenvio.
- **Mais superfície de auth** do que OAuth puro - mas sem palavras-passe é o mínimo viável.

## 12. Referências

- [Supabase - Auth with Email OTP / passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase - Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase + Resend SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase - Bot detection (Turnstile)](https://supabase.com/docs/guides/auth/auth-captcha)
