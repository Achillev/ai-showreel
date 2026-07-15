// Liste les fiches de cases/ qui n'ont pas encore de traduction EN (translations/en/<id>.json).
// Usage: node site/translate-check.mjs        -> imprime les ids manquants, un par ligne
//        node site/translate-check.mjs --count -> imprime juste le nombre
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASES = join(ROOT, 'cases');
const EN = join(ROOT, 'translations', 'en');

const ids = readdirSync(CASES).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
const missing = ids.filter(id => !existsSync(join(EN, `${id}.json`)));

if (process.argv.includes('--count')) {
  console.log(missing.length);
} else {
  for (const id of missing) console.log(id);
  if (!missing.length) process.stderr.write(`OK : les ${ids.length} fiches ont leur traduction EN.\n`);
  else process.stderr.write(`${missing.length}/${ids.length} fiches sans traduction EN.\n`);
}
