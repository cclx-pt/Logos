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
      <header className="mb-8 space-y-2">
        <h1 className="text-ink font-display text-3xl sm:text-4xl">Live</h1>
        <p className="text-muted font-sans text-sm sm:text-base">
          Transmissão em direto do canal LOGOS. Quando estamos no ar, o vídeo aparece aqui.
        </p>
      </header>

      <LivePlayer initialStatus={initialStatus} />
    </main>
  );
}
