import Link from 'next/link';

import { cn } from '@/lib/utils';

type ConversasLinkProps = {
  /** Ponto de aviso quando há resposta da equipa que o aluno ainda não leu. */
  hasUnread?: boolean;
  className?: string;
  onNavigate?: () => void;
};

/**
 * Link de cabeçalho "As minhas conversas" - vista do aluno das perguntas às
 * aulas. Só montado para utilizadores com sessão. O ponto laranja aparece
 * quando há uma conversa respondida que o aluno ainda não abriu (answered +
 * updated_at > owner_seen_at): sinal leve de "tens resposta por ler", sem
 * percentagens nem gamificação. Apaga quando o aluno abre a conversa.
 */
export function ConversasLink({ hasUnread = false, className, onNavigate }: ConversasLinkProps) {
  return (
    <Link
      href="/perguntas"
      onClick={onNavigate}
      className={cn(
        'text-ink hover:text-orange-hover focus-visible:ring-ring relative inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
    >
      As minhas conversas
      {hasUnread ? (
        <>
          <span
            className="bg-orange-primary inline-block h-2 w-2 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <span className="sr-only">(a equipa respondeu)</span>
        </>
      ) : null}
    </Link>
  );
}
