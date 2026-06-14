import { formatDateTime } from '@/lib/format';

/**
 * Bolha de uma mensagem de conversa (pergunta às aulas). Partilhada pela vista
 * de admin (`/admin/perguntas/[id]`) e pela vista do aluno (`/perguntas/[code]`).
 *
 * `align` é relativo a quem lê: `end` (direita) são as mensagens de quem está a
 * ver a conversa (o admin na inbox; o aluno na sua vista), `start` (esquerda) as
 * do outro lado. Presentacional puro - sem estado, sem interatividade.
 */
export function ConversationBubble({
  align,
  name,
  at,
  body,
  label,
}: {
  align: 'start' | 'end';
  name: string;
  at: string;
  body: string;
  label?: string;
}) {
  const isEnd = align === 'end';
  return (
    <article className={isEnd ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={`max-w-[85%] rounded-2xl border p-4 ${
          isEnd ? 'border-orange-primary/30 bg-orange-primary/5' : 'border-border bg-card'
        }`}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-ink text-sm font-medium">{name}</span>
          {label ? (
            <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">
              {label}
            </span>
          ) : null}
          <span className="text-muted-foreground text-xs">{formatDateTime(at)}</span>
        </div>
        <p className="text-ink text-sm leading-relaxed break-words whitespace-pre-wrap">{body}</p>
      </div>
    </article>
  );
}
