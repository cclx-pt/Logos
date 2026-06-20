import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { FirstVisitTutorial } from './first-visit-tutorial';

const SEEN_KEY = 'logos.tutorial.seen';

describe('FirstVisitTutorial', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mostra o convite na 1.ª visita (sem flag) com link para /como-funciona', async () => {
    render(<FirstVisitTutorial />);
    const dialog = await screen.findByRole('dialog', { name: /bem-vindo ao logos/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver tutorial/i })).toHaveAttribute(
      'href',
      '/como-funciona',
    );
  });

  it('não mostra quando a flag já está gravada', () => {
    localStorage.setItem(SEEN_KEY, '1');
    render(<FirstVisitTutorial />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Agora não" dispensa e grava a flag', async () => {
    render(<FirstVisitTutorial />);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /agora não/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(SEEN_KEY)).toBe('1');
  });

  it('"Ver tutorial" também grava a flag (não volta a aparecer)', async () => {
    render(<FirstVisitTutorial />);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('link', { name: /ver tutorial/i }));
    expect(localStorage.getItem(SEEN_KEY)).toBe('1');
  });
});
