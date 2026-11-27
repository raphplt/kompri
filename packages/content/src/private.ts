import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

/**
 * Answer keys (examiner notes, detailed levels of defect-finding rubrics,
 * realistic reference orals) are kept out of the public repository: they are
 * committed only encrypted (AES-256-GCM) and decrypted with
 * KOMPRI_CONTENT_KEY, a random 32-byte key in base64url. Authors work on a
 * plaintext copy that Git ignores (`pnpm content:unlock` / `content:lock`).
 */
const envelopeSchema = z.object({
  version: z.literal(1),
  iv: z.string(),
  tag: z.string(),
  data: z.string(),
});

function keyFrom(encoded: string) {
  const key = Buffer.from(encoded.trim(), 'base64url');
  if (key.length !== 32)
    throw new Error('KOMPRI_CONTENT_KEY must be 32 bytes in base64url');
  return key;
}

export function generateContentKey() {
  return randomBytes(32).toString('base64url');
}

export function encryptPrivate(plaintext: string, encodedKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(encodedKey), iv);
  const data = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return `${JSON.stringify(
    {
      version: 1,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: data.toString('base64'),
    },
    null,
    2,
  )}\n`;
}

export function decryptPrivate(envelope: string, encodedKey: string): string {
  const parsed = envelopeSchema.parse(JSON.parse(envelope));
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFrom(encodedKey),
    Buffer.from(parsed.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

async function readIfPresent(url: URL): Promise<string | null> {
  try {
    return await readFile(url, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * The private text: the plaintext copy when an author unlocked it, otherwise
 * the encrypted file decrypted with the key, otherwise null (public mode).
 */
export async function readPrivate(
  plaintext: URL,
  encrypted: URL,
  key: string | undefined = process.env.KOMPRI_CONTENT_KEY,
): Promise<string | null> {
  const clear = await readIfPresent(plaintext);
  if (clear !== null) return clear;
  const envelope = key ? await readIfPresent(encrypted) : null;
  return envelope === null ? null : decryptPrivate(envelope, key!);
}
