// AI Showreel — moteur d'angles morts : transforme la matrice de couverture en plan de collecte.
// La carte des trous EST le produit qu'on vend ; elle doit donc piloter ce qu'on va chercher.
//
//   node site/gaps.mjs            rapport lisible (humain)
//   node site/gaps.mjs --json     ecrit batch/_gaps.json (machine, pour le fan-out)
//   node site/gaps.mjs --brief    brief pret a coller dans un agent de decouverte
//   node site/gaps.mjs --top 6    limite le nombre de croisements cibles (defaut 8)
//
// Aucune dependance externe. Ne modifie aucune fiche.

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const CASES_DIR = join(ROOT, 'cases');

// Les 4 leviers growth : taxonomie fixe du produit (miroir de _LEVIERS dans build.mjs).
const LEVIERS = ['acquisition', 'activation_conversion', 'retention', 'monetisation'];

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const TOP = (() => { const i = args.indexOf('--top'); return i >= 0 ? parseInt(args[i + 1], 10) || 8 : 8; })();

const cases = readdirSync(CASES_DIR).filter(f => f.endsWith('.json'))
  .map(f => { try { return JSON.parse(readFileSync(join(CASES_DIR, f), 'utf8')); } catch { return null; } })
  .filter(Boolean);
const succ = cases.filter(c => c.type_fiche !== 'echec_retrait');

const industries = [...new Set(succ.map(c => c.industrie).filter(Boolean))].sort();
const countAt = (i, l) => succ.filter(c => c.industrie === i && c.axes?.levier === l).length;

const grid = [];
for (const i of industries) for (const l of LEVIERS) grid.push({ industrie: i, levier: l, n: countAt(i, l) });

const vides = grid.filter(c => c.n === 0);
const fragiles = grid.filter(c => c.n === 1);
const parLevier = Object.fromEntries(LEVIERS.map(l => [l, succ.filter(c => c.axes?.levier === l).length]));
const parIndustrie = Object.fromEntries(industries.map(i => [i, succ.filter(c => c.industrie === i).length]));

// Priorisation : on cible d'abord les trous sur les leviers les plus pauvres (ils tirent la matrice
// vers le bas et deforment le cadre "4 leviers"), puis les industries les moins couvertes.
const levierRank = Object.fromEntries([...LEVIERS].sort((a, b) => parLevier[a] - parLevier[b]).map((l, r) => [l, r]));
const score = (c) => levierRank[c.levier] * 100 + parIndustrie[c.industrie];
const cibles = [...vides].sort((a, b) => score(a) - score(b)).slice(0, TOP);

const payload = {
  genere_le: new Date().toISOString().slice(0, 10),
  total_succes: succ.length,
  cases_grille: grid.length,
  vides: vides.length,
  fragiles: fragiles.length,
  par_levier: parLevier,
  par_industrie: parIndustrie,
  cibles_prioritaires: cibles.map(c => ({ industrie: c.industrie, levier: c.levier })),
  tous_les_vides: vides.map(c => ({ industrie: c.industrie, levier: c.levier })),
  tous_les_fragiles: fragiles.map(c => ({ industrie: c.industrie, levier: c.levier, n: c.n })),
};

if (has('--json')) {
  const out = join(ROOT, 'batch');
  if (!existsSync(out)) mkdirSync(out, { recursive: true });
  writeFileSync(join(out, '_gaps.json'), JSON.stringify(payload, null, 1));
  console.log(`-> batch/_gaps.json (${vides.length} vides, ${cibles.length} cibles prioritaires)`);
} else if (has('--brief')) {
  console.log(`CIBLES DE COLLECTE (angles morts de la matrice, generes le ${payload.genere_le}).
Cherche en priorite des deploiements IA marketing A L'ECHELLE sur ces croisements industrie x levier,
qui sont aujourd'hui VIDES dans l'index (aucun cas prouve). Un cas sur un de ces croisements vaut plus
qu'un enieme cas retail/acquisition.

${cibles.map((c, i) => `${i + 1}. ${c.industrie} x ${c.levier}`).join('\n')}

Rappel des leviers : acquisition (faire venir), activation_conversion (faire convertir),
retention (faire revenir), monetisation (faire monter le panier / le revenu par client).
Le levier le plus pauvre de l'index est actuellement : ${Object.entries(parLevier).sort((a, b) => a[1] - b[1])[0][0]} (${Object.entries(parLevier).sort((a, b) => a[1] - b[1])[0][1]} cas).
Si tu ne trouves rien de solide sur un croisement, dis-le : un trou honnete vaut mieux qu'un cas force.`);
} else {
  console.log(`\nMATRICE DE COUVERTURE : ${succ.length} cas succes, ${industries.length} industries x ${LEVIERS.length} leviers = ${grid.length} croisements`);
  console.log(`  vides (angles morts) : ${vides.length} (${Math.round(vides.length / grid.length * 100)}%)`);
  console.log(`  fragiles (1 seul cas): ${fragiles.length}`);
  console.log('\nPAR LEVIER :');
  Object.entries(parLevier).sort((a, b) => b[1] - a[1]).forEach(([l, n]) => console.log(`  ${String(n).padStart(3)}  ${l}`));
  console.log('\nPAR INDUSTRIE (les plus pauvres en premier) :');
  Object.entries(parIndustrie).sort((a, b) => a[1] - b[1]).forEach(([i, n]) => console.log(`  ${String(n).padStart(3)}  ${i}`));
  console.log(`\nCIBLES PRIORITAIRES DU PROCHAIN RUN (top ${TOP}) :`);
  cibles.forEach((c, i) => console.log(`  ${i + 1}. ${c.industrie} x ${c.levier}`));
  console.log(`\nTOUS LES ANGLES MORTS (${vides.length}) :`);
  vides.forEach(c => console.log(`   - ${c.industrie} x ${c.levier}`));
  console.log('\nUtilise --json (fan-out) ou --brief (a coller dans un agent de decouverte).\n');
}
