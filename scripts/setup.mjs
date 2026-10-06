import { copyFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
if (!existsSync(new URL('.env', root))) {
  copyFileSync(new URL('.env.example', root), new URL('.env', root));
  console.log('Local .env created from .env.example.');
}
