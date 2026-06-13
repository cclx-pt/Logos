'use client';

import { YOUTUBE_SUBSCRIBE_URL } from '@/lib/youtube/channel';
import { useLiveStatus } from '@/lib/youtube/use-live-status';
import type { LiveStatus } from '@/lib/youtube/live-status';

type LivePlayerProps = {
  /** Estado determinado no servidor, para o primeiro render (evita flash). */
  initialStatus: LiveStatus | null;
};

const PRESENTATION_TITLE = 'Transmissão em direto - LOGOS';

/** Logótipo do YouTube (inline para não depender do conjunto de ícones). */
function YoutubeGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
    </svg>
  );
}

/**
 * Leitor da transmissão dentro do portal (spec §6.3).
 *  - Ao vivo: embed responsivo 16:9 via `youtube-nocookie` com o `videoId`.
 *  - Offline: mensagem de ausência de transmissão.
 * O botão "Subscrever canal" aparece em ambos os estados (spec §6.4).
 *
 * Continua a fazer polling (60s) para que uma transmissão que comece enquanto
 * o utilizador espera apareça sem recarregar.
 */
export function LivePlayer({ initialStatus }: LivePlayerProps) {
  const { status } = useLiveStatus(initialStatus);
  const live = status?.live === true;
  const videoId = status?.videoId ?? null;

  return (
    <div className="space-y-4">
      <div className="border-border overflow-hidden rounded-2xl border bg-black">
        {live && videoId ? (
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&autoplay=1`}
              title={PRESENTATION_TITLE}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="bg-cream-card/40 flex aspect-video w-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-ink font-display text-xl sm:text-2xl">
              Sem transmissão em direto neste momento
            </span>
            <p className="text-muted font-sans text-sm sm:text-base">
              Subscreve o canal para seres avisado quando a próxima começar.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <a
          href={YOUTUBE_SUBSCRIBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 font-sans text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          style={{ backgroundColor: '#FF0000' }}
        >
          <YoutubeGlyph />
          Subscrever canal
        </a>
      </div>
    </div>
  );
}
