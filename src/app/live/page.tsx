import type { Metadata } from 'next';

import { getLiveStatus } from '@/lib/youtube/live-status';
import { LivePlayer } from '@/components/site/live-player';

export const metadata: Metadata = {
  title: 'Live',
  description:
    'Transmissão em direto do canal LOGOS da CCLX. Vê o estudo Bíblico ao vivo, dentro do portal.',
};

// O estado live depende da hora e da cache do `fetch` interno; render dinâmico.
export const dynamic = 'force-dynamic';

export default async function LivePage() {
  const initialStatus = await getLiveStatus();

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Sem texto visível durante a emissão: só o leitor e o botão de
          subscrever. O título fica sr-only (acessibilidade + SEO). A única
          mensagem de texto aparece no fim da Live, dentro do LivePlayer. */}
      <h1 className="sr-only">Live</h1>

      <LivePlayer initialStatus={initialStatus} />
    </main>
  );
}
