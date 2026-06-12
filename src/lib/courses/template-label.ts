/**
 * Etiqueta curta do template de aula para o leitor (catálogo do curso +
 * página de módulo). Módulo puro (sem imports de servidor) para poder ser
 * usado tanto em Server como em Client Components sem cruzar a fronteira de
 * identidade.
 *
 * O admin usa um conjunto de etiquetas próprio ("só pdf" / "só vídeo") em
 * `lesson-list.tsx` — contexto e tom diferentes, por isso não é partilhado.
 */

import type { LessonTemplate } from './detail';

export const LESSON_TEMPLATE_LABEL: Record<LessonTemplate, string> = {
  pdf: 'pdf',
  video: 'vídeo',
  video_pdf: 'vídeo + pdf',
};
