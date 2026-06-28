import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ConversasLink } from './conversas-link';

describe('ConversasLink (V3.6 PR4)', () => {
  it('aponta para /perguntas com o rótulo PT-PT', () => {
    render(<ConversasLink />);
    const link = screen.getByRole('link', { name: /conversas/i });
    expect(link).toHaveAttribute('href', '/perguntas');
  });

  it('aceita href personalizado (deslogado vai para o login)', () => {
    render(<ConversasLink href="/entrar?next=/perguntas" />);
    const link = screen.getByRole('link', { name: /conversas/i });
    expect(link).toHaveAttribute('href', '/entrar?next=/perguntas');
  });

  it('sem conversas: não mostra qualquer ponto a leitores de ecrã', () => {
    render(<ConversasLink />);
    expect(screen.queryByText('(a equipa respondeu)')).not.toBeInTheDocument();
    expect(screen.queryByText('(sem respostas novas)')).not.toBeInTheDocument();
  });

  it('com conversas mas tudo lido: mostra o estado neutro', () => {
    render(<ConversasLink hasConversations />);
    expect(screen.getByText('(sem respostas novas)')).toBeInTheDocument();
    expect(screen.queryByText('(a equipa respondeu)')).not.toBeInTheDocument();
  });

  it('com resposta nova: anuncia o alerta (sobrepõe o neutro)', () => {
    render(<ConversasLink hasConversations hasUnread />);
    expect(screen.getByText('(a equipa respondeu)')).toBeInTheDocument();
    expect(screen.queryByText('(sem respostas novas)')).not.toBeInTheDocument();
  });
});
