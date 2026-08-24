# testing.md — Estratégia de testes (Logos)

> **Versão:** Setup (pré-V1) · **Última atualização:** 05-05-2026 · **Estado:** Vitest configurado · primeiro smoke test a passar

## 1. Objetivo

Garantir que as **regras duras** de `CLAUDE.md` ficam protegidas por testes desde o primeiro dia:

> Sempre escrever testes para: visibilidade por etiquetas, lógica de conclusão de curso, controlo de acesso por papel.

Hoje a aplicação ainda não tem nenhuma destas regras (estamos pré-V1). Este documento descreve o tooling instalado, os padrões a seguir, e o que vai ser testado em cada versão.

---

## 2. Stack instalada

| Pacote                            | Versão  | Papel                                                   |
|-----------------------------------|---------|---------------------------------------------------------|
| **`vitest`**                      | 4.1.5   | Runner. Vite 7 por baixo, compatível com Tailwind v4    |
| **`@vitest/coverage-v8`**         | 4.1.5   | Cobertura nativa V8                                     |
| **`@vitejs/plugin-react`**        | 6.0.1   | Suporte JSX/TSX                                         |
| **`@testing-library/react`**      | 16.3.2  | API de render e queries (v16 = primeira a suportar React 19) |
| **`@testing-library/jest-dom`**   | 6.9.1   | Matchers (`toBeInTheDocument`, `toHaveTextContent`, …)  |
| **`@testing-library/user-event`** | 14.6.1  | Simulação realista de input do utilizador               |
| **`jsdom`**                       | 29.1.1  | Ambiente DOM no Node                                    |

> Path alias `@/*` é resolvido nativamente pelo Vite 7 via `resolve.tsconfigPaths: true`. **Não** se usa o plugin `vite-tsconfig-paths` (foi instalado e removido após o aviso do Vitest 4 de que é redundante).

---

## 3. Configuração

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/app/layout.tsx',
        'src/app/fonts.ts',
      ],
    },
  },
});
```

### `src/test/setup.ts`

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

### `tsconfig.json` — types globais

```jsonc
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

Sem isto, `describe`/`it`/`expect` aparecem como undefined em TS, e os matchers de `jest-dom` (`toBeInTheDocument` etc.) não tipam.

---

## 4. Decisões

### 4.1. `jsdom`, não `happy-dom`

`jsdom` é mais lento, mas é o ambiente "aborrecido e bem-documentado" (CLAUDE.md). Compatibilidade superior com APIs do navegador. Reavaliar quando a suite passar de >100 testes e o tempo começar a doer.

### 4.2. Co-localização (`page.test.tsx` ao lado de `page.tsx`)

Convenção mais comum em projetos Next.js modernos. Vitest descobre automaticamente via padrão `src/**/*.{test,spec}.{ts,tsx}`. Vantagens:

- Renomear/mover o componente leva o teste junto sem pensar.
- Diff de PR mostra código + teste lado a lado.

Pasta `__tests__/` continua a funcionar — Vitest não impõe convenção, mas mantemos co-localização por defeito.

### 4.3. Globals ativos (`globals: true`)

`describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` ficam disponíveis sem import. Reduz boilerplate. O custo é tipagem — resolvido com `types: ['vitest/globals']`.

### 4.4. `css: false`

Em jsdom, importar Tailwind CSS num teste é caro e desnecessário — não há como assertar estilos computados de forma fiável (jsdom não corre PostCSS). Desligar evita warnings e acelera arranque. Assertivas devem ser feitas em **DOM, role, texto e atributos**, nunca em cores ou layout.

### 4.5. Coverage adiada (sem thresholds)

`pnpm test:coverage` está configurado mas **não há thresholds de aceitação**. Vamos enforcer (algo como `lines: 70%` em `src/lib/`) quando V2 trouxer auth e existir lógica não trivial para cobrir. Hoje é 100% mas é trivial — `page.tsx` tem 1 linha executável.

### 4.6. `layout.tsx` e `fonts.ts` excluídos da coverage

`layout.tsx` é um wrapper que só monta o `<html>` + injeta variáveis das fontes. Testá-lo requer mock de `next/font/google` para evitar fetch real a Google Fonts em jsdom. Adiado — não há ROI em testar o que é essencialmente um harness.

`fonts.ts` é puro `next/font` config — igualmente sem ROI.

---

## 5. Comandos

```bash
pnpm test            # corre uma vez e sai (CI)
pnpm test:watch      # modo watch (dev local)
pnpm test:coverage   # corre + relatório V8 (text + HTML em coverage/)
```

`coverage/` está em `.gitignore`.

---

## 6. Padrões de teste — regras duras de CLAUDE.md

Os três alvos obrigatórios. Quando cada um for implementado, **um teste falha primeiro, depois passa** (TDD ligeiro).

### 6.1. Visibilidade por etiquetas (V3 para curso, V4 para módulo/aula)

> Conteúdo restrito por etiqueta é **invisível**, nunca aparece com cadeado.

Padrão de teste:

```tsx
// Pseudo-código — quando V3 chegar
it('lista apenas cursos cujas tags estão na lista do utilizador', () => {
  const courses = [
    { id: '1', title: 'Aberto', requiredTags: [] },
    { id: '2', title: 'Restrito', requiredTags: ['lider'] },
  ];
  render(<CourseList courses={courses} userTags={[]} />);
  expect(screen.getByText('Aberto')).toBeInTheDocument();
  expect(screen.queryByText('Restrito')).not.toBeInTheDocument(); // INVISÍVEL
});
```

Ponto crítico: usar `queryBy*` (devolve `null`) e `not.toBeInTheDocument`, **nunca** `getBy*` que lança quando não encontra (mas a semântica é "não deve estar", não "não consigo encontrar").

### 6.2. Conclusão de curso

> IDs internos estáveis. Renomear/reordenar nunca invalida conclusões existentes.

Padrão de teste:

```ts
// Pseudo-código — server action ou util
it('marca curso como concluído quando todas as aulas estão completas', () => {
  const lessons = [{ id: 'a' }, { id: 'b' }];
  const completions = ['a', 'b'];
  expect(isCourseComplete(lessons, completions)).toBe(true);
});

it('preserva conclusão mesmo após nova aula ser adicionada (idempotência V4)', () => {
  // documenta o trade-off de §5 SPEC_1 (conclusão "primeira vez" preservada)
});
```

### 6.3. Controlo de acesso por papel

> `user`, `admin`, `super_admin`. Endpoints/Server Actions de admin recusam `user`.

Padrão de teste:

```ts
it('rejeita não-admin a aceder a /admin/courses', async () => {
  const result = await callServerAction({ role: 'user' });
  expect(result).toEqual({ error: 'forbidden' });
});
```

A V2 (auth) instala estes patterns. Documentar em PR.

### 6.4. Guardas ao SQL das migrations (25-08-2026)

> Quando a autoridade real vive num trigger ou numa policy, **os testes de Server Action não a cobrem** - mockam o Supabase, por isso o SQL nunca corre.

Foi assim que a promoção a super administrador esteve partida ~3 meses com a suite toda verde: `setUserRoleAction` tinha 8 testes, todos a passar, e o trigger na base de dados recusava o valor. Ver `feature-docs/auth-architecture.md` §5.1.

O padrão que fecha esta lacuna lê os **ficheiros de migration** e valida a versão que fica viva na base de dados - a que ordena por último, não a mais recente em wall-clock:

```ts
// src/test/profiles-role-trigger.test.ts
const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
let last = null;
for (const file of files) {
  const match = readFileSync(join(MIGRATIONS_DIR, file), 'utf8').match(DEFINITION_RE);
  if (match) last = { file, body: match[1] };   // fica a ULTIMA na ordem de aplicacao
}
expect(/not\s+in\s*\(\s*'user'\s*,\s*'admin'\s*,\s*'super_admin'\s*\)/i.test(last.body)).toBe(true);
```

Quando usar: sempre que uma função ou policy for recriada por `create or replace` / `drop policy` em **mais do que uma migration** - aí um ramo pode reverter outro em silêncio. A mensagem de falha deve **nomear o ficheiro culpado**, senão o teste diz "está partido" sem dizer onde.

Quando **não** usar: para regras que vivem em TypeScript. Aí testa-se a função, não o texto do ficheiro.

Limite honesto: isto valida o **SQL versionado**, não a base de dados. Se alguém aplicar DDL à mão sem migration, o teste continua verde e a BD diverge - foi por isso que o fix de 25-08 registou a versão do ficheiro em `supabase_migrations.schema_migrations` ao aplicá-lo.

---

## 7. Anti-padrões

- **Não testar estilos computados.** jsdom não processa Tailwind. Testar comportamento, não cores.
- **Não usar snapshots para componentes.** Diffs ruidosos, ninguém lê. Usar `toBeInTheDocument` + `toHaveTextContent` + `toHaveAttribute`.
- **Não importar `globals.css` em testes.** Inútil em jsdom (`css: false`).
- **Não fazer fetch real a APIs.** Mockar com `vi.fn()` (server actions) ou `msw` (route handlers, quando tiver sentido).
- **Não confiar em ordem de testes.** `cleanup()` corre após cada teste; estado partilhado é proibido.

---

## 8. Limites conhecidos

- **Sem mock de `next/font`** — necessário se algum teste futuro renderizar `RootLayout`. Padrão:
  ```ts
  vi.mock('next/font/google', () => ({
    Cormorant_Garamond: () => ({ variable: '', className: '' }),
    Inter: () => ({ variable: '', className: '' }),
  }));
  ```
- **Sem MSW** (`msw` para mockar route handlers) — adicionar quando V2 trouxer rotas com fetch externo.
- **Sem testes E2E** — Playwright entra na V3 (SPEC_1 §11). Pasta `e2e/` já está em `vitest.config.ts` exclude para não colidir.
- **Sem coverage thresholds** — adicionar em V2 quando houver lógica não trivial.
- **A suite não corre SQL.** Não há Postgres nos testes: RLS, triggers e policies só são exercidos pelo texto das migrations (§6.4) ou à mão contra a BD. Qualquer autoridade que viva no Postgres é, para a suite, um ponto cego - assume-o ao ler uma suite verde.

---

## 9. Troubleshooting

### "ReferenceError: describe is not defined"
Falta `globals: true` em `vitest.config.ts` ou `types: ['vitest/globals']` em `tsconfig.json`.

### "Property 'toBeInTheDocument' does not exist on type 'JestAssertion'"
Falta `@testing-library/jest-dom` em `compilerOptions.types` ou `import '@testing-library/jest-dom/vitest'` no setup file.

### "Cannot find module '@/...'"
Vitest 4 + Vite 7 resolvem alias do `tsconfig.json` via `resolve.tsconfigPaths: true`. Confirmar que essa opção está em `vitest.config.ts` (não usar `vite-tsconfig-paths` plugin — é redundante e gera aviso).

### Testes lentos em watch
Primeiro arranque do `vitest` carrega o `jsdom` (~1.5s). Depois cada teste corre em ms. Se tudo for lento, verificar que `css: false` está ativo.

### `next/font` falha em testes
Mockar `next/font/google` (ver §8). Não importa o ambiente — `next/font` requer infraestrutura de build do Next.js que não existe em jsdom.

---

## 10. Smoke test atual

`src/app/page.test.tsx` — duas asserções básicas:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from './page';

describe('Home', () => {
  it('renderiza o wordmark LOGOS com aria-label correto', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Logos' });
    expect(heading).toHaveTextContent('LOGOS');
  });

  it('exibe a legenda "Em construção"', () => {
    render(<Home />);
    expect(screen.getByText('Em construção')).toBeInTheDocument();
  });
});
```

**Imports explícitos** apesar de `globals: true` — preferência por explicitude, mais fácil de pesquisar (`import.*from 'vitest'`) e prepara o terreno para um lint rule eventual.

---

## 11. Referências

- `feature-docs/nextjs-init.md` — base do projeto
- `SPEC_1.md` §11 — stack canónico (Vitest é fixo, Playwright em V3)
- `SPEC_1.md` §13 — fluxo de dev (testes correm em CI antes de cada merge)
- `architecture.md` §10 — pipeline GitHub Actions a instalar a seguir
- `CLAUDE.md` — regras duras de cobertura
- [Vitest docs](https://vitest.dev/) · [Testing Library docs](https://testing-library.com/)
