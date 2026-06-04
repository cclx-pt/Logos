# Microsoft (Entra/Azure) OAuth Setup — Logos

> **Quando seguir:** assim que quiseres que o botão "Continuar com Microsoft" funcione. O código já está no sítio (V3.3, 04-06-2026); só falta configurar o provider em Supabase.
> **Quem executa:** o utilizador (passos no browser). O Claude não tem acesso ao portal Azure nem ao painel Supabase Auth.
> **Tempo estimado:** ~15 minutos por ambiente.
> **Custo:** gratuito (Azure app registrations não custam nada; ao contrário do Apple Developer Program).

## 1. O que ficas com no fim

- Uma **App registration** no Microsoft Entra (Azure AD) por ambiente Supabase:
  - `logos-dev` → ligado ao Supabase `dknrnqyqlojvnhspwjrd`
  - `logos-prod` → ligado ao Supabase `tirzriuabfwzqxtjsmfb`
- O provider **Azure enabled** em `Authentication → Providers → Azure` em cada projecto Supabase, com `Application (client) ID`, `Client Secret` e `Azure Tenant URL` colados.
- Login com Microsoft a funcionar localmente (`pnpm dev`) e em Production.

> No Supabase o provider Microsoft chama-se **`azure`** — é o slug que o código usa em `signInWithMicrosoftAction` (`src/lib/auth/actions.ts`).

## 2. Pré-requisitos

- Uma conta Microsoft (pessoal serve para criar uma app registration; não é preciso tenant de organização).
- Acesso ao painel dos 2 projectos Supabase (URLs em `feature-docs/supabase.md`).

## 3. Criar a App registration (por ambiente)

1. Abrir https://portal.azure.com/ → procurar **"App registrations"** → **New registration**.
2. **Name:** `logos-dev` (e mais tarde `logos-prod`).
3. **Supported account types:** escolher **"Accounts in any organizational directory and personal Microsoft accounts"** (permite contas pessoais @outlook/@hotmail + contas de organização). Isto mapeia para o tenant `common`.
4. **Redirect URI:** plataforma **Web** →
   - dev: `https://dknrnqyqlojvnhspwjrd.supabase.co/auth/v1/callback`
   - prod: `https://tirzriuabfwzqxtjsmfb.supabase.co/auth/v1/callback`
5. **Register**.
6. Na página da app, copiar o **Application (client) ID**.

## 4. Criar o Client Secret

1. Na app → **Certificates & secrets → Client secrets → New client secret**.
2. **Description:** `supabase`; **Expires:** 24 meses (anota a data — há que rodar antes de expirar).
3. **Add** → copiar **imediatamente** o **Value** (não o "Secret ID"). Só aparece uma vez.

## 5. Garantir o scope de email

1. Na app → **API permissions** → deve ter `Microsoft Graph → User.Read` (delegated), que vem por omissão. Confirma que `email`, `openid` e `profile` estão presentes (adiciona via **Add a permission → Microsoft Graph → Delegated** se faltar).
2. O código já pede `scopes: 'email'` no `signInWithOAuth` para o Entra devolver o email.

## 6. Ligar a Supabase — por ambiente

Para **cada** projecto (`logos-dev` primeiro, `logos-prod` depois):

1. Painel Supabase → **Authentication → Providers → Azure**.
2. Toggle **Enable** → ligar.
3. **Application (client) ID:** colar (passo 3.6).
4. **Secret Value:** colar (passo 4.3).
5. **Azure Tenant URL:** `https://login.microsoftonline.com/common` (porque escolhemos "any directory + personal accounts").
6. **Save**.

> A callback URL (`.../auth/v1/callback`) já vem pré-configurada por Supabase — foi essa que registaste no passo 3.4.

## 7. URL Configuration (uma vez, partilhado com o Google)

Já deve estar feito do setup do Google, mas confirma em **Authentication → URL Configuration**:
- **Site URL:** `http://localhost:3000` (dev) / `https://logos.cclx.pt` (prod).
- **Redirect URLs:** inclui `http://localhost:3000/**` (dev) / `https://logos.cclx.pt/**` (prod).

## 8. Smoke test

Com o provider enabled em `logos-dev`, corre `pnpm dev`, clica em **Entrar → Microsoft** (ou num CTA "Continuar com Microsoft"), e confirma o ida-e-volta. O perfil deve ser criado em `profiles` pelo trigger `on_auth_user_created` (igual ao Google).

## 9. Troubleshooting

| Sintoma | Causa provável | Fix |
|---|---|---|
| `AADSTS50011: redirect URI mismatch` | Redirect URI no Azure ≠ callback do Supabase | Garantir `https://<ref>.supabase.co/auth/v1/callback` exacto, plataforma **Web** |
| Login funciona mas sem email no perfil | Falta o scope `email` | Confirmar `scopes: 'email'` (já no código) + permission `email` no Azure |
| `AADSTS700016: application not found in directory` | Tenant URL errado no Supabase | Usar `.../common` quando "any directory + personal accounts" |
| Secret deixa de funcionar passado um tempo | Client secret expirou | Criar novo secret (passo 4) e recolar no Supabase |

## 10. Referências externas

- [Supabase Docs — Login with Azure (Microsoft)](https://supabase.com/docs/guides/auth/social-login/auth-azure)
- [Microsoft — Register an application with the Microsoft identity platform](https://learn.microsoft.com/entra/identity-platform/quickstart-register-app)
