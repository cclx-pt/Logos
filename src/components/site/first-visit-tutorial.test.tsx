import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { FirstVisitTutorial, tutorialSeenKey } from './first-visit-tutorial';

const USER_A = 'user-a';
const USER_B = 'user-b';

describe('FirstVisitTutorial', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mostra o convite na 1.ª visita (sem flag) com link para /como-funciona', async () => {
    render(<FirstVisitTutorial userId={USER_A} />);
    const dialog = await screen.findByRole('dialog', { name: /bem-vindo ao logos/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver tutorial/i })).toHaveAttribute(
      'href',
      '/como-funciona',
    );
  });

  it('não mostra quando a flag desse utilizador já está gravada', () => {
    localStorage.setItem(tutorialSeenKey(USER_A), '1');
    render(<FirstVisitTutorial userId={USER_A} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('aparece a um utilizador diferente mesmo que outro já o tenha dispensado', async () => {
    localStorage.setItem(tutorialSeenKey(USER_A), '1');
    render(<FirstVisitTutorial userId={USER_B} />);
    expect(await screen.findByRole('dialog', { name: /bem-vindo ao logos/i })).toBeInTheDocument();
  });

  it('"Agora não" dispensa e grava a flag do utilizador', async () => {
    render(<FirstVisitTutorial userId={USER_A} />);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /agora não/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(tutorialSeenKey(USER_A))).toBe('1');
  });

  it('"Ver tutorial" também grava a flag (não volta a aparecer)', async () => {
    render(<FirstVisitTutorial userId={USER_A} />);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('link', { name: /ver tutorial/i }));
    expect(localStorage.getItem(tutorialSeenKey(USER_A))).toBe('1');
  });
});
