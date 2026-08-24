/**
 * Guarda de regressão ao trigger `enforce_profiles_role_mutation_authority`.
 *
 * Contexto (bug de 25-08-2026): a função é recriada por `create or replace` em
 * migrations de ramos diferentes. A `20260530160000_profiles_update_lockdown`
 * (ramo v2.5) partiu da versão de `20260514030344` - a única que o seu ramo
 * conhecia - e, ao ordenar depois da `20260530120000_allow_super_admin_promotion`
 * (ramo v3, com timestamp back-dated), **reverteu em silêncio** a promoção a
 * super_admin. Os testes das Server Actions não apanham isto: mockam o Supabase,
 * por isso o trigger nunca corre.
 *
 * Este teste olha para a ÚLTIMA definição na ordem em que o Postgres as aplica
 * (ordem alfabética do nome do ficheiro = ordem de timestamp) e verifica que
 * essa versão - a que fica viva na base de dados - mantém as duas garantias
 * acumuladas ao longo do tempo. Qualquer `create or replace` futuro que perca
 * uma delas falha aqui.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');
const FN = 'enforce_profiles_role_mutation_authority';

/** Captura o corpo (entre `$$`) de um `create or replace function <FN>`. */
const DEFINITION_RE =
  /create\s+or\s+replace\s+function\s+enforce_profiles_role_mutation_authority\b[\s\S]*?\$\$([\s\S]*?)\$\$/i;

/** Corpo da última definição da função, na ordem em que o Postgres as aplica. */
function lastDefinition(): { file: string; body: string } {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let last: { file: string; body: string } | null = null;
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const match = sql.match(DEFINITION_RE);
    if (match) last = { file, body: match[1] };
  }
  if (!last) throw new Error(`Nenhuma definição de ${FN}() encontrada em ${MIGRATIONS_DIR}.`);
  return last;
}

describe(`${FN}() - última versão aplicada`, () => {
  it('aceita super_admin como valor de role (promoção pela UI)', () => {
    const { file, body } = lastDefinition();
    expect(
      /not\s+in\s*\(\s*'user'\s*,\s*'admin'\s*,\s*'super_admin'\s*\)/i.test(body),
      `A última definição (${file}) não aceita 'super_admin' em NEW.role - a promoção pela UI fica partida. ` +
        `Um create or replace tem de partir da versão mais recente da função, não da que o ramo conhece.`,
    ).toBe(true);
  });

  it('mantém id e external_auth_id imutáveis a partir de contexto autenticado', () => {
    const { file, body } = lastDefinition();
    expect(
      /NEW\.external_auth_id\s+is\s+distinct\s+from\s+OLD\.external_auth_id/i.test(body),
      `A última definição (${file}) perdeu a imutabilidade de id/external_auth_id (hardening V2.5).`,
    ).toBe(true);
    expect(/current_profile_id\(\)\s+is\s+not\s+null/i.test(body)).toBe(true);
  });

  it('mantém a mutação de role restrita a super_admin e nunca sobre um super_admin existente', () => {
    const { body } = lastDefinition();
    expect(/current_profile_role\(\)[\s\S]*?<>\s*'super_admin'/i.test(body)).toBe(true);
    expect(/OLD\.role\s*=\s*'super_admin'/i.test(body)).toBe(true);
  });
});
