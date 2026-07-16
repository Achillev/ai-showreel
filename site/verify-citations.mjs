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
//   INJOIGNABLE la source n'a pas pu etre lue (403/paywall/timeout, PDF non extractible)
//               -> non conclusif, ne JAMAIS corriger une fiche sur cette base
//
// Les PDF sont decompresses (zlib) et lus via leurs operateurs de texte. Une police en
// sous-ensemble CID (texte en hexa, sans table ToUnicode) reste illisible : l'extraction est alors
// marquee partielle et une citation non trouvee rend INJOIGNABLE, pas ABSENTE. Corollaire a retenir
// avant de "reparer" quoi que ce soit : un ABSENTE se corrige en citant mieux la source, jamais en
// supprimant une citation exacte que l'outil n'a pas su lire.
//
// Zero dependance externe (node:zlib est natif).

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inflateSync, inflateRawSync } from 'node:zlib';

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
// Desechappe le texte livre a l'interieur d'un payload JSON (<, \", \/ ...).
function unescapeEmbedded(s) {
  return String(s)
    .replace(/\\u003c/gi, '<').replace(/\\u003e/gi, '>').replace(/\\u0026/gi, '&')
    .replace(/\\u00e9/gi, 'e').replace(/\\u2019/gi, "'").replace(/\\u201[cd]/gi, '"')
    .replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\//g, '/').replace(/\\[nrt]/g, ' ');
}
// Deux angles morts corriges le 2026-07-16 : ils produisaient des ABSENTE a tort (la citation
// etait bel et bien publiee, l'extracteur ne la voyait pas). La logique de comparaison
// (sous-chaine litterale apres normalisation) est inchangee : on elargit le texte lu, pas le test.
//  1. <script> : sur Wix / Next.js, le CORPS de l'article est livre dans un payload d'hydratation
//     JSON. Le jeter en bloc rendait invisible le texte publie (ex. circana.com).
//  2. alt="" : un resultat chiffre vit souvent dans un visuel, et son seul equivalent texte publie
//     est l'attribut alt de l'image (ex. les nuggets Think with Google).
function stripHtml(html) {
  return String(html)
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_, js) => ' ' + unescapeEmbedded(js) + ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*\salt=(?:"([^"]*)"|'([^']*)')[^>]*>/gi, (_, d, s) => ' ' + (d ?? s ?? '') + ' ')
    .replace(/<[^>]+>/g, ' ');
}
// --- extraction PDF (zlib est natif : toujours zero dependance externe) ---
// Un PDF stocke son texte dans des flux compresses. L'ancienne version se contentait de retirer
// les octets non-ASCII du fichier brut : elle ne lisait donc AUCUN PDF compresse et rendait un
// verdict ABSENTE sur des citations pourtant exactes. Ici on decompresse les flux et on lit les
// operateurs de texte. Trois cas restent illisibles : les polices en sous-ensemble CID (texte en
// hexa <...> Tj) sans leur table ToUnicode, les PDF chiffres (/Encrypt) dont zlib ne peut pas
// decompresser les flux, et les documents dont la majorite des flux echouent a l'inflate. Dans ces
// cas l'extraction est marquee `partial` et une citation non trouvee devient INJOIGNABLE, jamais
// ABSENTE : on ne conclut pas d'un document qu'on n'a pas su lire.
function pdfStreams(buf) {
  const out = []; let failed = 0;
  const S = Buffer.from('stream'), E = Buffer.from('endstream'); let i = 0;
  while (true) {
    const s = buf.indexOf(S, i); if (s < 0) break;
    const e = buf.indexOf(E, s); if (e < 0) break;
    let st = s + S.length;
    if (buf[st] === 0x0d) st++;
    if (buf[st] === 0x0a) st++;
    const chunk = buf.subarray(st, e);
    let d = null;
    try { d = inflateSync(chunk); } catch { try { d = inflateRawSync(chunk); } catch { d = null; } }
    // un flux qui ne se decompresse pas peut simplement etre stocke en clair : on le lit tel quel
    if (d === null) failed++;
    out.push(d ? d.toString('latin1') : chunk.toString('latin1'));
    i = e + E.length;
  }
  return { streams: out, failed };
}
const PDF_ESC = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
function pdfUnescape(s) {
  return s.replace(/\\(\d{1,3}|.)/gs, (_, g) => (/^\d+$/.test(g) ? String.fromCharCode(parseInt(g, 8)) : (PDF_ESC[g] ?? g)));
}
function pdfText(buf) {
  let out = [], hexOps = 0;
  const { streams, failed } = pdfStreams(buf);
  // Un PDF chiffre (/Encrypt : le rapport annuel Zurich 2025 est en AES-256, lecture libre mais copie
  // interdite) a des flux que zlib ne sait pas decompresser. L'extraction ne rend alors que du bruit
  // binaire, qui contient assez de lettres pour passer le seuil ci-dessous : sans ce garde-fou, une
  // citation pourtant exacte etait declaree ABSENTE.
  const encrypted = buf.indexOf(Buffer.from('/Encrypt')) >= 0;
  for (const c of streams) {
    // (texte) Tj|'|"   et   [(a) -3 (b)] TJ  ; <hexa> Tj/TJ = texte CID non decode
    const re = /\[((?:[^\[\]\\]|\\.)*)\]\s*TJ|\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|'|")|<([0-9A-Fa-f\s]+)>\s*(?:Tj|TJ)/gs;
    let m;
    while ((m = re.exec(c))) {
      if (m[1] !== undefined) {
        let s = ''; const inner = /\(((?:[^()\\]|\\.)*)\)/gs; let p;
        while ((p = inner.exec(m[1]))) s += pdfUnescape(p[1]);
        if (/<[0-9A-Fa-f\s]+>/.test(m[1])) hexOps++;
        if (s) out.push(s);
      } else if (m[2] !== undefined) out.push(pdfUnescape(m[2]));
      else hexOps++;
    }
  }
  const text = out.join('\n');
  const letters = (text.match(/[a-z]/gi) || []).length;
  return { text, partial: hexOps > 0 || letters < 200 || encrypted || failed > streams.length / 2 };
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
        const { text: t, partial } = pdfText(Buffer.from(buf));
        return { ok: true, text: norm(t), partial };
      }
      // Meme principe que pour les PDF : une page rendue cote client (Wix, Next, React) ne livre au
      // fetcher qu'une coquille de navigation. On n'a pas lu l'article -> une citation non trouvee
      // ne prouve rien. Seuil bas et volontairement prudent : sous ~1200 caracteres de prose, aucune
      // page de cas client reelle n'existe (perfectcorp.com sert 60 Ko de shell generique).
      const html = norm(stripHtml(text));
      return { ok: true, text: html, partial: html.length < 1200 };
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
  const test = (txt) => variants(it.citation).some(v => v.length > 8 && txt.includes(v));
  const r = await getText(it.url);
  let found = r.ok && test(r.text);
  // Repli sur archive_url : la source vit (schema : url = canonique, archive_url = la preuve), mais
  // le lien a pu mourir, migrer ou passer en rendu client depuis la collecte. L'archive est ce que le
  // collecteur a REELLEMENT lu : c'est elle qui fait foi pour juger la citation, pas l'etat du jour.
  let via = '';
  if (!found && it.archive) {
    const a = await getText(it.archive);
    if (a.ok && test(a.text)) { found = true; via = ' (via archive_url)'; }
    else if (!found && a.ok && a.partial) { rows.push({ ...it, verdict: 'INJOIGNABLE', why: 'live + archive non extractibles' }); continue; }
  }
  if (found) { rows.push({ ...it, verdict: 'OK', why: via.trim() }); continue; }
  if (!r.ok) { rows.push({ ...it, verdict: 'INJOIGNABLE', why: r.why }); continue; }
  // Une correspondance positive reste fiable meme sur une extraction partielle. En revanche, ne pas
  // trouver une citation dans un document qu'on n'a lu qu'en partie ne prouve rien : c'est INJOIGNABLE.
  if (r.partial) { rows.push({ ...it, verdict: 'INJOIGNABLE', why: 'source non extractible (pdf chiffre/CID, ou page rendue cote client)' }); continue; }
  rows.push({ ...it, verdict: 'ABSENTE', why: 'non trouvee dans la source lue' });
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
