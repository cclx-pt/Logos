import { describe, it, expect } from 'vitest';
import { getCurrentUser, getServerClient, signInWithGoogle, signOut } from './index';

describe('lib/auth (V2 PR1 skeleton)', () => {
  it('getCurrentUser devolve null por defeito', async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('getServerClient atira erro explícito até V2 PR2', () => {
    expect(() => getServerClient()).toThrow(/V2 PR2/);
  });

  it('signInWithGoogle atira erro explícito até V2 PR2', async () => {
    await expect(signInWithGoogle()).rejects.toThrow(/V2 PR2/);
  });

  it('signOut atira erro explícito até V2 PR2', async () => {
    await expect(signOut()).rejects.toThrow(/V2 PR2/);
  });
});
