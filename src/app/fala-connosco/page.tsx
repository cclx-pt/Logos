import type { Metadata } from 'next';
import { FalaConnoscoContent } from './fala-connosco-content';

export const metadata: Metadata = {
  title: 'Fala Connosco',
  description: 'Como entrar em contacto com a equipa LOGOS da CCLX.',
};

export default function FalaConnoscoPage() {
  return <FalaConnoscoContent />;
}
