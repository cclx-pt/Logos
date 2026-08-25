/**
 * SPIKE (PR0) - descartavel, nao mergeia para `main`.
 *
 * Fica sob /admin de proposito: o `admin/layout.tsx` ja faz o guard (404 PT-PT
 * para quem nao e admin, conforme "conteudo restrito e invisivel"). Nao entra
 * na nav da area admin - chega-se aqui so pelo URL directo.
 *
 * Ver `feature-docs/spike-audio.md` para o que se esta a medir e porque.
 */

import type { Metadata } from 'next';

import { SpikeAudioClient } from './spike-audio-client';

export const metadata: Metadata = {
  title: 'Spike: áudio em segundo plano',
  robots: { index: false, follow: false },
};

export default function SpikeAudioPage() {
  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">Spike descartável</p>
        <h1 className="font-display text-ink mt-2 text-3xl font-medium tracking-tight">
          Áudio das aulas - prova de viabilidade
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Duas perguntas, por esta ordem. Se a <strong>B</strong> falhar num telemóvel real, a
          funcionalidade não existe e não vale a pena construir mais nada - nenhum teste automático
          a consegue responder.
        </p>
      </header>

      <SpikeAudioClient />
    </div>
  );
}
