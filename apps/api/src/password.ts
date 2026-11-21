import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { ScryptOptions } from 'node:crypto';

// OWASP Password Storage Cheat Sheet minimum for scrypt: N=2^17, r=8, p=1.
const defaults = { N: 2 ** 17, r: 8, p: 1 };
const keyLength = 32;

function derive(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password.normalize('NFKC'),
      salt,
      keyLength,
      { ...options, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}

export async function hashPassword(
  password: string,
  options = defaults,
): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, options);
  return [
    'scrypt',
    options.N,
    options.r,
    options.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, N, r, p, salt, key] = stored.split('$');
  if (algorithm !== 'scrypt' || !N || !r || !p || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Used for unknown accounts so that response time does not reveal them. */
export const dummyHash = await hashPassword(randomBytes(16).toString('hex'));
