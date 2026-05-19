import { describe, it, expect } from 'vitest';

import { extractYoutubeId } from './youtube';

describe('extractYoutubeId', () => {
  it('extrai id de URL formato youtu.be/<id>', () => {
    expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extrai id de URL formato youtube.com/watch?v=<id>', () => {
    expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('aceita também youtube.com sem www', () => {
    expect(extractYoutubeId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('ignora query params extra mantendo o v=', () => {
    expect(
      extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s'),
    ).toBe('dQw4w9WgXcQ');
  });

  it('devolve null para id com formato inválido (curto demais)', () => {
    expect(extractYoutubeId('https://youtu.be/abc')).toBeNull();
  });

  it('devolve null para id com caracteres não permitidos', () => {
    expect(extractYoutubeId('https://youtu.be/has spaces!')).toBeNull();
  });

  it('devolve null para hostnames estranhos', () => {
    expect(extractYoutubeId('https://vimeo.com/dQw4w9WgXcQ')).toBeNull();
  });

  it('devolve null para strings que não são URLs', () => {
    expect(extractYoutubeId('not a url')).toBeNull();
  });

  it('devolve null para null/undefined/empty', () => {
    expect(extractYoutubeId(null)).toBeNull();
    expect(extractYoutubeId(undefined)).toBeNull();
    expect(extractYoutubeId('')).toBeNull();
  });
});
