import type { Metadata } from 'next';
import { ConteudosContent } from './conteudos-content';

export const metadata: Metadata = {
  title: 'Conteúdos',
  description:
    'O estudo bíblico da CCLX em duas áreas — Cursos em vídeo com apostilas e a Escola Bíblica.',
};

export default function ConteudosPage() {
  return <ConteudosContent />;
}
