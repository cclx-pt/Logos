import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TutorialVideo, CROP_CLASSES } from './tutorial-video';

// Tipos mínimos da IFrame Player API que o componente usa (sem `any`).
type PlayerVars = Record<string, number>;
type FakeTarget = {
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  getIframe: () => HTMLIFrameElement;
};
type FakeEvent = { target: FakeTarget; data: number };
type FakeOptions = {
  videoId: string;
  playerVars?: PlayerVars;
  events?: {
    onReady?: (event: FakeEvent) => void;
    onStateChange?: (event: FakeEvent) => void;
  };
};

const playVideo = vi.fn();
const seekTo = vi.fn();
const mute = vi.fn();
let captured: FakeOptions | undefined;
let iframeEl: HTMLIFrameElement;

beforeEach(() => {
  vi.clearAllMocks();
  captured = undefined;
  iframeEl = document.createElement('iframe');

  class FakePlayer {
    playVideo = playVideo;
    seekTo = seekTo;
    mute = mute;
    destroy = vi.fn();
    getIframe = () => iframeEl;
    constructor(_el: HTMLElement | string, options: FakeOptions) {
      captured = options;
    }
  }

  // A API estaria já carregada: `window.YT.Player` presente resolve de imediato.
  (window as unknown as { YT: unknown }).YT = {
    Player: FakePlayer,
    PlayerState: { ENDED: 0 },
  };
});

const target: FakeTarget = {
  playVideo,
  seekTo,
  mute,
  getIframe: () => iframeEl,
};

describe('TutorialVideo', () => {
  it('cria o player com o vídeo certo e em autoplay mudo, sem controlos', async () => {
    render(<TutorialVideo youtubeId="k6OACr38MaM" title="Passo 1" />);
    await waitFor(() => expect(captured).toBeDefined());
    expect(captured?.videoId).toBe('k6OACr38MaM');
    expect(captured?.playerVars?.autoplay).toBe(1);
    expect(captured?.playerVars?.mute).toBe(1);
    expect(captured?.playerVars?.controls).toBe(0);
  });

  it('no onReady arranca o vídeo (mudo) e aplica o letterbox-crop ao iframe', async () => {
    render(<TutorialVideo youtubeId="k6OACr38MaM" title="Passo 1" />);
    await waitFor(() => expect(captured).toBeDefined());
    captured?.events?.onReady?.({ target, data: -1 });
    expect(mute).toHaveBeenCalled();
    expect(playVideo).toHaveBeenCalled();
    for (const cls of CROP_CLASSES) expect(iframeEl.classList.contains(cls)).toBe(true);
    expect(iframeEl.getAttribute('title')).toBe('Vídeo: Passo 1');
  });

  it('faz loop sem recarregar: ao terminar, volta ao início e toca de novo', async () => {
    render(<TutorialVideo youtubeId="k6OACr38MaM" title="Passo 1" />);
    await waitFor(() => expect(captured).toBeDefined());
    captured?.events?.onStateChange?.({ target, data: 0 }); // 0 = ENDED
    expect(seekTo).toHaveBeenCalledWith(0, true);
    expect(playVideo).toHaveBeenCalled();
  });
});
