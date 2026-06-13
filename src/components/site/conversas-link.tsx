import Link from 'next/link';

import { cn } from '@/lib/utils';

type ConversasLinkProps = {
  /** Mostra um ponto de aviso quando a equipa já respondeu a alguma conversa. */
  hasUnread?: boolean;
  className?: string;
  onNavigate?: () => void;
};

/**
 * Link de cabeçalho "As minhas conversas" - vista do aluno das perguntas às
 * aulas. Só montado para utilizadores com sessão. O ponto laranja aparece
 * quando há pelo menos uma conversa em estado 'answered' (a equipa respondeu e
 * o aluno ainda não deu seguimento): sinal leve de "tens resposta", sem
 * percentagens nem gamificação.
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
