import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    // Identidade isolada: `@supabase/ssr` e `@supabase/supabase-js` só podem
    // ser importados dentro de `src/lib/auth/**`. O resto da app consome a
    // API pública desta camada (getCurrentUser, getServerClient, etc.).
    // Regra dura em CLAUDE.md + feature-docs/auth-architecture.md §3.
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/ssr',
              message:
                "Importa de '@/lib/auth' (getCurrentUser/getServerClient). Só src/lib/auth/** pode importar @supabase/ssr directamente.",
            },
            {
              name: '@supabase/supabase-js',
              message:
                "Importa de '@/lib/auth' (getCurrentUser/getServerClient). Só src/lib/auth/** pode importar @supabase/supabase-js directamente.",
            },
          ],
        },
      ],
    },
  },
  {
    // Excepção: dentro de src/lib/auth/** pode importar livremente.
    files: ['src/lib/auth/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts']),
]);

export default eslintConfig;
