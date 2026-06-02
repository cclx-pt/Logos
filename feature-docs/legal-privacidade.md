# Conformidade legal — Política de Privacidade + RGPD

> Branch: `launch/v2.5-security`. Data: 02-06-2026.
> Contexto: condição de lançamento. Um site português que recolhe dados pessoais
> (nome, email via Google) está sujeito ao RGPD + lei nacional (Lei 58/2019, e
> Lei 41/2004 para cookies/ePrivacy).

## 1. Decisão de âmbito: o que a lei obriga vs. o que é recomendado

O ministério pediu **apenas o mínimo necessário por lei**. Análise:

| Item | Obrigatório? | Fundamento |
|---|---|---|
| **Política de Privacidade** | ✅ Sim | RGPD art. 13.º — dever de informar o titular no momento da recolha. |
| Termos e Condições | ❌ Não | Nenhuma lei obriga ToS num serviço gratuito. Contratual/recomendado. |
| Banner de cookies | ❌ Não | Só cookies essenciais (sessão) + analytics cookieless → isento de consentimento (Lei 41/2004). |
| Página `/cookies` separada | ❌ Não | A info de cookies vive **dentro** da política (secção 6). |
| Botão "apagar conta" | ❌ Não (mas feito) | O direito ao apagamento (art. 17.º) tem de ser **cumprido**, mas a lei não exige self-service — bastaria honrar pedidos por email. O botão foi pedido pelo ministério. |

**Resultado implementado:** Política de Privacidade + link no footer + botão de apagar conta. Sem ToS, sem banner, sem `/cookies`.

## 2. Dados do responsável pelo tratamento

- **Responsável:** CCLX - Comunidade Cristã de Lisboa
- **Contacto de privacidade / exercício de direitos:** `logos@cclx.pt`
- **DPO:** não designado (igreja deste tipo provavelmente não obrigada; omitido na política conforme art. 13.º/1/b "se aplicável").

Base legal para exigir nome + email na política: **RGPD art. 13.º/1/a** ("identidade e contactos do responsável"). A morada não é estritamente exigida quando há um meio de contacto (email), por isso foi omitida.

## 3. Conteúdo da política (`src/app/privacidade/page.tsx`)

Server component, PT-PT, 9 secções a cobrir o art. 13.º:
1. Responsável pelo tratamento (CCLX + `logos@cclx.pt`)
2. Que dados e porquê (conta Google: nome/email/foto/id; registos de conclusão; cookies de sessão)
3. Fundamento jurídico (execução do serviço + interesse legítimo)
4. Subcontratantes (Supabase, Vercel, Google, Resend)
5. Transferências internacionais (EUA; SCCs / EU-US Data Privacy Framework)
6. Cookies (só essenciais; explica porque não há banner)
7. Conservação (enquanto a conta estiver ativa; apagada → eliminação permanente)
8. Direitos do titular (acesso, retificação, apagamento, oposição/portabilidade; link para `/perfil` e para a CNPD)
9. Alterações à política

`LAST_UPDATED` é uma constante no topo do ficheiro — atualizar quando o texto mudar.

## 4. Arquitetura do apagamento de conta (RGPD art. 17.º)

**Migration `20260602100000_delete_own_account.sql`** — função `delete_own_account()`:
- `SECURITY DEFINER` com `set search_path = public` (sem hijack de search_path).
- **Sem parâmetros**: o alvo é sempre `auth.uid()`. Não há como apagar a conta de outrem.
- Ordem: apaga `profiles` **antes** de `auth.users`, porque `profiles.external_auth_id → auth.users` tem `ON DELETE RESTRICT` (migration `20260514002002`). Quando V3 adicionar tabelas a apontar para `profiles.id`, devem usar `ON DELETE CASCADE` para serem arrastadas a partir do delete da `profiles` row.
- `REVOKE EXECUTE ... FROM public, anon` + `GRANT ... TO authenticated`.

**Server Action `deleteAccountAction()`** (`src/lib/auth/actions.ts`):
- `supabase.rpc('delete_own_account')` → em erro, lança e **não** termina sessão nem redireciona.
- Em sucesso, `signOut()` (best-effort, sessão já órfã) + `redirect('/')`.

**UI** (`src/components/site/delete-account-button.tsx`): confirmação em dois passos (`role="alertdialog"`), no `/perfil` numa secção "Apagar conta".

Testes: `src/lib/auth/actions.test.ts` (3 casos).

## 5. A cargo da organização (fora do código)

- **Aceitar/assinar os DPAs** dos subcontratantes (Supabase, Vercel, Google, Resend) — contratos-padrão fornecidos por cada um.
- **Cumprir pedidos** de outros direitos (acesso, portabilidade) que cheguem a `logos@cclx.pt`.
- Se entrar tracking não-essencial no futuro (ex.: pixels, analytics com cookies), passa a ser **obrigatório** um banner de consentimento — rever esta decisão.
- Validação por jurista recomendada, sobretudo quanto ao enquadramento de dados de categoria especial (art. 9.º — contexto religioso) e à isenção do art. 9.º/2/d para associações religiosas.
