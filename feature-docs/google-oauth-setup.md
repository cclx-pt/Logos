# Google OAuth Setup — Logos

> **Quando seguir:** antes de começar V2 PR2 (login real). PR1 não precisa de OAuth funcional, mas as URLs de redirect deste doc são pré-condição para o login funcionar end-to-end.
> **Quem executa:** o utilizador (passos no browser). O Claude não tem acesso ao Google Cloud Console.
> **Tempo estimado:** 20 minutos para os dois ambientes (10 cada).

## 1. O que ficas com no fim

- Um **OAuth Client ID** no Google Cloud Console por cada ambiente Supabase:
  - `logos-dev` → ligado ao Supabase `dknrnqyqlojvnhspwjrd`
  - `logos-prod` → ligado ao Supabase `tirzriuabfwzqxtjsmfb`
- O provider **Google enabled** em `Authentication → Providers → Google` em cada projecto Supabase, com `Client ID` e `Client Secret` colados.
- Login com Google passa a funcionar localmente (`pnpm dev`) e em Preview/Production Vercel.

## 2. Pré-requisitos

- Conta Google que vai ficar dona do projecto Google Cloud (recomendado: a mesma que vai ser o primeiro super_admin do Logos, `joaocanelasribeiro@gmail.com` — assim a identidade da app e do super_admin alinha).
- Acesso ao painel dos 2 projectos Supabase (URLs em `feature-docs/supabase.md`).

## 3. Criar projecto Google Cloud (uma vez só)

1. Abrir https://console.cloud.google.com/
2. Drop-down de projecto no topo → **"New Project"**.
3. **Project name:** `logos-cclx` (ou nome que prefiras; é só interno).
4. **Organization:** se a CCLX tiver Workspace, escolher; senão deixar "No organization".
5. **Create**. Esperar ~30s e mudar o drop-down para o projecto novo.

> **Nota:** **um único** projecto Google Cloud chega para os dois ambientes Supabase. Vamos criar **dois OAuth Clients** dentro do mesmo projecto Google Cloud (um aponta para `logos-dev`, outro para `logos-prod`).

## 4. Configurar OAuth consent screen (uma vez só)

1. No menu lateral: **APIs & Services → OAuth consent screen**.
2. **User Type:** **External** → **Create**.
3. **App information:**
   - **App name:** `Logos — CCLX`
   - **User support email:** `logos@cclx.pt` (ou o teu Gmail por agora)
   - **App logo:** opcional; podes adicionar `public/logo-cclx-interiors.svg` em PNG mais tarde.
4. **App domain:**
   - **Application home page:** `https://logos.cclx.pt`
   - **Application privacy policy link:** deixar vazio até existir (V2+).
   - **Application terms of service link:** deixar vazio.
   - **Authorized domains:** adicionar **`cclx.pt`** e **`supabase.co`**. Não é preciso `vercel.app`.
5. **Developer contact information:** o teu email.
6. **Save and continue**.
7. **Scopes:** clicar **Add or remove scopes** e seleccionar apenas:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
8. **Save and continue**.
9. **Test users:** **enquanto a app estiver em "Testing"**, só os emails aqui listados conseguem login. Adicionar `joaocanelasribeiro@gmail.com` + qualquer outro tester (incluindo o teu).
10. **Save and continue → Back to dashboard.**
11. **Publishing status:** clicar **"Publish app"** → confirmar. Sem isto, só os test users conseguem login mesmo em produção. (Estás a usar scopes não-sensitive, portanto a Google **não exige verificação manual** — é instantâneo.)

## 5. Criar OAuth Client para `logos-dev`

1. Menu lateral: **APIs & Services → Credentials**.
2. **Create credentials → OAuth client ID**.
3. **Application type:** **Web application**.
4. **Name:** `logos-dev` (para te lembrares qual é qual).
5. **Authorized JavaScript origins:** adicionar **apenas**:
   - `http://localhost:3000`
   > ⚠️ **Google não aceita wildcards** (`*.vercel.app` é rejeitado com erro "Origem inválida"). Por isso login a partir de Vercel Preview URLs **não funciona** — validamos visualmente em Preview mas o teste real do login fica em local (`localhost:3000`) e em Production (`https://logos.cclx.pt`, no OAuth Client `logos-prod`).
6. **Authorized redirect URIs:** adicionar **exactamente** (sem `/` final, sem wildcard):
   - `https://dknrnqyqlojvnhspwjrd.supabase.co/auth/v1/callback`
7. **Create**.
8. Aparece um modal com **Client ID** e **Client secret**. **Copia ambos** — vais precisar no passo 7. **Não commits** o JSON que a Google oferece em "Download JSON" — guarda-o fora de pastas sincronizadas com git.

## 6. Criar OAuth Client para `logos-prod`

Repetir o passo 5 com:
- **Name:** `logos-prod`
- **Authorized JavaScript origins:**
  - `https://logos.cclx.pt`
- **Authorized redirect URIs:**
  - `https://tirzriuabfwzqxtjsmfb.supabase.co/auth/v1/callback`

Copiar o segundo par **Client ID** / **Client secret**.

## 7. Ligar a Supabase — ambos os projectos

Para **cada um** dos dois projectos (`logos-dev` primeiro, `logos-prod` depois):

1. Abrir o projecto Supabase no painel.
2. **Authentication → Providers → Google** (na lista).
3. Toggle **"Enable Sign in with Google"** → ligar.
4. Colar **Client ID** e **Client Secret** do par correspondente (do passo 5 para dev, passo 6 para prod).
5. **"Skip nonce check"** → deixar **off** (default; é o seguro).
6. **Save**.

> A URL de callback (`.../auth/v1/callback`) já está pré-configurada por Supabase. Foi essa que registaste no passo 5/6 como "Authorized redirect URI" do lado do Google.

## 8. Validar (smoke test rápido)

Antes de termos código de login, podes confirmar que está tudo certo:

1. No painel Supabase do projecto `logos-dev` → **Authentication → Providers → Google**: deve mostrar **"Enabled"**.
2. **Authentication → URL Configuration** (mesma página, scroll):
   - **Site URL** (campo único no topo): `http://localhost:3000` em `logos-dev`; `https://logos.cclx.pt` em `logos-prod`.
   - **Redirect URLs** (secção logo abaixo, é uma **lista**, não campo único; aqui wildcards **são** aceites): adicionar `http://localhost:3000/**` em `logos-dev`; adicionar `https://logos.cclx.pt/**` em `logos-prod`.
3. **Não vale a pena** adicionar `https://logos-git-*.vercel.app/**` em `logos-dev` — o Google já bloqueia o login a partir de Preview URLs no passo 5.5, portanto Supabase aceitar não muda nada.

Quando o V2 PR2 (login) tiver código, basta ir a `/entrar` (ou clicar no botão "Entrar" do Header) e o fluxo deve ir-vir com Google.

## 9. Onde guardar as credenciais

**Nunca commit** `Client ID` ou `Client Secret`. Eles ficam no painel Supabase (passo 7). Não há necessidade de os colocar em `.env.local` da app — o lado do servidor de auth é o **Supabase**, não o Logos.

Quando a app fizer `signInWithOAuth({ provider: 'google' })`, é Supabase Auth que sabe os secrets — o Logos só recebe a sessão depois do callback.

**O ficheiro JSON que a Google oferece descarregar** ("Download JSON" no modal pós-create) tem o secret em plaintext. Recomendado:
- Não guardar em pastas sincronizadas (OneDrive, Dropbox, Google Drive).
- Após colar Client ID + Secret no Supabase (passo 7), o ficheiro JSON pode ser apagado — o Supabase Dashboard fica como fonte de verdade.
- Se precisares de re-aceder ao Secret, vais a Google Cloud Console → Credentials → clica no OAuth Client → mostra novamente.

## 10. Troubleshooting

| Sintoma | Causa provável | Fix |
|---|---|---|
| `Error 400: redirect_uri_mismatch` | URL no Google ≠ URL de callback do Supabase | Garantir que **passo 5/6** tem **exactamente** `https://<ref>.supabase.co/auth/v1/callback`, sem `/` final |
| `Origem inválida: não é permitido que o domínio contenha um caractere curinga (*)` | Wildcard em "Authorized JavaScript origins" | Google **não aceita** wildcards. Pôr apenas hosts concretos (`http://localhost:3000` em dev, `https://logos.cclx.pt` em prod). Login a partir de Preview URLs fica sem suporte por design. |
| Login só funciona para alguns Gmails | App ainda em "Testing" no consent screen | Publish app (passo 4.11) ou adicionar email aos Test users |
| Pós-login redireciona para localhost em produção | "Site URL" do Supabase mal configurado | Painel Supabase → Authentication → URL Configuration → corrigir |
| Não encontro "Redirect URLs" no Supabase, só vejo Site URL | Estás a olhar para o campo errado | "Redirect URLs" é uma **secção separada**, abaixo do Site URL na mesma página. Scroll. É uma lista (botão "Add URL"), não um campo único. |
| `cclx.pt` não aceita como authorized domain | Domínio não verificado no Google Cloud | Adicionar e verificar `cclx.pt` em **APIs & Services → Domain verification**; meter um TXT record no DNS da Hostinger (Google indica) |

## 11. Referências externas

- [Supabase Docs — Sign in with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud — OAuth consent screen](https://support.google.com/cloud/answer/10311615)
