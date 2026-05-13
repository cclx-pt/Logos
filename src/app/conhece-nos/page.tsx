import type { Metadata } from 'next';
import { ConheceNosContent } from './conhece-nos-content';

export const metadata: Metadata = {
  title: 'Conhece-nos',
  description: 'Quem somos, o que fazemos e porquê.',
};

export default function ConheceNosPage() {
  return <ConheceNosContent />;
}
