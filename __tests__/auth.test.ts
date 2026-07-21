import { hashPassword, verifyPassword } from '@/lib/utils/auth';

describe('password hashing (scrypt + per-user salt)', () => {
  it('hashPassword returns the scrypt$<salt>$<hash> format', () => {
    const hash = hashPassword('my-secret-pw');
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it('same password yields different hashes (per-user salt)', () => {
    const a = hashPassword('my-secret-pw');
    const b = hashPassword('my-secret-pw');
    expect(a).not.toBe(b);
  });

  it('verifyPassword succeeds for the correct password', () => {
    const hash = hashPassword('my-secret-pw');
    expect(verifyPassword('my-secret-pw', hash)).toBe(true);
  });

  it('verifyPassword fails for a wrong password', () => {
    const hash = hashPassword('my-secret-pw');
    expect(verifyPassword('wrong-pw', hash)).toBe(false);
  });

  it('verifyPassword returns false for malformed/legacy hashes without throwing', () => {
    expect(verifyPassword('pw', null)).toBe(false);
    expect(verifyPassword('pw', undefined)).toBe(false);
    expect(verifyPassword('pw', '')).toBe(false);
    expect(verifyPassword('pw', 'deadbeef')).toBe(false);
  });
});
