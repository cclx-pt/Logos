# Email OTP - guia de configuração externa (runbook)

> **Contexto:** o código do login por email OTP está entregue (PR #49) mas fica **inerte** até esta configuração externa existir. Este guia é a versão operacional, do zero, dos §5/§6 de [`email-otp-login.md`](email-otp-login.md).
> **Tempo estimado:** 45-60 min de trabalho ativo + espera de propagação DNS.
> **Custo:** 0€ - Resend free tier (3.000 emails/mês, 100/dia, sem cartão) + Cloudflare Turnstile gratuito.

**Nada disto toca em código.** O `RESEND_API_KEY` do `.env.example` continua comentado: o OTP sai pelo **SMTP do Supabase**, não pela API do Resend. A única env var nova é a site key do Turnstile (Parte E).

**Acessos necessários:** resend.com (criar conta), hPanel da Hostinger (DNS de `cclx.pt`), dashboard Supabase (`logos-dev` agora; `logos-prod` só no lançamento), dashboard Cloudflare (criar conta na Parte E).

## Checklist rápida

- [ ] **A** - Conta Resend + domínio `logos.cclx.pt` adicionado
- [ ] **B** - Registos DNS na Hostinger + domínio "Verified" no Resend
- [ ] **C** - API key do Resend criada e guardada
- [ ] **D** - Supabase `logos-dev`: SMTP custom + provider Email + templates `{{ .Token }}` + rate limits
- [ ] **E** - Turnstile: widget criado + site key no deploy + secret no Supabase (por esta ordem!)
- [ ] **F** - Smoke test no preview
- [ ] **Lançamento** - repetir a Parte D em `logos-prod` + env var no scope Production

## Parte A - Conta Resend + domínio (~10 min)

1. Criar conta em [resend.com](https://resend.com) (pode ser com a conta Google).
2. **Domains → Add Domain** → introduzir `logos.cclx.pt` → região **EU (Ireland)** (proximidade + RGPD).
3. O Resend mostra 3-4 registos DNS para adicionar. Deixar essa página aberta - vão ser copiados para a Hostinger:
   - 1 registo **MX** (em `send.logos.cclx.pt`)
   - 1 **TXT** SPF (também em `send.logos.cclx.pt`)
   - 1 **TXT** DKIM (em `resend._domainkey.logos.cclx.pt`)
   - opcional: 1 **TXT** DMARC (em `_dmarc.logos.cclx.pt`)

> Porquê `logos.cclx.pt` e não `cclx.pt`: mantém a reputação de envio do Logos separada do email principal da igreja, e nenhum registo toca no que já existe na zona de `cclx.pt`.

## Parte B - DNS na Hostinger (~10 min + espera)

4. hPanel → **Domínios → cclx.pt → DNS / Zona DNS**.
5. Adicionar cada registo da Parte A. **Atenção ao campo "Nome"**: a Hostinger acrescenta `cclx.pt` automaticamente, por isso escreve-se só a parte relativa:
   - `send.logos.cclx.pt` → nome `send.logos`
   - `resend._domainkey.logos.cclx.pt` → nome `resend._domainkey.logos`
   - `_dmarc.logos.cclx.pt` → nome `_dmarc.logos`
   - MX com prioridade `10`; TTL default está bem.
   - **Não tocar** no CNAME existente `logos` → Vercel. Estes registos vivem em subdomínios dele; não há conflito.
6. Voltar ao Resend → **Verify**. Propagação demora normalmente 5-30 min. Quando ficar **Verified**, seguir em frente.

## Parte C - API key do Resend (~2 min)

7. Resend → **API Keys → Create API Key** → nome `Logos Supabase SMTP`, permissão **Sending access** chega. **Copiar imediatamente** - só é mostrada uma vez. Esta key serve de password SMTP no passo 8.

## Parte D - Supabase `logos-dev` (~15 min)

> Tudo no dashboard do projeto **logos-dev** (`dknrnqyqlojvnhspwjrd`). No lançamento, repetir esta parte inteira em `logos-prod` (`tirzriuabfwzqxtjsmfb`).

8. **SMTP custom**: Authentication → **Emails → SMTP Settings** (em versões mais antigas do dashboard: Project Settings → Authentication) → Enable Custom SMTP:
   - Host: `smtp.resend.com` · Porta: `465` (se a 465 falhar, usar `587`)
   - Username: `resend` · Password: a API key da Parte C
   - Sender email: `no-reply@logos.cclx.pt` · Sender name: `Logos`
9. **Provider Email**: Authentication → **Sign In / Up → Email** → ativar. Na mesma página:
   - **Email OTP Length:** `6`
   - **Email OTP Expiration:** `600` (10 min)
   - "Confirm email" fica ligado (o próprio código serve de confirmação). Confirmar também que "Allow new users to sign up" está ON (default) - é o que permite criar conta no primeiro login.
10. **Templates de email** - ⚠️ **o passo mais fácil de falhar**: por default o Supabase envia um _link_ (`{{ .ConfirmationURL }}`), não um código. Em Authentication → **Emails → Templates**, editar **dois** templates - **Magic Link** (utilizadores existentes) e **Confirm signup** (primeiro login) - para o corpo usar `{{ .Token }}`. Sugestão PT-PT pronta a colar nos dois:
    - **Subject:** `O teu código LOGOS é {{ .Token }}`
    - **Body:**

    ```html
    <h2>O teu código de acesso</h2>
    <p>Olá! Usa este código para entrares na plataforma LOGOS:</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
    <p>O código é válido durante 10 minutos. Se não pediste este código, podes ignorar este email.</p>
    <p>Equipa LOGOS - CCLX</p>
    ```

11. **Rate limits** (verificação rápida): Authentication → Rate Limits. Os defaults servem: 30 emails/hora no total e intervalo mínimo de 60s entre envios ao mesmo email (é isto que regula o botão "Reenviar" da UI).

## Parte E - Turnstile (recomendado; pode ser adiado)

> ⚠️ **A ordem importa**: se o captcha for ativado no Supabase antes de a site key estar no deploy da app, o envio de OTP parte (o widget não renderiza → não há token → o Supabase rejeita). Fazer o passo 13 antes do 14, ou tudo na mesma sentada. O login Google não é afetado (OAuth não passa pelo captcha).

12. Conta Cloudflare (gratuita) → **Turnstile → Add Widget**: nome `Logos`, modo **Managed**, hostnames: `logos.cclx.pt`, `logos-git-v3-cursos-jcrninjas-projects.vercel.app` e `localhost`. Guardar a **Site Key** (pública) e a **Secret Key**.
13. **Site key na app**: variável `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no `.env.local` (dev local) e no Vercel (Settings → Environment Variables; scope **Preview** agora, **Production** no lançamento) → **redeploy** (a variável é inlined em build).
14. **Secret key no Supabase**: Authentication → **Attack Protection** → Enable CAPTCHA protection → provider **Cloudflare Turnstile** → colar a secret key. A mesma secret serve `logos-dev` e `logos-prod` (é um widget só, com os dois hostnames).

## Parte F - Smoke test (no preview de `v3-cursos`)

15. Abrir `/entrar` no preview → email real → o código chega (**verificar a pasta de spam!**) → entrar funciona.
16. Verificações complementares:
    - Código errado falha com mensagem; código expirado (>10 min) falha.
    - "Reenviar código" respeita os 60s de intervalo.
    - Primeiro login com email novo cria linha em `profiles` (ver em Supabase → Table Editor).
    - Login Google continua a funcionar ao lado.
    - Entregabilidade com **Gmail e Outlook reais** - SPF/DKIM mal afinados = códigos no spam, e este é o maior risco de tudo. O dashboard do Resend (**Emails**) mostra cada envio e o estado de entrega - é o primeiro sítio para debug.

## Lançamento (`logos-prod`)

- [ ] Repetir a Parte D inteira (passos 8-11) no projeto `logos-prod`.
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no scope **Production** do Vercel (o hostname `logos.cclx.pt` já ficou no widget na Parte E).
- [ ] Secret do Turnstile em Attack Protection do `logos-prod`.
- [ ] Smoke test rápido em `logos.cclx.pt` depois do deploy.

## Referências

- [Supabase - Auth with Email OTP / passwordless](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase - Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend - Send with Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)
- [Supabase - Bot detection (Turnstile)](https://supabase.com/docs/guides/auth/auth-captcha)
