# Pendências legais — o que ainda falta para conformidade plena

> Branch: `launch/v2.5-security`. Criado 02-06-2026.
> Companion de `legal-privacidade.md` (o que **já** está feito).
> Este doc lista **só o que se aplica à CCLX/LOGOS e ainda não foi feito**.

Legenda de responsável: 🧑‍💻 **código** (faz-se no repo) · 🏛️ **organização** (CCLX, fora do código) · ⚙️ **operação** (deploy/infra).

---

## 🔴 Obrigatório por lei — a tratar antes/no lançamento

### 1. 🧑‍💻 Aviso de privacidade no ponto de recolha (art. 13.º) — ✅ FEITO (02-06-2026)
O RGPD exige informar o titular **no momento em que os dados são recolhidos**, não só num link de footer. O CTA de login do hero (`home-hero.tsx`) passou a mostrar, quando não autenticado:
> "Entras com a tua conta Google. Ao continuar, aceitas a [Política de Privacidade]."

### 2. 🏛️ Acordos de subcontratação / DPA (art. 28.º)
Tem de existir um contrato entre o responsável (CCLX) e cada subcontratante que trata dados por nossa conta. São contratos-padrão que cada fornecedor disponibiliza — basta aceitar/assinar na conta:
- **Supabase** — DPA na dashboard (Settings → Legal/Compliance).
- **Vercel** — DPA aceitável no painel da equipa.
- **Google Cloud / OAuth** — coberto pelos Google Cloud/Workspace Data Processing Terms.
- **Resend** — DPA disponível a pedido/painel.

**Estado:** por fazer. Ação da CCLX. Sem isto, o uso destes fornecedores não está formalmente coberto.

### 3. 🏛️ Fundamento para dados de categoria especial (art. 9.º)
Ser utilizador de uma plataforma de estudo bíblico de uma igreja pode revelar **convicções religiosas** (categoria especial). Há a isenção do **art. 9.º/2/d** para associações religiosas tratarem dados dos seus membros/contactos regulares — mas isto deve ser confirmado e registado internamente (ou, em alternativa, obter consentimento explícito).

**Estado:** por confirmar com jurista. Decisão a documentar.

### 4. 🏛️ Procedimento de violação de dados (art. 33.º/34.º)
Obrigação de notificar a **CNPD em 72h** após tomar conhecimento de uma violação que represente risco, e os titulares se o risco for elevado. Precisa de um procedimento interno simples (quem deteta, quem avalia, quem notifica, registo).

**Estado:** por criar. Documento interno da CCLX.

---

## 🟠 Fortemente recomendado / provavelmente aplicável

### 5. 🏛️ Registo de Atividades de Tratamento — RAT (art. 30.º)
Organizações com <250 pessoas estão em princípio isentas, **exceto** se o tratamento não for ocasional ou envolver categorias especiais — o que pode ser o nosso caso (contexto religioso). Recomenda-se manter um RAT simples: finalidades, categorias de dados/titulares, subcontratantes, transferências, prazos.

**Estado:** por criar. Documento interno.

### 6. 🏛️ Avaliação de necessidade de Encarregado de Proteção de Dados (DPO, art. 37.º)
Provavelmente **não** é obrigatório (não há monitorização em larga escala nem tratamento de categorias especiais em larga escala). Mas a conclusão deve ficar registada.

**Estado:** avaliação a documentar (conclusão esperada: não obrigatório).

### 7. 🧑‍💻🏛️ Menores (art. 8.º + Lei 58/2019)
Em Portugal, o consentimento de menores em serviços da sociedade da informação aplica-se a partir dos **13 anos**; abaixo disso exige consentimento dos pais. Se a plataforma puder ser usada por crianças, é preciso decidir a abordagem (idade mínima nos termos de uso, ou consentimento parental).

**Estado:** decisão de produto pendente. Se a plataforma for de adultos/jovens da igreja, basta indicar idade mínima.

---

## 🟢 Operacional (não é "lei", mas faz a conformidade funcionar)

### 8. ⚙️ Aplicar migrações à base de dados — ✅ FEITO (02-06-2026)
- **`logos-dev`:** já tinha as migrações de segurança (sob outros timestamps, via linha V3); aplicada só a nova `delete_own_account` (versão MCP `20260602133608`).
- **`logos-prod`:** aplicada a sequência pendente completa (`role_mutation_authority`, `revoke_execute...`, `profiles_update_lockdown`, `rate_limit`, `delete_own_account`), **com a versão exata de cada ficheiro** registada em `schema_migrations` — o histórico de prod passa a bater certo com o repo. Validado: anon não executa as funções sensíveis, `authenticated` executa o que precisa, dono `postgres`. Advisor de segurança: só avisos esperados (RLS-no-policy intencional no `rate_limit`, helpers de RLS, RPC de apagamento intencional, leaked-password irrelevante por ser OAuth-only).

### 8b. ⚠️ 🧑‍💻 Caveat V3: apagamento bloqueado para autores de conteúdo
Em `logos-dev` (que já tem V3) há FKs `RESTRICT` para `profiles.id` em `courses.created_by`, `tags.created_by` e `user_tags.assigned_by`. Um **utilizador normal** apaga-se sem problema (conclusões/vistas/tags próprias são `CASCADE`), mas um **admin que criou conteúdo** seria bloqueado pelo `delete_own_account()`. Irrelevante em prod hoje (sem V3), mas **quando o V3 for para prod** é preciso uma estratégia (ex.: `SET NULL`, reatribuir a conta de sistema, ou bloquear apagamento de autores com aviso).

### 9. 🧑‍💻 Ligar o caller do rate limiter
`check_rate_limit()` é uma primitiva de DB sem consumidor na app. Não é exigência legal, mas é hardening pendente desta branch.

**Estado:** pós-lançamento.

---

## Já feito (ver `legal-privacidade.md`)
- ✅ Política de Privacidade (`/privacidade`, art. 13.º)
- ✅ Link no footer
- ✅ Direito ao apagamento self-service (`delete_own_account()`, art. 17.º)
- ✅ Decisão de âmbito: ToS / banner de cookies / página `/cookies` dispensados
