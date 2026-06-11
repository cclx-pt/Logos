# accounts.md — contas e ownership de serviços externos

> **Última atualização:** 11-06-2026
> **Resumo:** todas as contas críticas (faturação, *owner* / *root* admin de serviços externos) ficam sob `joaocanelasribeiro@gmail.com`, o líder do ministério LOGOS. Esta decisão centraliza a *bus factor* + sucessão na pessoa que detém o ministério na vida real, e não em colaboradores técnicos que possam rotar.

## 1. Princípio

A camada de identidade pode mudar (e mudará, quando a *shell* CCLX existir, ver `auth-architecture.md` §5). O que **não** muda é quem controla o **fornecedor** desses serviços. Esse controlo vive na conta de email indicada acima — é a única que pode:

- Adicionar/remover membros, mover scopes, fechar projectos.
- Resetar passwords e métodos 2FA.
- Receber facturas e gerir métodos de pagamento.
- Recuperar acesso em caso de comprometimento de qualquer outra conta.

Contas de outros colaboradores (incluindo a do *developer* actual, `ricardoribeiro9@googlemail.com`) podem ter acesso operacional (push, deploy, gerir env vars) mas **nunca** *ownership*.

## 2. Mapa de contas

| Serviço | Scope / Org | Owner email | Notas |
|---|---|---|---|
| **GitHub** | `cclx-pt/Logos` | `joaocanelasribeiro@gmail.com` | Org `cclx-pt` é da CCLX. Repo público desde 12-05-2026 (ver `vercel.md` §5). Branch protection em `main` activa. |
| **Vercel** | scope `jcrninjas-projects`, projecto `logos` | `joaocanelasribeiro@gmail.com` | Conta pessoal Hobby (0€/mês). Adiar criação de team CCLX até Vercel Pro ser justificável (~20€/mês/membro). |
| **Supabase** | projectos `logos-dev` (`dknrnqyqlojvnhspwjrd`) e `logos-prod` (`tirzriuabfwzqxtjsmfb`) | `joaocanelasribeiro@gmail.com` | Plano free `eu-west-3`. Sem backups; risco aceite até V3. |
| **Google Cloud** (OAuth client) | projecto Google Cloud do LOGOS | `joaocanelasribeiro@gmail.com` | Detém OAuth Consent Screen + client IDs para Google Auth nos 2 projectos Supabase. Detalhes em `google-oauth-setup.md`. |
| **Domínio `cclx.pt`** | Hostinger | CCLX (admin: `joaocanelasribeiro@gmail.com`) | Subdomínio `logos.cclx.pt` aponta para Vercel via CNAME. |
| **Resend** | domínio `logos.cclx.pt` (região `eu-west-1`) | `joaocanelasribeiro@gmail.com` | Conta criada e domínio ligado (11-06-2026): DKIM + SPF + MX publicados no DNS Hostinger e a resolver. Integração na app só em V5 (Q&A). Detalhes em `resend.md`. |
| **Conta `joaocanelasribeiro@gmail.com` em Supabase Auth** | utilizador final | si próprio | Primeiro `super_admin` em `logos-dev` e `logos-prod` (ver `auth-architecture.md` §5.1 + `super-admin.sql.example`). |

## 3. Implicações operacionais

- **Onboarding de novos colaboradores:** convite vem de João nas dashboards (Vercel, Supabase, GitHub org). Nunca trocar *ownership* — apenas adicionar como *member* / *collaborator*.
- **Recovery codes / 2FA:** João guarda os *backup codes* fora deste repo. Não versionar.
- **Email transaccional do site** (`logos@cclx.pt`): é um alias da CCLX, não uma Google account. Não confundir com o email *owner* das contas externas.
- **Service-role keys / Vercel tokens:** mesmo gerados pela conta do João, ficam apenas em `.env.local` (gitignored) e no painel do Vercel. Nunca commitar.

## 4. Quando atualizar este doc

- Sempre que uma nova conta de fornecedor for criada para o projecto.
- Quando *ownership* mudar (não devia acontecer; se acontecer, registar a razão).
- Quando um serviço previamente adiado (Resend, Vercel team CCLX, dark mode CDN) for activado.
