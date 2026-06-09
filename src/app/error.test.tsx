import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorPage from './error';

describe('ErrorPage (error boundary global)', () => {
  it('apresenta heading de erro em PT-PT', () => {
    render(<ErrorPage error={new Error('boom')} reset={() => {}} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/algo correu mal/i);
  });

  it('"Tentar novamente" chama reset', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('oferece CTA para a Home', () => {
    render(<ErrorPage error={new Error('boom')} reset={() => {}} />);
    expect(screen.getByRole('link', { name: /voltar ao início/i })).toHaveAttribute('href', '/');
  });
});
