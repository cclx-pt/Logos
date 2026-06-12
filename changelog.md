# changelog.md — Logos

> **Quando atualizar:** após cada feature, fix ou mudança relevante.
> **Formato:** [data DD-MM-YYYY] — descrição curta no infinitivo, agrupada por tipo.
> **Tipos:** `add` (nova feature), `update` (melhoria), `fix` (correção), `docs` (documentação), `infra` (CI/CD, deploy, dependências).

---

## [Unreleased]

### update
- update: [12-06-2026] **leitor: breadcrumbs removidas + descrições na coluna central + botão "Sair do curso"** (V3.4 PR5, pedido do líder). Removida a breadcrumb ("Conteúdos › Curso › Módulo") das páginas de **curso** e **módulo** - a navegação faz-se pela árvore (na aula), pela lista de aulas e pela saída para o curso. A página de módulo (que não tem árvore) ganha um "← Voltar ao curso" no topo, igual à vista de aula. As descrições do **curso** e do **módulo** passam a preencher a coluna central (saíram `max-w-prose`/`max-w-3xl` estreito + `text-justify` + `hyphens-auto`): deixam de ficar encostadas/justificadas e ficam alinhadas com a vista de aula já aprovada. O **"Sair do curso"** (unenroll) deixa de ser um link minúsculo e passa a **botão maior, neutro, com contorno vermelho** (`h-11`, `border-destructive`), mais visível como opção.

### fix
- fix: [12-06-2026] **leitor de aula: conteúdo principal centrado + sticky da árvore corrigido** (V3.4 PR4, ajuste do líder ao PR2). (1) O vídeo/apostila/descrição ficavam puxados à esquerda porque a árvore deslocava o grupo; agora o artigo fica **centrado na página** via um espelho invisível da árvore à esquerda (`max-w-[84rem]` + flanco `w-64` de cada lado), com a árvore só no lado direito. (2) A árvore sticky enfiava-se por baixo do cabeçalho fixo (h-16), aparecendo cortada a meio: passa de `top-6` para `top-20` (abaixo do cabeçalho) + `max-h-[calc(100vh-7rem)] overflow-y-auto` - o quadrado fica todo visível com margem e faz scroll interno se for mais alto que o ecrã.

### feat
- feat: [12-06-2026] **cabeçalho do módulo mais limpo** (V3.4 PR3, item 7) - na página de módulo (`/conteudos/[courseId]/modulos/[moduleId]`): removido o eyebrow "Módulo N de M" (a contagem) e o indicador de conclusão solto do cabeçalho; o header fica só **título + descrição** (descrição também passa a alinhada à esquerda, sem `text-justify`). A informação "{x}/{total} concluídas" + "✓ concluído" muda-se para **ao lado do título "Aulas"** da secção. Breadcrumb mostra o título do módulo em vez de "Módulo N". Sem mudança de lógica (apresentacional). 461 verdes.
- feat: [12-06-2026] **leitor de aula: árvore de navegação + layout** (V3.4 PR2, itens 3-6). (3) Nova **árvore de navegação à direita** (`lesson-tree.tsx`, só `xl+`, sticky) com módulos colapsáveis, aula atual destacada e ✓ nas aulas concluídas - espelho público da `CourseTree` do admin; carrega o estado de conclusão de todo o curso. (4) Descrição da aula passa a **alinhada à esquerda** numa coluna legível (`max-w-3xl`, sem `text-justify`/`hyphens-auto` - o justify em coluna estreita criava o efeito "atira para a direita"). (5) Navegação inferior passa a **módulo-scoped** (`getModuleLessonNavigation` em `detail.ts`): a última aula do módulo deixa de mostrar "Próxima aula" (a passagem entre módulos fica para o banner de conclusão + a árvore); a nav inferior só renderiza se houver anterior ou próxima. (6) **Breadcrumb do topo removido** e substituído por um botão claro "← Voltar ao curso". Testes novos: `getModuleLessonNavigation` (5) + `lesson-tree` (3). 469 verdes.
- feat: [12-06-2026] **modelo de aula só-vídeo (`video`)** (V3.4 PR1) - uma aula passa a poder ser `pdf` (só apostila), `video` (só vídeo do YouTube) ou `video_pdf` (ambos). DB: migration `20260612120000_lessons_video_only_template.sql` relaxa os CHECK de `lessons` (apostila deixa de ser sempre obrigatória; vídeo passa a exigir `youtube_url`; só-vídeo guarda `pdf_storage_path = null`) - **só `logos-dev`**. Server Actions (`createLessonAction`/`updateLessonAction`) validam YouTube quando o template tem vídeo e PDF quando tem apostila; trocar para `video` limpa o path e remove o ficheiro do bucket best-effort. **Form de aula condicional** (item 2): novo Client Component `lesson-form.tsx` mostra só os campos do template escolhido (só PDF → ficheiro; só vídeo → URL; ambos → os dois). Leitor de aula renderiza vídeo/apostila conforme o template; etiquetas dos 3 modelos no admin (`só pdf`/`só vídeo`/`vídeo + pdf`) e no leitor (`pdf`/`vídeo`/`vídeo + pdf`, via `template-label.ts`). SPEC bump 3.2; tipos `LessonTemplate` + `pdf_storage_path` nullable em `detail.ts`. 461 verdes.

### add
- add: [11-06-2026] **login por email OTP validado ponta-a-ponta** em `logos-dev` - o caminho que estava inerte desde a PR #49 ficou operacional. SMTP custom do **Resend** ligado no Supabase (domínio `logos.cclx.pt` Verified, região `eu-west-1`; DKIM/SPF/MX confirmados no DNS - registos guardados em `email-otp-setup-guide.md` Parte B), rate limit de email subido de 2/h para 30/h (só possível com SMTP custom), templates Magic Link + Confirm signup com `{{ .Token }}`, e **Turnstile** ativo. Fluxo `/entrar` → email → código de 6 dígitos → entrar a funcionar; primeiro login com email novo cria linha em `profiles`. Pendentes #1 e #2 do handoff fechados.

### fix
- fix: [11-06-2026] **Turnstile carregava mas nunca resolvia ("não foi possível conectar ao site")** - a CSP permitia o script (`script-src`) e a frame (`frame-src`) do `challenges.cloudflare.com` mas faltava no **`connect-src`**, por isso o fetch que valida o desafio era bloqueado: desafio emitido, nunca resolvido, e o envio de OTP falhava por `captcha_token` em falta/inválido. `next.config.ts` ganha `https://challenges.cloudflare.com` no `connect-src`; teste de `connect-src` em `security-headers.test.ts` passa a exigir o domínio. (O sintoma somava-se a um segundo problema do utilizador: testar no URL único do deployment, fora dos hostnames do widget - resolve-se usando o alias da branch.)

### update
- update: [11-06-2026] **CTAs de login dos estados anónimos vão para `/entrar` (login geral), não direto ao Google**. Em "não autenticado", a home, a página de curso e "Os meus cursos" mostravam botões "Continuar com Google" que iniciavam o OAuth do Google diretamente - escondiam o login por email. Passam a um CTA único para `/entrar?next=...` (a página que junta Google + email OTP), com nome geral: "Entrar" (home + meus cursos) e "Entrar para começar" (página de curso). Novo componente `SignInCta` (link `<Link>` para `/entrar`, com prefetch seguro - ao contrário do `ProviderSignIn`, que vai direto a um provider e fica só na `/entrar`). Copy de "Os meus cursos" perde "com a tua conta Google". 3 testes adaptados (home, meus-cursos, start-course-cta) - href passa de `/auth/login/google?next=` para `/entrar?next=`.

### feat
- feat: [11-06-2026] **cabeçalho mostra só a parte antes do `@` para utilizadores de email** - quem entra por email OTP tem o email como `display_name`, e o cabeçalho mostrava "Olá, joao@gmail.com" / "Sessão de joao@gmail.com". `user-menu.tsx` ganha um helper `localPart` que tira o domínio na camada de apresentação (no-op para utilizadores de Google, que têm nome real). Teste novo para o caso do email.

### docs
- docs: [11-06-2026] **handoff de pendentes pré-lançamento** em `feature-docs/pre-lancamento-handoff.md` (OTP, Resend SMTP, lançamento). Registos DNS Resend confirmados salvados para `email-otp-setup-guide.md` (Parte B) a partir do draft #52, que foi fechado por ter base antiga e enquadramento errado para V3 (dava Resend como adiado para V5 / login Google puro).

### sec
- sec: [11-06-2026] **revisão de segurança V3 pré-lançamento** (`pnpm audit` + Supabase advisors + column-scoping das policies UPDATE + código de auth novo). Achados corrigidos: (1) 4 vulns moderate em `hono` (transitiva do CLI `shadcn`, tooling) - pnpm override `>=4.12.21` + `shadcn` movido para devDependencies, audit a zero; (2) `count_registered_users()` deixa de estar executável por `anon` via RPC (gate interno já existia; REVOKE reduz superfície); (3) **column-scoping em `course_access_log`** - a policy UPDATE own limitava a linha mas não as colunas (dava para falsificar `course_id`/`accessed_at` via REST); GRANT passa a cobrir só `unenrolled_at`, a única coluna que a app escreve; (4) `search_path` fixo em `set_updated_at()`. Migration `20260611120000_security_review_hardening.sql`. Falsos-positivos dos advisors documentados (helpers RLS para anon/authenticated, `delete_own_account`, `rate_limit` deny-all, leaked-password N/A sem palavras-passe). Relatório completo em `feature-docs/revisao-seguranca-v3.md`. 457 verdes.

### update
- update: [11-06-2026] copy de `/entrar` sem "É sempre gratuito." (edição manual do líder do projeto).

### fix
- fix: [10-06-2026] **login Google rebentava com "This page couldn't load" (500)** - o botão "Entrar" do cabeçalho dava erro de página em vez de ir para o Google (bug desde a PR #49; o botão da home funcionava porque era um `<form action>`, que o React sabe seguir, ao passo que o dropdown chamava a action *programaticamente* via `startTransition`). Causa raiz: iniciar o OAuth dentro de uma **Server Action** termina num `redirect()` para um URL **externo** (o do provider); quando a action é invocada pelo cliente, o Next 16 rebenta com `Error: Connection closed.` (500). Reproduzido no preview: caminho no-JS dava 303 (ok), invocação programática 500. **Fix definitivo:** o início do OAuth passa a ser um **route handler** `src/app/auth/login/[provider]/route.ts` que devolve um **307 HTTP real** para o provider (route handlers redirecionam para externo sem problema, ao contrário de Server Actions); os botões de login passam a **simples `<a>`** para `/auth/login/google?next=...`. Funciona com ou sem JS, sem hidratação nem o dropdown que se desmonta. `signInWithGoogleAction` removida de `actions.ts`; `getOrigin`/host-allowlist extraídos para `src/lib/auth/origin.ts` (partilhados); `providers.ts` deixa de referenciar a action (registry `{slug,label}` + `isSignInProvider` + `providerLoginHref`); `ProviderSignIn` e `SignInButton` viram links. Testes: novos `route.test.ts` (307 para o provider, provider inválido, next externo descartado, erro Supabase) + `origin.test.ts` (allowlist, fallback de headers, host-injection); 4 adaptados (button → link + href). 448 → 457 verdes. **Adenda:** o botão "Entrar" do cabeçalho deixou de ser dropdown (Base UI) e passou a um **`<Link>` directo para `/entrar`** - mais simples e sem qualquer dependência de navegação de item-de-dropdown; a página `/entrar` já junta Google + email OTP.
- fix: [10-06-2026] **CSP bloqueava o Supabase Storage - banners e apostilas PDF "desapareciam"**. Regressão silenciosa do port de hardening (#47): a paridade foi verificada contra `main`, mas `main` (V2) não tem banners de cursos nem visualizador inline de apostilas. `img-src` não permitia as signed URLs dos banners (`course-banners`, renderizados por `<CourseImage>` com `unoptimized` no catálogo, `/meus-cursos`, landing do curso e preview do admin) e `frame-src` só permitia YouTube + Turnstile, bloqueando o iframe da apostila (`lesson-pdfs`) na página de aula. `next.config.ts` ganha `https://*.supabase.co` nas duas directivas (wildcard cobre `logos-dev` e `logos-prod` sem acoplar a CSP a env vars - mesmo racional do `connect-src`). Teste de regressão novo `src/test/security-headers.test.ts` pina as origens externas de cada directiva + o conjunto completo de headers. 440 → 445 verdes.

### update
- update: [10-06-2026] **nomes dos autores repostos nos testemunhos da home** - ordem do líder (a anonimização de 04-06-2026 tinha ficado "os 3 não fazemos sem ordem"; a ordem chegou). `home-testimonials.tsx` recupera `author` + `<figcaption>` (estrutura pré-anonimização); nome do 3.º testemunho passa ao completo: **Raniere Bruno** (era só "Raniere"). Teste de anonimato invertido - passa a verificar os 4 nomes (Bernardo Degues, Sara Narciso, Raniere Bruno, André Mata). 445 verdes (sem mudança líquida).
- update: [10-06-2026] **CTAs da página de curso: copy + destino mais claros**. (1) Vista "não inscrito": o botão passa de "Começar curso" para **"Adicionar a “Meus cursos”"** (com ícone +) - inscrever não navega para nenhuma aula, acrescenta o curso a `/meus-cursos`. (2) Vista "inscrito": "Começar curso" (sem progresso) e "Continuar curso" (com progresso) ganham uma segunda linha com o **nome da aula de destino** ("Primeira aula: X" / "A seguir: X"). (3) "Continuar curso" deixa de ir sempre para a primeira aula do curso e passa a retomar na **primeira aula não concluída** - novo helper puro `getFirstIncompleteLesson` em `completion.ts` (com set vazio devolve a primeira aula, por isso serve os dois CTAs; fecha a intenção anotada no docstring de PR6/PR7). `getFirstLessonOfCourse` removido de `detail.ts` (ficou morto). Testes: 4 novos do helper + 1 novo do CTA de inscrição + asserts do nome da aula no `start-course-cta`; 3 do helper removido saem. 445 → 447 verdes.

### docs
- docs: [10-06-2026] **runbook de configuração externa do email OTP** em `feature-docs/email-otp-setup-guide.md`: passo-a-passo do zero - conta Resend + domínio `logos.cclx.pt` (região EU), registos DNS (MX/SPF/DKIM/DMARC) na Hostinger com os nomes relativos certos, API key, SMTP custom + provider Email + **templates com `{{ .Token }}` em PT-PT** (por default o Supabase envia link, não código - Magic Link **e** Confirm signup) + rate limits em `logos-dev`, widget Turnstile (site key no deploy **antes** do secret no Supabase, senão o envio de OTP parte) e smoke test. Checklist de lançamento para `logos-prod`. `email-otp-login.md` §0/§5 e o bloqueador em `status.md` passam a apontar para o guia.

### update
- update: [10-06-2026] **login com Microsoft (Entra/Azure) removido** - decisão do líder: os métodos de login passam a ser só **Google + email OTP**. O código Microsoft (adicionado a 04-06-2026) chegou a estar pronto na PR #49, mas o provider Azure nunca foi configurado no Supabase; foi retirado antes do merge. `src/lib/auth/actions.ts`: sai `signInWithMicrosoftAction` + o helper genérico `signInWithProvider` + o map `PROVIDERS`/`OAuthProvider`; `signInWithGoogleAction` passa a fazer o `signInWithOAuth({ provider: 'google' })` diretamente. `src/lib/auth/providers.ts`: registry `SIGN_IN_PROVIDERS` fica só com Google (slug `'google'`). Copy ajustada em `/entrar` (metadata) e `/meus-cursos` (estado anónimo). `feature-docs/microsoft-oauth-setup.md` apagado; SPEC bump 3.0 → 3.1; CLAUDE/architecture/status/supabase/email-otp-login reconciliados. Tests: 4 ficheiros ajustados (`provider-sign-in`, `page`, `meus-cursos-content`, `start-course-cta`) - deixam de exigir o botão Microsoft. 440 verdes.

### add
- add: [07-06-2026] **login por email + código (OTP) implementado**. Terceiro método de login (passwordless, código de 6 dígitos via SMTP do Supabase/Resend) para quem não tem Google nem Microsoft. Server Actions `sendEmailOtpAction` / `verifyEmailOtpAction` em `src/lib/auth/actions.ts` (2 passos via `useActionState`; verificação faz `redirect(safeNextPath)`, anti-enumeration no envio). Componente `email-otp-sign-in.tsx` (email → código, reenviar, usar outro email) + `turnstile-widget.tsx` (captcha gated por `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, inerte se ausente). Rota dedicada `/entrar?next=` junta providers OAuth + "ou" + OTP; item "Email (código)" no dropdown "Entrar". **Fica inerte até configurar SMTP/Resend + Email provider no Supabase** (`feature-docs/email-otp-login.md` §5/§6). Rate-limiting via `check_rate_limit` adiado (precisa de cliente service-role); proteção ativa = Turnstile + rate-limit nativo do Supabase. Handoff `email-otp-handoff.md` apagado. Tests: `email-otp-actions.test.ts` (9) + `email-otp-sign-in.test.tsx` (3). 425 → 437.
- add: [04-06-2026] **login com Microsoft (Entra/Azure) além de Google**. A pedido do líder do projeto; override consciente da regra "Google OAuth apenas" (SPEC §17/§18 + CLAUDE.md atualizados; SPEC bump 2.9 → 3.0). Apple ficou de fora por exigir Apple Developer Program (~99 USD/ano). `src/lib/auth/actions.ts` ganha helper genérico `signInWithProvider(provider)` + wrappers `signInWithGoogleAction` / `signInWithMicrosoftAction` (Microsoft = slug `azure`, com `scopes: 'email'`). Novo componente reutilizável `src/components/site/provider-sign-in.tsx` (par de botões Google + Microsoft num só `<form>` com `next` partilhado via `formAction`). Aplicado em hero, `/meus-cursos` (estado anónimo), CTA de começar curso e vista anónima de `/conteudos/[courseId]`. `SignInButton` do cabeçalho passa a dropdown com os dois providers. **O código fica inerte até o provider Azure ser configurado no painel Supabase** (`logos-dev` e, no lançamento, `logos-prod`) - passo-a-passo em `feature-docs/microsoft-oauth-setup.md`. Tests: novo `provider-sign-in.test.tsx` (3) + ajustes em `page.test.tsx`, `meus-cursos-content.test.tsx`, `start-course-cta.test.tsx`.

### update
- update: [04-06-2026] **testemunhos do carrossel da home anónimos**, alinhados com a versão em produção (V2/`main`). Os 4 quotes mantêm-se; removidos os nomes de autor (`author`/`<figcaption>`) que tinham sido acrescentados em `v3-cursos`. `home-testimonials.tsx` + teste atualizado (passa a verificar anonimato).

### fix
- fix: [09-06-2026] **error boundary global em PT-PT** (`src/app/error.tsx`): a app não tinha nenhum `error.tsx`, e as Server Actions de OAuth fazem `throw` quando o `signInWithOAuth` falha - exatamente o que acontece hoje ao clicar "Entrar → Microsoft" com o provider Azure ainda por configurar no Supabase. O utilizador caía na página default do Next ("Application error...") em inglês e sem saída; agora cai numa página da casa com "Tentar novamente" (reset) + "Voltar ao início". 3 testes novos. Achado da revisão local da PR #49 (fallback do ultrareview que excedeu 30 min na cloud).
- fix: [09-06-2026] **poll do Turnstile com limite** (`turnstile-widget.tsx`): quando o script existe no DOM mas nunca carrega (adblocker, rede), o `setInterval` de 200ms pollava indefinidamente enquanto o componente estivesse montado. Agora desiste ao fim de ~15s.
- fix: [09-06-2026] **CSP permite o Cloudflare Turnstile** (`next.config.ts`): `script-src` e `frame-src` ganham `https://challenges.cloudflare.com`. Sem isto, quando o Turnstile fosse ativado (site key + Supabase), o browser bloqueava silenciosamente o script `api.js` e o iframe do desafio - o captcha nunca renderizava e o envio de OTP falhava com captcha obrigatório. Detetado em revisão local do commit OTP.
- fix: [09-06-2026] **"Reenviar código" deixa de reutilizar o token Turnstile consumido**. Tokens Turnstile são de uso único: o do 1º envio já foi gasto, e o reenvio submetia-o outra vez (falharia sempre que o captcha estivesse ativo no Supabase). O form de reenviar passa a montar um `TurnstileWidget` próprio (renderiza `null` sem site key - zero impacto até o captcha existir) e o widget limpa o token ao desmontar (`onVerify('')`), para nenhum form submeter token obsoleto de outro passo.

### update
- update: [09-06-2026] **registry único de providers de login** (`src/lib/auth/providers.ts`): `SIGN_IN_PROVIDERS` passa a alimentar o `<ProviderSignIn>` e o dropdown "Entrar" do cabeçalho - adicionar/remover um provider é um wrapper em `actions.ts` + uma entrada na lista, sem tocar nos componentes. (Vive fora de `actions.ts` porque ficheiros `'use server'` só exportam funções async.)
- update: [09-06-2026] **fluxo OTP reutiliza `SubmitButton`**: os dois submits de `email-otp-sign-in.tsx` deixam de duplicar à mão o estilo do botão primário + estado pending (spinner via `useFormStatus`); `PRIMARY_BTN` removido. O reset de `forceEmailStep` migrou do `onClick` do botão para o wrapper da action do form.
- update: [09-06-2026] `signInWithProvider` paraleliza `getServerClient()` + `headers()` (independentes; eram sequenciais no caminho de login).

### docs
- docs: [09-06-2026] `architecture.md` reconciliado com o login por email OTP (diagrama §1, §4 autenticação com o fluxo de 2 passos + Turnstile, §8 DNS: SPF/DKIM Resend deixa de ser "adiado V5+" e passa a pré-condição do OTP). Lacuna deixada pelo commit do OTP, que atualizou SPEC/CLAUDE/changelog/status mas não a arquitetura.
- docs: [04-06-2026] **plano de login por email + código (OTP passwordless via Resend)** - decisão fechada de avançar (terceiro método de login para quem não tem Google/Microsoft, sem sistema de palavras-passe). Plano completo + setup Resend/SMTP/DNS/Turnstile em `feature-docs/email-otp-login.md`; handoff para implementação em `feature-docs/email-otp-handoff.md`. SPEC §17/§18/§19 atualizada (OTP entra em âmbito; password continua fora). Implementação por fazer.
- docs: [04-06-2026] apagar handoff stale `feature-docs/v3-3-handoff.md` (listava PR5-PR8 como pendentes quando já estavam mergeadas: #38/#40/#41/#42/#43) e substituir pela entrada definitiva `feature-docs/v3-3-iteration.md`. Secção "Em progresso" do `status.md` reconciliada: V3.1/V3.2/V3.3 todas fechadas em código + DB; pré-requisitos sequenciais confirmados como adiados para V4. Bloqueador residual ao merge `v3-cursos → main` continua a ser testemunhos do ministério + smoke no preview.

### add
- add: [02-06-2026] portar para `v3-cursos` o hardening de segurança da V2.5 (agora em prod). Cherry-pick dos 4 commits de segurança (sem o RGPD nem o copy/UX): headers HTTP + CSP enforcing + host allowlist (`next.config.ts`), patch Next 16.2.4 -> 16.2.6 + overrides pnpm (postcss/qs/brace-expansion), REVOKE EXECUTE nos helpers SECURITY DEFINER, lockdown da política UPDATE de `profiles`, rate limiter Postgres (`check_rate_limit`), fix de open-redirect em `next` (`src/lib/auth/redirect.ts`) e hardening do `getOrigin` contra host-header injection. Paridade de conteúdo verificada contra `main`. `bodySizeLimit` reconciliado para 25mb (a v3 faz upload de PDFs; o limite do Next é global, não por-action). 422/422 testes verdes. Caveat de migrações em `feature-docs/seguranca-port-v3.md`. (`sec/portar-seguranca-v2.5-para-v3`)

### infra
- infra: [09-06-2026] **CI passa a correr em PRs contra `v3-cursos`** (e push à branch). Desde 19-05 todas as PRs de V3 (#38-#49) abriam contra `v3-cursos` sem nenhum check de CI - só pipeline local. A razão original de limitar a `main` (poupar minutos do plano gratuito) caducou quando o repo passou a público (Actions gratuito/ilimitado em repos públicos). `ci.yml` + `feature-docs/ci.md` §2 atualizados. Check informativo (sem branch protection em `v3-cursos`).
- add: repositório GitHub privado inicial
- add: estrutura de documentação (`CLAUDE.md`, `architecture.md`, `status.md`, `feature-docs/`)
- add: `.env.example` com placeholders Supabase + Resend
- add: `.gitignore` para Next.js + Supabase

---

## [30-05-2026] — Estatísticas: pesquisa + ordenação nas tabelas (INP-safe)

### add
- **`SortableStatsTable`** (`src/components/admin/sortable-stats-table.tsx`) — tabela cliente reutilizável com **pesquisa** (opcional) e **ordenação por coluna** (clicar no cabeçalho alterna asc/desc; numéricas começam do maior). Filtro usa `useDeferredValue` para **não bloquear a escrita** (INP saudável à medida que as listas crescem). Lógica pura em `src/lib/stats-table.ts` (`filterAndSortStatRows`; 5 testes).
- Aplicado a: **overview por curso** (pesquisa por título; ordena por acessos/inscritos/finalizações/etc.), **detalhe do curso** (módulos e aulas; pesquisa de aulas; ordena por visitas/conclusões), e **por utilizador** (pesquisa por nome/papel; ordena por inscritos/terminados). A lista por-utilizador deixa de usar `ListSearch` (passa a ter também ordenação).

### fix
- Resposta ao aviso de **INP** na pesquisa: as tabelas de estatísticas filtram de forma diferida (não-bloqueante). A pesquisa do catálogo `/conteudos` já era server-side (form GET), não filtra por tecla.

### infra
- Só em `v3-cursos`. Sem migration.

---

## [30-05-2026] — Estatísticas profundas (puxar V5), fase 2: detalhe por curso + por utilizador

### add
- **Detalhe por curso** `/admin/estatisticas/cursos/[courseId]` (admin+) — cards (inscritos, finalizações, acessos, únicos), **módulos e aulas ordenados por visitas** (visitas/únicos/conclusões via `lesson_views` + `lesson_completions`), e **"Quem terminou"** com nomes+datas **só para super_admin** (admin normal vê só a contagem). `src/lib/courses/stats-detail.ts` (`aggregateCourseDetail` + `buildFinishers` com gate de papel; 6 testes).
- **Por utilizador** `/admin/estatisticas/utilizadores` + `/[id]` (**só super_admin**) — lista pesquisável com nº de cursos inscritos/terminados; detalhe com cursos inscritos (activos) e terminados (com datas). `src/lib/courses/stats-users.ts` (`aggregateUsersOverview`, `aggregateUserDetail`, `activeEnrollmentKeys`; 4 testes). Link "Ver por utilizador →" no overview (super_admin).
- Linhas do overview passam a ligar a `/admin/estatisticas/cursos/[id]`.

### docs
- `SPEC_1.md` §9/§10 — dashboard de estatísticas (contagens) marcado como **puxado de V5 para V3** (30-05); ficam em V5 só as taxas/percentagens e segmentação por etiqueta.
- `feature-docs/admin-estatisticas.md` — secção de detalhe profundo + regras de PII/papéis.

### infra
- Só em `v3-cursos`. Sem migration nova (usa `lesson_views`/RPC da fase 1, já em `logos-dev`).

---

## [30-05-2026] — Estatísticas profundas (puxar V5), fase 1: visitas + overview expandido

> Decisão de scope: o "dashboard de estatísticas mais profundo" é V5 (SPEC_1.md §9). Foi **puxado para o período de V3** a pedido do utilizador. Só quantidades — sem percentagens/taxas (respeita "sem percentagens até V7") nem segmentação por etiqueta (fica V5).

### add
- Migration `20260530130000_stats_deep_v5.sql`: tabela **`lesson_views`** (visitas a aulas; RLS SELECT admin, INSERT self, imutável) + função **`count_registered_users()`** SECURITY DEFINER (devolve só a contagem de `profiles`, e só a admins — sem expor PII).
- **Instrumentação de visitas:** `logLessonViewAction` (best-effort) em `access-actions.ts` + `<LessonViewBeacon>` (client, dispara uma vez no mount) montado na página de aula.
- **Overview expandido** (`/admin/estatisticas`): novo card **Utilizadores registados** (via RPC; "—" se indisponível) e, na tabela por curso, novas colunas **Inscritos** (inscrições activas via row mais recente do `course_access_log` com `unenrolled_at IS NULL`) e **Finalizações** (`course_completions` por curso). `aggregateOverview` estendida (+3 testes; 9 no total).

### infra
- Só em `v3-cursos`. Migrations a aplicar a `logos-dev` (nunca `logos-prod`).

---

## [30-05-2026] — super_admin pode promover a super_admin (pela UI)

### add
- **Promoção a super_admin pela UI** em `/admin/utilizadores` — botão "Promover a super admin" (só super_admin, só sobre alvos não-super) + confirmação inline (`?promover-super=<id>`, mesmo padrão URL-driven do `?apagar=` das etiquetas) a avisar que **é irreversível pela interface**.
- Migration `20260530120000_allow_super_admin_promotion.sql` — recria `enforce_profiles_role_mutation_authority()` para aceitar `NEW.role = 'super_admin'`. **Mantém** o bloqueio de alterar um super_admin existente (`OLD.role = 'super_admin'`) → despromover continua só-SQL (evita lock-out).
- `setUserRoleAction` aceita `newRole = 'super_admin'` (mantém: caller super_admin, alvo não-super, não-próprio).

### docs
- `feature-docs/auth-architecture.md` §5.1 — nota sobre promoção a super_admin via UI vs demoção só-SQL.

### infra
- Só em `v3-cursos`. Migration aplicada a `logos-dev` (nunca `logos-prod`).

---

## [30-05-2026] — Estatísticas admin: vista agregada (V3-básico)

### add
- **Nova página `/admin/estatisticas`** (admin + super_admin) — visão geral da utilização num só sítio: 5 cards de totais (cursos publicados/rascunhos, acessos totais, utilizadores activos, aulas concluídas, cursos concluídos) + tabela-resumo por curso (acessos, únicos, conclusões de aulas) com cada linha a ligar para `/admin/conteudos/<courseId>`. Link "Estatísticas" na sidebar admin (a seguir a Conteúdos).
- **`src/lib/courses/overview-stats.ts`** — `aggregateOverview()` (função pura, 7 testes) + `getAdminOverview()` (6 SELECTs agregados em JS). "Utilizadores activos" = `count(distinct user_id)` de `course_access_log` (admin-safe; `profiles` só dá SELECT a super_admin). Sem N+1 — um SELECT por tabela.
- **`src/components/admin/stat-card.tsx`** — `StatCard` extraído de `course-stats-content.tsx` e partilhado pelas duas vistas (DRY).

### docs
- Fronteira de versão respeitada: o **dashboard profundo** (taxas de conclusão %, segmentação por etiqueta, tendências, export) é **V5** (SPEC_1.md §9) e fica deferido. Esta entrega é só "estatísticas básicas visíveis ao admin" (V3).

### infra
- Só em `v3-cursos` (V3 — não toca em `v2.5-copy-ux` nem `main`). Sem migration: UI read-only sobre tabelas existentes; RLS de admin já dá SELECT.

---

## [29-05-2026] — Copy final do ministério: carrossel + hero (v2.5 + v3)

### update
- `src/components/site/home-testimonials.tsx` — carrossel redesenhado para **um testemunho por slide** em cartão **largo horizontal** (ícone `Quote` à esquerda + citação/autor à direita em ≥sm; empilha em mobile). `basis-full` (deixa de mostrar 2/3 cards lado a lado), `align: 'center'`, autoplay 5,5s → 6,5s (textos mais longos, um de cada vez). Cada testemunho ganha `author`.
- **4 testemunhos finais do ministério** (substituem placeholders): Bernardo Degues, Sara Narciso, Raniere e o novo **André Mata**.
- `src/components/site/home-hero.tsx` — subtítulo do hero passa de "O ministério LOGOS é o espaço da CCLX..." para **"Cursos, Apostilas e o teu ritmo — Sempre gratuitos."**
- Testes: `home-testimonials.test.tsx` (4 slides + atribuição de autor) e `page.test.tsx` (subtítulo gratuito).

### docs
- `status.md` — removidos os 2 itens "Bloqueado por: ministério" (Conhece-nos copy final — já estava final no repo; morada/horários — dispensados a pedido do utilizador).

### infra
- Aplicado em **ambas** as branches `v3-cursos` e `v2.5-copy-ux` (copy partilhada; ver `feature-docs/branch-strategy.md`).

---

## [29-05-2026] — V3.3 PR8: enrollment + estado anónimo + ordenação do catálogo (bloqueador final V3.3)

### add (iteração 29-05-2026)
- **Dropdown de ordenação em `/conteudos`** com 4 chaves: `por-comecar` (default auth), `concluidos`, `a-z` (default anon), `z-a`. Persistido em `?ordenar=` (partilhável, server-rendered). Para anon só aparecem `A→Z` / `Z→A`.
- **`src/lib/courses/sort.ts`** + 10 testes — `defaultSortKey`, `isSortKey`, `sortCourses` (ordena dentro de grupos por estado + alfabético).
- **`getEnrolledCourseIdsForCurrentUser`** em `enrollment.ts` — Set de cursos com inscrição activa. Usada pelo sort por estado.
- **Catálogo greyout para cursos concluídos**: cards de cursos em `course_completions` ganham `opacity-60` + badge "Concluído" + CTA "Rever curso →" (mesma UX que `/meus-cursos` "Terminados"). Mantêm-se clicáveis para rever.
- **Anon não vê "Em breve"** — cards de cursos sem aulas continuam clicáveis para anon; clicar leva ao CTA de login na landing do curso. "Em breve" e o estado disabled só aparecem para utilizadores autenticados.
- **`getCompletedCourseIdsForCurrentUser`** em `completion.ts` — Set de cursos concluídos pelo utilizador. RLS filtra a `own`.

### add (PR8 original)
- **Modelo de enrollment** sobre `course_access_log`: row mais recente por (user, course) decide o estado. `unenrolled_at IS NULL` → inscrito. Nova migration `20260529120000_enrollment_and_anon_landing.sql` adiciona coluna `unenrolled_at`, índice composto e UPDATE policy.
- **`src/lib/courses/enrollment.ts`** com `getEnrollmentState`, `enrollAction`, `unenrollAction`. Revalida `/conteudos/<id>` + `/meus-cursos` em mutações.
- **3 vistas em `/conteudos/[courseId]`**:
  - **Anon:** banner + título + descrição + CTA "Inicia sessão com Google" (com `next` correcto).
  - **Logado não-inscrito:** + estrutura de módulos e aulas read-only (numeradas `1.1, 1.2…`, sem links) + CTA "Começar curso".
  - **Logado inscrito:** comportamento V3 actual (módulos como link cards, aulas clicáveis) + link discreto "Sair do curso" no fundo.
- **`EnrollCourseCta` e `UnenrollCourseLink`** Components com Server Actions inline.
- **Acesso anónimo a courses publicados sem `required_tags`**: `course_is_visible(courses)` passa a aceitar `anon` (apenas para published + sem required_tags). Anon vê banner via storage `course-banners`. Modules/lessons ficam auth-only via `auth.role() = 'authenticated'` explícito nas suas policies.
- Testes: 14 novos em `enrollment.test.ts` (getEnrollmentState, enrollAction, unenrollAction) + 2 novos em `started.test.ts` para o filtro de unenrollment.

### update
- **`getStartedCoursesForUser`** filtra cursos onde o utilizador saiu (mais recente `unenrolled_at` not null). Re-inscrever-se faz o curso voltar a aparecer em `/meus-cursos`.
- **`/conteudos/[courseId]/[lessonId]`** e **`/conteudos/[courseId]/modulos/[moduleId]`** ganham guard de enrollment — redirect para a landing do curso quando o utilizador não está inscrito (defesa em profundidade ao RLS).

### infra
- Migration aplicada em `logos-dev` (PR aprovado bloqueia push prod).

---

## [29-05-2026] — V3.3 PR7: smoothness pass — view transitions, transições, polish do estado vazio

### add
- **View Transitions API** activado via `experimental.viewTransition: true` em `next.config.ts` — Next.js 16 + React 19 fazem crossfade automático entre rotas. Browsers sem suporte caem para navegação instantânea, sem regressão.
- **Transição suave de `<details>`** via `interpolate-size: allow-keywords` + `::details-content` em `globals.css` — `CollapsibleSection` abre e fecha com fade de 250 ms em vez de salto instantâneo. Inclui fallback `prefers-reduced-motion`.
- **Baseline de transições em `<a>`, `<button>`, `<summary>`, `[role='button']`** — 150 ms ease-out em `color` / `background-color` / `border-color` / `opacity`. Cobre todos os hovers que não tinham `transition-colors` explícito, sem precisar de auditar dezenas de ficheiros. Components com transições próprias sobrepõem o default sem conflito.

### update
- **`/meus-cursos`: ícone `Sparkles` removido** da mensagem "Não tens cursos em progresso" quando o utilizador só tem cursos terminados. Mesma direcção dos restantes estados vazios (PR3).
- Import de `Sparkles` em `meus-cursos-content.tsx` removido.

### infra
- `interpolate-size`, `::details-content` e `viewTransition` são features modernas de browser/framework. Compatibilidade: Chrome 129+ / Safari 18.2+ / Firefox 137+ (interpolate-size); navegadores antigos degradam para o comportamento instantâneo de sempre.

---

## [29-05-2026] — V3.3 PR6: search admin + linha clicável em `/admin/conteudos`

### add
- **`<ListSearch>`** novo component reutilizável (`src/components/admin/list-search.tsx`) — wrapper Client que filtra descendentes com `data-search-text` client-side. Input acessível com label SR-only, empty-state quando zero matches, ignora espaços à volta. Fallback para listagens admin que vão crescer antes de existir paginação server-side (V4).
- **`<ClickableRow>`** (`src/components/admin/clickable-row.tsx`) — `<tr>` Client que navega para `href` ao clicar. Cliques em `<a>`/`<button>`/`<input>`/`<label>` são ignorados para não interferir com controlos inline.
- Search aplicada em **3 listagens admin**:
  - `/admin/conteudos`: pesquisa por título do curso.
  - `/admin/utilizadores`: pesquisa por nome, papel ou etiqueta.
  - `/admin/etiquetas`: pesquisa por nome da etiqueta.
- Testes em `list-search.test.tsx` (6 casos: label, default visível, filter substring, empty-state, clear, trim de espaços).

### update
- **`/admin/conteudos`**: linhas inteiras passam a ser clicáveis (navegam para a página do curso). Coluna "Ações" + botão "Abrir →" removidos — redundância eliminada.

---

## [29-05-2026] — V3.3 PR5: catálogo full-width + módulos como páginas + imagem edge-to-edge

### add
- **Página própria por módulo no público (`/conteudos/[courseId]/modulos/[moduleId]`)** — substitui os `<details>` dropdowns. Mostra título, descrição, lista de aulas com estado de conclusão, CTA "Próximo módulo →" quando concluído, e link "← Voltar ao curso".
- Breadcrumb da aula ganha link para a página do módulo (Conteúdos › Curso › Módulo › Aula).

### update
- **`/conteudos` ocupa toda a largura do ecrã em desktop** — `max-w-5xl` substituído por `w-full` com padding maior (`lg:px-12 xl:px-16`). Grid passa a `xl:grid-cols-4` para aproveitar o espaço.
- **`CourseCard`: imagem preenche o topo edge-to-edge em `aspect-video` (16:9 standard)** — mesmo ratio que a hero da landing do curso, sem distorção, `object-cover` para crop limpo. Card ganha `overflow-hidden` e padding migra para a coluna de texto. Icon fallback usa `h-14 w-14`.
- **`CourseCard` no catálogo já não mostra descrição** — fica reservada à landing do curso, evitando congestionar o catálogo. /meus-cursos continua a mostrar descrição.
- **Course landing (`/conteudos/[courseId]`): módulos passam de `<details>` dropdowns a link cards** que navegam para a página do módulo. Mantém-se contagem `N/M` e check quando concluído.
- "Próximo módulo →" da página da aula passa a apontar para a página do módulo (não para a primeira aula do módulo).

### remove
- Layout split 50/50 (PR #39) descartado após teste do utilizador.

### docs
- `feature-docs/v3-3-handoff.md` atualizado: PR4 marcada como descartada; PR5 expandida.

---

## [28-05-2026] — V3.3 PR3: copy /meus-cursos (ícone fora + textos novos)

### update
- **`/meus-cursos` estado anónimo**: remover ícone `BookMarked`. Subtexto passa a *"Aqui ficam guardados os cursos que já começaste. Inicia com a tua conta Google para começar."* Heading mantém-se.
- **`/meus-cursos` estado autenticado vazio**: remover ícone `BookMarked`. Subtexto passa a *"Aqui ficam guardados os cursos que começaste, ordenados pelo mais recente."* (alinha mensagem com o que a página entrega quando há cursos.)
- Import de `BookMarked` removido.

---

## [28-05-2026] — V3.3 PR2: admin homogeneidade + estatísticas card + numeração 1.x

### add
- **Página de módulo (`/admin/conteudos/<courseId>/<moduleId>`) ganha forma canónica V3.3**:
  - **Detalhes do módulo** (CollapsibleSection nova — form para editar título/descrição usando `updateModuleAction`).
  - **Aulas (N)** (CollapsibleSection — count vai para o título da secção). Form "Nova aula" passa a viver dentro desta secção, no topo. Sub-heading "Aulas existentes" eliminada.
  - **Zona de perigo** (CollapsibleSection nova — flow `?confirmar=apagar` para apagar módulo de dentro da sua própria página, em vez de ter de subir ao curso).
- **Modo edição de aula (`?editar=<lessonId>`)**: a página colapsa para uma única CollapsibleSection "Detalhes da aula" com o form. Detalhes do módulo / Aulas / Zona de perigo ficam escondidos. CourseTree à direita mantém-se visível.
- **Estatísticas como CollapsibleSection** em `/admin/conteudos/<courseId>` (entre Módulos e Zona de perigo). Componente `course-stats-content.tsx` partilhado.
- **CourseTree (sidebar Estrutura) ganha header com nome do curso actual** — utilizador vê em que curso está mesmo sem olhar para o breadcrumb.

### update
- **Numeração de aulas passa a `{módulo}.{aula}`** — módulo 1 → aulas 1.1, 1.2, 1.3; módulo 2 → 2.1, 2.2... Aplicado em `CourseTree` (sidebar) e `LessonList` (admin).
- **Header da página de módulo mostra `{n}. {título}`** com o número 1-based do módulo no curso.
- **Secção "Módulos" no curso ganha contador no título**: `Módulos (N)`. Sub-heading "Módulos existentes" eliminada.

### remove
- **Rota `/admin/conteudos/<courseId>/stats` removida**. Estatísticas vivem só dentro da secção do curso. Link "Ver estatísticas →" no header do curso eliminado.

---

## [28-05-2026] — V3.3 PR1: collapsibles fechados + reorder admin/curso

### update
- **`CollapsibleSection` arranca fechado por defeito** (`defaultOpen = false`). Páginas admin densas (curso, módulo) deixam de abrir todas as secções de uma vez — o utilizador escolhe o que expandir.
- **`/admin/conteudos/<courseId>` reordena para a forma canónica V3.3**: Detalhes do curso → Módulos → Zona de perigo. Stats continua acessível via link `Ver estatísticas →` (será absorvida em CollapsibleSection na PR3).
- **`/admin/conteudos/<courseId>/<moduleId>`**: secções "Nova aula" e "Aulas existentes" passam a arrancar fechadas (vinha implícito do default antigo).
- Testes de `collapsible-section.test.tsx` actualizados para o novo default.

---

## [28-05-2026] — V3.2 PR5: "Meus cursos" no nav + duas secções + catálogo limpo

### add
- **Item "Meus cursos" na navegação principal** (`src/lib/site-config.ts`). Sempre visível, entre "Conteúdos" e "Fala Connosco". Anónimos caem no CTA "Inicia sessão" da página `/meus-cursos` (já existente).
- **`/meus-cursos` ganha duas secções**: "Em progresso" (cursos com `completed=false`) e "Terminados" (`completed=true`). A secção "Terminados" só renderiza quando há terminados. Cards terminados ganham `opacity-60` (hover repõe).
- **Mensagem + link "Ver catálogo →"** dentro da secção "Em progresso" quando o utilizador só tem cursos terminados (não tem nada em curso).

### update
- **Catálogo `/conteudos` passa a marketplace puro** — cards já não mostram badges "Começado" / "Concluído". Estado pessoal vive exclusivamente em `/meus-cursos`. Mantém-se "Em breve" para cursos sem aulas.
- `src/app/conteudos/page.tsx` deixa de chamar `getCourseProgressForUser` — render simplificado.
- `ConteudosContent` recebe `courses: VisibleCourse[]` em vez de `VisibleCourseWithProgress[]`.

### remove
- `src/lib/courses/progress.ts` e `progress.test.ts` apagados (helpers `getCourseProgressForUser` / `CourseProgress` ficaram órfãos depois de o catálogo deixar de mostrar estado pessoal).

### test
- 345 testes (340 → 345). `/meus-cursos`: 5 testes novos (secções, mensagem com link, opacity). `/conteudos`: bloco "badges de progresso" reduzido a 2 testes (asserção negativa + "Em breve" preservado). Fixture `makeCourse` no catálogo passa a `VisibleCourse` simples.

---

## [27-05-2026] — V3.2 PR1: Banner opcional em cursos

### add
- **Coluna `courses.banner_storage_path`** (text nullable) + bucket privado `course-banners` (5 MB, JPEG/PNG/WebP) com policy SELECT `course_banners_select_visible` que reutiliza `course_is_visible(courses)` por path (`split_part(name, '/', 1)`). Convenção de path: `<courseId>/banner` (sem extensão; MIME via Content-Type). Migration `20260527000000`.
- **Helpers `getBannerUrlsByPath` / `getBannerUrlForPath`** em `src/lib/courses/banner.ts` — signing batched + single, TTL 30 min. Falha graciosa devolve Map vazio / null.
- **Componente `<CourseImage variant="card"|"hero">`** em `src/lib/courses/course-image.tsx` — banner com `next/image unoptimized` (CDN directo, sem cache miss em rotação de signed URL); fallback de icon Lucide quando `bannerUrl=null`. Test ids `course-image-banner` / `course-image-icon`.
- **Admin upload de banner** em `course-form.tsx` (form `multipart/form-data`, preview do existente, checkbox "Remover"); `createCourseAction` e `updateCourseAction` aceitam ficheiro `banner` (validação MIME + 5 MB); `updateCourseAction` aceita `remove_banner=on` (nova upload tem prioridade); `deleteCourseAction` faz cleanup best-effort do ficheiro.

### update
- **Listagens `/conteudos` e `/meus-cursos`** trocam `<CourseIcon>` por `<CourseImage variant="card">` (aspect-video no topo do card).
- **`/conteudos/[courseId]`** ganha hero banner em `aspect-video` acima do header (icon ainda usado como fallback).
- **Skeletons `loading.tsx`** das 3 rotas (listagens + landing de curso) reflectem o novo espaço aspect-video.
- **`VisibleCourse`, `StartedCourse`, `CourseDetail`** ganham `bannerUrl: string | null`; selects e mapping em `visibility.ts`, `started.ts`, `detail.ts` actualizados.

### docs
- `architecture.md` §7 dividido em 7.1 PDFs + 7.2 banners; tabela de migrations recebe linha `20260527000000`.
- `status.md` ganha bloco "V3.2 — Iteração de UI/UX e prerequisitos" (PR1 ⏳ + PR2-PR5 pendentes).
- `feature-docs/v3-2-iteration.md` (a criar) consolida o plano dos 5 PRs e as decisões (banner opt-in + icon fallback; bucket privado + signed URL 30 min; bloqueio misto cursos-invisíveis-aulas-locked; prerequisitos opt-in por entidade).

### test
- 18 testes novos (331 → 349) — `course-image.test.tsx` (5), `banner.test.ts` (7), `courses-actions.test.ts` (6 casos de banner). Fixtures de `CourseFormInitialData`, `VisibleCourse`, `StartedCourse`, `CourseDetail` ganham `bannerUrl: null`.

---

## [26-05-2026] — V3.1: migrations alinhadas em `logos-dev` (push + repair)

Aplicadas as 2 migrations pendentes a `logos-dev` (PR V3.1 T4/T6 ficam totalmente funcionais no preview Vercel):

- `20260520140000_drop_courses_slug.sql` — drop column `courses.slug`
- `20260526180000_course_access_log_select_own.sql` — policy SELECT permissiva no `course_access_log` (V3.1 T4)

Durante o push apareceu uma migration órfã no remote: `20260519230230` (drop `tags.slug`, conteúdo idêntico ao nosso local `20260520120000_drop_tags_slug.sql`). Vinha da outra máquina onde a operação foi aplicada a 19-05 antes de a versão definitiva ser commited a 20-05 com timestamp diferente. Estado real do schema já estava correcto desde 19-05 — só faltava limpar o tracking.

### infra
- repair: `supabase migration repair --status reverted 20260519230230` — limpa órfão (sem tocar no schema; coluna `slug` continua dropped).
- repair: `supabase migration repair --status applied 20260520120000` — alinha tracking com o schema real (operação já aconteceu, só por outro nome).
- push: `supabase db push` aplicou as 2 migrations realmente pendentes. `migration list` agora mostra 11 entradas Local + Remote alinhadas.

### decision
- `repair` em vez de `db pull` para resolver a divergência: pull traria o conteúdo da migration órfã como ficheiro local novo, duplicando a nossa `20260520120000_drop_tags_slug.sql` (mesmo SQL, timestamp diferente). Repair preserva a história limpa que já tínhamos commited.

---

## [26-05-2026] — V3.1 T6: badges "Em curso" / "Concluído" no catálogo `/conteudos` — local em `v3-cursos`

Cards do catálogo passam a mostrar o estado do utilizador para cada curso: badge sage "Concluído ✓" se está em `course_completions`; badge laranja claro "Começado" se está em `course_access_log` mas não concluído; nada se nunca foi iniciado. Anónimos não vêem badges. Cards "Em breve" (sem aulas) também não — não faz sentido badge de progresso num curso vazio.

### add
- add: `src/lib/courses/progress.ts` — helper `getCourseProgressForUser(courseIds)` devolve `Record<string, {started, completed}>` para o set fornecido. 2 queries em paralelo (`course_access_log` + `course_completions` filtrados por `IN`), dedup client-side. Anónimos ou input vazio ⇒ `{}` sem touch à DB.
- add: `src/lib/courses/progress.test.ts` (7 testes — input vazio, anónimo, sem progresso, started=true, completed=true, ambos erros).
- add: tipo exportado `VisibleCourseWithProgress = VisibleCourse & CourseProgress` em `conteudos-content.tsx` — usado pela page e pelos testes.

### update
- update: `src/app/conteudos/page.tsx` — chama `getCourseProgressForUser(courses.map(c => c.id))` e faz o merge com defaults `{started: false, completed: false}` antes de passar a `<ConteudosContent />`. RLS de `course_access_log` (V3.1 T4 migration) garante que só vê os próprios acessos.
- update: `src/app/conteudos/conteudos-content.tsx` — Props aceita `VisibleCourseWithProgress[]`; cards renderizam badge condicional (completed > started > nenhum). Cards `hasLessons=false` mantêm só "Em breve" (sem progresso).
- update: `src/app/conteudos/page.test.tsx` — fixture `makeCourse` actualizada para o tipo augmentado (defaults `started: false, completed: false`); import passa de `VisibleCourse` para `VisibleCourseWithProgress`.

### test
- 4 testes novos em `page.test.tsx` (nenhum badge, "Começado", prioridade "Concluído", cards "Em breve" sem badges). 316 → 327 verdes (+7 helper + 4 content). Lint + typecheck verdes.

### decision
- Helper separado de `getVisibleCoursesForUser` em vez de mergear: mantém `VisibleCourse` minimal (sem campos opcionais) e separa responsabilidades. Page faz o join. `Record` em vez de `Map` para serialização limpa entre Server Component e Client Component (Next.js).
- "Concluído" tem prioridade sobre "Começado" no card. Razão: um curso concluído é tipicamente também started (clicou para começar, depois concluiu); mostrar apenas o estado mais avançado. Trade-off aceite: se o user concluir sem nunca clicar "Começar curso" (entrou directo via aula), o badge mostra "Concluído" sem ter visto "Começado" — comportamento correcto.

---

## [26-05-2026] — V3.1 T5: CTA hero e dropdown apontam a `/meus-cursos` — local em `v3-cursos`

Trivial: o hero "Meus cursos" e o item "Os meus cursos" no dropdown do utilizador deixam de apontar a `/conteudos` (catálogo) e passam a apontar a `/meus-cursos` (rota pessoal criada em T4). Mais coerente com o label.

### update
- update: `src/app/page.tsx` — `<HomeHero ctaHref="/meus-cursos" />` (era `/conteudos`).
- update: `src/components/site/user-menu.tsx` — `DropdownMenuItem` "Os meus cursos" agora `href="/meus-cursos"` (era `/conteudos`).
- update: `src/app/page.test.tsx` — 5 occurrences de `'/conteudos'` actualizadas para `'/meus-cursos'`. Testes continuam a verificar o contrato do `HomeHero` (prop flows through); valor da prop alinhado com produção.

### test
- 316/316 verdes (sem testes novos — testes existentes do `HomeHero` cobrem o contrato). Lint + typecheck verdes.

---

## [26-05-2026] — V3.1 T4: rota `/meus-cursos` — local em `v3-cursos`

Nova rota pessoal: lista os cursos que o utilizador começou (≥1 row em `course_access_log`), ordenados pelo último acesso. Cada card mostra badge "Em curso" ou "Concluído ✓" e leva à página do curso (onde o "Continuar curso" já leva à primeira aula incompleta). Anónimos vêem um CTA de login com `next=/meus-cursos`.

### infra
- add: `supabase/migrations/20260526180000_course_access_log_select_own.sql` — nova policy SELECT permissiva `course_access_log_select_own` (`user_id = current_profile_id()`). Compõe OR com a `course_access_log_select_admin` de PR2 (admin/super_admin continua a ver tudo para stats). Sem mudança a INSERT/UPDATE/DELETE. **Não aplicada a `logos-dev` automaticamente** — pede `pnpm dlx supabase login` interactivo. Versionada e pronta para `pnpm dlx supabase db push` na próxima sessão.

### add
- add: `src/lib/courses/started.ts` — helper `getStartedCoursesForUser()` retorna `StartedCourse[]` (`VisibleCourse` + `completed: boolean` + `lastAccessedAt: string`). Faz 2 queries: `course_access_log` (ordered desc, dedup client-side por `course_id`, filtra acessos a cursos despublicados) + `course_completions` (limitado ao set de course ids actual via `.in()`).
- add: `src/lib/courses/started.test.ts` (9 testes — sem sessão, sem acessos, dedup, dropped courses, completed flag, ambos erros, hasLessons=false).
- add: `src/app/meus-cursos/page.tsx` — server component. Sem sessão → `<MeusCursosContent isAuthenticated={false}>`; com sessão → busca cursos e passa para o content.
- add: `src/app/meus-cursos/meus-cursos-content.tsx` — client component com 3 estados: anónimo (CTA Google + `next=/meus-cursos`), autenticado vazio (link "Ver catálogo"), autenticado com cursos (grid de cards estilo `/conteudos` + badges Concluído/Em curso).
- add: `src/app/meus-cursos/meus-cursos-content.test.tsx` (6 testes — heading sempre, CTA anónimo + hidden next, estado vazio com link, grid + href correcto, badges para os 2 estados).
- add: `src/app/meus-cursos/loading.tsx` — skeleton do caminho mais comum (3 cards).

### test
- 301 → 316 verdes. Lint + typecheck verdes.

### decision
- Card aponta a `/conteudos/[courseId]` (página do curso), não directamente à primeira aula incompleta. Razão: a página do curso já calcula a primeira aula incompleta no botão "Continuar curso" (PR7), e expor isso no helper exigiria carregar modules + lessons + completions de todos os cursos começados (N+1 ou query pesada). 1 clique extra para uma feature secundária — aceitável.
- RLS policy adicionada em vez de SECURITY DEFINER function — mesmo padrão de `lesson_completions` ("own OR admin" composto via 2 policies SELECT). Mais simples e idiomático em Postgres.
- Sem sessão renderiza inline em vez de redireccionar — a rota `/meus-cursos` é descobrível via link do `UserMenu`; mostrar o que ela faz + CTA de login é melhor UX que redirect cego.

---

## [26-05-2026] — V3.1 T7: login-gate em "Começar curso" + proteger rota de aula — local em `v3-cursos`

Anónimos deixam de poder abrir aulas directamente. CTA "Começar/Continuar curso" no detalhe do curso muda para "Inicia sessão para começar →" quando não há sessão; clicar dispara `signInWithGoogleAction` com `next` apontado à primeira aula (mesmo padrão do hero "Meus cursos" em `home-hero.tsx`). A rota `/conteudos/[courseId]/[lessonId]` ganha um early-return: sem sessão redirige para `/conteudos/[courseId]`, onde o utilizador encontra o CTA de sign-in.

### add
- add: `src/app/conteudos/[courseId]/start-course-cta.tsx` — server component com 3 estados: anónimo (form `signInWithGoogleAction` + hidden `next`), autenticado sem progresso ("Começar curso"), autenticado com progresso ("Continuar curso"). Server Action inline mantém o `logCourseAccessAction` + `redirect` quando autenticado.
- add: `src/app/conteudos/[courseId]/start-course-cta.test.tsx` (3 testes).
- add: `src/app/conteudos/[courseId]/[lessonId]/page.test.tsx` (2 testes — redirect anónimo + UUID check vem antes do auth check).

### update
- update: `src/app/conteudos/[courseId]/page.tsx` — chama `getCurrentUser()` + delega CTA ao `<StartCourseCta />` (substitui form inline `'use server'` + `redirect`). Imports de `logCourseAccessAction` e `redirect` saem (já vivem dentro do componente).
- update: `src/app/conteudos/[courseId]/[lessonId]/page.tsx` — auth-gate entre a validação de UUID e a query Supabase. Anónimos não chegam a tocar a DB.

### test
- 296 → 301 verdes (5 novos). Lint + typecheck verdes.

### decision
- Redirect anónimo aponta para a página do curso (`/conteudos/[courseId]`), não para `/?next=...`. Razão: a página do curso já tem o login-gate com `next` correcto após T7; redireccionar para `/` exigiria adicionar consumo de `?next` no hero, fora do âmbito desta task. Trade-off: utilizador que clique num deep link de aula aterra na detalhe do curso (não na aula original após login) — aceitável dado que deep links anónimos para aulas são caso de borda.
- Extracção do `StartCourseCta` (em vez de manter inline em `page.tsx`) para testabilidade: 3 ramos isolados, testes pequenos, sem mocks pesados do resto da página. Mantém a inline `'use server'` action dentro do componente — sem mudança ao padrão estabelecido do codebase.

---

## [21-05-2026] — V3.1 followup: drop `courses.slug` — URLs públicas por UUID — local em `v3-cursos`

Cursos passam a ser referenciados por `id` (uuid) nas URLs públicas (`/conteudos/<uuid>` e `/conteudos/<uuid>/<lessonId>`). Coluna `courses.slug` removida da DB; UNIQUE index e CHECK constraint do regex caem com a coluna. Coerente com `tags`, já sem slug (migration `20260520120000_drop_tags_slug.sql`). Sem custo de redirects — V3 ainda não tem cursos em produção.

### infra
- add: `supabase/migrations/20260520140000_drop_courses_slug.sql` — `alter table public.courses drop column slug;`. Comment da tabela actualizado para reflectir "Identificação interna e em URLs públicas por id (uuid); UI mostra title". RLS, helper `course_is_visible(courses)` e FKs (`modules.course_id`, `course_access_log.course_id`) ficam intactos — não dependiam de slug.
- update: `.gitignore` — `.agents/` e `.codex/` (config local de outras ferramentas de agentes, por máquina; mesmo princípio que `.claude/settings.local.json`).

### update
- update: directório de rota renomeado `src/app/conteudos/[slug]/...` → `src/app/conteudos/[courseId]/...` (8 ficheiros movidos: `page.tsx`, `loading.tsx`, `[lessonId]/page.tsx`, `[lessonId]/loading.tsx`, `[lessonId]/mark-complete-button.tsx`, `[lessonId]/pdf-download-button.tsx` + 2 testes correspondentes).
- update: `src/lib/courses/detail.ts` — `getCourseDetailBySlug(slug)` → `getCourseDetailById(courseId)`; `.eq('slug', ...)` → `.eq('id', ...)`; campo `slug` removido de `CourseDetail`, `LessonDetail.course` e dos select strings. JSDoc actualizado para `[courseId]`.
- update: `src/lib/courses/visibility.ts` — `slug` removido de `VisibleCourse`, `CourseRow` e select string.
- update: `src/app/conteudos/conteudos-content.tsx` — links do hub passam a usar `course.id`.
- update: `src/app/admin/conteudos/courses-actions.ts` — `validateSlug`, regex e constantes `SLUG_MIN/MAX` removidos; create/update deixa de aceitar/escrever `slug`; mensagens de erro para `23505` (unique violation) removidas (já não há constraint UNIQUE em slug).
- update: `src/app/admin/conteudos/course-form.tsx` — input `slug` removido do grid; layout colapsa para coluna única com apenas "Título". `CourseFormInitialData` perde campo `slug`.
- update: admin pages (`page.tsx`, `[courseId]/page.tsx`, `novo/page.tsx`, `novo/loading.tsx`) sem referências residuais a slug.

### test
- update: `courses-actions.test.ts`, `detail.test.ts`, `visibility.test.ts`, `completion.test.ts`, `page.test.tsx`, `mark-complete-button.test.tsx`, `pdf-download-button.test.tsx` — fixtures e expects sem `slug`; helpers renomeados (`...BySlug` → `...ById`).
- 296/296 verdes. Lint + typecheck + format:check clean.

### decision
- **Remover slug em vez de derivar de title.** Em V3 ainda não há cursos em produção, por isso o custo de redirects é zero. Manter slug obrigava o admin a inventar um nome estável separado do título e duplicava defesa em profundidade (UNIQUE + CHECK + regex client + regex server). UUID nas URLs é menos amigável de partilhar, mas hoje a partilha é interna ao ministério — pode evoluir para slug derivado em V4 sem migration custosa (FKs continuam por id).
- **`.agents/` e `.codex/` em `.gitignore`, não commit.** São config de ferramentas de agentes que vivem por máquina (à semelhança de `.claude/settings.local.json`/`.claude/worktrees/`); não fazem parte do projecto partilhado.

### docs
- update: `changelog.md` ganha esta entrada. `status.md` não precisa de update — milestone ("V3 fechada à espera de testemunhos") mantém-se; isto é cleanup V3.1, não muda o mapa de 3 camadas nem desbloqueia/bloqueia o PR `v3-cursos` → `main`.

---

## [20-05-2026] — V3 PR9a: Vercel Analytics — local em `v3-cursos`

`@vercel/analytics@2.0.1` adicionado às dependências; `<Analytics />` (`@vercel/analytics/next`) inserido no root `src/app/layout.tsx` antes de `</body>`, depois do `<Footer />`. Cookieless por design — não acrescenta banner de cookies. Activo automaticamente no preview e production.

### add
- add: dependência `@vercel/analytics@^2.0.1` em `package.json`.
- add: `<Analytics />` no root layout (`src/app/layout.tsx`) com import de `@vercel/analytics/next`. Posicionamento depois do `<Footer />` para não competir com layout shift inicial; o componente injecta o script client-side via Next.js dynamic import.

### test
- Sem testes novos. O componente é um wrapper que injecta `/_vercel/insights/script.js`; testar o efeito exigiria mock do `window` + interceptar a request, baixo retorno vs custo. 284/284 mantêm-se verdes.

### decision
- **`<Analytics />` no root layout vs em páginas específicas.** Plataforma quer cobrir todas as rotas (incluindo `/admin`) para perceber padrões de uso interno. Sem opt-out condicional — Vercel Analytics é cookieless por design e o site já cumpre RGPD (não há cookies de tracking de terceiros).

### docs
- update: `status.md` regista PR9a concluída e abre PR9b (Playwright E2E) como "Em progresso"; `feature-docs/v3-plan.md` §9 dividida em 9a (✅) e 9b (⏳, bloqueada por decisão de OAuth bypass).

---

## [20-05-2026] — V3 PR8: access log activo + stats admin — local em `v3-cursos`

`logCourseAccessAction` deixa de ser stub (PR6) e passa a inserir em `course_access_log`. Página de stats por curso em `/admin/conteudos/[courseId]/stats` com 3 números essenciais. RLS da PR2 já restringia tudo — nada novo no schema; só UI + activação da action.

### add
- add: `src/lib/courses/stats.ts` — `getCourseStats(courseId, lessonIds[])` devolve `{ totalAccesses, uniqueUsers, lessonCompletions }`. Total + distintos a partir das linhas de `course_access_log` (Set client-side, evita RPC para uma plataforma pequena). `lessonCompletions` via `count: 'exact', head: true` filtrado por `lesson_id IN (...)`. Sem `lessonIds` (curso sem aulas), salta a segunda query.
- add: `src/app/admin/conteudos/[courseId]/stats/page.tsx` — Server Component gated admin+super_admin; breadcrumb 3 níveis; 3 `StatCard` (acessos totais, utilizadores únicos, aulas concluídas) com ícones Lucide (`BarChart3`, `Users`, `CheckCircle2`); rodapé "Notas" explica origem dos números e a deviação de PR7 (`course_completions` não escrita).
- add: `src/app/admin/conteudos/[courseId]/stats/loading.tsx` — skeleton match com layout dos 3 cards.
- add: link "Ver estatísticas →" no header de `/admin/conteudos/[courseId]` (à direita do título do curso, mesmo estilo dos botões secundários do admin).

### update
- update: `src/lib/courses/access-actions.ts` — `logCourseAccessAction` deixa de ser no-op. Insert em `course_access_log` com `{ user_id: caller.id, course_id }`. Erro do insert é propagado (não silenciado) para que call sites possam diagnosticar, mas a UI ignora o resultado (best-effort). Comentário do ficheiro reescrito para reflectir que já não é stub.
- update: `src/app/conteudos/[slug]/page.tsx` — CTA "Começar/Continuar curso" passa de `<Link>` para `<form action={async () => { 'use server'; await logCourseAccessAction(course.id); redirect(...); }}>`. Custo: ~200ms extra por submit/redirect; benefício: telemetria sem JS no cliente. Falha do log não bloqueia o redirect — RLS deny ou sessão expirada continua a abrir a aula (que tem o seu próprio gating por RLS de `lessons`).

### test
- 6 testes novos: 5 em `stats.test.ts` (zeros sem dados, total + distinct via Set, propagação de erro do select de acessos, propagação de erro do count, count null → 0) + 1 net em `access-actions.test.ts` (3 reescritos: stub removido, insert correcto, propagação de erro do insert).
- 284/284 verdes (278 → 284, +6 líquido).

### decision
- **Distinct via `Set` client-side, não RPC.** Para volumes pequenos (admin único, dezenas-centenas de linhas por curso) é mais simples carregar a coluna e dedupe em JS do que criar uma função `get_course_unique_users()` em SQL. Reabrir se `course_access_log` crescer a milhares de linhas por curso — ainda há margem de muitos meses.
- **Action falha não bloqueia redirect.** Log de acesso é best-effort. Bloquear a navegação por causa de um insert falhado em telemetria seria pior UX. A consequência: utilizador pode chegar à aula sem acesso registado se RLS recusar (sessão expirada entre carregar a página e clicar) — aceitável.
- **Sem contagem de "utilizadores que concluíram o curso inteiro"** — exigiria query mais cara (group by user_id + comparar com Set de lessonIds do curso). Adiada para V3.1 ou para quando o ministério pedir uma métrica concreta.

### docs
- update: `status.md` regista PR8 concluída e move PR9 para "Em progresso"; `feature-docs/v3-plan.md` §8 marcada ✅ + tabela actualizada.

---

## [20-05-2026] — V3 PR7: conclusão binária + ecrã "curso concluído" — local em `v3-cursos`

Toggle binário de "Marcar como concluída" por aula, sem percentagens nem gamificação (CLAUDE.md §🚫). Conclusão de módulo e de curso são derivadas *on-read* a partir de `lesson_completions` — `course_completions` fica reservada para V3.1 se precisarmos da data preservada para stats da PR8.

### add
- add: `src/lib/courses/completion-actions.ts` — `markLessonCompleteAction(lessonId)` faz insert em `lesson_completions` e silencia o erro 23505 (PK duplicate → já estava marcada; clicar duas vezes não falha). `unmarkLessonCompleteAction(lessonId)` faz delete por `(user_id, lesson_id)`. UUID validado antes do round-trip à DB. Ambas revalidam `'/conteudos'` em `'layout'` para refrescar a página de curso simultânea ao toggle na página de aula.
- add: `src/lib/courses/completion.ts` — `getCompletedLessonIds(lessonIds[])` devolve `Set<string>` carregando só as conclusões cujos `lesson_id` pertencem ao input (evita full scan da tabela); RLS filtra por `current_profile_id()`. `isModuleComplete`/`isCourseComplete` retornam `false` quando o módulo/curso não tem aulas (não há nada para concluir). `getNextModuleWithLessons` salta módulos sem aulas — não contam para a progressão.
- add: `src/app/conteudos/[slug]/[lessonId]/mark-complete-button.tsx` — Client Component com `useOptimistic` + `startTransition`. Toggle visual imediato; `aria-pressed` reflecte estado. Em falha sem revalidate, optimistic reverte para `initiallyCompleted`. Estado pending implícito (action corre dentro do startTransition; sem spinner adicional — o feedback é a mudança imediata da label/ícone).

### update
- update: `src/app/conteudos/[slug]/page.tsx` — carrega `getCompletedLessonIds(allLessonIds)` antes de renderizar; aulas concluídas ganham ícone ✓ em círculo laranja + label `line-through`; cada módulo mostra contador `X/Y`; quando o módulo está completo, mostra `<Check>` + banner "Módulo concluído → Próximo módulo" se há próximo, ou "Último módulo concluído" se não; quando tudo está feito, banner "✓ Curso concluído" substitui o CTA principal. CTA muda label entre "Começar curso" (zero conclusões) e "Continuar curso" (≥1 conclusão).
- update: `src/app/conteudos/[slug]/[lessonId]/page.tsx` — carrega completions só do módulo actual (`getCompletedLessonIds(moduleLessonIds)`) — não precisa de tudo aqui. `MarkCompleteButton` abaixo do PDF. Quando a aula actual é a última do módulo e o módulo fica completo, bloco "Módulo/Curso concluído" abaixo do botão com link para o próximo módulo ou de volta ao curso.
- update: `src/app/conteudos/[slug]/loading.tsx` + `[slug]/[lessonId]/loading.tsx` — skeletons alinhados com o novo layout (botão de conclusão + banners).

### test
- 25 testes novos: 10 em `completion.test.ts` (helpers + edge cases: `Set` vazio quando sem sessão, RLS skip, módulo/curso vazio retorna false, `getNextModuleWithLessons` salta módulos vazios), 9 em `completion-actions.test.ts` (mark idempotente em 23505, mark falha em outro erro, unmark sucesso, unmark sem sessão, UUID inválido em ambos), 6 em `mark-complete-button.test.tsx` (render por initiallyCompleted, toggle visual, action correcta consoante estado, optimistic reverte em sem-action).
- 278/278 verdes (253 → 278, +25 líquido).

### decision
- **`course_completions` não é escrita.** Schema da PR2 mantém a tabela, mas PR7 deriva o estado "curso concluído" on-read a partir de `lesson_completions`. Trade-off: sem data de conclusão preservada, mas implementação simples (sem trigger, sem race condition entre "marca última aula" e "insere conclusão de curso"). Reabrir em V3.1 se PR8 (stats) precisar da data ou se o ministério pedir exibição "concluído em DD-MM-YYYY". `architecture.md` §6 reflecte a deviação.

### docs
- update: `status.md` regista PR7 concluída e move PR8 para "Em progresso"; `architecture.md` §6 ajusta para "derivação on-read; `course_completions` não escrita em V3"; `feature-docs/v3-plan.md` §7 marcada ✅; `changelog.md` ganha esta entrada.

---

## [20-05-2026] — V3 PR6: página de curso + página de aula — local em `v3-cursos`

Rotas públicas para consumir conteúdo: `/conteudos/[slug]` e `/conteudos/[slug]/[lessonId]`. URL da aula usa o UUID (lessons não têm slug; adicionar slug ficou para V4 — estável e sem migration). Visibilidade fica 100% delegada na RLS de PR2 (`course_is_visible` herdada em modules/lessons via subquery).

### add
- add: `src/lib/courses/detail.ts` — `getCourseDetailBySlug(slug)` carrega o curso completo (módulos + aulas) ordenado por position; `getLessonDetailById(id)` faz select com embed `module:modules!inner ( ..., course:courses!inner ( ... ) )` e devolve a aula em forma flat; `getLessonNavigation(course, currentLessonId)` linariza módulos+aulas e retorna `{ previous, next }`; `getFirstLessonOfCourse(course)` para o CTA "Começar curso" (PR7 muda para "primeira aula incompleta").
- add: `src/lib/courses/access-actions.ts` — `getLessonPdfSignedUrlAction(lessonId)` gera URL assinada de 5 min para o PDF (RLS em `lessons` filtra acesso; storage policies permitem authenticated ler qualquer objecto do bucket, defesa fina aqui). `logCourseAccessAction(courseId)` — stub no-op em PR6; PR8 destapa o insert em `course_access_log`.
- add: `src/lib/courses/youtube.ts` — `extractYoutubeId(url)` parseia formatos aceites em PR4b (`youtu.be/<id>`, `youtube.com/watch?v=<id>`); valida id contra `^[A-Za-z0-9_-]{11}$`; devolve null em formato inválido (defesa contra URL antiga/corrompida).
- add: `src/app/conteudos/[slug]/page.tsx` — header com ícone + título + descrição; CTA "Começar curso" linka para primeira aula; lista de módulos (h2) com aulas (Link cada uma); estado "Em breve" quando o curso não tem aulas publicadas. `generateMetadata` server-side com o título do curso.
- add: `src/app/conteudos/[slug]/[lessonId]/page.tsx` — breadcrumb 3 níveis (Conteúdos › Curso › Aula); módulo + título + descrição; iframe YouTube em `aspect-video` rounded-2xl com `loading="lazy"`, `youtube-nocookie.com` (privacidade), `allow` standard, `allowFullScreen`; botão "Descarregar apostila" (Client); navegação anterior/próxima atravessando fronteira de módulo; "Voltar ao curso" se for a última; índice do curso colapsável (módulo actual `open` por defeito) com indicador visual `aria-current="page"` na aula activa.
- add: `src/app/conteudos/[slug]/[lessonId]/pdf-download-button.tsx` — Client Component que chama `getLessonPdfSignedUrlAction` via `useTransition`, abre a URL em nova aba (`window.open(..., '_blank', 'noopener,noreferrer')`). Estados: idle (Download icon + label), pending (Spinner + "A preparar PDF…" + disabled + aria-busy), error (alert inline). UUID validado antes do submit.
- add: skeletons em `[slug]/loading.tsx` e `[slug]/[lessonId]/loading.tsx` reflectem o layout final (ícone + título + módulos / vídeo + nav + índice).

### test
- 33 testes novos: 9 em `youtube.test.ts` (formatos válidos + inválidos), 12 em `detail.test.ts` (mock supabase chain; navegação edge cases — primeira/última/atravessar módulo), 8 em `access-actions.test.ts` (RLS deny via maybeSingle null, signed URL TTL=300s, stub PR6), 4 em `pdf-download-button.test.tsx` (idle/pending/error/click flow).
- 253/253 verdes (215 → 253, +38 líquido).

### docs
- update: `status.md` regista PR6 concluída; `changelog.md` ganha esta entrada.

---

## [20-05-2026] — Fase C: optimistic UI em etiquetas-por-utilizador + apagar etiqueta — local em `v3-cursos`

Resposta a queixa do user de Fase B ("alguns botões demoram muito"): mesmo com `Spinner` no `SubmitButton`, atribuir/remover etiqueta a um utilizador ou apagar uma etiqueta tinham latência perceptível (round-trip Supabase + revalidatePath). Solução: `useOptimistic` aplica o estado-melhor-caso imediatamente; a Server Action corre em paralelo via `startTransition`; em falha, `useOptimistic` reverte automaticamente para o estado base do server.

### add
- add: `src/app/admin/utilizadores/user-tags-cell.tsx` — Client Component que renderiza pills + select de adicionar com `useOptimistic`. Estado é `assigned: TagItem[]` + reducer que aplica `add` (insere ordenado por label PT-PT) ou `remove` (filtra por id). Pill é agora `<button type="button">` com `onClick` (já não é submit num form) — feedback visual é o desaparecimento imediato, não o spinner. Form de adicionar usa `action={handleAdd}` (Client Component aceita server action wrapped numa função client; `formRef.current?.reset()` limpa o select após o submit).
- add: `src/app/admin/etiquetas/tags-table.tsx` — Client Component que envolve a tabela de etiquetas com `useOptimistic` para o delete. Linha desaparece imediatamente ao clicar "Apagar definitivamente"; `deleteTagAction` corre em paralelo. Edit row continua URL-driven (`?editar=`) e usa a Server Action `updateTagAction` directamente. Confirm delete também URL-driven (`?apagar=`) mas o botão final agora é client `onClick` (e não form submit).

### remove
- remove: `src/app/admin/utilizadores/tag-pill-remove-button.tsx` + teste — substituído por `UserTagsCell`. O spinner no `×` deixa de ser necessário porque a pill desaparece imediato (optimistic). Manter o spinner seria redundante.

### update
- update: `src/app/admin/utilizadores/page.tsx` — passa de ~70 linhas de forms inline (pills + select de adicionar) para `<UserTagsCell userId userName assigned allTags />`. Server Component continua a fazer o fetch das 3 queries (profiles + tags + user_tags) e calcular `tagsByUser`; o Client Component recebe só os dados via props.
- update: `src/app/admin/etiquetas/page.tsx` — passa de ~150 linhas de tabela inline para `<TagsTable initial editingId confirmingDeleteId />`. Server Component continua a ler `searchParams` (`editar`, `apagar`) e a fazer a query.

### test
- 13 testes novos: 7 em `user-tags-cell.test.tsx` (render placeholder/pills/select; options excluem assigned; click chama action; pill desaparece imediato com mock pending; pill aparece imediato ao adicionar) + 6 em `tags-table.test.tsx` (placeholder; render; edit/confirm rows; optimistic delete com mock pending).
- 215/215 verdes (204 → 215, +11 líquido — -2 TagPillRemoveButton + 13 novos).
- Nota sobre testes de `useOptimistic`: o estado optimistic reverte assim que a action resolve. Para observá-lo na assertion, o mock precisa de ficar pending (`new Promise(() => {})`). Documentado no comentário inline dos testes relevantes.

### docs
- update: `status.md` regista a Fase C; `changelog.md` ganha esta entrada.

---

## [20-05-2026] — Remove `tags.slug` — local em `v3-cursos`

Decisão do user: tags nunca aparecem em URLs públicas (são referenciadas por UUID internamente). Manter um slug kebab-case estável era fricção desnecessária no fluxo "criar etiqueta". `courses.slug` fica — esse vai ser usado em `/conteudos/[curso-slug]`.

### remove
- remove (DB): coluna `tags.slug` (incluindo UNIQUE constraint implícito e CHECK do regex/length). Migration `20260520120000_drop_tags_slug.sql` aplicada a `logos-dev`. RLS, função `current_profile_has_tag(uuid[])` e `user_tags` ficam intactos — não dependiam de `slug`.
- remove (Server Action): `validateSlug`, `SLUG_RE`, `SLUG_MIN`, `SLUG_MAX` em `etiquetas/actions.ts`. `createTagAction` / `updateTagAction` deixam de aceitar/inserir slug.
- remove (UI): input "Slug (kebab-case, estável)" do form Nova etiqueta + da row de edição. Coluna "Slug" da tabela. `<code>{tag.slug}</code>` em `CourseForm` ao lado da label da etiqueta no fieldset de `required_tags`.
- remove (queries): `id, slug, label` passa a `id, label` em 4 selects (`etiquetas/page.tsx`, `utilizadores/page.tsx`, `conteudos/novo/page.tsx`, `conteudos/[courseId]/page.tsx`).

### update
- update: copy do form Nova etiqueta — "Nome visível" passa a só "Nome" (uma palavra chega quando não há slug). Grid `1fr_1fr_auto` → `1fr_auto`.
- update: confirm delete de etiqueta deixa de mostrar `(slug)` ao lado da label.
- update: `architecture.md` §3 (tabela `tags` sem `slug`); `feature-docs/v3-plan.md` §1 reflecte a remoção.

### test
- update: `etiquetas/actions.test.ts` — testes que validavam slug (caracteres inválidos, demasiado curto, duplicado 23505) removidos. Novos: "recusa label demasiado longa", "faz trim ao label antes de gravar", "propaga erro de DB ao insert". Net 204/204 (sem mudança de cobertura final).

### docs
- update: `status.md` regista a remoção; `changelog.md` ganha esta entrada.

---

## [19-05-2026] — Remove CoursesColumn (bloco lateral redundante) — local em `v3-cursos`

Pedido directo do user antes de avançar para Fase C: o bloco lateral "Cursos" no painel `/admin/conteudos/*` era redundante com a `CourseTree` (que mostra a árvore do curso actual) e com o item "Conteúdos" da sidebar admin. Sem migrations, mudança puramente cosmética + simplificação de layout.

### remove
- remove: componente `CoursesColumn` em `src/app/admin/conteudos/courses-column.tsx` (linhas ~14-78). Ficheiro renomeado para `conteudos-breadcrumb.tsx` — só fica lá o `ConteudosBreadcrumb` mobile-only que ainda é usado.
- remove: `<CoursesColumn />` das 3 páginas (`/novo`, `/[courseId]`, `/[courseId]/[moduleId]`). O esqueleto correspondente nos 3 `loading.tsx` também sai.
- update: `course-tree.tsx` comentário deixa de mencionar "à direita da CoursesColumn".

### update
- update: `/admin/conteudos/novo/page.tsx` deixa de precisar de wrapper `<div className="flex gap-6">` — não há 2ª coluna ali.
- update: `[courseId]/page.tsx` e `[courseId]/[moduleId]/page.tsx` mantêm o wrapper flex porque a `CourseTree` (xl+) ainda vive lá.

### test
- 204/204 verdes (sem mudança de cobertura — não havia testes do `CoursesColumn`).

### docs
- update: `status.md` regista a remoção; `changelog.md` ganha esta entrada.

---

## [19-05-2026] — Skeletons em falta + spinners em todos os submits — local em `v3-cursos`

Resposta a queixa do user: vários botões clicados ficavam mudos (sem indicar "estou a trabalhar"), e várias rotas com queries Supabase abriam em branco antes do conteúdo aparecer. Auditoria identificou 5 rotas sem `loading.tsx` e 8 botões `<button type="submit">` sem feedback de pending. Sem migrations, sem mudanças funcionais — só visibilidade.

### add
- add: `src/app/admin/conteudos/[courseId]/[moduleId]/loading.tsx` — skeleton da página de aulas (3 colunas: conteúdo + Cursos + CourseTree).
- add: `src/app/admin/conteudos/novo/loading.tsx` — skeleton do `CourseForm` em modo create (2 colunas).
- add: `src/app/admin/utilizadores/loading.tsx` — skeleton da tabela de profiles (5 colunas, 5 rows).
- add: `src/app/admin/etiquetas/loading.tsx` — skeleton do form de criar + tabela de etiquetas.
- add: `src/app/perfil/loading.tsx` — skeleton do avatar + dl 2x2.
- add: `src/app/admin/utilizadores/tag-pill-remove-button.tsx` — Client Component que envolve o pill `{label}×` e troca `×` por `Spinner` enquanto a Server Action corre. Necessário porque o `SubmitButton` standard tem children textuais; aqui a children é composta e precisa de reagir a `useFormStatus` numa estrutura custom.

### update
- update: `src/app/admin/utilizadores/page.tsx` — botões **Promover/Despromover** e **Adicionar etiqueta** passam de `<button type="submit">` cru para `<SubmitButton>` com `pendingLabel` apropriado. Pill `×` de remover etiqueta passa a usar `<TagPillRemoveButton>`.
- update: `src/app/admin/etiquetas/page.tsx` — botões **Criar**, **Guardar** (edit) e **Apagar definitivamente** passam para `<SubmitButton>`. O destrutivo mantém `bg-destructive` via className.
- update: `src/app/admin/conteudos/course-form.tsx` — botão **Criar curso / Guardar alterações** passa para `<SubmitButton>` com `pendingLabel` dinâmico por `mode`. Este era dos mais lentos (validação + slug-unique + redirect) e o mais visível.

### test
- add: `src/app/admin/utilizadores/tag-pill-remove-button.test.tsx` — 2 testes (idle mostra `×`; pending mostra `Spinner` + disable + `aria-busy`).
- 204/204 testes verdes (202 → 204, +2 nesta iteração).

### docs
- update: `status.md` regista a iteração; `changelog.md` ganha esta entrada.

---

## [19-05-2026] — Admin UX: secções colapsáveis + reorder optimistic — local em `v3-cursos`

Continuação da iteração de UX admin. Páginas `/admin/conteudos/[courseId]` e `[courseId]/[moduleId]` estavam a empilhar 3–5 blocos densos (Módulos, Detalhes, Zona de perigo / Nova aula, Aulas existentes), forçando scroll longo. Reordenar módulos/aulas com ↑↓ implicava `revalidatePath` + full reload — perceptível em listas grandes. Sem migrations, sem mudanças funcionais — só extracção de componentes UI + `useOptimistic` nas listas.

### add
- add: `src/components/ui/collapsible-section.tsx` — wrapper genérico `<details>` + `<summary>` com chevron rotativo (`group-open:rotate-180`), título `font-display` (h2), subtítulo opcional, `variant="default" | "danger"`, `defaultOpen` controlável. Zero JS no cliente — o browser cuida do toggle; leitores de ecrã têm suporte nativo a `<details>`. Persistência não — o estado vive na DOM e reseta em navegação (aceitável dado ≤ 5 secções por página).
- add: `src/app/admin/conteudos/module-list.tsx` — Client Component que renderiza a lista de módulos com **optimistic reorder** via `useOptimistic`. Clicar ↑/↓ aplica o swap imediato na UI; `startTransition` dispara `moveModuleUpAction` / `moveModuleDownAction` em paralelo. Quando o server confirma e `revalidatePath` corre, `initial` muda e o estado optimistic reseta. Modos edit/delete continuam URL-driven (`?editar=`, `?apagar=`) — o pai pré-renderiza `editingNode` / `deletingNode` (JSX com Server Actions inline) e passa-os via props (funções não passam para Client Components, JSX pré-renderizado passa).
- add: `src/app/admin/conteudos/lesson-list.tsx` — mesmo padrão de `ModuleList` para aulas, com pill do template (só pdf / vídeo + pdf) e link YouTube quando `template === 'video_pdf'`.

### update
- update: `[courseId]/page.tsx` refactor — `Módulos`, `Detalhes do curso`, `Zona de perigo` passam a viver dentro de `<CollapsibleSection>`. Detalhes e Zona de perigo arrancam fechados (`defaultOpen={false}`). 459 → menos linhas (a lógica de ordenar/editar/apagar saiu da página para `ModuleList`).
- update: `[courseId]/[moduleId]/page.tsx` refactor — `Nova aula` e `Aulas existentes` passam a viver dentro de `<CollapsibleSection>`. Lista de aulas movida para `LessonList`. 485 → menos linhas.

### test
- 24 testes novos: 6 em `collapsible-section.test.tsx` (heading, subtítulo, defaultOpen, variant danger, id-heading), 8 em `module-list.test.tsx` (render: placeholder vazio, numeração 1-based, editingNode, deletingNode; reorder: ↑ no primeiro disabled, ↓ no último disabled, ↑ chama action com FormData, ↓ chama action), 10 em `lesson-list.test.tsx` (mesmo do ModuleList + pill do template + link YouTube).
- 202/202 testes verdes (178 → 202, +24 nesta iteração).

### docs
- update: `status.md` regista a iteração; `changelog.md` ganha esta entrada.

---

## [19-05-2026] — A11y WCAG AA + loading states — local em `v3-cursos`

Resposta a issues de axe DevTools (contraste insuficiente em `orange-primary`, falha de "Label in Name" no `UserMenu`) + pedido de skeletons/spinners/progress bars. Sem migrations, sem mudanças funcionais — só tokens visuais + novos componentes UI.

### fix
- fix: `orange-primary` passa de `#E36A2C` para `#B14E1F` — WCAG AA passa com margem (5.27:1 white-on-orange; 4.84:1 orange-on-cream). Antes falhava o threshold 4.5:1 em ambas as direcções. `orange-hover` de `#C85A22` para `#993F15` (6.84:1 / 6.27:1).
- fix: `UserMenu` `DropdownMenuTrigger` deixa de ter `aria-label="Menu do utilizador X"` — substituía o texto visível `Olá, X` e falhava WCAG SC 2.5.3 "Label in Name". Accessible name passa a derivar do texto visível (Base UI anuncia o role de menu trigger automaticamente). Teste actualizado para verificar `getByRole('button', { name: /olá, joão/i })`.

### add
- add: `src/components/ui/spinner.tsx` — Lucide `Loader2` com `animate-spin`, `role="status"` + sr-only label. Server-renderable.
- add: `src/components/ui/skeleton.tsx` — `bg-muted/60` + `animate-pulse`, `aria-hidden`. Usado por `loading.tsx`.
- add: `src/components/ui/progress-bar.tsx` — indeterminada, `role="progressbar"` sem `aria-valuenow` (pattern WAI-ARIA recomendado). Keyframe `indeterminate` definido em `globals.css`.
- add: `src/components/ui/submit-button.tsx` — Client Component que usa `useFormStatus` (React 19) para mostrar `Spinner` + label alternativo enquanto a Server Action corre. Opcional `showProgressBar` para uploads longos. Aplicado nos forms de criar e editar aula (uploads de PDF até 20 MB são lentos).
- add: `src/app/admin/conteudos/loading.tsx`, `src/app/admin/conteudos/[courseId]/loading.tsx`, `src/app/conteudos/loading.tsx` — skeletons que reflectem o layout final para minimizar layout shift quando a página real chega.

### update
- update: `branding.md` §1 reflecte os novos hex.

### test
- 15 testes novos: 3 em `spinner.test.tsx`, 3 em `progress-bar.test.tsx`, 3 em `skeleton.test.tsx`, 5 em `submit-button.test.tsx` (mock de `useFormStatus`).
- update: `user-menu.test.tsx` — verifica accessible name via texto visível em vez do antigo `aria-label`.
- 178/178 testes verdes (163 → 178, +15 nesta iteração).

### docs
- update: `status.md` regista a iteração de a11y + loading states; `changelog.md` ganha entrada para 19-05-2026.

---

## [19-05-2026] — Admin UX: full-width + árvore do curso (CourseTree) — local em `v3-cursos`

Iteração de UX após pedido do user em showcase: admin estava demasiado centrado no PC, e navegar entre aulas de um curso exigia voltar à página do módulo a cada salto. Sem migrations, sem mudanças funcionais — só layout + nova coluna de navegação.

### update
- update: `src/app/admin/layout.tsx` deixa de ter `mx-auto max-w-6xl` e passa a usar a largura toda do viewport (`px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-14`). Sidebar admin slim em `md` (w-48) e wider em `lg+` (w-56). Páginas públicas (Home, Conhece-nos, Conteúdos, Fala connosco, Perfil) **não** são tocadas — mantêm `max-w-*` para legibilidade de texto longo.
- update: `[courseId]/page.tsx` e `[courseId]/[moduleId]/page.tsx` ganham `<CourseTree />` como terceira coluna, sempre depois de `<CoursesColumn />`.

### add
- add: `src/app/admin/conteudos/course-tree.tsx` — Server Component que carrega módulos + aulas do curso actual via `select('id, title, position, lessons ( id, title, position )')` num único round-trip e renderiza uma árvore navegável. Detalhes:
  - `<details>` puro para colapsar/expandir módulos (zero JS no cliente; usa `<summary>` + `group-open:rotate-90` no chevron).
  - Visibilidade `hidden xl:block` — só aparece em ecrãs ≥1280px (mobile/md/lg continuam com layout actual).
  - Default-open só no módulo actual (`open={isCurrentModule}`).
  - Cada aula é um `<Link>` para `/admin/conteudos/[courseId]/[moduleId]?editar=<lessonId>` — o estado "aula em edit" vive em search param, por isso o salto entre aulas é só navegação na mesma página.
  - Destaque `aria-current="page"` + estilo laranja no módulo activo (quando sem `?editar=`) ou na aula activa.
  - "Sem aulas" inline em itálico quando o módulo está vazio.

### test
- add: `src/app/admin/conteudos/course-tree.test.tsx` com 16 testes — render básico (heading, estado vazio, error throw), render de árvore completa (links de módulos + aulas com URLs correctos, ordenação JS quando DB devolve desordenado, "Sem aulas" em módulo vazio), destaque do actual (default-open só no current module, sem currentModuleId nenhum abre, aria-current na aula vs. no módulo conforme `?editar=`), shape da query Supabase (eq course_id, order position asc, select embed correcto), semantics (aside com aria-label).
- 163/163 testes verdes (147 → 163, +16 nesta iteração).

### docs
- update: `status.md` regista a iteração de admin UX como concluída em `v3-cursos`.

---

## [19-05-2026] — V3 PR5: Catálogo público em `/conteudos` — local em `v3-cursos`

Sexta PR de V3 (1ª UI pública depois das 4 admin). `/conteudos` deixa de ser placeholder "Em breve" e passa a renderizar o catálogo real de cursos, com pesquisa textual e badge "Em breve" para cursos sem aulas. Continua só em `logos-dev`; nada vai a `main`/`logos-prod` antes de 01-07-2026.

### add
- add: `src/lib/courses/visibility.ts` com `getVisibleCoursesForUser({ query? })`. Não duplica regras: delega visibilidade na RLS policy `course_is_visible(courses)` criada em PR2; só agrega `hasLessons` via embed PostgREST `modules ( lessons ( count ) )` num único round-trip. Pesquisa opcional via `.ilike('title', '%q%')`, trim + 80 char max, vazio/whitespace é ignorado.
- add: `src/lib/courses/icons.tsx` — registry partilhado de ícones Lucide para cursos + componente `<CourseIcon slug={…} className={…} />` (fallback `book-open` para slugs desconhecidos). Substitui o array local de `icon-picker.tsx`.
- update: `src/app/admin/conteudos/icon-picker.tsx` passa a importar `COURSE_ICONS` do registry partilhado (sem duplicação entre admin e catálogo).
- update: `src/app/conteudos/page.tsx` reescrita como Server Component que lê `searchParams.q`, chama o helper de visibilidade e passa `courses + query` ao componente cliente.
- update: `src/app/conteudos/conteudos-content.tsx` (continua `'use client'` para manter as animações `motion/react`) — form GET de pesquisa (`role="search"` + input com ícone Lucide e botão "Pesquisar" + link "Limpar" quando filtro activo); grid responsivo 1 / 2 / 3 colunas de cards com ícone laranja, título, descrição (line-clamp-4), badge `Em breve` se `hasLessons = false` (com `aria-disabled` + `tabIndex=-1` + `pointer-events-none`). Estado vazio reusa o bloco Sparkles, com título dinâmico `Em breve` vs `Sem resultados`.

### decisions
- GET form em vez de `useTransition` + Server Action — mais simples, acessível sem JS, cacheável; revisitar se UX exigir instant search.
- RLS é fonte única de visibilidade — helper não passa `profileId` nem filtra em JS; toda a regra vive em `course_is_visible(courses)`.
- Cards sem aulas continuam visíveis mas desactivados — dão sinal ao utilizador em vez de desaparecerem.

### test
- add: `src/lib/courses/visibility.test.ts` com 14 testes (empty/error, `hasLessons` em todos os shapes possíveis, `.ilike` com trim/limit/skip, ordering, embed select).
- update: `src/app/conteudos/page.test.tsx` reescrita com 12 testes (sempre-presente: heading + intro + search form; vazio sem filtro: "Em breve" sem Limpar; vazio com filtro: "Sem resultados" + Limpar + input pré-populado; cards: link para slug, badge + `aria-disabled` quando sem aulas, sem badge quando há aulas, descrição nula omitida).
- 147/147 testes verdes (124 → 147, +23 nesta PR: 14 visibility + 12 conteúdos novos − 3 conteúdos antigos).

### docs
- update: `status.md` move "V3 PR5" de "Em progresso" para "Concluído"; "V3 PR6 — Página de curso + página de aula" passa a próxima.
- update: `feature-docs/v3-plan.md` tabela e §5 ticadas para PR5, com decisões e contagem de testes.

---

## [19-05-2026] — V3 PR4b: Admin CRUD de Aulas — local em `v3-cursos`

Quinto passo de V3 (PR4 sub-iteração b, depois de PR4a e PR4-IA). Sem migrations novas: a página de aulas vive em cima do schema da PR2 e do storage `lesson-pdfs`. Server Actions com upload PDF, validação YouTube URL e coerência de template entre `pdf` ↔ `video_pdf`. Continua só em `logos-dev`; nada vai a `main`/`logos-prod` antes de 01-07-2026.

### add
- add: `src/app/admin/conteudos/lessons-actions.ts` com 5 Server Actions — `createLessonAction`, `updateLessonAction`, `deleteLessonAction`, `moveLessonUpAction`, `moveLessonDownAction`. Triple defesa: role admin+super_admin, RLS em `lessons`, CHECK constraints DB. Upload PDF para `lesson-pdfs/<courseId>/<lessonId>.pdf` (MIME `application/pdf`, ≤ 20 MB, `upsert: true`). Insert primeiro com placeholder em `pdf_storage_path` para satisfazer o NOT NULL; substituído pelo path real após upload. Em falha de upload faz rollback do row inserido.
- add: regra de coerência de template — `pdf → video_pdf` exige `youtube_url` no mesmo submit; `video_pdf → pdf` limpa o `youtube_url`. PDF mantém-se sempre. Validador `validateYoutubeUrl` aceita `youtu.be/<id>` e `youtube.com/watch?v=<id>`.
- add: `src/app/admin/conteudos/[courseId]/[moduleId]/page.tsx` — drill-down de aulas dentro de um módulo (admin+super_admin). Breadcrumb mobile `Cursos › Curso › Módulo`, voltar ao curso via link no header. Form "Nova aula" no topo (`encType="multipart/form-data"`) com radios de template, URL do YouTube opcional, file input `accept="application/pdf"`. Listagem ordenada por `position` com pill do template + URL YouTube linkado. Edit inline via `?editar=<lessonId>` (PDF opcional — vazio mantém o actual), confirm delete inline via `?apagar=<lessonId>`, setas ↑↓ para reordenar.
- update: `ConteudosBreadcrumb` ganha `moduleTitle` + `courseId` para suportar três níveis (Cursos / Curso / Módulo); curso passa a link quando há módulo selecionado.
- update: lista de módulos em `/admin/conteudos/[courseId]` ganha botão **Aulas →** (CTA primário em borda laranja) a apontar para o drill-down. Descrição da secção actualizada (já não diz "PR4b").

### test
- add: `src/app/admin/conteudos/lessons-actions.test.ts` com 17 testes — 9 em `createLessonAction` (role guard, template inválido, video_pdf sem URL, URL fora do formato, PDF em falta, MIME errado com rollback, > 20 MB com rollback, happy path full, falha de storage com rollback), 3 em `updateLessonAction` (role, coerência pdf→video_pdf sem URL, coerência video_pdf→pdf limpa URL, novo PDF anexado), 1 em `deleteLessonAction` (apaga DB + bucket + revalida), 3 em `moveLessonUpAction` (swap, no-op no primeiro, rejeita module_id que não bate).
- 124/124 testes verdes (107 → 124, +17 nesta PR).

### docs
- update: `status.md` move "V3 PR4b" de "Em progresso" para "Concluído"; "V3 PR5 — Catálogo público" passa a próxima.
- update: `feature-docs/v3-plan.md` tabela e §4b ticadas para PR4b.

---

## [19-05-2026] — V3 PR3: Admin CRUD de Cursos — local em `v3-cursos`

Terceira PR de V3. Primeira UI por cima do schema da PR2: a área admin ganha o painel `/admin/cursos` para criar, editar e apagar cursos. Aplicada apenas a `logos-dev` (sem migrations novas — só UI). Continua sem mergear em `main` conforme estratégia de 3 camadas.

### add
- add: `/admin/cursos` listagem (admin + super_admin) com estado Publicado/Rascunho, etiquetas necessárias resolvidas para labels, botão "Novo curso".
- add: `/admin/cursos/novo` form de criação (server component) com `title`, `slug` (kebab-case regex), `description` (textarea texto puro), `icon` (Lucide name livre, opcional), `required_tags` (checkboxes alimentados por `tags` da PR1), toggle "Publicado". Após sucesso faz `redirect` para `/admin/cursos/<id>` para o utilizador continuar a editar.
- add: `/admin/cursos/[id]` form de edição com o mesmo `CourseForm` partilhado. UUID inválido ou curso inexistente → `notFound()`.
- add: Zona de perigo na página de edição com hard delete confirmado via `?confirmar=apagar` (mesmo padrão server-side de `/admin/etiquetas`, sem Client Components). Apagar usa o CASCADE da FK em modules/lessons/completions.
- add: Server Actions `createCourseAction`/`updateCourseAction`/`deleteCourseAction` em `src/app/admin/cursos/actions.ts` com validação inline (slug regex 2-80, title 1-120, description ≤ 4000, icon ≤ 64, required_tags UUID-checked, dedup), defesa de role admin+super_admin, mensagem clara para slug duplicado (Postgres 23505). Sem Zod — manter convenção das actions existentes.
- add: regra `published_at` "primeira publicação preservada" — toggle off ⇒ NULL; toggle on com `published_at` actual ⇒ mantém data; toggle on com NULL anterior ⇒ `now()`. Decisão para minimizar churn da data publicada em re-edições.
- add: link "Cursos" na navegação admin (`src/app/admin/layout.tsx`) visível a admin **e** super_admin (diferente de Etiquetas/Utilizadores que ficam só super_admin).
- add: `src/app/admin/cursos/course-form.tsx` (server component) partilhado entre create/edit para reduzir duplicação.

### test
- add: `src/app/admin/cursos/actions.test.ts` com 13 testes — 7 para `createCourseAction` (sessão, role, slug regex, título vazio, required_tags UUID, rascunho vs publicado, slug duplicado 23505), 5 para `updateCourseAction` (role, id inválido, preservação de `published_at`, despublicar, primeira publicação, curso inexistente), 1 para `deleteCourseAction`.
- update: `src/app/admin/layout.test.tsx` ajustado para verificar que `role=admin` vê link Cursos mas não vê Utilizadores/Etiquetas.
- 89/89 testes verdes (73 → 89, +16 incluindo 13 novos em cursos + 3 ajustes no layout).

### docs
- update: `status.md` move "V3 PR3" de "Em progresso" para "Concluído"; aponta "V3 PR4" como próxima.
- update: `feature-docs/v3-plan.md` tabela e §3 ticadas para PR3.

---

## [19-05-2026] — V3 PR2: Schema base + storage (cursos, módulos, aulas, conclusões, bucket lesson-pdfs) — local em `v3-cursos`

Segunda PR de V3, puramente SQL/infra (sem UI; ship-able sozinha sem mudar nada visível). PRs 3-7 vão construir UI por cima deste schema. Aplicada apenas a `logos-dev`; `logos-prod` continua schema V2 conforme estratégia de 3 camadas (`feature-docs/branch-strategy.md`).

### add
- add: migration `supabase/migrations/20260519020000_v3_courses_schema_and_storage.sql` aplicada a `logos-dev`.
  - **Helper** `set_updated_at()` trigger function genérica para gerir `updated_at`.
  - **`courses`**: id, slug unique (kebab-case CHECK 2-80), title (1-120), description, icon (nome Lucide ou texto livre), `required_tags uuid[] default '{}'`, `published_at` nullable (NULL = draft), created_by → profiles restrict, updated_at via trigger. Índice parcial `courses_published_at_idx` em published_at IS NOT NULL para catálogo público rápido.
  - **`modules`**: course_id CASCADE, position int >= 0, title, description, updated_at via trigger. Índice composto `(course_id, position)`.
  - **`lessons`**: module_id CASCADE, position, title, description, template CHECK in ('pdf','video_pdf'), youtube_url nullable, pdf_storage_path **not** nullable (V3 exige apostila), CHECK `video_pdf → youtube_url IS NOT NULL`. Índice composto `(module_id, position)`.
  - **`lesson_completions`**: PK composta (user_id, lesson_id), CASCADE em ambos. Idempotente por design.
  - **`course_completions`**: PK composta (user_id, course_id), CASCADE. Imutável (sem policy UPDATE/DELETE).
  - **`course_access_log`**: id uuid, user/course CASCADE, accessed_at — sem unique. Índices em course_id e accessed_at desc para stats em PR8.
  - **Helper** `course_is_visible(courses) → boolean` STABLE + SECURITY DEFINER unifica a regra de visibilidade: admin/super_admin tudo; user só published_at NOT NULL E (required_tags vazio OR overlap via `current_profile_has_tag`). Reutilizado nas policies de courses, modules e lessons.
  - **RLS** activa em todas as 6 tabelas:
    - `courses`/`modules`/`lessons` SELECT via `course_is_visible`; INSERT/UPDATE/DELETE admin+super_admin.
    - `lesson_completions` SELECT próprias ou admin/super_admin; INSERT/DELETE só o próprio (conclusão é acto pessoal — admin não marca por outros).
    - `course_completions` SELECT próprias ou admin/super_admin; INSERT só o próprio; sem UPDATE/DELETE (imutável).
    - `course_access_log` SELECT só admin/super_admin (auditoria); INSERT só o próprio.
  - **Storage**: bucket `lesson-pdfs` privado (public=false), `file_size_limit` 20 MB, `allowed_mime_types: ['application/pdf']`. Policies em `storage.objects`: SELECT authenticated qualquer profile (acesso fino fica na Server Action de PR6 que verifica `course_is_visible` antes de `createSignedUrl`); INSERT/UPDATE/DELETE admin+super_admin.

### testing
- Suite continua 73/73 (esperado — sem código novo). RLS validada manualmente em PR3-PR7 quando a UI existir.

### docs
- docs: `status.md` move V3 PR2 para concluído; muda "Em progresso" para PR3.

---

## [19-05-2026] — V3 PR1: Etiquetas (fundação) — local em `v3-cursos`

Primeira PR de V3, executada localmente. V2.5 fica em hold em preview a aguardar testemunhos do ministério; V3 desenvolve em paralelo em `v3-cursos` sem tocar `main` (V3 sobe ao Production só no merge final, prazo 01-07-2026). Decisão: V2 PR4 (etiquetas planeada em `feature-docs/v2-auth.md` §4) absorvida directamente em V3 PR1, conforme `feature-docs/v3-plan.md` §1.

### add
- add: migration `supabase/migrations/20260518120000_tags_and_user_tags.sql` aplicada a `logos-dev` via `pnpm dlx supabase db push`. Cria `tags` (id, slug unique kebab-case CHECK 2-64 chars, label 1-80, created_by → profiles `on delete restrict`, created_at) e `user_tags` (PK composta `(user_id, tag_id)`, assigned_by → profiles `on delete restrict`, assigned_at, cascade em user_id/tag_id). Índice em `user_tags(tag_id)` para queries reversas. Helper SQL `current_profile_has_tag(uuid[]) → boolean` STABLE + SECURITY DEFINER (padrão anti-recursão RLS estabelecido em V2). RLS: `tags` SELECT admin/super_admin tudo + user só as próprias (subquery a `user_tags`), escrita só super_admin; `user_tags` SELECT próprias ou admin/super_admin, INSERT/DELETE admin + super_admin (sem UPDATE — atribuição binária).
- add: `src/app/admin/etiquetas/{page,actions,actions.test}.tsx|ts` — CRUD de etiquetas super_admin-only. Form de criar (label + slug, ambos com regex/length validation matching DB constraints). Edição inline via query param `?editar=<id>`, confirmação de delete via `?apagar=<id>` (server-side puro, sem Client Components novos). Mensagens claras para slug duplicado (Postgres 23505).
- add: `src/app/admin/utilizadores/actions.ts` — `assignTagAction` + `unassignTagAction` (admin + super_admin). Upsert idempotente com `onConflict: 'user_id,tag_id', ignoreDuplicates: true` para evitar 409 em cliques duplos. Defesas em profundidade: caller role, UUID regex em ambos os IDs, RLS no servidor.

### update
- update: `src/app/admin/layout.tsx` — adiciona link "Etiquetas" no aside (super_admin only).
- update: `src/app/admin/utilizadores/page.tsx` — gating relaxa para admin + super_admin (antes era super_admin only). Coluna "Etiquetas" nova com pills das etiquetas atribuídas (botão `×` por pill → unassign) + `<select>` nativo + botão Adicionar para atribuir as ainda não atribuídas. Coluna "Papel" (acção) condicional só para super_admin; admin vê página focada em etiquetas. Cabeçalho cresce com link "Criar uma etiqueta" quando não há etiquetas e o caller é super_admin.

### testing
- 21 testes novos (52 → 73 a passar): 12 em `etiquetas/actions.test.ts` (create/update/delete com defesas + slug regex + label vazia + dup 23505), 8 em `utilizadores/actions.test.ts` (assign/unassign com defesas + idempotência), 1 ajuste em `admin/layout.test.tsx` (novo link "Etiquetas" aparece a super_admin, ausente a admin).

### docs
- docs (a fazer): `status.md` move V3 PR1 para concluído e regista a estratégia "V3 só sobe ao Production no fim".

---

## [18-05-2026] — V2.5: rebase + fix do 404 + branch de preview

Ronda V2.x (PR-A a PR-F) re-aplicada em cima de `main` após terem aterrado PR #27 (V2 PR3 roles UI), PR #32 (Cursos→Conteúdos hub) e PR #33 (copy do ministério). Conflitos resolvidos a favor do trabalho V2.x: `/conteudos` volta a ser página flat (intro justificada + bloco "Em breve" único), os sub-routes `/conteudos/cursos` e `/conteudos/escola-biblica` do hub anterior são eliminados. Branch `v2.5-copy-ux` pushed para preview-only — **não merge em `main`** enquanto os testemunhos forem placeholder.

### add
- add: `feature-docs/accounts.md` — mapa de *ownership* de todas as contas externas (GitHub, Vercel, Supabase, Google Cloud, Hostinger, Resend) sob `joaocanelasribeiro@gmail.com`. Esclarece a fronteira entre *ownership* (João, ministério) e acesso operacional (developer actual). Decisão para *bus factor* + sucessão centralizada no líder do ministério.

### fix
- fix: `src/app/not-found-content.tsx` — `Base UI: A component that acts as a button expected a native <button>` quando se carregava num 404. `Button render={<Link/>}` substituído por `<Link className={buttonVariants(...)}>` (mesmo padrão já usado em `home-hero.tsx`). Erro só aparecia no client porque a primitiva valida o contexto de render no browser.

### update
- update: `src/app/conteudos/{page,page.test,conteudos-content}.tsx` — versão flat da rota (alinhada com `feature-docs/v2-copy-and-conteudos.md` §3), com intro justificada + cartão "Em breve" único. Os ficheiros do hub anterior (`/conteudos/cursos/*` e `/conteudos/escola-biblica/*`) são eliminados.
- update: `src/app/cursos/page.tsx` — fica como `permanentRedirect('/conteudos')`, agora no caminho final (recriado após o rename de `main` que tinha movido para `/conteudos/cursos/`).

### infra
- infra: branch `v2.5-copy-ux` push para `origin`. Vercel cria preview deploy automático em `https://logos-l4nq6ppd8-jcrninjas-projects.vercel.app/` (URL protegida por Vercel Authentication — só *signed in* na conta Vercel do João). Production em `logos.cclx.pt` continua intocada.

### docs
- docs: `status.md` actualizada para reflectir o estado de V2.5 (preview-only, à espera de testemunhos do ministério).

---

## [16-05-2026] — V2.x: Copy & UX (LOGOS, hero, /conteudos, testemunhos, /perfil)

Ronda só de copy + UX (sem DB, sem auth) executada em 6 PRs locais (PR-A a PR-F). Plano e mapeamento das 19 pedidas do ministério em `feature-docs/v2-copy-and-conteudos.md`.

### add
- add: `src/components/site/home-motto.tsx` — lema do ministério em três linhas em itálico (`<aside>` com `aria-label="Lema do ministério LOGOS"`, bordas laranja subtis). Renderizado no `page.tsx` abaixo do hero.
- add: `src/components/site/home-testimonials.tsx` — carrossel com 5 testemunhos placeholder PT-PT. embla-carousel-react@8.6.0 instalado como dep directa; carrossel custom shadcn-style (não copiado do CLI shadcn por hang) com loop infinito, 1/2/3 slides por breakpoint, setas prev/next acessíveis e dots tab-list com `aria-selected`. Sync inicial via `queueMicrotask` para evitar `react-hooks/set-state-in-effect`.
- add: `src/app/conteudos/` (page + content + test) — nova rota pública que substitui `/cursos`. Parágrafo intro justificado com texto final do ministério, 3 cards placeholder "Em preparação" (badge laranja). H1 "Conteúdos".
- add: `src/app/perfil/page.tsx` — placeholder de perfil para utilizadores autenticados. Avatar (Google `avatar_url` ou iniciais), nome, email (lido de `auth.users`, não duplicado em `profiles`), papel em PT-PT, data de criação. `notFound()` quando sem sessão.
- add: `feature-docs/v2-copy-and-conteudos.md` — doc de planeamento das 6 PRs com escopo, verificações e mapeamento da checklist do ministério.

### update
- update: `src/components/site/home-hero.tsx` — logo `size="xl"` (`h-32 sm:h-44 md:h-52`, `priority`); h1 "Estudo Bíblico para uma Fé Enraizada." com capitalizações pedidas; CTA único centrado "Meus cursos"; comportamento depende de sessão (server resolve via `getCurrentUser()` e passa `isAuthenticated` + `ctaHref`): autenticado abre `<Link href={ctaHref}>`, sem sessão abre `<form action={signInWithGoogleAction}>` com hidden `next`. Parágrafo justificado.
- update: `src/components/site/user-menu.tsx` — items finais: "Os meus cursos" (→ /conteudos), "Perfil" (→ /perfil), "Área admin" (condicional), separador, "Terminar sessão". Label "Sessão de X" agora envolvida em `<DropdownMenuGroup>` (corrige bug Base UI residual de PR3).
- update: `src/lib/auth/actions.ts` — `signInWithGoogleAction(formData?)` aceita FormData opcional com campo `next`; valida com `safeNext` (mesma defesa anti-open-redirect do callback) e injecta `?next=` no `redirectTo`.
- update: `src/lib/auth/index.ts` — re-exporta `SupabaseUser` (alias de `User` do `@supabase/supabase-js`) para que código fora de `lib/auth/**` possa tipar sem violar `no-restricted-imports`.
- update: `src/lib/site-config.ts` — `name: 'LOGOS'`, descrição sem em dash, nav passa a ter `{ href: '/conteudos', label: 'Conteúdos' }` e `{ href: '/fala-connosco', label: 'Fala Connosco' }`.
- update: `src/app/cursos/page.tsx` — passa a `permanentRedirect('/conteudos')` (308). `cursos-content.tsx` e `cursos/page.test.tsx` eliminados.
- update: `src/app/conhece-nos/conhece-nos-content.tsx` — `Logos` → `LOGOS`, `fé` → `Fé`, `fala connosco` → `fala Connosco`. Todos os em dashes (—) em copy substituídos por vírgulas / ponto-e-vírgula / dois pontos. Três parágrafos longos com `text-justify hyphens-auto`. Frase "Sem prazos, sem barras de progresso, sem distrações" removida (tom IA).
- update: `src/app/fala-connosco/fala-connosco-content.tsx` — título "Fala Connosco" (C maiúsculo), parágrafo intro substituído pelo texto novo do ministério com "Connosco" maiúsculo, justificado. Nota "Horários e morada da igreja em breve" eliminada. Subject email "Contacto LOGOS".
- update: `src/components/site/logo.tsx` — novo tamanho `xl`; aria-label "LOGOS" (era "Logos"); em dash fora.
- update: `src/app/admin/page.tsx`, `src/app/admin/utilizadores/page.tsx`, `src/app/fala-connosco/page.tsx`, `src/app/cursos/page.tsx`, `src/app/layout.tsx`: metadata title/description com `LOGOS`. UI em dashes substituídos por pontuação alternativa.
- update: `src/app/not-found-content.tsx` + `not-found.test.tsx` — CTA "Ver conteúdos" → `/conteudos`.

### infra
- infra: `embla-carousel-react@^8.6.0` adicionado como dependência directa para suportar o carrossel de testemunhos.
- infra: `src/test/setup.ts` ganha stubs mínimos de `matchMedia`, `ResizeObserver` e `IntersectionObserver` (jsdom não os tem; embla e motion tocam neles à montagem).

### fix
- fix: `src/components/site/user-menu.tsx` — `<DropdownMenuLabel>` agora envolvido em `<DropdownMenuGroup>` (fix do `MenuGroupRootContext is missing` reportado na PR3 em preview Vercel).

---

## [14-05-2026] — V2 PR3: Roles UI (dropdown user + área /admin + promoção super_admin)

### add
- add: `src/components/site/user-menu.tsx` — dropdown do utilizador no Header (base-ui via shadcn `DropdownMenu`). Items: label "Sessão de {displayName}", "Área admin" (só se `role !== 'user'`, link para `/admin`), "Terminar sessão" (Server Action `signOutAction`). Trigger acessível com `aria-label` completo, indicador `<ChevronDown />`.
- add: `src/components/ui/dropdown-menu.tsx` — shadcn `DropdownMenu` instalado via `pnpm dlx shadcn@latest add dropdown-menu`. Wrapper de `@base-ui/react/menu`.
- add: `src/app/admin/layout.tsx` — server component gating: chama `getCurrentUser()`; se `role === 'user'` ou sem sessão, devolve `notFound()` (coerente com "conteúdo restrito é invisível", CLAUDE.md §🚫). Shell com `<aside>` nav (Painel + Utilizadores apenas se super_admin) + `<main>`.
- add: `src/app/admin/page.tsx` — landing da área admin: saudação, descrição PT-PT, parágrafo extra para super_admin a apontar para Utilizadores.
- add: `src/app/admin/utilizadores/page.tsx` — listagem de profiles (super_admin only — `notFound()` caso contrário). Tabela com nome, papel, data de criação, e botão "Promover a admin" / "Despromover a utilizador" inline via Server Action wrapped (`'use server'` inline para retorno void exigido por `<form action={}>`). Próprio caller e super_admins existentes aparecem sem botão.
- add: `src/app/admin/utilizadores/actions.ts` — `setUserRoleAction(formData)`: gating (caller=super_admin, alvo ≠ caller, alvo ≠ super_admin), validação manual de uuid + enum `user|admin`, lookup do alvo, update, `revalidatePath('/admin/utilizadores')`. Devolve `SetUserRoleResult` para testes; consumido como void no form da página.
- add: `supabase/migrations/20260514030344_profiles_role_mutation_authority.sql` — policy `profiles_update_super_admin` (super_admin pode update em qualquer profile, necessário para a UI) + função `enforce_profiles_role_mutation_authority()` + trigger BEFORE UPDATE que bloqueia (a) mudanças de role por não-super_admin, (b) mudanças que afectem super_admins, (c) valores fora de `{user, admin}`. Defesa em profundidade ao Server Action; cobre service-role-bypass também (trigger corre sempre).
- add: `src/components/site/user-menu.test.tsx` — 2 testes para o trigger (nome no botão + aria-label). Nota in-line: items do menu não testados em jsdom porque base-ui `Menu` não monta o conteúdo sem APIs de browser (ResizeObserver, etc.); cobertura via testes do admin layout (mesma lógica `role !== 'user'`) + E2E manual.
- add: `src/app/admin/layout.test.tsx` — 4 testes: `notFound()` quando sem sessão e quando role=user; renderização normal para admin (sem link Utilizadores) e super_admin (com link).
- add: `src/app/admin/utilizadores/actions.test.ts` — 9 testes do Server Action: caller sem sessão / não super_admin; targetId inválido; newRole inválido; alvo é o próprio; alvo é super_admin; no-op quando role já é o pedido; promoção feliz com revalidatePath; erro de DB ao update.

### update
- update: `src/components/site/header.tsx` — substitui `<span>Olá, {nome}</span>` por `<UserMenu user={user} />`. Helper `firstName()` movido para dentro de `UserMenu`.

### infra
- infra: 1 migration aplicada a `logos-dev` (`20260514030344_profiles_role_mutation_authority`). A aplicar a `logos-prod` antes do merge desta PR em produção.

---

## [14-05-2026] — copy do ministério: Conhece-nos, home e Fala connosco

### update
- update: `Conhece-nos` substitui o texto placeholder (tag "Em construção" + secções "O que aqui encontras"/"Quem está por trás") pelo manifesto definitivo do ministério Logos — propósito, significado de «Logos», a igreja que se quer construir, a tríade "Mais do que… queremos…" e a assinatura. Fecha com um cartão-CTA que liga ao site da CCLX (`cclx.pt`, nova aba, `rel` seguro).
- update: parágrafo do hero da home passa a abrir com "O ministério Logos é o espaço…" (antes "A plataforma Logos…"), alinhando o vocabulário com o do ministério.
- update: `Fala connosco` — intro deixa cair "viste um erro num curso"; fica "Tens uma sugestão ou queres saber mais sobre a CCLX?".
- update: `conhece-nos/page.test.tsx` reescrito para o novo conteúdo (propósito + tríade + link CCLX). 25/25 testes a passar.

---

## [14-05-2026] — "Cursos" passa a "Conteúdos" (hub com Cursos + Escola Bíblica)

### update
- update: o item de topo da navegação deixa de ser **Cursos** e passa a **Conteúdos**. A página `/cursos` deu lugar a `/conteudos`, um hub com dois cartões — **Cursos** e **Escola Bíblica** — que prepara o site para os dois tipos de conteúdo previstos. Decisão de produto do líder do projeto: entregar o esqueleto ao público numa versão "em construção", para sinalizar o que virá.
- update: `home-hero.tsx` e `not-found-content.tsx` — o CTA "Ver cursos" passa a "Ver conteúdos" e aponta para `/conteudos`.
- update: o hub `/conteudos` recebe a copy definitiva do ministério — parágrafo de abertura ("Os nossos conteúdos foram desenvolvidos…") e linha de contacto com `logos@cclx.pt` a substituir a tag placeholder "Em construção". Teste novo para o mailto (29/29 a passar).

### add
- add: `src/app/conteudos/` — hub (`conteudos-content.tsx`) com dois cartões em grelha (tonalidades `cream-card` e `sage-card`), cada um a ligar à respetiva sub-página.
- add: `src/app/conteudos/cursos/` — a antiga página `/cursos` (placeholder "Em breve" + 3 pilares) movida para `/conteudos/cursos`, sem alteração de conteúdo.
- add: `src/app/conteudos/escola-biblica/` — nova sub-página placeholder "Em construção / Em breve" para as futuras transmissões da Escola Bíblica da CCLX (live streams, trabalho de uma versão futura — ver `SPEC_1.md` §6/§9).
- add: 4 testes novos (hub: heading, dois cartões com destinos certos, badge "Em breve"; Escola Bíblica: heading + nota). 28/28 a passar.

### docs
- docs: `SPEC_1.md` atualizada — modelo de conteúdo passa a falar de "Conteúdos" como nível de topo com duas áreas (Cursos + Escola Bíblica); `sitemap.ts` ganha as duas sub-rotas de Conteúdos.

---

## [14-05-2026] — favicon maior (logótipo de margem a margem)

### update
- update: `src/app/favicon.ico` e `src/app/icon.png` regenerados com o logótipo de margem a margem (~2% de margem em vez de ~16%) — fica o maior possível no separador do browser. A legibilidade do texto "LOGOS" a 16–32px continua limitada pelo formato largo do logótipo (decisão de produto: manter o logótipo completo).

---

## [14-05-2026] — favicon e ícone com fundo transparente

### fix
- fix: `src/app/favicon.ico` e `src/app/icon.png` tinham fundo creme — passa a transparente, para o logótipo flutuar no separador do browser sem caixa à volta. O `og-image.png` mantém o fundo creme de propósito (PNG transparente renderiza como preto no WhatsApp/Facebook).

---

## [14-05-2026] — Open Graph + favicon com o logótipo completo Logos

### fix
- fix: partilhar `logos.cclx.pt` no WhatsApp/redes mostrava um cartão genérico da Vercel — a app não definia nenhuma `og:image` nem bloco `openGraph`, e sem imagem própria os scrapers caíam para o fallback do alojador.
- fix: o separador do browser mostrava o favicon por omissão do Next.js — substituído pelo logótipo Logos.

### add
- add: `public/og-image.png` — cartão Open Graph 1200×630, logótipo completo (livro + letras "LOGOS") centrado em fundo creme (`#faf4ea`). Imagem estática composta com `sharp`, sem código em runtime.
- add: `src/app/icon.png` — ícone 512×512 com o logótipo centrado em fundo creme (browsers modernos, via `<link rel="icon">` gerado pelo App Router).
- add: bloco `openGraph` + `twitter` (`summary_large_image`) + `metadataBase` em `src/app/layout.tsx`, apontando para `/og-image.png` com `width`/`height`/`alt`.

### update
- update: `src/app/favicon.ico` passa a ser o logótipo Logos (PNG 48×48 embebido num contentor ICO montado à mão — o `sharp` não escreve `.ico`).

### docs
- docs: `feature-docs/og-image.md` — porquê dos bugs, decisões e como regenerar os assets.

> Nota: uma iteração intermédia (PR #28) usou só o livro do logótipo no cartão; revertido para o logótipo completo por decisão de produto. O `public/logo-cclx-book.svg` desse PR foi removido.

---

## [14-05-2026] — V2 PR2: login flow Google OAuth + callback + trigger profile sync + RLS fixes

### add
- add: `src/lib/auth/index.ts` — implementação real de `getServerClient()` (cria cliente `@supabase/ssr` com cookies do request, para Server Components/Actions); `getRouteHandlerClient(response)` (variante para Route Handlers — escreve cookies directamente na `NextResponse` em vez do `cookieStore`, padrão canónico Supabase Next.js); `getCurrentUser()` (lookup `auth.uid() → profiles.external_auth_id → Profile camelCase`). Substitui stubs de PR1.
- add: `src/lib/auth/actions.ts` — Server Actions `signInWithGoogleAction` (chama `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: ${origin}/auth/callback })` e redirecciona) + `signOutAction`. Helper `getOrigin()` lê `origin`/`x-forwarded-proto`+`x-forwarded-host`/`host` por ordem de robustez.
- add: `src/lib/auth/proxy.ts` — `updateSession()` que refresca o token Supabase em cada request. Sem isto, sessões expiravam silenciosamente após ~1h.
- add: `src/proxy.ts` — shim raiz que invoca `updateSession`. Matcher exclui assets estáticos. **Convenção Next.js 16:** `proxy.ts` (não `middleware.ts` — depreciado).
- add: `src/app/auth/callback/route.ts` — GET handler do callback OAuth: `exchangeCodeForSession(code)` → redirect para `?next=` (validado como caminho relativo interno, defesa anti-open-redirect) ou `/`. Erros viram `?auth_error=missing_code|exchange_failed`. Usa `getRouteHandlerClient(response)` para os cookies de sessão chegarem ao redirect.
- add: `src/components/site/sign-in-button.tsx` — `<form action={signInWithGoogleAction}>` com `Button` shadcn (`size="sm"`, label "Entrar"). Renderizado pelo Header quando não há sessão.
- add: `supabase/migrations/20260514015528_profiles_insert_trigger.sql` — função `handle_new_auth_user()` (`SECURITY DEFINER`, `coalesce(name, full_name, email)` para `display_name`) + trigger `on_auth_user_created AFTER INSERT ON auth.users`. Idempotente via `on conflict (external_auth_id) do nothing`.
- add: `supabase/migrations/20260514022124_current_profile_id_security_definer.sql` — fix #1 descoberto no E2E: `current_profile_id()` passa de `SECURITY INVOKER` a `SECURITY DEFINER` para quebrar recursão RLS (a função era chamada pela policy de `profiles` e queryava `profiles`).
- add: `supabase/migrations/20260514022734_profiles_select_policy_no_recursion.sql` — fix #2 descoberto no E2E: a policy `profiles_select_own_or_super_admin` ainda continha `or exists (select 1 from profiles me ...)`, sub-select que re-disparava a policy. Nova função `current_profile_role()` `SECURITY DEFINER` + reescrita da policy para `id = current_profile_id() or current_profile_role() = 'super_admin'`. Sem queries em `profiles` dentro da policy.
- add: `src/app/auth/callback/route.test.ts` — 6 testes (sucesso, `?next` válido, rejeição de `next` absoluto e protocol-relative, código em falta, exchange falhado).

### update
- update: `src/components/site/header.tsx` — passa a `async` server component, lê `getCurrentUser()`, renderiza `<SignInButton />` ou `<span aria-live="polite">Olá, {primeiroNome}</span>` (placeholder; dropdown real fica para PR3).
- update: `src/lib/auth/index.test.ts` — reescrito: cobre `getCurrentUser()` em 4 ramos (sem sessão, sessão sem profile, erro RLS, sucesso com mapeamento camelCase).
- update: `src/components/site/home-hero.tsx` — CTAs migram de `<Button render={<Link/>}>` para `<Link className={buttonVariants(...)}>`. Razão: o uso anterior disparava warning Base UI ("`nativeButton=true` mas elemento renderizado não é `<button>`") e tentar silenciar com `nativeButton={false}` partia testes (mudava o role acessível). O padrão `Link + buttonVariants` é idiomático shadcn, mantém `role="link"` correcto e elimina o warning.

### infra
- infra: 3 migrations aplicadas a `logos-dev` via `pnpm dlx supabase db push` — `20260514015528` (trigger), `20260514022124` (function security definer), `20260514022734` (policy sem recursão). Confirmadas em `migration list`. Repetir todas em `logos-prod` antes do primeiro merge V2 visível em produção.

### why
- **Trigger DB sozinho** (em vez de "Server Action + trigger" da spec original) — Server Action a inserir em `profiles` exigia service role (RLS sem `for insert` policy, decisão deliberada de PR1). Trigger `SECURITY DEFINER` cobre 100% dos caminhos (callback OAuth, criação por SQL admin, dashboard) sem introduzir novo segredo (`SUPABASE_SERVICE_ROLE_KEY`).
- **Proxy + cliente para Route Handlers separado** — `cookieStore.set()` do `next/headers` **não** propaga cookies para uma `NextResponse.redirect()`. Sem `getRouteHandlerClient(response)`, a sessão exchangeada no callback não persistia no redirect → `getCurrentUser()` no Header seguinte devolvia `null`. Descoberto no E2E manual via logs `[auth/diag]` temporários (já removidos).
- **2 fixes RLS** — descobertos por experimentação no E2E. A função e a policy ambas tocavam `profiles`, criando dois pontos de recursão. Documentado em comentários SQL detalhados das migrations.
- **Validação de `?next`** — recusar URLs absolutos e protocol-relative (`//evil.com`) é defesa contra open redirect. Aceita apenas caminhos `/<algo>` internos.

### segue
- 🔜 Após primeiro login Google de `joaocanelasribeiro@gmail.com` em `logos-dev` (já feito durante este E2E): correr `supabase/seed/super-admin.sql.example` (cópia local) contra `logos-dev` para promover. Necessário antes de PR3.
- 🔜 PR3 — Roles UI + área `/admin` esqueleto.

---

## [14-05-2026] — V2 PR1: foundation auth (DB + skeleton lib/auth/ + ESLint guard)

### add
- add: `supabase/migrations/20260514002002_profiles_and_current_profile_id.sql` — cria `profiles` (id, external_auth_id, display_name, role, created_at; check em role para `user|admin|super_admin`; FK `auth.users` com `on delete restrict`), função SQL `current_profile_id()` (STABLE, security invoker) e 2 RLS policies em `profiles` (select próprio ou super_admin; update apenas próprio). Sem `for insert` policy — Server Action no callback OAuth (PR2) faz o insert via service role.
- add: `src/lib/auth/index.ts` — tipo `Profile` + `Role` + 4 stubs (`getCurrentUser` devolve `null`, `getServerClient`/`signInWithGoogle`/`signOut` atiram erro com mensagem "chega em V2 PR2"). Fixa o contrato público da camada de identidade.
- add: `src/lib/auth/index.test.ts` — 4 testes que verificam o comportamento dos stubs.
- add: `@supabase/ssr@0.10.3` + `@supabase/supabase-js@2.105.4` em dependências (uso real só em PR2; instaladas agora para validar o ESLint guard).

### update
- update: `eslint.config.mjs` — regra `no-restricted-imports` bloqueia `@supabase/ssr` e `@supabase/supabase-js` fora de `src/lib/auth/**`. Override por ficheiro reactiva-os dentro dessa pasta. Mensagem de erro aponta consumidores para `@/lib/auth`.

### segue
- ✅ Migration aplicada a `logos-dev` em 14-05-2026 (CLI + `SUPABASE_ACCESS_TOKEN`). `list_migrations` confirma `20260514002002` em local + remoto. Repetir em `logos-prod` antes do primeiro merge V2 PR2 em produção.
- 🚧 `feature-docs/google-oauth-setup.md` em execução pelo utilizador (~20 min). Pré-condição para PR2.

### fix (doc)
- fix: `feature-docs/google-oauth-setup.md` §5.5 — Google **não aceita wildcards** em "Authorized JavaScript origins" (`*.vercel.app` é rejeitado com erro "Origem inválida"). Doc passa a indicar apenas hosts concretos (`localhost:3000` em dev, `logos.cclx.pt` em prod). Login em Vercel Preview fica sem suporte por design.
- fix: `feature-docs/google-oauth-setup.md` §8.2 — clarificar que "Redirect URLs" é uma **secção separada do Site URL** na mesma página (não um campo único); aqui wildcards **são** aceites pelo Supabase, mas adicionar Preview wildcards não vale a pena (Google já bloqueia antes).
- add: `feature-docs/google-oauth-setup.md` §9 + §10 — nota sobre não guardar o JSON com Client Secret em pastas sincronizadas + 2 linhas novas na tabela de troubleshooting (erro de wildcard + "não vejo Redirect URLs").

### why
- Estabelece a **fronteira de identidade** em código antes de a fronteira ser exercitada por código real. A regra ESLint torna desvios automáticos de detectar logo no PR seguinte.
- A migration aplica-se a Production sem efeito visível (tabela vazia até primeiro login real em prod, pós-PR2).
- Stubs com mensagem clara evitam que outros desenvolvedores (ou Claude noutra sessão) chamem a API antes de PR2 e fiquem confusos com o porquê.

---

## [14-05-2026] — V2 planeada: 2 docs novos em feature-docs/

### docs
- add: `feature-docs/google-oauth-setup.md` — passo-a-passo para criar OAuth App no Google Cloud Console (consent screen + 2 Web Clients, um por ambiente Supabase) e ligar ao provider Google de `logos-dev` (`dknrnqyqlojvnhspwjrd`) e `logos-prod` (`tirzriuabfwzqxtjsmfb`). Inclui tabela de troubleshooting e nota sobre `Publish app` para evitar bloqueio em "Testing".
- add: `feature-docs/v2-auth.md` — sequência de 4 PRs para V2 (PR1 foundation sem OAuth, PR2 login + callback + profile sync, PR3 roles UI + área `/admin` esqueleto, PR4 etiquetas). Cada PR lista ficheiros tocados, testes pensados e checkpoints operacionais (ex.: correr seed super_admin pós-PR2).

### update
- update: `status.md` — secção "Próximas tarefas" reescrita: SVG do ministério marcado como resolvido (continuamos com `logo-cclx-interiors.svg`); tarefa genérica de OAuth substituída por referência directa a `google-oauth-setup.md`; V2 PR1-PR4 listadas como próximos passos com ponteiros para `v2-auth.md`.

### why
- V2 é o salto técnico maior do projecto (4 PRs, mexe em DB + auth + RLS + UI admin). Antes de escrever migrations, valer a pena fechar o desenho num documento que define **o que cada PR entrega**, **o que ainda não entrega**, e **a ordem operacional** (ex.: seed super_admin só pode correr depois de a pessoa fazer login pela primeira vez).
- O documento de OAuth setup é necessário porque o utilizador escreveu explicitamente "não sei como começar" — passo-a-passo no painel Google reduz fricção e elimina decisões em runtime.

---

## [14-05-2026] — V1 conteúdo: copy placeholder em Conhece-nos, Cursos e Fala connosco

### update
- update: `src/app/conhece-nos/conhece-nos-content.tsx` — copy substantivo em 3 secções: identificação ("Somos a CCLX — Comunidade Cristã Lisboa"), "O que aqui encontras" (vídeo + PDF + sem prazos, sempre gratuito), "Quem está por trás" (equipa de voluntários). Marcado como "Em construção — texto definitivo em breve".
- update: `src/app/cursos/cursos-content.tsx` — passa de placeholder simples a layout com intro + secção "O que vais encontrar" (3 cards: vídeo embebido, apostila PDF, ritmo próprio — icons `BookOpen`, `FileDown`, `CheckCircle2`). Mantém tag "Em breve".
- update: `src/app/fala-connosco/fala-connosco-content.tsx` — passa a oferecer 2 cards de contacto: email (`mailto:logos@cclx.pt?subject=Contacto Logos`) e site da CCLX (`https://cclx.pt`, abre em nova aba com `rel="noopener noreferrer"`). Nota inferior "Horários e morada da igreja em breve".

### add
- add: `src/app/conhece-nos/page.test.tsx`, `cursos/page.test.tsx`, `fala-connosco/page.test.tsx` — smoke tests por página (h1 + ancoras de copy + mailto/target/rel para Fala connosco). 14/14 testes a passar.

### why
- **Desbloquear V1 sem esperar pelo ministério.** Decisão consciente: copy nas 3 páginas é placeholder mas concreto o suficiente para servir em Production. Quando o ministério mandar texto final, é substituição de strings em ficheiros isolados (sem mexer em layout/animações/testes — exceto para actualizar matchers de copy se necessário).
- **3 pilares dos cursos coerentes com SPEC §6/§8:** vídeo YouTube embebido + PDF descarregável + estado de conclusão binário sem barras de progresso (`SPEC_1.md` proíbe percentagens até V7). Os 3 cards na página Cursos já comunicam isto.
- **Fala connosco com algo útil hoje:** `mailto:` com subject prefill ajuda triagem; link CCLX com nova aba para utilizadores continuarem no Logos depois. Morada/horários da igreja explicitamente pendentes do ministério.

### segue
- Substituir copy de Conhece-nos e Fala connosco por texto final do ministério (sem alteração de estrutura).
- Acrescentar morada + horários a Fala connosco quando o ministério os fornecer.

---

## [13-05-2026] — V1 a11y: skip-link "Saltar para o conteúdo"

### add
- add: `src/components/site/skip-link.tsx` — link "Saltar para o conteúdo" como **primeiro elemento focável** do body. `sr-only` por defeito, `focus:not-sr-only` quando recebe foco — aparece em cima-esquerda. Aponta para `#main-content`.
- add: `src/components/site/skip-link.test.tsx` — 2 testes (link tem `href="#main-content"` + texto PT-PT; classes `sr-only` + `focus:not-sr-only` presentes).

### update
- update: `src/app/layout.tsx` — `<SkipLink />` antes do `<Header />`; `<main>` ganha `id="main-content"` + `tabIndex={-1}` + `focus:outline-none` (alvo do salto, focável programaticamente sem ring visível).

### why
- Utilizadores de teclado e de leitor de ecrã têm hoje de tabular toda a Header (logo + hambúrguer/nav) antes de chegarem ao conteúdo principal. WCAG 2.4.1 ("Bypass Blocks") pede uma forma de saltar. Esta é a opção mais simples e bem-documentada — um `<a>` que aparece no foco.
- 7/7 testes locais a passar; sem novas dependências.

---

## [13-05-2026] — V1 UX: stagger nas páginas + interiores das letras do logo transparentes

### add
- add: `src/lib/motion-variants.ts` — `staggerContainer` + `staggerItem` partilhados. Substituem variants duplicados que viviam só em `home-hero.tsx`.
- add: `src/app/conhece-nos/conhece-nos-content.tsx`, `cursos/cursos-content.tsx`, `fala-connosco/fala-connosco-content.tsx`, `not-found-content.tsx` — client components com `motion.section` + stagger. Cada `page.tsx` mantém-se server para preservar `export const metadata`.
- add: `public/logo-cclx-interiors.svg` — variante do logo com **interiores das letras transparentes**. Gerado a partir de `logo-cclx-clean.svg` via análise programática: bbox de cada path comparado com bboxes das 5 letras (L, O, G, O, S — extraídas dos paths laranja `#E38258`); paths creme **fully contained** dentro de uma letra ficam `fill="none"`. Resultado: 247 paths modificados, 198 mantidos (livro + gaps entre letras). Diff de tamanho: −0.4% (189904 → 189163 bytes).

### update
- update: `src/components/site/home-hero.tsx` — importa variants do novo módulo partilhado. Comportamento idêntico.
- update: `src/components/site/logo.tsx` — `src` aponta para `/logo-cclx-interiors.svg`.
- update: páginas `conhece-nos`, `cursos`, `fala-connosco` e `not-found` passam a delegar render ao client component co-localizado.

### why
- **Stagger consistente:** Home tinha entrada animada (logo → h1 → parágrafo → CTAs); restantes páginas saltavam directo. Resolve a falta de coerência. Pages curtas (2-3 elementos) também beneficiam — feedback de "página acabou de carregar" sem ruído.
- **Interiores das letras:** o SVG do ministério tem paths creme a preencher o bowl dos O e do G, dando aspecto de "branco" contra `bg-background` (`#FAF4EA`). Solução cirúrgica: só paths cuja bbox cai inteiramente dentro de uma letra ficam `fill="none"`. Livro fica intacto (paths em `y=509-757`), gaps entre letras também.
- **Cliente vs servidor:** `motion/react` exige client component. `metadata` exige server component. Padrão Next 15 limpo: `page.tsx` é fino, delega ao `<name>-content.tsx`. Fica `'use client'` localizado, não polui o root.

### limites
- Análise feita às cegas — Claude não tem browser. O utilizador valida em Preview Vercel se: (a) interior das letras agora mostra a cor do fundo da página, (b) livro mantém detalhe creme, (c) gaps entre letras não têm halo visível indesejado. Se houver halo, iterar — abrir bbox para incluir paths que cruzam a fronteira da letra.

---

## [13-05-2026] — Decisões pré-V2: bootstrap do Super Admin + entrada admin

### docs
- update: `SPEC_1.md` §4 — nova sub-secção "Bootstrap do primeiro Super Admin (V2)". Primeiro super_admin é `joaocanelasribeiro@gmail.com`. Entrada à área `/admin` via item no dropdown do utilizador (visível apenas se `role !== 'user'`). Sem link na nav principal, sem sub-domain, sem aviso para utilizadores normais.
- update: `SPEC_1.md` §19 — versão bumped para 2.8.
- update: `architecture.md` §4 — dois bullets novos: seed do primeiro super_admin via SQL versionado depois do primeiro login Google; entrada admin via dropdown coerente com "conteúdo restrito é invisível".
- update: `feature-docs/auth-architecture.md` — nova §5.1 "Bootstrap do primeiro Super Admin" com processo passo-a-passo, justificação ("porquê SQL versionado e não migration"), e nota de que `display_name` continua a vir do provider.

### add
- add: `supabase/seed/super-admin.sql.example` — SQL versionado em `DO $$ ... $$` idempotente. Lança `EXCEPTION` se a pessoa ainda não fez login; faz no-op se já é super_admin; reporta `row_count` via `RAISE NOTICE`. Não é corrido automaticamente — operador copia para `super-admin.sql` (gitignored) e executa contra o ambiente após o primeiro login.
- add: `.gitignore` — `supabase/seed/*.sql` (cópias locais) + `!supabase/seed/*.sql.example` (manter exemplos versionados).

### why
- Pre-V2 alignment: os três pontos abertos do design admin estavam por decidir (quem é o primeiro super_admin, como se entra na área admin, como se faz o seed). Sem isto, V2 PR1 (implementação da camada `lib/auth/` + migration `profiles`) começaria com decisões em runtime.
- Mantém-se a regra "boring, well-documented option" do `CLAUDE.md`: SQL versionado em vez de automação opaca; cópia local em vez de credenciais em CI.

---

## [13-05-2026] — V1 polimento: 404 PT-PT + robots/sitemap + limpeza

### add
- add: `src/app/not-found.tsx` — página 404 global em PT-PT, dentro do shell (`Header`/`Footer` herdados do layout). Heading "Página não encontrada" + CTAs `Voltar ao início` e `Ver cursos`. `metadata.robots = { index: false, follow: false }`.
- add: `src/app/robots.ts` — `MetadataRoute.Robots` permissivo (`allow: '/'`) com `sitemap` e `host` a apontar para `siteConfig.url` (`https://logos.cclx.pt`).
- add: `src/app/sitemap.ts` — `MetadataRoute.Sitemap` gerado a partir de `siteConfig.url` + `navItems`. Home com `priority: 1`, restantes com `0.7`. `changeFrequency: 'monthly'`. `lastModified = new Date()` (build-time).
- add: `src/app/not-found.test.tsx` — 2 testes (heading 404 em PT-PT + CTAs com `href` correctos).

### update
- update: site deixa de servir o 404 default em inglês do Next em qualquer rota inválida.

### remove
- remove: `src/app/debug-logo/` — rota de scaffolding usada durante a decisão "logo textual vs SVG" (`feature-docs/v1-shell.md` §3.2). Decisão fechada em V1 PR1, rota não pertence a produção.

### why
- Higiene técnica antes de partilhar `logos.cclx.pt` publicamente: SEO básico (`robots`/`sitemap`), erro 404 consistente com o resto do site (em PT-PT, dentro do shell), e remoção de rotas debug acessíveis em produção.
- Não bloqueia em copy do ministério (que é o que trava V1 PR2 e PR3).

---

## [12-05-2026] — Production: domínio `logos.cclx.pt` activo

### infra
- add: domínio custom `logos.cclx.pt` adicionado ao projeto Vercel `logos` (Production scope). CNAME `logos.cclx.pt` → `00f4337193415fe7.vercel-dns-017.com` (formato novo do Vercel, hash único por domínio).
- update: zona DNS Hostinger de `cclx.pt` — registos antigos do sub-domínio `logos` (A `147.79.119.210` + `193.58.105.154`, AAAA `2a02:4780:...`) removidos para libertar o nome; CNAME único adicionado a apontar para o target Vercel. Conflito CNAME+A é rejeitado pelo protocolo DNS, portanto a limpeza era pré-condição.
- add: certificado HTTPS emitido automaticamente pelo Vercel (Let's Encrypt) após validação. `https://logos.cclx.pt` responde 200.
- add: env var `NEXT_PUBLIC_SITE_URL=https://logos.cclx.pt` no scope **Production** via `vercel env add`. Era deliberadamente unset durante o Setup à espera de DNS (`feature-docs/vercel.md` §7).
- update: redeploy de Production forçado após o `env add` — `NEXT_PUBLIC_*` é inlined em build-time, portanto o deploy anterior (do merge PR #17, ~1 min antes) não trazia o valor novo.

### docs
- update: `feature-docs/vercel.md` §9 — DNS deixa de estar "pendente"; passa a "activo" com o CNAME concreto (`00f4337193415fe7.vercel-dns-017.com`) e nota sobre conflito CNAME+A.
- update: `feature-docs/vercel.md` §10 — "Pendente" perde os bullets de DNS e `NEXT_PUBLIC_SITE_URL`.
- update: `status.md` — bullets de DNS Hostinger e checkpoint do `NEXT_PUBLIC_SITE_URL` movem-se para ✅ Concluído; risco "DNS Hostinger" removido.
- update: `changelog.md` — esta entrada.

### why
- Fecha a última dependência externa que travava a V1 em Production (até aqui Production estava em `logos-<hash>.vercel.app`).
- Desbloqueia metadata absoluta (`<link rel="canonical">`, OG tags, sitemap) para qualquer feature V1/V2 que precise de URL fixo.

---

## [12-05-2026] — V1 PR1 mergeado para `main` (PR #17)

### infra
- update: PR #17 (`feat/v1-shell` → `main`) squash-merged via `gh pr merge --squash --delete-branch`. CI verde, Vercel Preview verde, `mergeStateStatus: CLEAN`. Branch `feat/v1-shell` apagada local e remotamente. Primeiro PR a passar pela regra de branch protection (PR #15 / #16 foram os que a activaram).
- add: deploy Production do shell de navegação iniciado automaticamente pelo push em `main`. Aliased a `https://logos.cclx.pt` após DNS+env var (entrada acima).

### why
- Production deixa de servir a página "Em construção" do Setup e passa a servir o shell V1 (Header + Footer + Home + stubs).
- Conteúdo das PRs V1 seguintes (Conhece-nos, Cursos placeholder, Fala-connosco) será mergeado em cima deste shell.

---

## [12-05-2026] — V1 PR1: shell de navegação (Header + Footer + Home + stubs)

### add
- add: `src/components/site/header.tsx` — cabeçalho global sticky, `bg-background/95` com backdrop blur, logo à esquerda + nav à direita em desktop (`md+`), hambúrguer em mobile.
- add: `src/components/site/footer.tsx` — rodapé com Logo `size="sm"` + descrição do projeto, link à página da CCLX e copyright dinâmico.
- add: `src/components/site/logo.tsx` — wordmark "LOGOS" em Cormorant Garamond a `text-orange` + ícone `BookOpen` da `lucide-react`. Tamanhos `sm`/`md`/`lg`. Renderiza como `<Link href="/">` por defeito; `asStatic` para uso em hero/rodapé. Decisão de usar fallback de texto em vez do SVG de `docs/branding/logo-cclx-logos.svg` documentada em `feature-docs/v1-shell.md` §3.2 (SVG tem fundo `#F7F7F7` opaco que cobriria a paleta creme).
- add: `src/components/site/nav-links.tsx` — `'use client'`, lê `usePathname()` para aplicar `aria-current="page"` + sublinhado em rota activa. Reutilizado em desktop (`orientation="horizontal"`) e mobile (`orientation="vertical"`).
- add: `src/components/site/mobile-nav.tsx` — `'use client'`, hambúrguer + painel `fixed inset-x-0 top-16 bottom-0` com `role="dialog" aria-modal="true"`. Fecha com Escape, bloqueia scroll do body enquanto aberto. Sem dependência shadcn `Sheet` (não está na roadmap V1 do `feature-docs/shadcn-ui.md`).
- add: `src/lib/site-config.ts` — `siteConfig` (nome, descrição, organização) + `navItems` centralizados (single source of truth para nav).
- add: `src/app/conhece-nos/page.tsx`, `src/app/cursos/page.tsx`, `src/app/fala-connosco/page.tsx` — **stubs** com "em breve" para que o nav não dê 404 entre PRs. PR2 e PR3 substituem.
- add: `feature-docs/v1-shell.md` — estrutura, decisões (sem `Sheet`, logo textual, `Button render={<Link/>}` em vez de `asChild`), a11y, validação local.

### update
- update: `src/app/layout.tsx` — passa a envolver `children` em `<Header />` + `<main className="flex-1">` + `<Footer />`. Body com `bg-background text-foreground flex min-h-full flex-col`. Metadata `default` e `template` consomem `siteConfig`.
- update: `src/app/page.tsx` — "Em construção" reescrita como hero V1: Logo `size="lg" asStatic`, h1 "Estudo bíblico para uma fé enraizada.", parágrafo de intro PT-PT, dois CTAs (`Button render={<Link href="/cursos" />}` para "Ver cursos" + variant `ghost` para "Conhece o projeto").
- update: `src/app/page.test.tsx` — 3 testes: heading presente + wordmark visível + CTAs com `href` correctos. Removido o teste de "Em construção" (substituído por hero).

### why
- Primeira PR da V1; o site deixa de ser "Em construção" e passa a ter shell pronto para receber conteúdo nas PRs seguintes.
- Stubs em vez de rotas missing evitam 404 do nav durante revisão de PR2/PR3.
- Copy em PT-PT rascunhada pelo agent; revisão final pelo ministério antes de Production (decisão em chat — `status.md`).

### gotchas (documentados em `feature-docs/v1-shell.md`)
- Base UI (não Radix) — `Button` não tem `asChild`; usa `render` prop.
- SVG do logo de `docs/branding/` não é usável em runtime; fallback textual ao abrigo da `SPEC_1.md` §14.
- Tokens shadcn `--muted` (`#f4ead8`, background) vs `--muted-foreground` (`#6b6b6b`, texto): texto secundário usa `text-muted-foreground`.

---

## [12-05-2026] — Setup: branch protection em `main` activa

### infra
- add: regra de branch protection aplicada via `gh api PUT /repos/cclx-pt/Logos/branches/main/protection`. Configuração:
  - `required_pull_request_reviews: { required_approving_review_count: 0 }` — PR obrigatório, sem exigência de aprovação (single dev).
  - `required_status_checks: { strict: false, contexts: ["Lint · Typecheck · Test · Format"] }` — CI tem de passar antes de merge.
  - `required_linear_history: true` — alinhado com squash-merge usado em todos os PRs.
  - `allow_force_pushes: false`, `allow_deletions: false`.
  - `enforce_admins: false` — admin pode override em emergência; disciplina honor-system continua em `CLAUDE.md` + `.claude/settings.json` `permissions.deny`.

### docs
- update: `SPEC_1.md` §16 — branch protection passa de "elegível, activação pendente" para **activa** com a regra completa documentada.
- update: `SPEC_1.md` §19 — v2.6 → v2.7.
- update: `feature-docs/ci.md` §1 — admonition reescrita: regra activa, com a configuração concreta listada.
- update: `status.md` — bullet "Activar branch protection em `main`" movido para ✅ Concluído; entrada em ⚠️ Riscos actualizada (risco residual = override de admin).
- update: `changelog.md` — esta entrada.

### why
- Fecha o último item de fundação que dependia da mudança de visibilidade do repo (PR #15).
- Estabelece salvaguarda server-side para a regra "nunca push directo para `main`" que era apenas honor-system.
- Este próprio PR valida a regra na prática (primeiro a passar pelo gate).

---

## [12-05-2026] — Setup: Vercel bootstrap (deploy + env vars + repo público)

### infra
- add: projeto Vercel `logos` (`prj_V0Kp9TZj5QHdAkwBMoPenKlA1TJj`) no scope `jcrninjas-projects` (conta pessoal — CCLX sem Vercel team, adiar até Pro justificável). Framework auto-detectado Next.js. Install/build resolvidos via `packageManager: pnpm@10.33.2` do `package.json`.
- add: Vercel GitHub App instalado em `cclx-pt` org com acesso restrito a `Logos` (Only select repositories). `push origin main` → Production deploy; PRs → Preview com URL único; webhook GitHub → Vercel.
- add: env vars nos 3 scopes (Production / Preview / Development) via `vercel env add`:
  - **Production**: `NEXT_PUBLIC_SITE_NAME=Logos` (Supabase prod env vars deliberadamente unset até checkpoint V2).
  - **Preview**: `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SUPABASE_URL` (logos-dev), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (logos-dev). Preview aponta para `logos-dev`, não `logos-prod` (segurança de mutação, schema testing, auth testing, custo zero).
  - **Development**: mesmo conjunto do Preview + `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Espelha `.env.local` para `vercel env pull` quando alguém clonar o repo.
- update: visibilidade do repo `cclx-pt/Logos` privada → pública (12-05-2026). Restrição do plano Hobby: repo de organização privado requer Pro (~20€/mês). Mudança aceite após verificação de segurança (nenhum `.env` jamais commitado; refs Supabase são identificadores públicos por design; publishable key é client-side; service role nunca em ficheiro versionado).

### add
- add: `.gitignore` — entrada `.vercel` (ficheiros gerados por `vercel link`: `.vercel/project.json` contém `projectId` + `orgId`, não deve ser versionado).
- add: `feature-docs/vercel.md` — bootstrap completo: recursos provisionados, ligação GitHub↔Vercel, env vars por scope (com decisão Preview→logos-dev), razão da mudança de visibilidade do repo (com checklist de segurança), CLI install/login, gotcha do `vercel env add` em Claude Code (auto-deteção de agent + workaround `env -u CLAUDECODE`), validação do primeiro deploy, DNS pendente, troubleshooting.

### docs
- update: `SPEC_1.md` §13.5 — Preview deploys formalizados a apontar para `logos-dev` (decisão prévia em `feature-docs/supabase.md` PR #12 promovida à SPEC).
- update: `SPEC_1.md` §16 e `feature-docs/ci.md` §1 — branch protection passa de "não elegível no plano free" para "elegível agora que o repo é público"; activação fica como tarefa nova.
- update: `architecture.md` §8 — tabela de ambientes inclui Vercel scopes (Production/Preview/Development) e referência a `feature-docs/vercel.md`.
- update: `status.md` — bullet "Criar conta Vercel e ligar ao repositório" movido para ✅ Concluído; tarefa nova "Activar branch protection em `main`" em ⏭️ (agora elegível); risco antigo sobre branch protection actualizado.

### why
- Pré-condição V1 (site público estático precisa de host com deploy automático).
- Preview deploys por PR aceleram review (URL único, comentário automático no PR, valida build antes de merge).
- 0€/mês mantido como `SPEC_1.md §11` exige; trade-off da visibilidade do repo aceite após auditoria.

---

## [09-05-2026] — Setup: auth scope reduzido para Google OAuth apenas (V1-V9)

### docs
- update: `SPEC_1.md` §9.2 (V2) — login passa a Google OAuth apenas; remoção da linha de recovery emails via Resend.
- update: `SPEC_1.md` §11 — célula Autenticação atualizada (apenas Google OAuth, com referência a §17/§18); célula Email (Resend) passa para "V5+ notificações Q&A" (sem urgência V2).
- update: `SPEC_1.md` §17 — nova decisão adiada explícita sobre email/password como método alternativo (reabrir apenas se o ministério pedir inclusão de utilizadores sem Google).
- update: `SPEC_1.md` §18 — login com email e palavra-passe listado como fora de âmbito V1-V9.
- update: `SPEC_1.md` §19 — versão 2.4 → 2.5.
- update: `CLAUDE.md` 🏗️ Arquitetura — descrição auth ajustada (Google OAuth apenas).
- update: `architecture.md` cabeçalho — data atualizada para 09-05-2026.
- update: `architecture.md` §4 — primeira linha reescrita; nota sobre shell futura potencialmente oferecer email/password sem condicionar a decisão V2.
- update: `architecture.md` §11 (RGPD) — origens de email e display_name actualizadas para "Google OAuth (claim)".
- update: `feature-docs/auth-architecture.md` §3.1 — `signInWithGoogle()` listado como única função de sign-in da API pública.
- update: `feature-docs/auth-architecture.md` §5 — sincronização clarificada como callback OAuth do Google.
- update: `feature-docs/auth-architecture.md` §7 — tabela de email/display_name actualizada para refletir claim do Google.
- update: `feature-docs/auth-architecture.md` §10 — fluxos de email/password listados como fora deste documento.
- update: `feature-docs/supabase.md` §7 — secção Auth simplificada (só Google).
- update: `status.md` — Resend movido para tarefa adiada V5+; tarefa Google Cloud OAuth acrescentada como pré-condição V2; nova entrada em ⚠️ Riscos sobre exclusão de utilizadores sem Google.

### why
- Esforço V2 auth desce de ~13h para ~3.5h.
- Elimina duas dependências externas em V2 (Resend account + DNS Hostinger SPF/DKIM).
- Acelera entrega da V3 (prazo: 01-07-2026).
- Trade-off aceite: utilizadores sem Google ficam fora até decisão contrária.

---

## [09-05-2026] — Setup: pipeline Supabase migrations validado em logos-dev

### infra
- run: `pnpm dlx supabase link --project-ref dknrnqyqlojvnhspwjrd` — autenticação CLI via PAT (`SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` apenas nas env vars da sessão Bash; nada commitado).
- run: `pnpm dlx supabase db push` — primeira migration `20260509175745_initial.sql` aplicada à DB remota de `logos-dev`. Confirmado via MCP `list_migrations`: `[{"version":"20260509175745","name":"initial"}]`. Pipeline end-to-end (gerar → linkar → push) validado antes de existir schema real (V2).

### docs
- update: `status.md` — bullets "Configurar `.env.local`" e "Linkar Supabase CLI a `logos-dev` + primeira `db push`" movidos para ✅ Concluído. "Última atualização" estendida.

---

## [09-05-2026] — Setup: Supabase bootstrap (2 projetos + CLI + primeira migration)

### infra
- add: projeto Supabase `logos-dev` (ref `dknrnqyqlojvnhspwjrd`) em `eu-west-3` (Paris). Free tier ($0/mês). Provisionado via MCP `mcp__plugin_supabase_supabase__create_project`. Status `ACTIVE_HEALTHY`.
- add: projeto Supabase `logos-prod` (ref `tirzriuabfwzqxtjsmfb`) em `eu-west-3` (Paris). Free tier ($0/mês). `ACTIVE_HEALTHY`.

### add
- add: `supabase/config.toml` — gerado por `pnpm dlx supabase init`. Define `project_id = "Logos"`, ports locais (API 54321, DB 54322), schemas `public` + `graphql_public`. Sem instalação global da CLI; `pnpm dlx` é a forma canónica.
- add: `supabase/migrations/20260509175745_initial.sql` — primeira migration placeholder com comentários. Schema real chega na V2 (profiles, tags, user_tags, função `current_profile_id()`) e V3 (courses, modules, lessons, conclusões).

### docs
- add: `feature-docs/supabase.md` — bootstrap dos 2 projetos, env vars (com troca de `anon` legacy para `publishable_key`), CLI workflow (link + db push), strategy de migrations dev → prod, gotchas do plano free (sem backups, sem Docker local), referências.
- update: `.env.example` — `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formato moderno `sb_publishable_*` recomendado pela Supabase). `SUPABASE_SERVICE_ROLE_KEY` mantido (legacy enquanto Supabase não migra a UI). Comentário com refs dos 2 projetos para referência rápida.
- update: `status.md` — bullets "Criar projetos Supabase" e "Configurar Supabase CLI + primeira migration vazia" movidos para ✅ Concluído. Acrescentadas duas tarefas em ⏭️ (configurar `.env.local` e linkar CLI a `logos-dev`).

---

## [09-05-2026] — Setup: shadcn/ui instalado e mapeado à paleta CCLX

### add
- add: scaffold `pnpm dlx shadcn@latest init -d`. CLI v4 detetou Next.js 16 + Tailwind v4 + alias `@/*` automaticamente. Criou `components.json`, `src/lib/utils.ts` (`cn()` helper), e `src/components/ui/button.tsx` (incluído no scaffold em CLI v4).
- add: deps em `dependencies` — `@base-ui/react ^1.4.1` (primitive library default em CLI v4; substitui Radix), `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `lucide-react ^1.14.0`, `shadcn ^4.7.0` (package que disponibiliza `@import "shadcn/tailwind.css"`), `tailwind-merge ^3.5.0`, `tw-animate-css ^1.4.0`.

### update
- update: `components.json` — `baseColor: neutral` → `stone` (mais quente; alinha com tom creme da paleta).
- update: `src/app/globals.css` — paleta CCLX preservada em `@theme` (fonte de verdade); tokens semânticos shadcn (`--background`, `--primary`, `--foreground`, `--muted`, `--accent`, `--border`, `--ring`, etc.) mapeados em `:root` para os hex CCLX; `@theme inline` mapeia tokens Tailwind v4 (`--color-*`) para as CSS vars; `--font-heading: var(--font-display)` para que componentes shadcn que usem font-heading apliquem Cormorant. Bloco `.dark` mantém defaults shadcn (placeholder até V6).
- update: `src/app/layout.tsx` — restaurado para versão original Cormorant + Inter; removida tentativa do CLI v4 de injectar Geist como `--font-sans` (gotcha conhecido).
- update: `feature-docs/branding.md` §1 e §2 — secções obsoletas reescritas para Tailwind v4 (sem `tailwind.config.ts`). §1 mostra agora `@theme` em `globals.css` para tokens CCLX + `:root`/`@theme inline` para tokens semânticos shadcn. §2 troca `tailwind.config.ts → extend.fontFamily` por `@theme` em CSS. §7 historial estendido.

### docs
- add: `feature-docs/shadcn-ui.md` — comando, configuração final, mapeamento token-a-token CCLX → shadcn, decisões (style `base-nova`, `baseColor: stone`, Base UI vs Radix, lucide), 4 gotchas (layout corrompido, font-sans circular, prettier reformat após `add`, format:check local em Windows), roadmap por versão (V1: card/input/textarea/label/form; V2: dropdown-menu/avatar/dialog/alert/separator/badge; V3: accordion/skeleton/scroll-area; **sem progress até V7**).

---

## [08-05-2026] — Setup: branch protection adiada (plano free) → regra honor-system

### docs
- update: `SPEC_1.md` §16 — restrição nova: branch protection do GitHub não está ativa (plano gratuito não a disponibiliza em repositórios privados; decisão consciente de não subscrever Pro). Regra "PR obrigatório, nunca push directo para `main`" fica honor-system em `CLAUDE.md`, reforçada por `git push --force`, `git reset --hard` e `git branch -D *main*` em `.claude/settings.json` `permissions.deny`.
- update: `SPEC_1.md` §19 — versão 2.3 → 2.4.
- update: `feature-docs/ci.md` — nota sobre branch protection reescrita: passa de "ainda não está ativa" (com expectativa de ativar a seguir) para "não vai ser ativada com o plano atual"; explica trade-off e ligação a `SPEC_1.md` §16.
- update: `status.md` — bullet "Ativar branch protection em `main`" removido de ⏭️ Próximas tarefas; nova entrada em ⚠️ Riscos / bloqueios; "Última atualização" estendida.

---

## [08-05-2026] — Setup: GitHub Actions CI (lint + typecheck + test + format:check)

### infra
- add: `.github/workflows/ci.yml` — job único `quality` em `pull_request` e `push` para `main`. Steps sequenciais: checkout → `pnpm/action-setup@v4` (versão lida do `packageManager`) → `actions/setup-node@v4` com `cache: pnpm` → `pnpm install --frozen-lockfile` → `pnpm exec eslint --max-warnings 0` → `pnpm typecheck` → `pnpm test` → `pnpm format:check`. `concurrency` com `cancel-in-progress: true` (poupa minutos em pushes consecutivos). `permissions: contents: read` (princípio do menor privilégio). `timeout-minutes: 10` (rede de segurança contra flakes). Tempo típico de execução: ~30s.
- add: `.gitattributes` — normaliza line endings (`* text=auto eol=lf`) com listas explícitas para binários e SVGs. Resolve avisos `LF will be replaced by CRLF` em Windows e impede drift entre dev local (Windows) e CI (Linux).

### docs
- add: `feature-docs/ci.md` — pipeline canónica documentada (triggers, concurrency, decisão de job único, passo a passo dos steps, secção de troubleshooting, roadmap V2 com coverage thresholds e V3 com Playwright contra preview deploys).
- update: `architecture.md` §10 — passos da pipeline atualizados (5 passos em vez de 4 + E2E V3) e remete para `feature-docs/ci.md`.
- update: `eslint.config.mjs` — `globalIgnores` inclui `coverage/**`.

---

## [08-05-2026] — Setup: fronteira de identidade vs autorização Logos

### docs
- add: `feature-docs/auth-architecture.md` — desenho da fronteira: camada `src/lib/auth/` como única importadora de `@supabase/ssr`; tabela `profiles` com `id` (FK universal Logos) e `external_auth_id` (única ligação ao sistema de identidade externo); sincronização `auth.users → profiles` em defesa em profundidade (Server Action + trigger DB); RLS via função SQL `current_profile_id()`; `display_name` no Logos vs email não duplicado; lista do que muda e do que **não** muda quando uma shell partilhada CCLX vier substituir a identidade. Implementação fica para V2.
- update: `SPEC_1.md` §17 — entrada sobre "SSO com app da CCLX" reescrita: passa de "não viável agora" para "não implementada agora, mas estruturada para ser substituível"; remete para `architecture.md` §4 e `feature-docs/auth-architecture.md`.
- update: `SPEC_1.md` §19 — versão 2.2 → 2.3.
- update: `architecture.md` §2 — FKs `auth.users` migradas para `profiles` em `tags.created_by`, `user_tags.user_id`, `user_tags.assigned_by`, `lesson_completions.user_id`, `course_completions.user_id`, `course_access_log.user_id`; schema de `profiles` reescrito (`id` PK, `external_auth_id` UNIQUE, `display_name`, `role`, `created_at`); nota explicativa da fronteira de identidade.
- update: `architecture.md` §3 — camada de identidade (`src/lib/auth/`) listada com responsabilidade explícita; `getVisibleCoursesForUser` passa a aceitar `profileId`.
- update: `architecture.md` §4 — reescrita: identidade isolada em `lib/auth/`; RLS via `current_profile_id()` em vez de JWT custom claim direto; sincronização `auth.users → profiles` em defesa em profundidade documentada; ligação a `feature-docs/auth-architecture.md`.
- update: `CLAUDE.md` — três regras duras novas em "🚫 Regras (não negociáveis)": (1) identidade isolada em `src/lib/auth/`; (2) FKs nunca para `auth.users`, sempre para `profiles.id`; (3) email não duplicado em tabelas Logos.
- update: `status.md` — bullet em ✅ Concluído sobre fronteira de identidade documentada; data atualizada.

---

## [05-05-2026] — Setup: Vitest + Testing Library + primeiro smoke test

### add
- add: **Vitest 4.1.5** + **`@vitest/coverage-v8` 4.1.5** — runner com env `jsdom`, `globals: true`, alias `@/*` via Vite 7 nativo (`resolve.tsconfigPaths: true`)
- add: **`@testing-library/react` 16.3.2** + **`@testing-library/jest-dom` 6.9.1** + **`@testing-library/user-event` 14.6.1** — primeira major a suportar React 19
- add: **`@vitejs/plugin-react` 6.0.1** + **`jsdom` 29.1.1**
- add: `vitest.config.ts` — env jsdom, globals, setup file, exclude `node_modules`/`.next`/`e2e`, coverage V8 (text + html), exclui `layout.tsx`/`fonts.ts` (sem ROI sem mock de `next/font`)
- add: `src/test/setup.ts` — `import '@testing-library/jest-dom/vitest'` + `cleanup()` automático em `afterEach`
- add: `src/app/page.test.tsx` — primeiro smoke test (2 asserções: heading `aria-label="Logos"` com texto "LOGOS"; legenda "Em construção" presente). 2/2 a passar
- add: scripts `test`, `test:watch`, `test:coverage` em `package.json`
- add: `vitest/globals` + `@testing-library/jest-dom` em `tsconfig.json` `compilerOptions.types`
- add: `feature-docs/testing.md` — estratégia de testes (stack, decisões, padrões para regras duras de CLAUDE.md, anti-padrões, troubleshooting)

### update
- update: `status.md` — Vitest item movido para ✅; data atualizada
- update: `package.json` — bump deps + scripts (sem `vite-tsconfig-paths`, removido após aviso do Vitest 4 sobre suporte nativo)

---

## [05-05-2026] — Setup: Next.js 16 + Tailwind v4 + TS strict + ESLint 9 + Prettier (pnpm)

### add
- add: Next.js **16.2.4** com App Router, `src/`, alias `@/*`, Turbopack default — scaffold via `pnpm create next-app@latest --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbopack`
- add: TypeScript 5.9 em `strict: true` (config `tsconfig.json` default do scaffold)
- add: Tailwind **v4** (`tailwindcss@^4`, `@tailwindcss/postcss@^4`) com tokens de branding em `@theme` no `src/app/globals.css` (paleta de 8 cores + famílias `--font-sans` Inter / `--font-display` Cormorant Garamond)
- add: ESLint **9** flat config (`eslint.config.mjs`) com `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- add: Prettier 3.8 com `prettier-plugin-tailwindcss` (ordem canónica de classes) e `eslint-config-prettier/flat` (desliga regras conflituosas no ESLint)
- add: `.prettierrc.json` (single quote, semi true, trailingComma all, printWidth 100, LF) e `.prettierignore` (build, lockfile, `.claude/`, docs versionados manualmente)
- add: `src/app/fonts.ts` — Cormorant Garamond (500/600) + Inter (400/500/600) via `next/font/google` com subset `latin`
- add: `src/app/layout.tsx` — `<html lang="pt-PT">`, fontes injetadas, metadata com template `'%s · Logos'`
- add: `src/app/page.tsx` — wordmark "LOGOS" (Cormorant + `text-orange`) + "Em construção" sobre `bg-cream-bg`, `aria-label` no h1 para screen readers
- add: scripts `lint:fix`, `typecheck`, `format`, `format:check` em `package.json`
- add: `engines` (`node >=20`, `pnpm >=10`) e `packageManager: pnpm@10.33.2` em `package.json`
- add: `feature-docs/nextjs-init.md` — documentação exaustiva (comando exato, flags, decisões, troubleshooting)

### update
- update: `CLAUDE.md` — Framework de "Next.js 15" para "Next.js 16"
- update: `architecture.md` — diagrama e cabeçalho passam a Next.js 16; data de última atualização
- update: `SPEC_1.md` §11 — célula Framework atualizada para Next.js 16 (justificação ajustada)
- update: `feature-docs/branding.md` — secção "Carregamento (Next.js X App Router)" passa a 16
- update: `.claude/agents/test-runner.md` — mensagem de erro refere Next.js 16
- update: `status.md` — Next.js init movido para ✅; remoção do bullet "Inicializar projeto Next.js 15..." da lista de próximas tarefas

### housekeeping
- remove: SVGs boilerplate em `public/` (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`)
- add: `AGENTS.md` no root — aviso do Next 16 sobre breaking changes vs versões anteriores

---

## [05-05-2026] — Branding: SVG oficial do logótipo

### add
- add: `docs/branding/logo-cclx-logos.svg` — SVG oficial entregue pelo ministério (1600×913, 452 paths, wordmark "LOGOS" + livro aberto estilizado a linha laranja)

### docs
- update: `feature-docs/branding.md` — secção §3 Logótipo flipada de pendente → recebido; fallback de texto reclassificado como `aria-label`; histórico de 05-05-2026 estendido
- update: `status.md` — SVG do logótipo movido de 🚧 para ✅; risco "logótipo bloqueia V1" removido

### infra
- update: `.gitignore` — ignorar `.claude/worktrees/` (estado interno do Claude Code) e `claude-code-psb-guide.md` (notas pessoais soltas)

---

## [05-05-2026] — Setup: configuração transversal do Claude Code

### infra
- add: `.claude/settings.json` versionado — 7 plugins ativos (`github`, `vercel`, `supabase`, `typescript-lsp`, `commit-commands`, `frontend-design`, `engineering-skills`), marketplace `claude-code-skills` declarado, modelo `opus`
- add: permissões partilhadas `permissions.allow` para pnpm, supabase CLI, vercel CLI, git, gh, shadcn — reduz prompts em qualquer máquina
- add: permissões `permissions.deny` para operações destrutivas (`rm -rf`, `git push --force`, `git reset --hard`, `git branch -D *main*`, `supabase projects delete`, `vercel remove`, `gh repo delete`)

### docs
- add: `feature-docs/claude-code-setup.md` — guia para configurar Claude Code numa máquina nova (clone → `claude` → instalar plugins → autenticar serviços), explicação das camadas de configuração, lista de plugins, política de permissões

---

## [05-05-2026] — Setup: identidade visual fixada (paleta + tipografia)

### docs
- update: `SPEC_1.md` §14 — paleta hex fixada com 8 tokens (`cream-bg`, `cream-card`, `sage-card`, `butter-card`, `orange-primary`, `orange-hover`, `ink`, `muted`); tipografia fixada (Cormorant Garamond + Inter via `next/font/google`); descrição de logótipo com fallback de texto até chegar SVG; mockups vinculativos referenciados
- update: `SPEC_1.md` §17 — decisão "paleta + tipografia" resolvida; pendente apenas SVG do logótipo
- update: `SPEC_1.md` §19 — versão 2.1 → 2.2
- add: `feature-docs/branding.md` — spec completa de tokens (mapeamento Tailwind + shadcn HSL), regras de uso, escala tipográfica, integração Next.js 15, regras do logótipo, mockups vinculativos
- update: `status.md` — paleta + tipografia movidas para ✅; SVG do logo é o único item em 🚧; risco de "logótipo bloqueia V1" removido (fallback em texto)
- add: `docs/branding/placeholder-cclx-logos.png` — *placeholder* atual em `cclx.cclx.pt/logos` como referência de tom
- add: `docs/branding/mockups-v3.jpeg` — quatro mockups V3 (catálogo, aula, módulo, apostila) — referência vinculativa de paleta e estrutura

---

## [04-05-2026] — Setup: agents e slash commands para Claude Code

### infra
- add: sub-agent `doc-updater` (`.claude/agents/doc-updater.md`) — sincroniza `changelog.md`, `status.md`, `architecture.md` e `feature-docs/`
- add: sub-agent `pt-pt-reviewer` (`.claude/agents/pt-pt-reviewer.md`) — audita strings user-facing em busca de PT-BR e inglês
- add: sub-agent `test-runner` (`.claude/agents/test-runner.md`) — corre `pnpm lint && pnpm typecheck && pnpm test` (+ `test:e2e` a partir da V3)
- add: sub-agent `spec-guardian` (`.claude/agents/spec-guardian.md`) — valida âmbito de versão e regras duras antes de implementar
- add: slash command `/update-docs` — invoca `doc-updater` com slug opcional
- add: slash command `/version-check` — invoca `spec-guardian` com descrição da tarefa
- add: slash command `/pr-ready` — checklist pré-PR (branch ≠ main, testes, PT-PT, docs)

---

## [02-05-2026] — Auditoria de docs pré-Setup

### docs
- update: `SPEC_1.md` §11 — adicionar Vitest, Playwright (V3+), ESLint, Prettier, TypeScript `strict`, Supabase CLI; clarificar 2 projetos Supabase (`logos-dev`/`logos-prod`)
- update: `SPEC_1.md` §13 — fluxo de dev formalizado (PR + GitHub Actions + branch protection + passos de migration)
- update: `SPEC_1.md` §17 — remover decisão "Supabase único vs separados" (resolvida = 2 projetos)
- update: `SPEC_1.md` §19 — versão 2.0 → 2.1
- add: `architecture.md` §10 — secção CI/CD (GitHub Actions + Vercel)
- add: `architecture.md` §11 — secção Privacidade e RGPD
- update: `architecture.md` §5 — nota sobre estado "rascunho" via etiqueta WIP (sem coluna nova)
- update: `architecture.md` §8 — tabela de ambientes inclui projeto Supabase + DNS para Resend + procedimento de migrations
- update: `architecture.md` §9 — remover decisão Supabase env (resolvida)
- update: `status.md` — concluído + tarefas de Setup expandidas (testes, CI, SPF/DKIM, 2 projetos Supabase)

---

## [28-04-2026] — Setup inicial

### docs
- add: `SPEC_1.md` v2.0 (especificação canónica)
- add: `CLAUDE.md` com objetivos, arquitetura, estilo e regras
- add: `architecture.md` com modelo de dados V3/V4
- add: `status.md` para milestones
- add: `feature-docs/` para documentação por feature
