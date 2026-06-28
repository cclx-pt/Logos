/**
 * Janelas de transmissão em direto (timezone Europe/Lisbon).
 *
 * Em Vercel não existe processo de longa duração: a proteção de quota da
 * YouTube Data API depende de (1) só chamar a API dentro de janelas configuradas
 * e (2) cachar a resposta (Next.js Data Cache). Este módulo trata do ponto (1):
 * funções puras que decidem se um dado instante cai dentro das janelas.
 *
 * Formato do spec `YOUTUBE_LIVE_WINDOWS`:
 *   "TUE 20:00-22:00; SUN 10:00-12:30"
 * Dias separados por `;`, cada um `DOW HH:MM-HH:MM`. Dias: SUN MON TUE WED THU FRI SAT.
 */

/** Códigos de dia da semana, índice 0 = domingo (alinhado com Date.getDay). */
const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

const TIME_ZONE = 'Europe/Lisbon';

export type LiveWindow = {
  /** Índice do dia (0 = domingo … 6 = sábado). */
  day: number;
  /** Início em minutos desde a meia-noite (inclusive). */
  start: number;
  /** Fim em minutos desde a meia-noite (exclusive). */
  end: number;
};

function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Converte a string de configuração numa lista de janelas. Entradas inválidas
 * são ignoradas silenciosamente (fail-safe: uma janela malformada não abre acesso).
 */
export function parseLiveWindows(spec: string | undefined | null): LiveWindow[] {
  if (!spec) return [];
  const windows: LiveWindow[] = [];

  for (const chunk of spec.split(';')) {
    const trimmed = chunk.trim();
    if (trimmed.length === 0) continue;

    const match = /^([A-Za-z]{3})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(trimmed);
    if (!match) continue;

    const day = DAY_CODES.indexOf(match[1].toUpperCase() as (typeof DAY_CODES)[number]);
    if (day === -1) continue;

    const start = parseTime(match[2]);
    const end = parseTime(match[3]);
    if (start === null || end === null || end <= start) continue;

    windows.push({ day, start, end });
  }

  return windows;
}

/** Dia da semana (0-6) e minutos desde a meia-noite, no fuso Europe/Lisbon. */
function toLisbonDayMinutes(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  let hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  // Intl pode devolver "24" à meia-noite consoante o ambiente; normaliza para 0.
  if (hour === 24) hour = 0;

  const day = DAY_CODES.indexOf(weekday.slice(0, 3).toUpperCase() as (typeof DAY_CODES)[number]);
  return { day, minutes: hour * 60 + minute };
}

/**
 * Devolve `true` se `now` (em Europe/Lisbon) cair dentro de alguma janela.
 *
 * Sem janelas configuradas devolve `false` (fail-safe): polling contínuo
 * esgotaria a quota da YouTube API. Em desenvolvimento, configura uma janela
 * larga em `YOUTUBE_LIVE_WINDOWS`.
 */
export function isWithinLiveWindow(now: Date, spec: string | undefined | null): boolean {
  const windows = parseLiveWindows(spec);
  if (windows.length === 0) return false;

  const { day, minutes } = toLisbonDayMinutes(now);
  return windows.some((w) => w.day === day && minutes >= w.start && minutes < w.end);
}
