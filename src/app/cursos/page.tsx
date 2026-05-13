import type { Metadata } from 'next';
import { CursosContent } from './cursos-content';

export const metadata: Metadata = {
  title: 'Cursos',
  description: 'Em breve — cursos de estudo bíblico em vídeo com apostilas para descarregar.',
};

export default function CursosPage() {
  return <CursosContent />;
}
