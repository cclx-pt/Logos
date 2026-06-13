import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ConversasLink } from './conversas-link';

describe('ConversasLink (V3.6 PR4)', () => {
  it('aponta para /perguntas com o rótulo PT-PT', () => {
    render(<ConversasLink />);
    const link = screen.getByRole('link', { name: /as minhas conversas/i });
    expect(link).toHaveAttribute('href', '/perguntas');
  });

  it('sem respostas: não anuncia o aviso a leitores de ecrã', () => {
    render(<ConversasLink hasUnread={false} />);
    expect(screen.queryByText('(a equipa respondeu)')).not.toBeInTheDocument();
  });

  it('com respostas: anuncia o aviso a leitores de ecrã', () => {
    render(<ConversasLink hasUnread />);
    expect(screen.getByText('(a equipa respondeu)')).toBeInTheDocument();
  });
});
