'use server';

/**
 * Server Actions de gestão de módulos — V3 PR4a.
 *
 * Admin e super_admin gerem módulos dentro de cursos (CRUD + reordenar via
 * setas ↑↓). Triple defesa:
 *
 *   1. Esta action recusa se o caller não for admin nem super_admin.
 *   2. RLS em `modules` (policies modules_insert/update/delete_admin) garante
 *      que escritas por outro role nunca tocam dados.
 *   3. CHECK constraints na DB (position >= 0, length(title) 1-120) defendem
 *      contra inputs maliciosos via service role.
 *
 * Reordenar (móvel ↑↓): faz swap de `position` com o vizinho imediato. O
 * schema não tem UNIQUE em `(course_id, position)` — apenas índice — pelo que
 * a janela de colisão temporária entre os dois UPDATEs sequenciais é
 * inofensiva. Aceitável dado que admin é um voluntário único; cenários
 * concorrentes não são realistas em V3.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';

import {
  DESCRIPTION_MAX,
  validateOptionalText,
  validateTitle,
  validateUuid,
} from './_lib/validation';

export type CreateModuleResult = { ok: true; id: string } | { ok: false; error: string };
export type ModuleActionResult = { ok: true } | { ok: false; error: string };

function revalidateCoursePages(courseId: string): void {
  revalidatePath(`/admin/conteudos/${courseId}`);
  revalidatePath('/conteudos');
}

export async function createModuleAction(formData: FormData): Promise<CreateModuleResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode criar módulos.' };
  }

  const courseId = validateUuid(formData.get('course_id'), 'course_id');
  if (!courseId.ok) return courseId;
  const title = validateTitle(formData.get('title'));
  if (!title.ok) return title;
  const description = validateOptionalText(
    formData.get('description'),
    DESCRIPTION_MAX,
    'Descrição',
  );
  if (!description.ok) return description;

  const supabase = await getServerClient();

  const { data: maxRow, error: maxError } = await supabase
    .from('modules')
    .select('position')
    .eq('course_id', courseId.value)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  if (maxError) {
    return { ok: false, error: `Falha a calcular posição: ${maxError.message}` };
  }

  const nextPosition = maxRow ? maxRow.position + 1 : 0;

  const { data, error } = await supabase
    .from('modules')
    .insert({
      course_id: courseId.value,
      title: title.value,
      description: description.value,
      position: nextPosition,
    })
    .select('id')
    .single<{ id: string }>();

  if (error) {
    return { ok: false, error: `Falha a criar módulo: ${error.message}` };
  }

  revalidateCoursePages(courseId.value);
  return { ok: true, id: data.id };
}

export async function updateModuleAction(formData: FormData): Promise<ModuleActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode alterar módulos.' };
  }

  const id = validateUuid(formData.get('id'), 'id');
  if (!id.ok) return id;
  const courseId = validateUuid(formData.get('course_id'), 'course_id');
  if (!courseId.ok) return courseId;
  const title = validateTitle(formData.get('title'));
  if (!title.ok) return title;
  const description = validateOptionalText(
    formData.get('description'),
    DESCRIPTION_MAX,
    'Descrição',
  );
  if (!description.ok) return description;

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('modules')
    .update({ title: title.value, description: description.value })
    .eq('id', id.value);

  if (error) {
    return { ok: false, error: `Falha a atualizar módulo: ${error.message}` };
  }

  revalidateCoursePages(courseId.value);
  return { ok: true };
}

export async function deleteModuleAction(formData: FormData): Promise<ModuleActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode apagar módulos.' };
  }

  const id = validateUuid(formData.get('id'), 'id');
  if (!id.ok) return id;
  const courseId = validateUuid(formData.get('course_id'), 'course_id');
  if (!courseId.ok) return courseId;

  const supabase = await getServerClient();
  const { error } = await supabase.from('modules').delete().eq('id', id.value);

  if (error) {
    return { ok: false, error: `Falha a apagar módulo: ${error.message}` };
  }

  revalidateCoursePages(courseId.value);
  return { ok: true };
}

type Direction = 'up' | 'down';

async function moveModule(formData: FormData, direction: Direction): Promise<ModuleActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode reordenar módulos.' };
  }

  const id = validateUuid(formData.get('id'), 'id');
  if (!id.ok) return id;
  const courseId = validateUuid(formData.get('course_id'), 'course_id');
  if (!courseId.ok) return courseId;

  const supabase = await getServerClient();

  const { data: current, error: currentError } = await supabase
    .from('modules')
    .select('id, position, course_id')
    .eq('id', id.value)
    .maybeSingle<{ id: string; position: number; course_id: string }>();

  if (currentError) {
    return { ok: false, error: `Falha a carregar módulo: ${currentError.message}` };
  }
  if (!current) {
    return { ok: false, error: 'Módulo não encontrado.' };
  }
  if (current.course_id !== courseId.value) {
    return { ok: false, error: 'O módulo não pertence ao curso indicado.' };
  }

  const neighborQuery = supabase
    .from('modules')
    .select('id, position')
    .eq('course_id', courseId.value);
  const { data: neighbor, error: neighborError } = await (
    direction === 'up'
      ? neighborQuery.lt('position', current.position).order('position', { ascending: false })
      : neighborQuery.gt('position', current.position).order('position', { ascending: true })
  )
    .limit(1)
    .maybeSingle<{ id: string; position: number }>();

  if (neighborError) {
    return { ok: false, error: `Falha a carregar vizinho: ${neighborError.message}` };
  }

  // No-op nos extremos — primeiro/último módulo. UI continua a mostrar a
  // ordem actual, sem erro visível ao admin.
  if (!neighbor) {
    return { ok: true };
  }

  const { error: updateCurrentError } = await supabase
    .from('modules')
    .update({ position: neighbor.position })
    .eq('id', current.id);
  if (updateCurrentError) {
    return { ok: false, error: `Falha a mover módulo: ${updateCurrentError.message}` };
  }

  const { error: updateNeighborError } = await supabase
    .from('modules')
    .update({ position: current.position })
    .eq('id', neighbor.id);
  if (updateNeighborError) {
    return { ok: false, error: `Falha a mover vizinho: ${updateNeighborError.message}` };
  }

  revalidateCoursePages(courseId.value);
  return { ok: true };
}

export async function moveModuleUpAction(formData: FormData): Promise<ModuleActionResult> {
  return moveModule(formData, 'up');
}

export async function moveModuleDownAction(formData: FormData): Promise<ModuleActionResult> {
  return moveModule(formData, 'down');
}
