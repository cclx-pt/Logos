/**
 * Predicates de papel — partilhados por Server Actions e pages para evitar
 * espalhar `role === 'admin' || role === 'super_admin'` por todo o lado.
 *
 * Defesa em profundidade: estas funções são o filtro UI/UX (esconder botões,
 * devolver 404). A autoridade final é a RLS no Postgres + triggers de
 * `enforce_*_role_mutation_authority`.
 */

import type { Role } from './index';

/** `true` para `admin` e `super_admin`. */
export function isAdmin(role: Role): boolean {
  return role === 'admin' || role === 'super_admin';
}

/** `true` apenas para `super_admin`. */
export function isSuperAdmin(role: Role): boolean {
  return role === 'super_admin';
}
