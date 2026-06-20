import type { Metadata } from 'next';

import { ComoFuncionaContent } from './como-funciona-content';

export const metadata: Metadata = {
  title: 'Como funciona',
  description:
    'Um tutorial rápido do LOGOS: encontrar cursos, ver aulas, marcar como concluído e fazer perguntas.',
};

export default function ComoFuncionaPage() {
  return <ComoFuncionaContent />;
}
