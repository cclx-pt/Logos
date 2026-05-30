# Fronteira de identidade vs autorização Logos

> **Versão:** Setup (pré-V1) · **Última atualização:** 13-05-2026 · **Estado:** desenho documentado; implementação na V2

## 1. Objetivo

O Logos pode, num horizonte de 2 a 4 anos, vir a ser um módulo dentro de uma **shell** partilhada da CCLX (uma "Church app" que ainda não existe), juntamente com outros módulos como _Contribuir_ ou _Grupos de Crescimento_. Quando essa shell existir, a **autenticação** deixará de ser feita no Logos: o utilizador faz login uma vez na shell e é encaminhado para o módulo que quiser. Hoje, a shell não existe — o Logos é autónomo em `logos.cclx.pt` com Supabase Auth (Google OAuth como único provider; ver `SPEC_1.md` §17/§18) e mantém-se assim durante toda a V2 e V3.

Este documento descreve a **fronteira** que estamos a desenhar agora, antes de implementar a V2, para garantir que essa migração futura seja **uma substituição de camada e não uma reescrita**. Não documentamos o contrato concreto da shell — esse será definido em documento próprio quando a shell for desenhada. Aqui descrevemos o lado **Logos** da fronteira.

## 2. Princípio

Separamos duas camadas conceptuais:

- **Identidade — _quem és?_** Email, sessão, OAuth callbacks. É a única coisa que migra para a shell. Hoje vive na Supabase Auth (`auth.users`). Amanhã pode vir de um JWT da shell, cookie partilhado, ou outro mecanismo.
- **Autorização Logos — _o que podes fazer aqui?_** Papéis (`admin`, `super_admin`, `user`), etiquetas, conclusões de aulas e cursos, registos de acesso. Vive sempre dentro do Logos. Não migra. A shell pode vir a ter os seus próprios administradores de plataforma — pessoas que gerem a aplicação em si (criar contas, revogar acessos, auditar) mas que não gerem conteúdo dos módulos. Os papéis do Logos continuam a ter fonte de verdade no Logos, com UI dedicada para promover/despromover.

A regra prática é simples: **se uma feature responde "quem és?", é identidade. Se responde "o que esta pessoa pode fazer no Logos?", é autorização Logos.**

## 3. Camada de identidade: `src/lib/auth/`

A camada `src/lib/auth/` é a **única** parte da aplicação que importa `@supabase/ssr` ou equivalentes de identidade. O resto da app não conhece o provedor por baixo.

### 3.1. API pública

A camada expõe duas funções:

- `getCurrentUser()` — devolve o `Profile` ativo (ou `null` se não há sessão). É a única forma de saber quem está autenticado no Logos.
- `getServerClient()` — devolve um cliente Supabase autenticado (com a sessão do utilizador atual), pronto para queries que respeitam RLS. É a única forma de obter um cliente Postgres ligado à identidade do utilizador.

Em V2, a única forma de iniciar sessão é via Google OAuth — `signInWithGoogle()` é a única função de sign-in na API pública desta camada. Email/password está fora de âmbito V1-V9 (`SPEC_1.md` §17/§18); logo, esta camada não expõe `signInWithPassword`, `signUp` ou `resetPassword`.

Tudo o resto (Server Components, Server Actions, Route Handlers) consome estas três funções. **Ninguém chama `createServerClient` diretamente fora desta pasta.**

### 3.2. Porquê absorver também o cliente

A tentação inicial é abstrair só a sessão. Mas `@supabase/ssr` cria sessão **e** cliente Postgres na mesma chamada — e o cliente Postgres é o que o resto da app usa para queries autenticadas (RLS depende dele). Se a regra "só `lib/auth/` importa `@supabase/ssr`" não cobrir também o cliente, ela fura à primeira query. Por isso a camada absorve os dois.

### 3.3. Regra dura

Ver `CLAUDE.md`:

> **Identidade isolada em `src/lib/auth/`.** Importações de `@supabase/ssr` (e equivalentes de identidade) só dentro dessa pasta. O resto da app consome `getCurrentUser()` / `getServerClient()`.

Quando a pasta nascer (V2), considerar uma regra ESLint `no-restricted-imports` a proibir `@supabase/ssr` fora de `src/lib/auth/**` para tornar o desvio mais barato de detetar. Não se configura agora porque a pasta ainda não existe.

## 4. Tabela `profiles`

A tabela `profiles` é a **fonte de verdade do utilizador no Logos**. Todas as outras tabelas (`user_tags`, `lesson_completions`, `course_completions`, `course_access_log`, etc.) fazem FK para `profiles.id` — **nunca para `auth.users`**.

```
profiles
 ├─ id (uuid, PK)                 -- ID interno estável; FK universal para tudo o que é Logos
 ├─ external_auth_id (uuid, UNIQUE) -- aponta para o sistema de identidade externo
 ├─ display_name (text)
 ├─ role ('user'|'admin'|'super_admin')
 ├─ created_at (timestamptz)
```

### 4.1. Semântica de cada coluna

- **`id`** — UUID interno estável. **Nunca muda**. É a chave para tudo o que é do domínio Logos. Conclusões, etiquetas, registos de acesso — tudo aponta para aqui. Se um utilizador apagar a conta na shell e voltar a registar-se, `id` pode permanecer (decisão a tomar caso a caso na altura).
- **`external_auth_id`** — aponta para o ID que o sistema de identidade externo conhece. **Hoje** é `auth.users.id` da Supabase Auth. **Amanhã** será o ID que a shell entregar (o tipo continua `uuid` por ora; se a shell vier a usar outro tipo, faz-se uma migration de coluna em UMA tabela). Esta é a **única coluna** que pode mudar de origem quando a identidade migrar.
- **`display_name`** — gerido pelo Logos. Uma pessoa pode querer ser "Pastor João" no Logos e "João C." noutro módulo da shell. Se a shell tiver um perfil global, o Logos pode importar como sugestão inicial — mas o que fica em `profiles.display_name` é o que vale dentro do Logos.
- **`role`** — papel no Logos. Fonte de verdade Logos. **Não migra para a shell** mesmo quando a shell existir: alguém pode ser admin do Logos sem ser admin da shell, e vice-versa.
- **`created_at`** — quando o `profile` Logos foi criado (não confundir com a data de registo na Supabase Auth).

### 4.2. O que **não** está aqui

- **Email.** Não duplicado. Vive em `auth.users.email` (ou no equivalente da shell, no futuro). Quando a UI admin do Logos precisar de mostrar email, pede à camada `lib/auth/` por `getEmailFor(profileId)` — não consulta `auth.users` diretamente. Esta separação ajuda RGPD: uma fonte para apagar.

### 4.3. Regra de FK universal

Ver `CLAUDE.md`:

> **FKs nunca apontam para `auth.users`.** Sempre para `profiles.id`. A única ligação ao sistema de identidade externo vive em `profiles.external_auth_id`.

Esta é a regra que torna a migração futura trivial — quando o `external_auth_id` mudar de origem, **nenhuma outra tabela é afetada**.

## 5. Sincronização `auth.users → profiles`

> **Nota de implementação (V2 PR2, 14-05-2026):** a estratégia "Server Action + trigger" descrita abaixo foi simplificada na implementação para **trigger sozinho**. O Server Action no callback exigiria `SUPABASE_SERVICE_ROLE_KEY` (RLS em `profiles` deixou-se deliberadamente sem `for insert` policy em PR1) e o trigger `SECURITY DEFINER` consegue ler `raw_user_meta_data` sem dificuldade. Cobre 100% dos caminhos sem novo segredo. Decisão e código real em `feature-docs/v2-auth.md` §2 "Decisão"; este parágrafo fica como contexto histórico do desenho original.

Quando um utilizador faz primeiro login com Google, o registo `auth.users` nasce automaticamente (Supabase Auth processa o callback OAuth). O `profiles` correspondente tem de aparecer também. Estratégia originalmente desenhada — **defesa em profundidade** com dois caminhos:

1. **Server Action no callback OAuth.** O endpoint `/auth/callback?code=...` (que recebe o código de autorização do Google e troca-o por sessão Supabase) executa `insert into profiles (external_auth_id, display_name) values ($1, $2) on conflict (external_auth_id) do nothing`. É controlado, testável em Vitest, e mockável. O `display_name` inicial é lido do claim `name` (ou `given_name`/`full_name`) que o Google devolve.
2. **Trigger DB defensivo.** Uma migration cria um trigger em `auth.users` que faz o mesmo `insert ... on conflict do nothing`. Apanha qualquer caminho que escape ao Server Action — por exemplo, criação de utilizadores via SQL admin ou painel da Supabase.

Ambos são idempotentes (`on conflict do nothing`); correr ambos não cria duplicados nem race conditions. O Server Action também serve para pôr `display_name` inicial vindo dos metadados OAuth (que o trigger DB tem mais dificuldade em ler). O trigger DB só preenche o mínimo (`external_auth_id`) — o Server Action completa.

Esta estratégia foi revista em V2 PR2 (ver nota acima): mantemos só o trigger, que faz o coalesce(name, full_name, email) ele próprio.

### 5.1. Bootstrap do primeiro Super Admin

O sistema arranca sem nenhum `super_admin`: o callback OAuth + trigger DB criam `profiles` sempre com `role='user'`. Para arrancar a cadeia, faz-se um seed manual por ambiente — uma vez por cada ambiente (`logos-dev`, `logos-prod`), depois é o próprio super_admin que promove os outros pela UI dedicada.

**Pessoa designada:** `joaocanelasribeiro@gmail.com` (V2). Decisão registada em `SPEC_1.md` §4 e `architecture.md` §4.

**Processo:**

1. Pessoa faz login na app via Google OAuth. Isto cria `auth.users` e, em cascata, `profiles` com `role='user'`.
2. Operador corre `supabase/seed/super-admin.sql.example` (ou cópia local `super-admin.sql`, não versionada) contra o ambiente. O ficheiro está documentado in-line e é idempotente:
   - Lança erro explícito se a pessoa ainda não fez login.
   - Faz no-op se já é `super_admin`.
   - Reporta nº de rows actualizadas via `RAISE NOTICE`.
3. Operador verifica que o `update` afectou exactamente 1 row.

> **Promoção a super_admin pela UI (30-05-2026):** depois de existir o primeiro super_admin (seed acima), qualquer super_admin pode promover outros utilizadores a `super_admin` em `/admin/utilizadores` (botão "Promover a super admin" + confirmação inline). O trigger `enforce_profiles_role_mutation_authority` passou a aceitar `NEW.role = 'super_admin'`, mas **continua a bloquear alterar o papel de um super_admin já existente** — ou seja, **despromover** um super_admin é ainda só por SQL directo (evita lock-out). O seed `.example` mantém-se como bootstrap do *primeiro* super_admin de cada ambiente.

**Porquê SQL versionado e não migration:**

- Uma migration assume um `auth.users` específico, o que falha em qualquer DB de CI/teste que não tenha o login prévio. O Vercel Preview (que aponta para `logos-dev`) corre migrations automaticamente — incluir o seed numa migration partiria builds.
- O seed só corre uma vez por ambiente, depois de um acto humano explícito. SQL versionado como `.example` dá rasto auditável (qualquer pessoa que olhe para o repo entende o processo) sem o transformar em automação.

**Porquê não hard-codar `display_name`:**

- `display_name` vem do claim Google no primeiro login (Server Action no callback). O seed só toca em `role`. Mantém-se assim a regra "identidade vem do provider; autorização Logos é Logos".

## 6. RLS via `current_profile_id()`

Sem indireção, RLS é trivial: `where user_id = auth.uid()`. Com a indireção `auth.uid() → external_auth_id → profile.id`, escrever esse lookup em todas as policies é frágil — qualquer policy nova esquece-se da indireção e fura.

Solução: **uma só função SQL** que isola a indireção:

```sql
create function current_profile_id() returns uuid
language sql stable
as $$
  select id from profiles where external_auth_id = auth.uid()
$$;
```

Todas as policies usam `current_profile_id()`:

```sql
create policy "user vê só as suas conclusões"
  on lesson_completions for select
  using (user_id = current_profile_id());
```

`stable` permite ao planeador Postgres cachear o resultado dentro de uma query. Performance: idêntica a uma policy "direta".

**Quando a shell vier**, troca-se a implementação da função (por exemplo, lê de outro JWT claim em vez de `auth.uid()`). **As policies não mudam.** Esta é a peça operacional que torna a migração possível: se as policies estivessem espalhadas com lookups inline, qualquer migração era uma reescrita.

## 7. Email vs `display_name` — onde fica o quê

| Dado | Onde vive | Quem gere | Porquê |
|---|---|---|---|
| Email | `auth.users.email` (alimentado pelo claim do Google OAuth) | Sistema de identidade externo (Google → Supabase Auth) | Uma só fonte da verdade. Facilita RGPD (pedido de eliminação só toca um sítio). |
| `display_name` | `profiles.display_name` | Logos (valor inicial vem do claim `name`/`given_name` do Google; pode ser editado depois) | Pode ser específico ao contexto Logos. A pessoa pode querer um nome diferente neste módulo. |
| `role` | `profiles.role` | Logos | Autorização Logos, não identidade. Não migra. |

## 8. Migração futura para shell — em alto nível

Quando a shell existir e for o momento de migrar (decisão **não tomada agora**; depende da shell estar pronta e estável):

**O que muda:**
- Implementação da camada `src/lib/auth/` — substitui-se Supabase Auth pelo mecanismo da shell (validação de JWT, cookie partilhado, etc.).
- Implementação da função `current_profile_id()` — passa a ler de outro claim ou de outra função, em vez de `auth.uid()`.
- Os valores de `profiles.external_auth_id` migram do espaço de IDs da Supabase para o espaço de IDs da shell. Esta é a única migração de dados; afeta uma coluna numa tabela.

**O que não muda:**
- API pública da camada `lib/auth/` (`getCurrentUser`, `getServerClient`) — assinaturas iguais.
- `profiles.id` e tudo o que aponta para ele (todas as outras tabelas).
- Schema das tabelas de domínio (cursos, módulos, aulas, etiquetas, conclusões).
- Policies RLS — escritas contra `current_profile_id()`, não tocam.
- UI de admin do Logos para promover papéis. Os papéis continuam fonte de verdade do Logos.
- Etiquetas. Continuam exclusivamente no Logos.

O contrato concreto (formato do JWT, cookies, fluxo de logout coordenado, etc.) será definido em documento próprio (`feature-docs/shell-integration.md` ou similar) na altura da migração — não agora.

## 9. Limites conhecidos

- A função `current_profile_id()` faz lookup por linha. Em queries com volumes muito altos, pode justificar-se pôr `profile_id` num custom JWT claim para evitar o lookup. Não é problema na V2-V3 (volumes pequenos); reavaliar quando os volumes o exigirem.
- Se um `auth.users` for apagado externamente (admin Supabase apaga conta), `profiles.external_auth_id` fica órfão. O `profiles` permanece para preservar histórico (`lesson_completions` continuam atribuídas). Política de eliminação dura é decisão de produto, não arquitetural.
- Esta entrega é só documental. A camada `src/lib/auth/`, a tabela `profiles` e o trigger não existem ainda — implementam-se na V2.

## 10. Fora deste documento

- **Contrato concreto da shell.** Não existe; será definido quando a shell for desenhada.
- **Implementação V2 da camada `lib/auth/`.** Vai ter o seu próprio documento (`feature-docs/auth.md`) quando ficar concluída.
- **Política de eliminação de conta / RGPD.** Coberto em `architecture.md` §11.
- **Detalhes da UI de promoção de papéis (V2).** Documentação V2.
- **Fluxos de email/password (signup, recovery, validação).** Fora de âmbito V1-V9 — Google OAuth é o método único (`SPEC_1.md` §17/§18).

## 11. Testes (princípios)

A camada `lib/auth/` deve expor `getCurrentUser()` mockável diretamente em testes Vitest. Testes que validem comportamento por papel (`admin` vs `user` vs `super_admin`) injetam um `Profile` fake e verificam o ramo de lógica. Testes de RLS correm contra Supabase local com a função `current_profile_id()` instalada. Cobertura concreta fica para a documentação V2.

## 12. Referências

- `CLAUDE.md` — secção "🚫 Regras (não negociáveis)": as três regras duras desta fronteira (identidade isolada, FK universal, email não duplicado).
- `architecture.md` §2 — modelo de dados com FKs corrigidas para `profiles.id`.
- `architecture.md` §3 — camada de identidade na tabela de camadas.
- `architecture.md` §4 — descrição operacional de auth e papéis.
- `SPEC_1.md` §17 — entrada sobre integração futura com shell partilhada CCLX.
- `feature-docs/README.md` — convenções de documentação por feature.
