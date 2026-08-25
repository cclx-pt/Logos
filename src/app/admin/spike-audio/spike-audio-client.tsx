'use client';

/**
 * SPIKE (PR0) - descartavel. Nao mergeia para `main`.
 *
 * Existe para responder as duas perguntas de que depende toda a funcionalidade
 * de audio das aulas. Se qualquer uma falhar, poupa-se semanas de trabalho:
 *
 *   A) O browser consegue extrair o audio de um master real da CCLX, com
 *      ffmpeg.wasm, sem rebentar a memoria? Quanto tempo demora? Que tamanho da?
 *   B) Um <audio> + Media Session continua a tocar num iPhone e num Android
 *      com o ECRA BLOQUEADO, com os controlos no ecra de bloqueio?
 *
 * (B) e a pergunta eliminatoria e NAO ha teste automatico que a responda - so
 * dispositivos reais. Por isso o registo de eventos com hora: depois de
 * desbloquear o telemovel, mostra o que aconteceu enquanto ninguem via.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

type LogLine = { at: string; text: string };

const SKIP_SECONDS = 15;
const SPEEDS = [1, 1.25, 1.5, 2] as const;

function hhmmss(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function SpikeAudioClient() {
  // ---- registo partilhado -------------------------------------------------
  const [log, setLog] = useState<LogLine[]>([]);
  const push = useCallback((text: string) => {
    setLog((prev) => [...prev.slice(-299), { at: nowStamp(), text }]);
  }, []);

  // ---- A) conversao -------------------------------------------------------
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    url: string;
    inputBytes: number;
    outputBytes: number;
    seconds: number;
    inputName: string;
  } | null>(null);

  const convert = useCallback(
    async (file: File) => {
      setConverting(true);
      setProgress(0);
      setResult(null);
      push(`Entrada: ${file.name} (${megabytes(file.size)}, ${file.type || 'tipo desconhecido'})`);

      const started = performance.now();
      try {
        // Import dinamico: o core do ffmpeg tem ~32 MB. So o admin que escolhe
        // mesmo um ficheiro e que o descarrega.
        const { FFmpeg, FFFSType } = await import('@ffmpeg/ffmpeg');
        const ffmpeg = new FFmpeg();

        ffmpeg.on('log', ({ message }) => push(message));
        ffmpeg.on('progress', ({ progress: p }) => setProgress(Math.min(1, Math.max(0, p))));

        push('A carregar o core do ffmpeg (~32 MB, servido de /ffmpeg/)…');
        await ffmpeg.load({
          coreURL: '/ffmpeg/ffmpeg-core.js',
          wasmURL: '/ffmpeg/ffmpeg-core.wasm',
        });
        push('Core carregado.');

        // WORKERFS monta o File e le-o preguicosamente. E o que evita copiar
        // gigabytes para dentro da memoria do wasm (teto de ~2 GB) - o ponto
        // que decide se masters grandes passam ou nao.
        const dir = '/master';
        await ffmpeg.createDir(dir);
        await ffmpeg.mount(FFFSType.WORKERFS, { files: [file] }, dir);
        push(`Montado em ${dir} via WORKERFS (sem copiar para memória).`);

        const output = 'saida.mp3';
        // -vn descarta o video; -ac 1 forca mono; -b:a 64k e o alvo de ~22 MB
        // por aula de 45 min.
        await ffmpeg.exec(['-i', `${dir}/${file.name}`, '-vn', '-ac', '1', '-b:a', '64k', output]);

        const data = await ffmpeg.readFile(output);
        await ffmpeg.unmount(dir);
        await ffmpeg.deleteFile(output);

        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        const blob = new Blob([bytes as BlobPart], { type: 'audio/mpeg' });
        const seconds = (performance.now() - started) / 1000;

        setResult({
          url: URL.createObjectURL(blob),
          inputBytes: file.size,
          outputBytes: blob.size,
          seconds,
          inputName: file.name,
        });
        setProgress(1);
        push(
          `PRONTO em ${seconds.toFixed(1)}s - ${megabytes(file.size)} -> ${megabytes(blob.size)}.`,
        );
        ffmpeg.terminate();
      } catch (error) {
        push(`FALHOU: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setConverting(false);
      }
    },
    [push],
  );

  // ---- B) reproducao ------------------------------------------------------
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState('');
  const [urlField, setUrlField] = useState('');
  const [speed, setSpeed] = useState<number>(1);

  // Espelho do estado do <audio> em state. Ler `audioRef.current` durante o
  // render nao actualizaria a UI (e o lint proibe-o, com razao).
  const [playback, setPlayback] = useState<{
    currentTime: number;
    duration: number;
    paused: boolean;
  }>({ currentTime: 0, duration: Number.NaN, paused: true });

  // useSyncExternalStore em vez de useEffect+setState: e uma capacidade do
  // browser, nunca muda, e assim nao ha divergencia de hidratacao (o
  // servidor le sempre false).
  const hasMediaSession = useSyncExternalStore(
    () => () => {},
    () => 'mediaSession' in navigator,
    () => false,
  );

  // Registo de eventos do media. E isto que se le DEPOIS de desbloquear o
  // telemovel para saber se o som aguentou, e se nao aguentou, quando parou.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const events = [
      'play',
      'playing',
      'pause',
      'ended',
      'waiting',
      'stalled',
      'suspend',
      'error',
      'ratechange',
    ] as const;

    const sync = () =>
      setPlayback({ currentTime: el.currentTime, duration: el.duration, paused: el.paused });

    const handlers = events.map((name) => {
      const handler = () => {
        push(`<audio> ${name} @ ${hhmmss(el.currentTime)}`);
        sync();
      };
      el.addEventListener(name, handler);
      return [name, handler] as const;
    });

    const onVisibility = () =>
      push(`documento ${document.visibilityState} @ ${hhmmss(el.currentTime)}`);
    document.addEventListener('visibilitychange', onVisibility);

    // Refresca o mostrador (e o positionState) uma vez por segundo.
    const timer = window.setInterval(sync, 1000);

    return () => {
      handlers.forEach(([name, handler]) => el.removeEventListener(name, handler));
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [push]);

  // Media Session: e isto que poe titulo, imagem e botoes no ecra de bloqueio.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !src) return;
    const el = audioRef.current;
    if (!el) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Aula de teste (spike)',
      artist: 'Curso de teste',
      album: 'LOGOS - CCLX',
      // Varios tamanhos: o Safari ja teve o bug de mostrar caixa cinzenta
      // quando so havia arte grande. Barato de prevenir.
      artwork: [96, 192, 512].map((size) => ({
        src: '/og-image.png',
        sizes: `${size}x${size}`,
        type: 'image/png',
      })),
    });

    const actions: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => void el.play()],
      ['pause', () => el.pause()],
      ['seekbackward', () => (el.currentTime = Math.max(0, el.currentTime - SKIP_SECONDS))],
      ['seekforward', () => (el.currentTime = el.currentTime + SKIP_SECONDS)],
      [
        'seekto',
        (details) => {
          if (typeof details.seekTime === 'number') el.currentTime = details.seekTime;
        },
      ],
    ];

    for (const [action, handler] of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Nem todos os browsers suportam todas as accoes - ignorar em silencio.
      }
    }
  }, [src]);

  // positionState alimenta a barra de tempo do ecra de bloqueio.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !('mediaSession' in navigator) || !Number.isFinite(el.duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: el.duration,
        position: Math.min(el.currentTime, el.duration),
        playbackRate: el.playbackRate,
      });
    } catch {
      // setPositionState rejeita valores incoerentes durante o seek.
    }
  }, [playback, src]);

  return (
    <div className="flex flex-col gap-10">
      {/* ---------------- A ---------------- */}
      <section className="border-border rounded-2xl border p-5">
        <h2 className="font-display text-ink text-xl font-medium">
          A. Extrair o áudio de um master
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Escolhe um ficheiro de vídeo real da CCLX. Converte no browser (ffmpeg.wasm, WORKERFS),
          sem enviar nada para servidor nenhum. Mede tempo e tamanho.
        </p>

        <input
          type="file"
          accept="video/*,audio/*"
          disabled={converting}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void convert(file);
          }}
          className="border-border mt-4 block w-full rounded-md border p-2 text-sm"
        />

        {converting && (
          <div className="mt-4">
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-orange-primary h-full transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              {Math.round(progress * 100)}% - não feches o separador.
            </p>
          </div>
        )}

        {result && (
          <dl className="border-border mt-4 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Entrada</dt>
              <dd className="text-ink font-medium">{megabytes(result.inputBytes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Saída</dt>
              <dd className="text-ink font-medium">{megabytes(result.outputBytes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Redução</dt>
              <dd className="text-ink font-medium">
                {(result.inputBytes / result.outputBytes).toFixed(0)}x
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase">Tempo</dt>
              <dd className="text-ink font-medium">{result.seconds.toFixed(1)}s</dd>
            </div>
            <div className="col-span-2 sm:col-span-4">
              <button
                type="button"
                onClick={() => {
                  setSrc(result.url);
                  push('Fonte do leitor = ficheiro convertido (blob).');
                }}
                className="bg-orange-primary hover:bg-orange-hover mt-1 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white"
              >
                Usar isto no leitor abaixo
              </button>
              <a
                href={result.url}
                download={`${result.inputName.replace(/\.[^.]+$/, '')}.mp3`}
                className="border-border text-ink hover:bg-muted/40 mt-1 ml-2 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium"
              >
                Descarregar MP3
              </a>
            </div>
          </dl>
        )}
      </section>

      {/* ---------------- B ---------------- */}
      <section className="border-border rounded-2xl border p-5">
        <h2 className="font-display text-ink text-xl font-medium">B. Tocar com o ecrã bloqueado</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          A pergunta eliminatória. Dá play, <strong>bloqueia o telemóvel</strong>, espera uns
          minutos, desbloqueia e lê o registo em baixo. Um blob não prova o caminho real (streaming
          por HTTP) - para testar em condições, cola o URL de um MP3 acessível.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="url"
            inputMode="url"
            placeholder="https://.../ficheiro.mp3"
            value={urlField}
            onChange={(event) => setUrlField(event.target.value)}
            className="border-border min-w-0 flex-1 rounded-md border p-2 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              if (!urlField.trim()) return;
              setSrc(urlField.trim());
              push(`Fonte do leitor = ${urlField.trim()}`);
            }}
            className="border-border text-ink hover:bg-muted/40 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Carregar
          </button>
        </div>

        {/* Elemento <audio> simples, DE PROPOSITO. Nada de Web Audio /
            AudioContext: o iOS suspende o AudioContext assim que o ecra
            bloqueia (WebKit #237878), e era exactamente isto que se perderia. */}
        <audio ref={audioRef} src={src || undefined} preload="metadata" className="mt-4 w-full" />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!src}
            onClick={() => {
              const node = audioRef.current;
              if (!node) return;
              if (node.paused) void node.play();
              else node.pause();
            }}
            className="bg-orange-primary hover:bg-orange-hover inline-flex h-10 items-center rounded-md px-5 text-sm font-medium text-white disabled:opacity-40"
          >
            {playback.paused ? 'Tocar' : 'Pausa'}
          </button>
          <button
            type="button"
            disabled={!src}
            onClick={() => {
              const node = audioRef.current;
              if (node) node.currentTime = Math.max(0, node.currentTime - SKIP_SECONDS);
            }}
            className="border-border text-ink hover:bg-muted/40 inline-flex h-10 items-center rounded-md border px-4 text-sm disabled:opacity-40"
          >
            -{SKIP_SECONDS}s
          </button>
          <button
            type="button"
            disabled={!src}
            onClick={() => {
              const node = audioRef.current;
              if (node) node.currentTime += SKIP_SECONDS;
            }}
            className="border-border text-ink hover:bg-muted/40 inline-flex h-10 items-center rounded-md border px-4 text-sm disabled:opacity-40"
          >
            +{SKIP_SECONDS}s
          </button>
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              disabled={!src}
              onClick={() => {
                const node = audioRef.current;
                if (node) node.playbackRate = value;
                setSpeed(value);
              }}
              className={`inline-flex h-10 items-center rounded-md border px-3 text-sm disabled:opacity-40 ${
                speed === value
                  ? 'border-orange-primary bg-orange-primary/10 text-orange-primary'
                  : 'border-border text-ink hover:bg-muted/40'
              }`}
            >
              {value}x
            </button>
          ))}
        </div>

        <p className="text-muted-foreground mt-3 font-mono text-xs">
          {hhmmss(playback.currentTime)} / {hhmmss(playback.duration)} -{' '}
          {playback.paused ? 'em pausa' : 'a tocar'} - Media Session{' '}
          {hasMediaSession ? 'sim' : 'NÃO'}
        </p>
      </section>

      {/* ---------------- registo ---------------- */}
      <section className="border-border rounded-2xl border p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-ink text-xl font-medium">Registo</h2>
          <button
            type="button"
            onClick={() => setLog([])}
            className="border-border text-ink hover:bg-muted/40 inline-flex h-8 items-center rounded-md border px-3 text-xs"
          >
            Limpar
          </button>
        </div>
        <pre className="bg-muted/40 mt-3 max-h-80 overflow-auto rounded-md p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
          {log.length === 0
            ? 'Sem eventos ainda.'
            : log.map((line) => `${line.at}  ${line.text}`).join('\n')}
        </pre>
      </section>
    </div>
  );
}
