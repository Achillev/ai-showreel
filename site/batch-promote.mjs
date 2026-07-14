// Valide, normalise (anti-slop), dédoublonne et promeut les fiches du batch vers cases/.
// node site/batch-promote.mjs [--commit] [--auto]
//   sans --commit : dry-run, rapport seulement
//   --auto : mode gate d'auto-publication (pour le cron). Ne publie dans cases/ que le
//            HAUTE CONFIANCE (niveau A ou B, avec >=2 sources garanties par le validateur).
//            Les C/D partent en file de revue humaine batch/_review/ (jamais publiés en auto).
//            Sans --auto, tout ce qui valide est promu (mode manuel, humain a jugé).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const BATCH = join(ROOT, 'batch');
const CASES = join(ROOT, 'cases');
const REJECTED = join(BATCH, '_rejected');
const REVIEW = join(BATCH, '_review');
const COMMIT = process.argv.includes('--commit');
const AUTO = process.argv.includes('--auto');
const AUTO_PUBLISH = new Set(['A', 'B']); // seuil d'auto-publication

const INDUSTRIES = ['retail_ecom', 'voyage_hospitality', 'banque_assurance_fintech', 'telco', 'media_entertainment', 'luxe_beaute', 'auto', 'cpg_d2c', 'food_beverage', 'sante_pharma', 'tech_saas', 'energie_utilities', 'immobilier', 'sport_fitness', 'education', 'secteur_public', 'autre'];
const LEVIERS = ['acquisition', 'activation_conversion', 'retention', 'monetisation'];
const FAMILLES = ['personnalisation', 'generation', 'conversation', 'prediction', 'optimisation_automatisation'];
const NIVEAUX = ['A', 'B', 'C', 'D'];

// Normalisation anti-slop (identique à qa-gate SUBS)
const SUBS = [[/[—–]/g, '-'], [/…/g, '...'], [/[‘’]/g, "'"], [/[“”]/g, '"'], [/[→➜➤]/g, '->'], [/ /g, ' '], [/ {2,}/g, ' ']];
const SKIP_KEYS = new Set(['id', 'url', 'archive_url', 'linkedin_url', 'slug', 'url_capture', 'ref', 'source_ref']);
function normalize(obj, key) {
  if (typeof obj === 'string') return SKIP_KEYS.has(key) ? obj : SUBS.reduce((s, [re, r]) => s.replace(re, r), obj);
  if (Array.isArray(obj)) return obj.map(v => normalize(v, key));
  if (obj && typeof obj === 'object') { const o = {}; for (const [k, v] of Object.entries(obj)) o[k] = normalize(v, k); return o; }
  return obj;
}

function validate(c) {
  const errs = [];
  if (!c.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id)) errs.push('id manquant/invalide');
  if (!c.marque) errs.push('marque manquante');
  if (!INDUSTRIES.includes(c.industrie)) errs.push(`industrie invalide: ${c.industrie}`);
  const a = c.axes || {};
  if (!LEVIERS.includes(a.levier)) errs.push(`levier invalide: ${a.levier}`);
  if (!FAMILLES.includes(a.famille)) errs.push(`famille invalide: ${a.famille}`);
  if (!a.pattern) errs.push('pattern manquant');
  if (!c.description) errs.push('description manquante');
  if (!c.niveau_preuve || !NIVEAUX.includes(c.niveau_preuve.niveau)) errs.push('niveau_preuve invalide');
  if (!c.statut_vivant?.statut) errs.push('statut_vivant manquant');
  if (!Array.isArray(c.sources) || c.sources.length < 2) errs.push('moins de 2 sources');
  else c.sources.forEach((s, i) => { if (!s.url || !/^https?:\/\//.test(s.url)) errs.push(`source[${i}] url invalide`); });
  if (!c.dates?.verifie_le) errs.push('dates.verifie_le manquant');
  if (c.type_fiche === 'echec_retrait') {
    if (!c.post_mortem) errs.push('echec sans post_mortem');
    if (c.intervenants?.length) errs.push('echec avec intervenants (interdit)');
    if (c.marque_linkedin) errs.push('echec avec marque_linkedin (interdit)');
  }
  return errs;
}

const seen = new Map(); // id -> file (dédoublonnage)
const seenBrandPattern = new Map();
// pré-charger les cas existants
for (const f of readdirSync(CASES).filter(x => x.endsWith('.json'))) {
  try { const c = JSON.parse(readFileSync(join(CASES, f), 'utf8')); seen.set(c.id, 'cases/' + f); seenBrandPattern.set((c.marque + '|' + (c.axes?.pattern || '')).toLowerCase(), 'cases/' + f); } catch {}
}

const slices = readdirSync(BATCH).filter(d => d.startsWith('slice'));
let accepted = 0, rejected = 0, dupes = 0;
const report = [];
const toWrite = [];

for (const slice of slices) {
  const dir = join(BATCH, slice);
  const files = readdirSync(dir).filter(x => x.endsWith('.json'));
  for (const f of files) {
    const p = join(dir, f);
    let c;
    try { c = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { rejected++; report.push(`REJET  ${slice}/${f} : JSON invalide (${e.message})`); continue; }
    c = normalize(c);
    const errs = validate(c);
    if (errs.length) { rejected++; report.push(`REJET  ${slice}/${f} : ${errs.join(', ')}`); continue; }
    const bp = (c.marque + '|' + c.axes.pattern).toLowerCase();
    if (seen.has(c.id) || seenBrandPattern.has(bp)) { dupes++; report.push(`DOUBLON ${slice}/${f} : ${c.marque} (${c.id})`); continue; }
    seen.set(c.id, slice + '/' + f); seenBrandPattern.set(bp, slice + '/' + f);
    toWrite.push(c);
    accepted++;
    report.push(`OK     ${slice}/${f} : ${c.marque} [${c.niveau_preuve.niveau}] ${c.type_fiche === 'echec_retrait' ? '(cimetiere)' : ''}`);
  }
}

// En mode --auto, on separe le haute confiance (A/B -> publie) du reste (C/D -> revue).
const toPublish = AUTO ? toWrite.filter(c => AUTO_PUBLISH.has(c.niveau_preuve.niveau)) : toWrite;
const toReview = AUTO ? toWrite.filter(c => !AUTO_PUBLISH.has(c.niveau_preuve.niveau)) : [];

console.log(report.sort().join('\n'));
console.log(`\n=== ${accepted} acceptees, ${dupes} doublons, ${rejected} rejetees ===`);
if (AUTO) console.log(`=== AUTO: ${toPublish.length} a publier (A/B), ${toReview.length} en revue humaine (C/D) ===`);

if (COMMIT) {
  for (const c of toPublish) writeFileSync(join(CASES, c.id + '.json'), JSON.stringify(c, null, 2) + '\n');
  console.log(`\n${toPublish.length} fiches ecrites dans cases/.`);
  if (AUTO && toReview.length) {
    if (!existsSync(REVIEW)) mkdirSync(REVIEW, { recursive: true });
    for (const c of toReview) writeFileSync(join(REVIEW, c.id + '.json'), JSON.stringify(c, null, 2) + '\n');
    console.log(`${toReview.length} fiches C/D -> batch/_review/ (a valider a la main avant publication).`);
  }
  console.log(`Lance: node site/qa-gate.mjs && node site/build.mjs`);
} else {
  console.log('\nDRY-RUN. Relance avec --commit pour ecrire.');
}
