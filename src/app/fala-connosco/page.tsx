import type { Metadata } from 'next';
import { FalaConnoscoContent } from './fala-connosco-content';

export const metadata: Metadata = {
  title: 'Fala connosco',
  description: 'Como entrar em contacto com a equipa Logos da CCLX.',
};

export default function FalaConnoscoPage() {
  return <FalaConnoscoContent />;
}
