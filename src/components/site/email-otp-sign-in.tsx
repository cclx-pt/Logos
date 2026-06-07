'use client';

import { useActionState, useCallback, useState } from 'react';

import {
  sendEmailOtpAction,
  verifyEmailOtpAction,
  type SendEmailOtpState,
  type VerifyEmailOtpState,
} from '@/lib/auth/actions';
import { TurnstileWidget } from './turnstile-widget';

const INPUT =
  'border-border bg-background text-ink focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none';
const PRIMARY_BTN =
  'bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-11 w-full items-center justify-center rounded-md px-5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60';
const LINK_BTN =
  'text-orange-primary hover:text-orange-hover text-xs font-medium underline-offset-2 hover:underline disabled:opacity-60';

const SEND_INITIAL: SendEmailOtpState = { status: 'idle' };
const VERIFY_INITIAL: VerifyEmailOtpState = { status: 'idle' };

/**
 * Login por email + código (OTP) em dois passos:
 *   1. email → "Enviar código" (com Turnstile, se configurado).
 *   2. código de 6 dígitos → "Entrar".
 *
 * Cada passo é uma Server Action via `useActionState`. O passo avança quando o
 * envio devolve `status: 'sent'`. O sucesso da verificação faz `redirect`
 * server-side (não volta como estado). Ver `feature-docs/email-otp-login.md`.
 */
export function EmailOtpSignIn({ next }: { next?: string }) {
  const [sendState, sendAction, sendPending] = useActionState(sendEmailOtpAction, SEND_INITIAL);
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyEmailOtpAction,
    VERIFY_INITIAL,
  );

  const [captchaToken, setCaptchaToken] = useState('');
  // "Usar outro email" volta ao passo do email mesmo com um envio bem-sucedido
  // em estado. Derivamos o passo no render (sem efeito) para satisfazer
  // react-hooks/set-state-in-effect; clicar "Enviar"/"Reenviar" repõe `false`.
  const [forceEmailStep, setForceEmailStep] = useState(false);

  const onCaptcha = useCallback((token: string) => setCaptchaToken(token), []);

  const sentEmail = sendState.status === 'sent' ? sendState.email : null;
  const showCodeStep = sentEmail !== null && !forceEmailStep;

  if (showCodeStep) {
    const email = sentEmail;
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Enviámos um código de 6 dígitos para <strong className="text-ink">{email}</strong>.
          Escreve-o aqui para entrar.
        </p>

        <form action={verifyAction} className="space-y-3">
          <input type="hidden" name="email" value={email} />
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label className="block">
            <span className="text-muted-foreground text-xs font-medium">Código</span>
            <input
              type="text"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              aria-describedby={verifyState.status === 'error' ? 'otp-verify-error' : undefined}
              className={`${INPUT} text-center font-mono text-lg tracking-[0.5em]`}
            />
          </label>

          {verifyState.status === 'error' ? (
            <p id="otp-verify-error" role="alert" className="text-destructive text-xs">
              {verifyState.message}
            </p>
          ) : null}

          <button type="submit" disabled={verifyPending} className={PRIMARY_BTN}>
            {verifyPending ? 'A verificar…' : 'Entrar'}
          </button>
        </form>

        <div className="flex items-center justify-between gap-3">
          {/* Reenviar: re-submete o passo 1 com o mesmo email. */}
          <form action={sendAction}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="captchaToken" value={captchaToken} />
            <button type="submit" disabled={sendPending} className={LINK_BTN}>
              {sendPending ? 'A reenviar…' : 'Reenviar código'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setForceEmailStep(true)}
            className={LINK_BTN}
            disabled={verifyPending}
          >
            Usar outro email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={sendAction} className="space-y-3">
      <input type="hidden" name="captchaToken" value={captchaToken} />
      <label className="block">
        <span className="text-muted-foreground text-xs font-medium">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          defaultValue={sentEmail ?? undefined}
          placeholder="tu@exemplo.pt"
          aria-describedby={sendState.status === 'error' ? 'otp-send-error' : undefined}
          className={INPUT}
        />
      </label>

      <TurnstileWidget onVerify={onCaptcha} />

      {sendState.status === 'error' ? (
        <p id="otp-send-error" role="alert" className="text-destructive text-xs">
          {sendState.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sendPending}
        onClick={() => setForceEmailStep(false)}
        className={PRIMARY_BTN}
      >
        {sendPending ? 'A enviar…' : 'Enviar código'}
      </button>
    </form>
  );
}
