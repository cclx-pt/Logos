import type { Metadata } from 'next';
import { NotFoundContent } from './not-found-content';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  description: 'A página que procuras não existe ou foi movida.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundContent />;
}
