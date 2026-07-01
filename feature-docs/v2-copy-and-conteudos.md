# V2.x — Copy, UX do hero, rota Conteúdos e dropdown

> **Estado:** PR-A a PR-F implementadas, validadas em preview Vercel (`logos-git-v2.5-copy-ux-...`). Os commits V2.5 foram absorvidos em `v3-cursos`; já não há PR separada V2.5 → main — tudo sobe junto com V3 no dia do lançamento (ver `feature-docs/branch-strategy.md` §1.2). Único bloqueador residual: 4-5 testemunhos finais do ministério para substituir os placeholders do carrossel.
> **Fonte:** lista de 19 pedidos do ministério (sessão 16-05-2026).
> **Última atualização:** 20-05-2026 (estado de absorção em V3).

## 0. Resumo

Esta ronda é só **copy + UX**, sem tocar em modelo de dados nem em auth. Junta correções de tom (PT-PT, sem em dashes, sem tom IA), branding consistente (**LOGOS** maiúsculo, capitalizações de palavras-chave), uma reorganização da navegação ("Cursos" → "Conteúdos") e ajustes ao hero e ao dropdown do utilizador.

Trabalhamos em 6 PRs independentes e pequenas para podermos verificar visualmente cada uma em preview antes de merge:

| PR | Foco | Estado | Ficheiros principais |
|---|---|---|---|
| **PR-A** | Copy & branding (LOGOS, capitalizações, em dashes, aspas, justificação, lema italic) | ✅ | `home-hero.tsx`, `conhece-nos-content.tsx`, `cursos-content.tsx`, `fala-connosco-content.tsx`, `logo.tsx`, `site-config.ts`, `home-motto.tsx` (novo) |
| **PR-B** | Hero: logo maior, CTA único centrado "Meus cursos" | ✅ | `home-hero.tsx`, `logo.tsx`, `page.tsx`, `lib/auth/actions.ts` (signInWithGoogleAction recebe FormData) |
| **PR-C** | Renomear Cursos → Conteúdos (rota, nav, placeholder) | ✅ | `src/app/conteudos/**` (novo), `site-config.ts`, `/cursos/page.tsx` é redirect 308 |
| **PR-D** | Carrossel de testemunhos no home | ✅ | `home-testimonials.tsx` (novo), embla-carousel-react@8.6.0 |
| **PR-E** | Fala Connosco: texto novo, sem horários/morada | ✅ | `fala-connosco-content.tsx` |
| **PR-F** | Dropdown user + página /perfil | ✅ | `user-menu.tsx`, `src/app/perfil/**` (novo), `lib/auth/index.ts` (re-export SupabaseUser) |

Atalhos para a checklist do ministério:

| # | Pedido | PR |
|---|---|---|
| 1 | Capitalizar palavras-chave (Bíblico, Fé, Enraizada, Connosco) | PR-A |
| 2 | Tirar em dashes e tom IA | PR-A |
| 3 | LOGOS sempre em maiúscula (excepto URLs/identificadores técnicos) | PR-A |
| 4 | Logo no home maior | PR-B |
| 5 | "Estudo Bíblico para uma Fé Enraizada." | PR-A (texto) + PR-B (visual) |
| 6 | Remover "Conhece o projeto" e centralizar CTA principal | PR-B |
| 7 | Carrossel com 4–5 testemunhos | PR-D |
| 8 | Aspas `"..."` em vez de `«...»` | PR-A |
| 9 | Lema do ministério em itálico (texto pendente do utilizador) | PR-A |
| 10 | "Deus ricamente te abençoe," + ministério LOGOS | PR-A |
| 11 | Justificar parágrafo de Conteúdos ("Os nossos conteúdos foram desenvolvidos...") | PR-A (estilo) + PR-C (página) |
| 12 | Sem distinção Cursos vs Escola Bíblica; só Conteúdos com cursos scrolláveis (placeholder por enquanto) | PR-C |
| 13 | Botão laranja "Meus cursos" → /conteudos; abre login se não houver sessão | PR-B |
| 15 | (nota) /conteudos passará a search avançada no futuro (V3+) | PR-C (placeholder) |
| 16 | Sem horários nem localização | PR-E |
| 17 | Texto novo Fala Connosco | PR-E |
| 18 | "Connosco" em maiúscula | PR-A + PR-E |
| 19 | Dropdown: Os meus cursos / Perfil / Terminar sessão | PR-F |

(O ponto 14 não existe na lista original — salto numérico do ministério.)

---

## 1. PR-A — Copy & branding global

**Objectivo:** todas as páginas existentes ficam em tom final (PT-PT do ministério), com LOGOS maiúsculo, aspas portuguesas duplas (`"..."`), sem em dashes e com capitalizações pedidas. Estilo justificado em parágrafos longos.

### Regras de copy

- **LOGOS** sempre em maiúscula quando referido como nome do ministério/plataforma. Excepção: URLs (`logos.cclx.pt`, `logos@cclx.pt`), atributos HTML técnicos, código.
- **Capitalizações fixadas:**
  - "Bíblico"/"Bíblica" → manter em maiúscula quando enfatizado em títulos e taglines.
  - "Fé" e "Enraizada" → maiúsculas dentro da tagline do hero.
  - "Connosco" → maiúscula no título "Fala Connosco" (nav + página).
- **Em dashes (`—`)**: substituir por:
  - vírgula ou ponto-e-vírgula quando ligam ideias;
  - dois pontos quando introduzem uma lista;
  - frase nova quando estão a separar parágrafos disfarçados.
  Nunca usar `—` em copy nova.
- **Tom IA a evitar:** frases tipo "A nossa missão é...", "imersiva", "transformadora", "no teu ritmo", "sem distrações", "imagina...". Substituir por linguagem concreta, frase curta, voz do ministério.
- **Aspas:** sempre `"..."` (aspas portuguesas duplas curvas) em copy. Nunca `«...»` nem `"..."` rectos. Em código JSX usar HTML entities (`&ldquo;` / `&rdquo;`) ou diretamente os caracteres.
- **Lema do ministério (ponto 9):** três linhas em itálico, com ar à volta, próximo do hero (ou ao fim de "Conhece-nos"). O texto exacto é:

  > *Mais do que transmitir informação, queremos formar pessoas.*
  >
  > *Mais do que ensinar conteúdos, queremos despertar paixão.*
  >
  > *Mais do que estudar a Bíblia, queremos viver a Bíblia.*

  Cada linha vai num parágrafo, com `font-display italic text-ink text-lg sm:text-xl leading-relaxed` e espaçamento generoso entre linhas. **Não usar `<blockquote>`** (não é citação externa, é lema próprio); estrutura semântica = `<aside>` com `aria-label="Lema do ministério LOGOS"` envolvendo três `<p>`.
- **"Deus ricamente te abençoe,"** e qualquer outra menção interna a "Logos" como ministério passa a "LOGOS".

### Estilos partilhados

- Classe utilitária Tailwind para parágrafos justificados: `text-justify hyphens-auto`. Aplicar nos parágrafos longos descritivos (Conteúdos intro, Conhece-nos, descrição do ministério).
- Lema em itálico: `font-display italic text-ink text-lg leading-relaxed`.

### Verificações pós-merge

- Grep `«` e `»` no `src/` → 0 ocorrências.
- Grep `—` em copy `.tsx`/`.md` (excepto changelog/docs) → 0 ocorrências em UI.
- Grep `Logos\b` em copy/JSX → confirmar caso a caso que se refere ao ministério (maiúsculo) ou a URL/identificador (mantém).
- `pnpm test`, `pnpm lint --max-warnings 0`, `pnpm typecheck` verdes.

---

## 2. PR-B — Home: logo maior, CTA único centrado

**Objectivo:** hero mais "presente" visualmente, com logo maior; um único CTA laranja centrado, que reage a sessão.

### Mudanças

- `src/components/site/logo.tsx`: adicionar tamanho `xl` (≈ `h-32 sm:h-44 md:h-52`) usado pelo hero.
- `src/components/site/home-hero.tsx`:
  - Logo `size="xl"`.
  - Remover botão `Conhece o projeto` (mantemo-lo acessível via nav).
  - Substituir botão `Ver cursos` por `Meus cursos` apontando para `/conteudos`. Manter `<Link>` em vez de `<Button>` (segue padrão atual e evita warning Base UI).
  - Layout do botão: `flex items-center justify-center` (em vez de coluna→linha) — fica sempre centrado.
  - Comportamento: o botão aponta para `/conteudos` independentemente da sessão. A redirecção para login acontece **no servidor** dentro da página `/conteudos` quando ainda não tivermos página real (V3+); por agora a placeholder é pública, então o botão simplesmente leva-te lá. **Mas** o pedido do ministério é "se não estiver logado, abre login" — para já implementamos com `?next=/conteudos` no botão se `getCurrentUser()` for `null`:
    - Em `home-hero.tsx` (que é client) recebemos `isAuthenticated: boolean` por prop a partir de `src/app/page.tsx` (server). Server faz `await getCurrentUser()` e passa o booleano para o hero.
    - `href = isAuthenticated ? '/conteudos' : '/auth/login?next=/conteudos'` — se a rota `/auth/login` não existir, fallback para iniciar o Server Action de Google directamente via um `<form>` (ver PR-F para discussão).

### Verificações

- Visual em preview mobile/desktop.
- Lighthouse: o logo maior continua com `priority` (`size === 'lg' || 'xl'`).
- Botão único, centrado em todos os breakpoints.

---

## 3. PR-C — Renomear Cursos → Conteúdos (placeholder)

**Objectivo:** página pública passa a chamar-se "Conteúdos". Conteúdo real (cursos individuais) é V3+ — mantemos placeholder.

### Mudanças

- **Rota:** `src/app/cursos/` → `src/app/conteudos/`. Mover `page.tsx`, `page.test.tsx`, `cursos-content.tsx` → `conteudos-content.tsx`.
- **Redirect:** `src/app/cursos/page.tsx` passa a um `redirect('/conteudos', RedirectType.permanent)` (308) para não partir links indexados.
- **Nav (`site-config.ts`):** `{ href: '/conteudos', label: 'Conteúdos' }`.
- **Conteúdo do placeholder:**
  - Título "Conteúdos".
  - Parágrafo intro justificado: "Os nossos conteúdos foram desenvolvidos para fortalecer a igreja e aprofundar o amor pelas Escrituras. Disponibilizamos diferentes formatos, aulas gravadas, sebentas, materiais de apoio e outros recursos pensados para tornar o ensino bíblico mais acessível, prático e transformador. O nosso objetivo é ajudar cada pessoa a crescer no conhecimento da Palavra de Deus, com conteúdos claros, edificantes e centrados em Cristo."
  - Lista scrolável vertical de "cursos" placeholder (3–4 cards estáticos sem links activos). Cada card: título, descrição curta de 2 linhas, tag "Em preparação".
  - Nota final pequena: "Catálogo completo a abrir em breve."
- **Sitemap:** `src/app/sitemap.ts` já deriva de `navItems`, fica automático.

### Verificações

- `/cursos` redireciona com 308 para `/conteudos` (curl em preview).
- Testes movidos (mantém os já existentes) + actualizar IDs/conteúdos.
- Active state da nav funciona em `/conteudos`.

---

## 4. PR-D — Carrossel de testemunhos no home

**Objectivo:** secção abaixo do hero com 4–5 testemunhos rotativos.

### Mudanças

- Instalar shadcn carousel: `pnpm dlx shadcn@latest add carousel` (embla-based).
- `src/components/site/home-testimonials.tsx`:
  - Server component (lista estática por agora) que renderiza o carrossel client.
  - 4–5 testemunhos placeholder em PT-PT (com nome próprio + papel: "Membro da CCLX", "Líder de pequeno grupo", etc.). Conteúdo final virá do ministério; marcar com comentário `{/* TODO: testemunhos finais do ministério */}`.
  - Aspas curvas `"..."` no texto, **não** «».
- `src/app/page.tsx`: passa a renderizar `<HomeHero />` + `<HomeTestimonials />`.
- Acessibilidade: setas com `aria-label`, indicadores com `aria-current`, pausa em hover/focus, respeita `prefers-reduced-motion`.

### Verificações

- Testes Vitest: smoke do número de items + presença de aria-labels.
- Manual: setas navegam, ponto activo muda, mobile funciona com swipe.

---

## 5. PR-E — Fala Connosco: texto novo

**Objectivo:** alinhar com pontos 16-18.

### Mudanças

- `src/app/fala-connosco/fala-connosco-content.tsx`:
  - Título "Fala Connosco" (C maiúsculo).
  - Parágrafo principal: "Queres falar Connosco ou descobrir melhor o que fazemos na CCLX? Estamos disponíveis para esclarecer dúvidas, dar-nos a conhecer ou ajudar no que precisares. Podes entrar em contacto Connosco através do nosso email ou visitar o nosso website, onde encontrarás mais informações sobre a CCLX, os nossos projetos e outros contactos úteis." — justificado.
  - Manter as duas cards (email + website) tal como estão.
  - **Remover** a nota inferior "Horários e morada da igreja em breve".
  - Não introduzir morada nem horários.
- `site-config.ts`: label nav `Fala Connosco` (C maiúsculo).
- Atualizar testes que verifiquem strings.

### Verificações

- Teste de snapshot/text fica verde após substituir literais.

---

## 6. PR-F — Dropdown user + página /perfil

**Objectivo:** dropdown final pedido pelo ministério + placeholder de perfil.

### Mudanças no dropdown (`src/components/site/user-menu.tsx`)

Ordem de items (de cima para baixo):

1. Label "Sessão de {displayName}" (já existe).
2. `Os meus cursos` → `/conteudos` (ícone `BookMarked` ou `GraduationCap`).
3. `Perfil` → `/perfil` (ícone `User`).
4. `Área admin` → `/admin` (só se `role !== 'user'`, mantém ícone `Shield`).
5. `Terminar sessão` → Server Action `signOutAction` (ícone `LogOut`).

Continuar a usar `<DropdownMenuGroup>` à volta do `<DropdownMenuLabel>` (fix do bug PR3).

### Página `/perfil`

- `src/app/perfil/layout.tsx` (opcional): gating server — `redirect('/?signin=1')` se `getCurrentUser()` for `null`. Ou usar `notFound()` para coerência com "conteúdo restrito é invisível" (CLAUDE.md §🚫).
- `src/app/perfil/page.tsx`: server component, lê `getCurrentUser()` + (via Supabase auth client) o `auth.users.email` e a `user_metadata.avatar_url`. Renderiza:
  - Avatar (`<Image>` ou `<div>` com iniciais se faltar URL).
  - Nome completo (`displayName`).
  - Email (`user.email` — não duplicar em `profiles`).
  - Papel ("Utilizador" / "Administrador" / "Super-administrador" em PT-PT).
  - Texto pequeno "Edição de perfil em breve."
- Email vem de `auth.users` via `getServerClient().auth.getUser()` — não tocar em `profiles.email` (CLAUDE.md §🚫).
- Testes: snapshot básico + redirect quando sem sessão.

### Verificações

- E2E manual: dropdown abre, todos os links navegam, "Área admin" só aparece para admin/super_admin, "Terminar sessão" funciona.
- Lighthouse a11y no /perfil ≥ 95.

---

## 7. Sequência de execução

1. **PR-A** primeiro — toca em strings de todas as páginas, abre caminho para as restantes.
2. **PR-B** — depende de PR-A apenas para o texto da tagline.
3. **PR-C** — mexe na nav; quase independente de A/B.
4. **PR-D** — independente, pode ir em paralelo conceptualmente, mas executamos depois.
5. **PR-E** — pequena.
6. **PR-F** — depende de PR-C estar mergeada (item "Os meus cursos" aponta para `/conteudos`).

Após cada PR mergeada:
- `changelog.md` recebe entrada datada (CLAUDE.md §🔄).
- `status.md` actualiza milestone e próximas tarefas.
- Este doc actualiza-se com o estado de cada PR (✅/⏳).

---

## 8. Pendentes do utilizador

- **Texto pasted #1** (ponto 9): ✅ recebido — três linhas do lema, ver §1.
- **Texto pasted #2** (ponto 12): ignorado por indicação do utilizador (era repetição).
- **Testemunhos finais** (PR-D): aguardam ministério.
- **Cursos placeholder concretos** (PR-C): se o ministério tiver títulos provisórios para os cards, entram aqui; caso contrário ficam genéricos.
