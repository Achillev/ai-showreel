// QA gate anti-slop (règles strictes REDACTION.md §0, héritées du skill site-redesign).
// Scanne le texte visible des fiches (cases/*.json) et signale tout caractère interdit.
// CLI : node site/qa-gate.mjs        -> rapport, exit 1 si violation
//       node site/qa-gate.mjs --fix  -> corrige les substitutions sûres
// Module : import { runGate, normalizeHtmlText } from './qa-gate.mjs' (build.mjs échoue si violation)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(__dir, '..', 'cases');

// Champs non concernés (identifiants, URLs, code)
const SKIP_KEYS = new Set(['id', 'url', 'archive_url', 'linkedin_url', 'slug', 'url_capture', 'ref', 'source_ref']);

// Substitutions sûres (--fix). Tout en échappements unicode pour éviter les caractères invisibles.
const SUBS = [
  [/[—–]/g, '-'],      // em dash, en dash
  [/…/g, '...'],            // ellipse unicode
  [/[‘’]/g, "'"],      // apostrophes courbes
  [/[“”]/g, '"'],      // guillemets courbes
  [/[→➜➤]/g, '->'], // flèches
  [/ /g, ' '],              // espace insécable
  [/ {2,}/g, ' '],               // doubles espaces
];
// NB : les guillemets français « » (u00AB u00BB) restent autorisés.

const BANNED = /[—–…‘’“”→➜➤•◦▪▶✓✗★ ]|✅|❌|⚠| {2}/;

function walk(obj, path, apply) {
  if (typeof obj === 'string') return apply(obj, path);
  if (Array.isArray(obj)) return obj.map((v, i) => walk(v, `${path}[${i}]`, apply));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = SKIP_KEYS.has(k) ? v : walk(v, `${path}.${k}`, apply);
    }
    return out;
  }
  return obj;
}

export function runGate({ fix = false, log = console.log } = {}) {
  let violations = 0, fixed = 0;
  for (const f of readdirSync(CASES_DIR).filter(x => x.endsWith('.json'))) {
    const p = join(CASES_DIR, f);
    let data = JSON.parse(readFileSync(p, 'utf8'));
    if (fix) {
      data = walk(data, f, (s) => {
        let out = s;
        for (const [re, rep] of SUBS) out = out.replace(re, rep);
        if (out !== s) fixed++;
        return out;
      });
      writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
    }
    walk(data, f, (s, path) => {
      const m = s.match(BANNED);
      if (m) {
        violations++;
        log(`[QA] ${path} : caractère interdit (U+${m[0].codePointAt(0).toString(16).toUpperCase()}) -> "${s.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\n/g, ' ')}"`);
      }
      return s;
    });
  }
  return { violations, fixed };
}

// Normalisation du texte visible des gabarits HTML (appliquée par build.mjs au rendu final).
export function normalizeHtmlText(html) {
  return html
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/ /g, ' ');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const fix = process.argv.includes('--fix');
  const { violations, fixed } = runGate({ fix });
  if (fix) console.log(`fix : ${fixed} champs corrigés`);
  if (violations) { console.log(`ÉCHEC QA GATE : ${violations} violation(s)`); process.exit(1); }
  console.log('QA gate OK : aucun caractère interdit dans le texte des fiches.');
}
