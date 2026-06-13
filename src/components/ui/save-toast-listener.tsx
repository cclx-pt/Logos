'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Mapeamento canónico `?guardado=<tipo>` → mensagem de sucesso para toasts.
 *
 * Mantém os tipos curtos e em PT-PT. Adicionar novos tipos é trivial — basta
 * acrescentar uma entrada e usar o mesmo valor no `redirect(?guardado=…)` do
 * lado do server.
 */
const SAVED_MESSAGES: Record<string, string> = {
  // Cursos
  curso_criado: 'Curso criado.',
  curso_atualizado: 'Alterações guardadas.',
  curso_apagado: 'Curso apagado.',
  // Módulos
  modulo_criado: 'Módulo adicionado.',
  modulo_atualizado: 'Módulo guardado.',
  modulo_apagado: 'Módulo apagado.',
  // Aulas
  aula_criada: 'Aula adicionada.',
  aula_atualizada: 'Aula guardada.',
  aula_apagada: 'Aula apagada.',
  // Etiquetas
  etiqueta_criada: 'Etiqueta criada.',
  etiqueta_atualizada: 'Etiqueta guardada.',
  etiqueta_apagada: 'Etiqueta apagada.',
  // Roles / permissões
  papel_atualizado: 'Papel actualizado.',
  // Perguntas (inbox de admin)
  pergunta_atualizada: 'Pergunta atualizada.',
  resposta_enviada: 'Resposta enviada ao aluno.',
  // Perguntas (conversa do aluno)
  seguimento_enviado: 'Mensagem enviada. A equipa foi avisada.',
};

const ERROR_MESSAGES: Record<string, string> = {
  generico: 'Algo correu mal. Tenta de novo.',
};

/**
 * `<SaveToastListener />` — Client Component que vive no layout admin e
 * inspecciona `searchParams` à procura de `?guardado=<tipo>` ou `?erro=<tipo>`.
 *
 * Quando encontra um valor conhecido:
 *   1. dispara `toast.success(message)` ou `toast.error(message)`;
 *   2. faz `router.replace` para o mesmo path **sem** o param, para que o
 *      toast não volte a aparecer em recargas ou navegações de back.
 *
 * Não dispara nada para valores desconhecidos, e ignora completamente as
 * páginas que não os usam. É o suficiente para suportar o padrão simples:
 *   redirect(`/admin/conteudos/${id}?guardado=curso_atualizado`)
 * server-side, sem ter de mexer no resto do form.
 */
export function SaveToastListener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = searchParams.get('guardado');
    const error = searchParams.get('erro');

    let didFire = false;
    if (saved && SAVED_MESSAGES[saved]) {
      toast.success(SAVED_MESSAGES[saved]);
      didFire = true;
    }
    if (error && ERROR_MESSAGES[error]) {
      toast.error(ERROR_MESSAGES[error]);
      didFire = true;
    }

    if (didFire) {
      const next = new URLSearchParams(searchParams);
      next.delete('guardado');
      next.delete('erro');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  return null;
}
