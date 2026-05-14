import type { Metadata } from 'next';
import { EscolaBiblicaContent } from './escola-biblica-content';

export const metadata: Metadata = {
  title: 'Escola Bíblica',
  description: 'Em breve — as transmissões da Escola Bíblica da CCLX.',
};

export default function EscolaBiblicaPage() {
  return <EscolaBiblicaContent />;
}
