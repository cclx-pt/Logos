import { notFound, redirect } from 'next/navigation';

import { SubmitButton } from '@/components/ui/submit-button';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { readLiveOverride } from '@/lib/youtube/live-override';
import { goLiveAction, endLiveAction } from './actions';

export const metadata = {
  title: 'Live · Área admin · LOGOS',
};

// Estado lido em cada visita (sem cache); reflete o interruptor em tempo real.
export const dynamic = 'force-dynamic';

type LiveState = 'offline' | 'connecting' | 'on-air';

function resolveState(isLive: boolean, videoId: string | null): LiveState {
  if (!isLive) return 'offline';
  return videoId ? 'on-air' : 'connecting';
}

const STATE_UI: Record<LiveState, { dot: string; label: string; help: string }> = {
  offline: {
    dot: 'bg-muted-foreground',
    label: 'Fora do ar',
    help: 'A transmissão não está visível. Carrega em "Estamos no ar" assim que iniciares o direto no YouTube.',
  },
  connecting: {
    dot: 'bg-orange-primary animate-pulse',
    label: 'A ligar',
    help: 'Estamos no ar, mas ainda não detetámos o direto no YouTube. Confirma que o direto já começou e carrega em "Procurar direto" para o associar.',
  },
  'on-air': {
    dot: 'bg-green-600',
    label: 'No ar',
    help: 'A transmissão está visível para toda a gente. Carrega em "Terminámos" quando o direto acabar.',
  },
};

export default async function AdminLivePage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    notFound();
  }

  const override = await readLiveOverride();
  const isLive = override?.isLive ?? false;
  const videoId = override?.videoId ?? null;
  const state = resolveState(isLive, videoId);
  const ui = STATE_UI[state];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">Live</h1>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          Interruptor da transmissão em direto. Inicia o direto no YouTube e depois carrega em{' '}
          <strong className="font-medium">Estamos no ar</strong> - o vídeo aparece em{' '}
          <span className="whitespace-nowrap">logos.cclx.pt/live</span> e o botão{' '}
          <strong className="font-medium">Live</strong> fica verde para toda a gente em segundos,
          sem ninguém ter de recarregar a página.
        </p>
      </header>

      <section className="border-border bg-card rounded-2xl border p-6">
        <div className="flex items-center gap-3">
          <span className={`inline-block h-3 w-3 rounded-full ${ui.dot}`} aria-hidden="true" />
          <span className="text-ink text-lg font-medium">{ui.label}</span>
        </div>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">{ui.help}</p>

        {state === 'on-air' && videoId ? (
          <p className="text-muted-foreground mt-3 text-xs">
            Vídeo: <code className="text-ink">{videoId}</code>
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {state === 'offline' ? (
            <form
              action={async () => {
                'use server';
                const result = await goLiveAction();
                redirect(
                  result.ok ? '/admin/live?guardado=live_ligada' : '/admin/live?erro=generico',
                );
              }}
            >
              <SubmitButton pendingLabel="A ligar…">Estamos no ar</SubmitButton>
            </form>
          ) : (
            <>
              {state === 'connecting' ? (
                <form
                  action={async () => {
                    'use server';
                    const result = await goLiveAction();
                    redirect(
                      result.ok ? '/admin/live?guardado=live_ligada' : '/admin/live?erro=generico',
                    );
                  }}
                >
                  <SubmitButton pendingLabel="A procurar…">Procurar direto</SubmitButton>
                </form>
              ) : null}
              <form
                action={async () => {
                  'use server';
                  const result = await endLiveAction();
                  redirect(
                    result.ok ? '/admin/live?guardado=live_terminada' : '/admin/live?erro=generico',
                  );
                }}
              >
                <SubmitButton
                  pendingLabel="A terminar…"
                  className="border-border text-ink hover:bg-muted/40 border bg-transparent"
                >
                  Terminámos
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
