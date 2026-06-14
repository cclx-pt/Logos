import Link from 'next/link';

import { cn } from '@/lib/utils';

type ConversasLinkProps = {
  /** Destino do link. Default `/perguntas`; deslogado passa-se `/entrar?next=/perguntas`. */
  href?: string;
  /** Há pelo menos uma conversa: mostra o ponto neutro de estado. */
  hasConversations?: boolean;
  /** Resposta nova por ler: ponto laranja de alerta (sobrepõe o neutro). */
  hasUnread?: boolean;
  className?: string;
  onNavigate?: () => void;
};

/**
 * Link de cabeçalho "As minhas conversas" - vista do aluno das perguntas às
 * aulas. Aparece para toda a gente: deslogado, aponta para o login (que volta
 * aqui). O ponto ao lado tem dois estados, sem percentagens nem gamificação:
 *  - laranja (alerta): a equipa respondeu e o aluno ainda não abriu (answered +
 *    updated_at > owner_seen_at). Apaga quando o aluno abre a conversa.
 *  - neutro (cinza): há conversas mas nada novo por ler ("tudo respondido").
 *  - sem ponto: ainda não há conversas (ou utilizador deslogado).
 */
export function ConversasLink({
  href = '/perguntas',
  hasConversations = false,
  hasUnread = false,
  className,
  onNavigate,
}: ConversasLinkProps) {
  return (
    <Link
      href={href}
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
      ) : hasConversations ? (
        <>
          <span
            className="bg-muted-foreground/40 inline-block h-2 w-2 shrink-0 rounded-full"
            aria-hidden="true"
          />
          <span className="sr-only">(sem respostas novas)</span>
        </>
      ) : null}
    </Link>
  );
}
