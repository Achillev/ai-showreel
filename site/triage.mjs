// Triage — couche 2 du moteur de collecte (docs/MOTEUR-COLLECTE.md, docs/ORCHESTRATEUR.md).
// Prend les candidats bruts des deux modes de decouverte, les normalise dans un
// format unique, dedoublonne contre la base, trie par potentiel de preuve, plafonne
// a K (controle de cout), et ecrit batch/_triage-queue.json.
//
// C'est la partie DETERMINISTE du triage. Le pre-filtre PERIMETRE (marketing vs
// hors-scope) n'est PAS ici : c'est un pass agent bon marche sur la queue produite,
// decrit dans docs/TRIAGE-BRIEF.md. Raison : la mesure du 2026-07-12 a montre que la
// seule perte du Mode B (Telstra) etait une erreur de categorisation amont, pas de
// source ; un jugement perimetre a 3k tokens evite un collecteur a ~90k tokens.
//
// Usage :
//   node site/triage.mjs            # cap 12 par defaut
//   node site/triage.mjs --cap 20   # plafond explicite
//   node site/triage.mjs --mode B   # ne trier qu'un mode (A | B), defaut = les deux

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const CASES = join(ROOT, 'cases');
const BATCH = join(ROOT, 'batch');

const arg = (flag, def) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : def; };
const CAP = parseInt(arg('--cap', '12'), 10);
const ONLY = arg('--mode', null); // 'A' | 'B' | null

// --- normalisation de marque (aligne sur discover.mjs / batch-promote.mjs) ---
const normBrand = (b = '') => b.toLowerCase().replace(/[^a-z0-9]/g, '')
  .replace(/(group|inc|sa|company|companies|the|ltd|llc|corp)$/g, '');

// --- index de la base : marques connues + URLs deja sourcees + couples marque|pattern ---
function knownBase() {
  const brands = new Set(), urls = new Set(), brandPattern = new Set();
  for (const f of readdirSync(CASES).filter(x => x.endsWith('.json'))) {
    let c; try { c = JSON.parse(readFileSync(join(CASES, f), 'utf8')); } catch { continue; }
    if (c.marque) brands.add(normBrand(c.marque));
    const pat = c.axes && c.axes.pattern;
    if (c.marque && pat) brandPattern.add((c.marque + '|' + pat).toLowerCase());
    for (const s of (c.sources || [])) {
      if (s && s.url) urls.add(s.url.replace(/[#?].*$/, '').replace(/\/$/, ''));
    }
  }
  return { brands, urls, brandPattern };
}

// --- chargement des candidats des deux modes, normalises ---
function loadModeA() {
  const p = join(BATCH, '_candidates.json');
  if (!existsSync(p)) return [];
  let arr; try { arr = JSON.parse(readFileSync(p, 'utf8')); } catch { return []; }
  return arr.map(c => ({
    mode: 'A',
    marque: c.brand || '',
    pattern: null,                 // le crawl ne connait pas le pattern : a etablir a la collecte
    industrie: null,
    urls: c.url ? [c.url] : [],
    niveau_estime: null,           // inconnu en Mode A
    justification: `Crawl ${c.vendor || '?'} (${c.status || '?'})`,
    _score_brut: c.score || 0,
  }));
}
function loadModeB() {
  const dir = join(BATCH, 'modeB');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
    let arr; try { arr = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { continue; }
    for (const c of arr) out.push({
      mode: 'B',
      marque: c.marque || '',
      pattern: c.pattern || null,
      industrie: c.industrie_probable || null,
      urls: c.source_urls || [],
      niveau_estime: c.niveau_preuve_estime || null,
      justification: c.justification || '',
      _score_brut: 0,
    });
  }
  return out;
}

// poids du potentiel de preuve : A>B>C>D, inconnu (Mode A) = median
const PROOF_W = { A: 4, B: 3, C: 2, D: 1 };

function classifyDedup(c, base) {
  const nb = normBrand(c.marque);
  const bp = c.pattern ? (c.marque + '|' + c.pattern).toLowerCase() : null;
  if (bp && base.brandPattern.has(bp)) return 'doublon-probable';
  if (c.urls.some(u => base.urls.has(u.replace(/[#?].*$/, '').replace(/\/$/, '')))) return 'doublon-probable';
  if (nb && base.brands.has(nb)) return 'marque-connue'; // meme marque, pattern peut-etre distinct
  return 'nouveau';
}

const shape = (c, i) => ({
  ordre: i + 1,
  mode: c.mode,
  marque: c.marque,
  pattern: c.pattern,
  industrie: c.industrie,
  niveau_estime: c.niveau_estime,
  dedup: c.dedup,
  urls: c.urls,
  justification: c.justification,
  perimetre: 'A_VERIFIER',   // le pass agent (docs/TRIAGE-BRIEF.md) remplace par 'marketing' ou 'hors_scope'
});

function main() {
  const base = knownBase();
  let cands = [...(ONLY === 'B' ? [] : loadModeA()), ...(ONLY === 'A' ? [] : loadModeB())];
  const charges = cands.length;

  // ecarte le bruit a marque vide/trop courte (slugs de crawl non exploitables)
  cands = cands.filter(c => normBrand(c.marque).length >= 2);
  const bruit = charges - cands.length;

  // dedup interne 1 : couple marque|pattern exact
  const seen = new Set();
  cands = cands.filter(c => {
    const k = (normBrand(c.marque) + '|' + (c.pattern || c.urls[0] || '')).toLowerCase();
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  // dedup interne 2 : meme marque presente plusieurs fois -> on garde le meilleur niveau
  // estime (evite 2 collecteurs sur le meme cas, ex. Ralph Lauren earnings + presse).
  const parMarque = new Map();
  const collisions = [];
  for (const c of cands) {
    const nb = normBrand(c.marque);
    const prev = parMarque.get(nb);
    if (!prev) { parMarque.set(nb, c); continue; }
    const w = x => (x.niveau_estime && PROOF_W[x.niveau_estime]) ?? 1.5;
    collisions.push(c.marque);
    if (w(c) > w(prev)) parMarque.set(nb, c);
  }
  cands = [...parMarque.values()];

  for (const c of cands) c.dedup = classifyDedup(c, base);

  // trois voies : doublon (jete), marque-connue (revue de distinction bon marche),
  // nouveau (fan-out collecteur apres pre-filtre perimetre).
  const byProof = (a, b) => ((b.niveau_estime && PROOF_W[b.niveau_estime]) ?? 1.5) + (b._score_brut || 0) / 100
                          - (((a.niveau_estime && PROOF_W[a.niveau_estime]) ?? 1.5) + (a._score_brut || 0) / 100);
  const doublons = cands.filter(c => c.dedup === 'doublon-probable');
  const revue = cands.filter(c => c.dedup === 'marque-connue').sort(byProof);
  const nouveaux = cands.filter(c => c.dedup === 'nouveau').sort(byProof);

  const queue = nouveaux.slice(0, CAP).map(shape);
  const out = {
    genere_le: null,                 // horodate par l'orchestrateur (pas de Date.now() ici)
    cap: CAP,
    stats: { charges, apres_dedup_interne: cands.length, doublons_base: doublons.length,
             marque_connue: revue.length, nouveaux: nouveaux.length, en_file: queue.length },
    queue,                           // -> pre-filtre perimetre puis fan-out
    revue_distinction: revue.map(shape), // -> check "pattern deja couvert ?" avant tout collecteur
  };
  writeFileSync(join(BATCH, '_triage-queue.json'), JSON.stringify(out, null, 2) + '\n');

  console.log(`Candidats charges   : ${charges} (Mode A + Mode B).`);
  if (bruit) console.log(`Bruit marque-vide ecarte : ${bruit}.`);
  if (collisions.length) console.log(`Collisions de marque ecrasees : ${collisions.length} (${[...new Set(collisions)].join(', ')}).`);
  console.log(`Doublons base ecartes: ${doublons.length}.`);
  console.log(`Revue de distinction : ${revue.length} (marque deja en base, pattern a verifier).`);
  console.log(`Nouveaux -> file     : ${nouveaux.length}, plafonnee a ${CAP} -> ${queue.length}.`);
  const parNiveau = queue.reduce((m, c) => (m[c.niveau_estime || 'inconnu'] = (m[c.niveau_estime || 'inconnu'] || 0) + 1, m), {});
  console.log(`Repartition file     : ${Object.entries(parNiveau).map(([k, v]) => `${k}:${v}`).join(' ') || '(vide)'}`);
  console.log(`\n-> batch/_triage-queue.json`);
  console.log(`Etape suivante : pre-filtre PERIMETRE (1 agent bon marche sur queue, docs/TRIAGE-BRIEF.md),`);
  console.log(`puis fan-out collecteurs sur les 'marketing' uniquement (docs/COLLECTOR-BRIEF.md).`);
}
main();
