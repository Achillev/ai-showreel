// Purge des chiffres inférés de la réplication (règle 2026-07-11 : que du factuel).
// Supprime replication.budget_estime / time_to_value / effort / score, et playbook[].phase.
// node site/purge-chiffres-inferes.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CASES = join(dirname(fileURLToPath(import.meta.url)), '..', 'cases');
let touched = 0;
for (const f of readdirSync(CASES).filter(x => x.endsWith('.json'))) {
  const p = join(CASES, f);
  const c = JSON.parse(readFileSync(p, 'utf8'));
  let dirty = false;
  const r = c.replication;
  if (r) {
    for (const k of ['budget_estime', 'time_to_value', 'effort', 'score']) {
      if (k in r) { delete r[k]; dirty = true; }
    }
    if (Array.isArray(r.playbook)) {
      for (const step of r.playbook) {
        if ('phase' in step) { delete step.phase; dirty = true; }
      }
    }
  }
  if (dirty) { writeFileSync(p, JSON.stringify(c, null, 2) + '\n'); touched++; }
}
console.log(`${touched} fiches purgées des chiffres inférés (budget/délais/effort/score/phases).`);
