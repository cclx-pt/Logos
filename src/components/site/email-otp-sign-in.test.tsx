import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend, mockVerify } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockVerify: vi.fn(),
}));

vi.mock('@/lib/auth/actions', () => ({
  sendEmailOtpAction: mockSend,
  verifyEmailOtpAction: mockVerify,
}));

import { EmailOtpSignIn } from './email-otp-sign-in';

describe('EmailOtpSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('começa no passo do email', () => {
    render(<EmailOtpSignIn />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar código/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument();
  });

  it('mostra a mensagem de erro quando o envio falha', async () => {
    // Email de formato válido (a validação HTML5 do input deixa submeter); a
    // action está mockada e devolve o erro que queremos ver renderizado.
    mockSend.mockResolvedValue({
      status: 'error',
      message: 'Não foi possível enviar o código. Confirma o email e tenta novamente.',
    });
    render(<EmailOtpSignIn />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.pt' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível/i);
    });
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument();
  });

  it('avança para o passo do código quando o envio devolve "sent"', async () => {
    mockSend.mockResolvedValue({ status: 'sent', email: 'joao@exemplo.pt' });
    render(<EmailOtpSignIn next="/conteudos/abc" />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'joao@exemplo.pt' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Código')).toBeInTheDocument();
    });
    expect(screen.getByText('joao@exemplo.pt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
    // O `next` viaja como hidden input no form de verificação.
    const hidden = document.querySelector('input[name="next"]');
    expect(hidden).toHaveAttribute('value', '/conteudos/abc');
  });
});
