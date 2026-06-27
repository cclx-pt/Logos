'use client';

import { useEffect, useRef } from 'react';

/**
 * Player de vídeo do tutorial via IFrame Player API do YouTube.
 *
 * Porquê a API e não um `<iframe>` simples:
 * - **Autoplay fiável** (incl. o 1.º vídeo): chamamos `playVideo()` no `onReady`
 *   (mudo), por isso arranca ao abrir a página sem depender de um clique. O
 *   truque `loop=1&playlist=<id>` no iframe simples transformava o embed numa
 *   "lista" e os browsers não deixam uma lista arrancar sem interação - só o 1.º
 *   vídeo (carregado sem clique) ficava parado; os seguintes (após "Seguinte")
 *   tocavam.
 * - **Loop sem corte**: ao terminar (`ENDED`) fazemos `seekTo(0)` em vez de
 *   recarregar, por isso não pisca.
 *
 * O título/controlos do YouTube são escondidos pelo "letterbox-crop": o iframe
 * gerado é estilizado mais alto que o contentor (`h-[160%]`) e centrado; o
 * contentor (no componente pai) tem `overflow-hidden`, por isso o YouTube ajusta
 * o vídeo à largura e o título/controlos caem nas barras pretas que ficam
 * cortadas - sem perder imagem. Um vídeo 16:9 preenche o contentor 16:9.
 */

type YouTubePlayer = {
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  getIframe: () => HTMLIFrameElement;
  destroy: () => void;
};

type PlayerEvent = { target: YouTubePlayer; data: number };

type PlayerConstructorOptions = {
  videoId: string;
  width?: string;
  height?: string;
  playerVars?: Record<string, number>;
  events?: {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: PlayerEvent) => void;
  };
};

type YouTubeNamespace = {
  Player: new (el: string | HTMLElement, options: PlayerConstructorOptions) => YouTubePlayer;
  PlayerState: { ENDED: number };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Classes do "letterbox-crop" aplicadas ao iframe gerado pela API. */
const CROP_CLASSES = [
  'pointer-events-none',
  'absolute',
  'left-0',
  'top-1/2',
  'h-[160%]',
  'w-full',
  '-translate-y-1/2',
];

let apiPromise: Promise<YouTubeNamespace> | null = null;

/** Carrega o script da IFrame Player API uma única vez (idempotente). */
function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeNamespace>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

export function TutorialVideo({ youtubeId, title }: { youtubeId: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    // Nó interno que a API do YouTube vai SUBSTITUIR por um iframe. É criado
    // fora do React (`createElement`), por isso o React nunca o gere nem tenta
    // removê-lo - evita o crash "removeChild: not a child" quando o YouTube
    // troca o nó. No unmount, o React só remove o `containerRef` (que possui) e
    // o browser leva o iframe junto.
    const host = document.createElement('div');
    container.appendChild(host);

    void loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(host, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event) => {
            event.target.mute();
            event.target.playVideo();
            const iframe = event.target.getIframe();
            iframe.setAttribute('title', `Vídeo: ${title}`);
            iframe.setAttribute('tabindex', '-1');
            iframe.classList.add(...CROP_CLASSES);
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) {
              event.target.seekTo(0, true);
              event.target.playVideo();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // o iframe pode já ter saído do DOM
      }
      playerRef.current = null;
    };
  }, [youtubeId, title]);

  return <div ref={containerRef} className="relative h-full w-full" />;
}

export { CROP_CLASSES };
