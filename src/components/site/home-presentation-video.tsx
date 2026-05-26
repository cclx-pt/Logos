'use client';

import { motion } from 'motion/react';
import { PlayCircle } from 'lucide-react';

import { staggerContainer, staggerItem } from '@/lib/motion-variants';

// TODO(v2.5): preencher com o ID do vídeo do YouTube depois do upload (modo "não listado")
// ao canal LOGOS / CCLX. Apenas o ID de 11 caracteres, ex.: "dQw4w9WgXcQ" — não o URL completo.
// Enquanto vazio, é renderizado o placeholder "em preparação".
const DEFAULT_VIDEO_ID = '';

const VIDEO_TITLE = 'Vídeo de apresentação do LOGOS';

type Props = {
  /** ID do vídeo YouTube (11 chars). Vazio renderiza placeholder. */
  videoId?: string;
};

export function HomePresentationVideo({ videoId = DEFAULT_VIDEO_ID }: Props = {}) {
  const hasVideo = videoId.length > 0;

  return (
    <motion.section
      aria-label="Vídeo de apresentação do LOGOS"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-20 lg:pb-24"
    >
      <motion.div
        variants={staggerItem}
        className="border-border overflow-hidden rounded-2xl border"
      >
        {hasVideo ? (
          <div className="aspect-video w-full bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
              title={VIDEO_TITLE}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full"
            />
          </div>
        ) : (
          <div
            role="img"
            aria-label="Vídeo de apresentação em preparação"
            className="bg-orange/5 flex aspect-video w-full flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <div className="bg-orange/10 text-orange flex h-14 w-14 items-center justify-center rounded-full">
              <PlayCircle className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="text-muted-foreground font-sans text-sm sm:text-base">
              Vídeo de apresentação em preparação.
            </p>
          </div>
        )}
      </motion.div>
    </motion.section>
  );
}
