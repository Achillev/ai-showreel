// Moteur de découverte — couche 1 du moteur de collecte (docs/MOTEUR-COLLECTE.md).
// Crawle les gisements de customer stories (Firecrawl), extrait les cas candidats,
// dédoublonne contre la base, écrit batch/_candidates.json classé.
//
// Usage :
//   node site/discover.mjs --dry     # index de dédup + gisements, sans crawl (marche sans clé)
//   node site/discover.mjs           # crawl réel (nécessite FIRECRAWL_API_KEY dans .env)
//
// Clé : créer ai-showreel/.env avec  FIRECRAWL_API_KEY=fc-xxxx  (fichier gitignoré, jamais commité).

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const CASES = join(ROOT, 'cases');
const BATCH = join(ROOT, 'batch');

// --- chargement .env (léger, sans dépendance) ---
function loadEnv() {
  const p = join(ROOT, '.env');
  if (!existsSync(p)) return {};
  const env = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}
const ENV = { ...loadEnv(), ...process.env };
const FIRECRAWL_KEY = ENV.FIRECRAWL_API_KEY;

// --- les gisements : sections customer stories à énumérer ---
// mktW = pertinence-marketing attendue du gisement (0 infra pur -> 3 régie pub)
const GISEMENTS = [
  { vendor: 'Meta', url: 'https://www.facebook.com/business/success', mktW: 3 },
  { vendor: 'Google', url: 'https://business.google.com/think', mktW: 3 },
  { vendor: 'Salesforce', url: 'https://www.salesforce.com/customer-success-stories/', mktW: 2 },
  { vendor: 'Adobe', url: 'https://business.adobe.com/customer-success-stories.html', mktW: 2 },
  { vendor: 'Microsoft', url: 'https://www.microsoft.com/en-us/customers', mktW: 1 },
  { vendor: 'Google Cloud', url: 'https://cloud.google.com/customers', mktW: 1 },
  { vendor: 'IBM', url: 'https://www.ibm.com/case-studies', mktW: 0 },
  { vendor: 'AWS', url: 'https://aws.amazon.com/solutions/case-studies/', mktW: 0 },
];

// --- index de dédup depuis la base existante ---
function knownBase() {
  const brands = new Set(), hosts = new Set(), urls = new Set();
  for (const f of readdirSync(CASES).filter(x => x.endsWith('.json'))) {
    let c; try { c = JSON.parse(readFileSync(join(CASES, f), 'utf8')); } catch { continue; }
    if (c.marque) brands.add(normBrand(c.marque));
    for (const s of (c.sources || [])) {
      if (!s.url) continue;
      urls.add(s.url.replace(/[#?].*$/, '').replace(/\/$/, ''));
      try { hosts.add(new URL(s.url).hostname.replace(/^www\./, '')); } catch {}
    }
  }
  return { brands, hosts, urls };
}
const normBrand = (b = '') => b.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(group|inc|sa|company|companies|the)$/g, '');

const GISEMENT_ROOTS = new Set();
// heuristique : cette URL ressemble-t-elle a une fiche cas individuelle (pas un index/categorie) ?
function looksLikeCase(u) {
  const url = new URL(u);
  const p = url.pathname.toLowerCase().replace(/\/$/, '');
  if (/\/(categories|category|tag|tags|topics|search|index|page|all)\b/.test(p)) return false; // pages d'index
  if (GISEMENT_ROOTS.has((url.origin + p))) return false; // la section elle-meme
  if (!/(success|case-stud|customer|customers|story|stories|think|ai-excellence)/.test(p)) return false;
  const segs = p.split('/').filter(Boolean);
  if (segs.length < 2) return false;
  const slug = segs[segs.length - 1];
  if (slug.length < 3 || /^\d+$/.test(slug)) return false; // slug vide/numerique
  return true;
}
// deviner la marque depuis le slug d'URL (nettoie prefixes numeriques et suffixes success-story)
function guessBrand(u) {
  let seg = new URL(u).pathname.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';
  return seg.replace(/\.html?$/, '').replace(/^\d+[-_]/, '').replace(/[-_]+/g, ' ')
    .replace(/\b(case study|success story|success|story|customer)\b/gi, '').trim();
}

// --- Firecrawl /v1/map : énumère les URLs d'une section (avec backoff sur 429) ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function fcMap(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FIRECRAWL_KEY}` },
      body: JSON.stringify({ url, limit: 300 }),
    });
    if (r.status === 429) { await sleep(2000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`Firecrawl ${r.status} sur ${url}`);
    const j = await r.json();
    return j.links || (j.data && j.data.links) || [];
  }
  throw new Error(`Firecrawl 429 persistant sur ${url}`);
}

async function main() {
  const dry = process.argv.includes('--dry');
  const base = knownBase();
  console.log(`Base : ${base.brands.size} marques, ${base.urls.size} URLs sources, ${base.hosts.size} domaines connus.`);
  console.log(`Gisements : ${GISEMENTS.length}.`);

  if (dry || !FIRECRAWL_KEY) {
    if (!FIRECRAWL_KEY) console.log('\n[!] FIRECRAWL_API_KEY absente. Ajouter ai-showreel/.env avec FIRECRAWL_API_KEY=fc-xxxx pour activer le crawl.');
    console.log('[dry-run] index de dédup prêt, aucun crawl lancé.');
    return;
  }

  for (const g of GISEMENTS) { try { GISEMENT_ROOTS.add(new URL(g.url).origin + new URL(g.url).pathname.replace(/\/$/, '')); } catch {} }
  const candidates = [];
  for (const g of GISEMENTS) {
    try {
      const links = await fcMap(g.url);
      await sleep(1500); // politesse anti rate-limit
      let added = 0;
      for (const link of links) {
        const clean = link.replace(/[#?].*$/, '').replace(/\/$/, '');
        if (!looksLikeCase(clean)) continue;
        if (base.urls.has(clean)) continue; // déjà sourcé
        const brand = guessBrand(clean);
        const btoken = normBrand((brand.split(' ')[0] || ''));
        const isKnownBrand = btoken.length > 3 && [...base.brands].some(b => b.includes(btoken));
        candidates.push({
          brand, url: clean, vendor: g.vendor,
          status: isKnownBrand ? 'marque-connue-nouvelle-source' : 'marque-nouvelle',
          score: (isKnownBrand ? 1 : 2) + (g.mktW || 0), // marque nouvelle + pertinence-marketing du gisement
        });
        added++;
      }
      console.log(`  ${g.vendor} : ${links.length} liens, ${added} candidats.`);
    } catch (e) { console.log(`  ${g.vendor} : ERREUR ${e.message}`); }
  }
  // dédup interne + tri
  const seen = new Set();
  const uniq = candidates.filter(c => { if (seen.has(c.url)) return false; seen.add(c.url); return true; })
    .sort((a, b) => b.score - a.score);

  if (!existsSync(BATCH)) mkdirSync(BATCH, { recursive: true });
  writeFileSync(join(BATCH, '_candidates.json'), JSON.stringify(uniq, null, 2) + '\n');
  console.log(`\n${uniq.length} candidats uniques -> batch/_candidates.json (${uniq.filter(c => c.status === 'marque-nouvelle').length} marques nouvelles).`);
  console.log('Étape suivante : lancer les agents collecteurs sur les candidats les mieux classés (docs/MOTEUR-COLLECTE.md, couche 3).');
}
main();
