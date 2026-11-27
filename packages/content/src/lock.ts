/**
 * `pnpm content:lock` encrypts the private answer keys before a commit;
 * `pnpm content:unlock` writes the plaintext copies that Git ignores. Both need
 * KOMPRI_CONTENT_KEY (32 random bytes in base64url, see private.ts).
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import {
  decryptPrivate,
  encryptPrivate,
  generateContentKey,
} from './private.ts';

const repository = new URL('../../../', import.meta.url);
/** Plaintext answers file, and the reference orals kept out of the repo. */
const answers = {
  plain: new URL('packages/content/private/answers.yaml', repository),
  sealed: new URL('packages/content/data/answers.enc', repository),
};
const references = {
  plain: new URL('packages/evals/private/', repository),
  sealed: new URL('packages/evals/references.enc', repository),
};

const command = process.argv[2];
if (command === 'key') {
  console.log(generateContentKey());
  process.exit(0);
}
const key = process.env.KOMPRI_CONTENT_KEY;
if (!key) throw new Error('KOMPRI_CONTENT_KEY is required');

if (command === 'lock') {
  await writeFile(
    answers.sealed,
    encryptPrivate(await readFile(answers.plain, 'utf8'), key),
  );
  const files: Record<string, string> = {};
  for (const name of (await readdir(references.plain)).sort())
    if (name.endsWith('.yaml') || name.endsWith('.md'))
      files[name] = await readFile(new URL(name, references.plain), 'utf8');
  await writeFile(
    references.sealed,
    encryptPrivate(JSON.stringify(files), key),
  );
  console.log(
    `Locked answers and ${Object.keys(files).length} reference orals.`,
  );
} else if (command === 'unlock') {
  await mkdir(new URL('./', answers.plain), { recursive: true });
  await writeFile(
    answers.plain,
    decryptPrivate(await readFile(answers.sealed, 'utf8'), key),
  );
  const files = JSON.parse(
    decryptPrivate(await readFile(references.sealed, 'utf8'), key),
  ) as Record<string, string>;
  await mkdir(references.plain, { recursive: true });
  for (const [name, text] of Object.entries(files))
    await writeFile(new URL(name, references.plain), text);
  console.log(
    `Unlocked answers and ${Object.keys(files).length} reference orals.`,
  );
} else throw new Error('Usage: lock | unlock | key');
