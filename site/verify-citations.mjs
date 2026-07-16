// AI Showreel — verificateur de citations. Le champ `citation_exacte` est cense etre le verbatim
// de sa source : c'est LA preuve. Ce script va chercher chaque source et verifie que la citation
// y figure litteralement. Un audit de 2026-07-16 a trouve 5 defauts sur 5 fiches auditees
// (citation fabriquee, prose de journaliste, fragment ampute de son sujet, blanchiment via
// source secondaire) : ce controle existe pour que ca ne reparte pas.
//
//   node site/verify-citations.mjs                 audit complet (peut prendre quelques minutes)
//   node site/verify-citations.mjs --json          ecrit batch/_citations-report.json
//   node site/verify-citations.mjs --only <id>     une seule fiche
//   node site/verify-citations.mjs --limit 40      limite le nombre d'URL fetchees
//   node site/verify-citations.mjs --fails         n'affiche que les problemes
//
// Verdicts :
//   OK          la citation est presente au mot pres dans la source
//   ABSENTE     la source est lisible mais la citation N'Y EST PAS  <- defaut a haute confiance
//   INJOIGNABLE la source n'a pas pu etre lue (403/paywall/timeout) -> non conclusif
//
// Zero dependance externe.

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const CASES_DIR = join(ROOT, 'cases');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const ONLY = val('--only', null);
const LIMIT = parseInt(val('--limit', '0'), 10) || 0;
const CONC = 8;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// --- normalisation : on compare du texte, pas de la typographie ---
const ENT = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&mdash;': '-', '&ndash;': '-', '&rsquo;': "'", '&lsquo;': "'", '&ldquo;': '"', '&rdquo;': '"', '&hellip;': '...', '&eacute;': 'e', '&egrave;': 'e', '&agrave;': 'a' };
function norm(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&[a-z]+;/gi, (m) => ENT[m.toLowerCase()] ?? ' ')
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”«»″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/…/g, '...')
    .replace(/ | | |​/g, ' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}
// la citation peut etre stockee avec des guillemets englobants ou une ponctuation finale
function variants(c) {
  const base = norm(c);
  const out = new Set([base]);
  out.add(base.replace(/^["'(\[]+|["'.,;:)\]]+$/g, '').trim());
  return [...out].filter(Boolean);
}

// --- collecte des citations ---
const files = readdirSync(CASES_DIR).filter(f => f.endsWith('.json'));
const items = [];
for (const f of files) {
  let c; try { c = JSON.parse(readFileSync(join(CASES_DIR, f), 'utf8')); } catch { continue; }
  if (ONLY && c.id !== ONLY) continue;
  (c.resultats || []).forEach((r, i) => {
    if (!r || typeof r.citation_exacte !== 'string' || !r.citation_exacte.trim()) return;
    const src = (c.sources || []).find(s => s.ref === r.source_ref);
    items.push({
      id: c.id, marque: c.marque, idx: i,
      citation: r.citation_exacte, ref: r.source_ref,
      url: src?.url || null, archive: src?.archive_url || null,
      fiabilite: src?.fiabilite || null,
    });
  });
}

// --- fetch avec cache par URL ---
const cache = new Map();
async function getText(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 15000);
      const res = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': UA, 'accept': 'text/html,application/xhtml+xml,application/pdf,*/*' } });
      clearTimeout(to);
      if (!res.ok) return { ok: false, why: 'http ' + res.status };
      const ct = res.headers.get('content-type') || '';
      const buf = await res.arrayBuffer();
      let text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      if (ct.includes('pdf') || text.slice(0, 5) === '%PDF-') {
        // extraction PDF grossiere : suffit pour un test de presence
        text = text.replace(/[^\x20-\x7E\n]/g, ' ');
      } else {
        text = stripHtml(text);
      }
      return { ok: true, text: norm(text) };
    } catch (e) {
      return { ok: false, why: String(e.name === 'AbortError' ? 'timeout' : e.message).slice(0, 40) };
    }
  })();
  cache.set(url, p);
  return p;
}

const urls = [...new Set(items.map(i => i.url).filter(Boolean))];
const targetUrls = LIMIT ? urls.slice(0, LIMIT) : urls;
process.stderr.write(`Verification de ${items.length} citations sur ${targetUrls.length} URL...\n`);

let done = 0;
async function pool(list, fn, n) {
  const it = list[Symbol.iterator]();
  await Promise.all(Array.from({ length: n }, async () => {
    for (const x of it) { await fn(x); done++; if (done % 25 === 0) process.stderr.write(`  ${done}/${list.length}\n`); }
  }));
}
await pool(targetUrls, getText, CONC);

// --- verdicts ---
const rows = [];
for (const it of items) {
  if (!it.url) { rows.push({ ...it, verdict: 'INJOIGNABLE', why: 'pas d url' }); continue; }
  if (LIMIT && !targetUrls.includes(it.url)) continue;
  const r = await getText(it.url);
  if (!r.ok) { rows.push({ ...it, verdict: 'INJOIGNABLE', why: r.why }); continue; }
  const found = variants(it.citation).some(v => v.length > 8 && r.text.includes(v));
  rows.push({ ...it, verdict: found ? 'OK' : 'ABSENTE', why: found ? '' : 'non trouvee dans la source lue' });
}

const by = (v) => rows.filter(r => r.verdict === v);
const ok = by('OK'), absente = by('ABSENTE'), inj = by('INJOIGNABLE');
const conclusif = ok.length + absente.length;

if (has('--json')) {
  const out = join(ROOT, 'batch');
  if (!existsSync(out)) mkdirSync(out, { recursive: true });
  writeFileSync(join(out, '_citations-report.json'), JSON.stringify({ genere_le: new Date().toISOString().slice(0, 10), total: rows.length, ok: ok.length, absente: absente.length, injoignable: inj.length, absentes: absente, injoignables: inj.map(r => ({ id: r.id, ref: r.ref, why: r.why })) }, null, 1));
  console.log(`-> batch/_citations-report.json`);
}

if (!has('--fails')) {
  console.log(`\n=== AUDIT citation_exacte ===`);
  console.log(`  total          : ${rows.length}`);
  console.log(`  OK             : ${ok.length}`);
  console.log(`  ABSENTE        : ${absente.length}   <- defauts a haute confiance`);
  console.log(`  INJOIGNABLE    : ${inj.length}   (403/paywall/timeout, non conclusif)`);
  if (conclusif) console.log(`  taux de verite sur le verifiable : ${Math.round(ok.length / conclusif * 100)}%`);
}
if (absente.length) {
  console.log(`\n--- CITATIONS ABSENTES DE LEUR SOURCE (${absente.length}) ---`);
  absente.forEach(r => {
    console.log(`  ${r.id} [${r.ref}${r.fiabilite ? ' ' + r.fiabilite : ''}] resultats[${r.idx}]`);
    console.log(`     "${r.citation.slice(0, 110)}"`);
    console.log(`     ${r.url}`);
  });
}
process.exit(0);
