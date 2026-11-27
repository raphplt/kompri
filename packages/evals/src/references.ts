import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { decryptPrivate } from '@kompri/content';
import { referenceSchema } from './index.ts';
import type { ReferenceOral } from './index.ts';

const publicDirectory = new URL('../references/', import.meta.url);
const privateDirectory = new URL('../private/', import.meta.url);
const sealed = new URL('../references.enc', import.meta.url);

async function yamlFiles(directory: URL): Promise<Record<string, string>> {
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
  const files: Record<string, string> = {};
  for (const name of names.sort())
    if (name.endsWith('.yaml'))
      files[name] = await readFile(new URL(name, directory), 'utf8');
  return files;
}

/**
 * Public references (plumbing checks that CI runs with the mock) and, when
 * available, the private ones: realistic orals that describe the defects of
 * their challenge, kept encrypted like the examiner notes.
 */
export async function loadReferences(
  key: string | undefined = process.env.KOMPRI_CONTENT_KEY,
): Promise<{ references: ReferenceOral[]; privateCount: number }> {
  let privateFiles = await yamlFiles(privateDirectory);
  if (!Object.keys(privateFiles).length && key)
    privateFiles = JSON.parse(
      decryptPrivate(await readFile(sealed, 'utf8'), key),
    ) as Record<string, string>;
  const files = { ...(await yamlFiles(publicDirectory)), ...privateFiles };
  return {
    references: Object.keys(files)
      .filter((name) => name.endsWith('.yaml'))
      .sort()
      .map((name) => referenceSchema.parse(parse(files[name]!))),
    privateCount: Object.keys(privateFiles).filter((n) => n.endsWith('.yaml'))
      .length,
  };
}
