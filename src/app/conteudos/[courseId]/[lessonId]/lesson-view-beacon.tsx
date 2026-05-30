'use client';

import { useEffect, useRef } from 'react';

import { logLessonViewAction } from '@/lib/courses/access-actions';

/**
 * Beacon de visita a aula. Dispara `logLessonViewAction` uma vez quando a
 * página de aula monta no cliente. Best-effort — erros são engolidos (a
 * telemetria nunca deve partir a página). Logar no mount (em vez de no render
 * do Server Component) evita contagens duplicadas por re-render de RSC e
 * mantém o registo "uma visita por abertura".
 */
export function LessonViewBeacon({ lessonId }: { lessonId: string }) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    void logLessonViewAction(lessonId).catch(() => {
      // best-effort: ignora falhas de telemetria
    });
  }, [lessonId]);

  return null;
}
