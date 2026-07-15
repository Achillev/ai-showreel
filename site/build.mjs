// AI Showreel — générateur statique schema-driven.
// Lit ../cases/*.json, écrit ../dist/*.html. Aucune dépendance externe.
// node site/build.mjs

import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { runGate, normalizeHtmlText } from './qa-gate.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
// version du CSS (hash du contenu) -> casse le cache navigateur des qu'il change (evite HTML neuf + CSS cache = layout casse)
const CSS_VER = createHash('md5').update(readFileSync(join(__dir, 'style.css'))).digest('hex').slice(0, 8);
const JS_SRC = join(__dir, 'static', 'interactions.js');
const JS_VER = existsSync(JS_SRC) ? createHash('md5').update(readFileSync(JS_SRC)).digest('hex').slice(0, 8) : '0';
const ROOT = join(__dir, '..');
const CASES_DIR = join(ROOT, 'cases');
const DIST = join(ROOT, 'dist');

// Adresse de réception des corrections (à remplacer par l'adresse projet au moment du naming).
const FEEDBACK_EMAIL = 'access@starfox-analytics.com';

function mailto(subject, body) {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function feedbackLink(c) {
  const title = c?.seo?.title || c?.marque || 'AI Showreel';
  const id = c?.id || '';
  const body = `Fiche concernée : ${title}\n(id : ${id})\n\nCe qui doit être corrigé, précisé ou mis à jour :\n\n\nVotre source (lien) :\n\n\nMerci. Toute correction sourcée est vérifiée avant publication.`;
  return mailto(`Correction - ${c?.marque || ''} (${id})`, body);
}

// ---------- i18n : langue courante + helpers ----------
// LANG est bascule par setLang() avant chaque passe de rendu (FR -> dist/, EN -> dist/en/).
let LANG = 'fr';
const t = (fr, en) => (LANG === 'en' && en != null) ? en : fr;   // libelle inline
const P = () => (LANG === 'en' ? '/en' : '');                     // prefixe d'URL interne
const LANGS = ['fr', 'en'];
const enPath = (p) => '/en' + (p === '/' ? '/' : p);             // chemin FR -> chemin EN

// ---------- libellés (source bilingue [fr, en]) ----------
const _INDUSTRIES = {
  retail_ecom: ['Retail & e-commerce', 'Retail & e-commerce'], voyage_hospitality: ['Voyage & hospitality', 'Travel & hospitality'],
  banque_assurance_fintech: ['Banque, assurance & fintech', 'Banking, insurance & fintech'], telco: ['Télécoms', 'Telecom'],
  media_entertainment: ['Média & entertainment', 'Media & entertainment'], luxe_beaute: ['Luxe & beauté', 'Luxury & beauty'],
  auto: ['Automobile', 'Automotive'], cpg_d2c: ['CPG & D2C', 'CPG & D2C'], food_beverage: ['Food & beverage', 'Food & beverage'],
  sante_pharma: ['Santé & pharma', 'Health & pharma'], tech_saas: ['Tech & SaaS', 'Tech & SaaS'],
  energie_utilities: ['Énergie & utilities', 'Energy & utilities'], immobilier: ['Immobilier', 'Real estate'], sport_fitness: ['Sport & fitness', 'Sports & fitness'],
  education: ['Éducation', 'Education'], secteur_public: ['Secteur public', 'Public sector'], autre: ['Autre', 'Other'],
};
const _LEVIERS = {
  acquisition: ['Acquisition', 'Acquisition'], activation_conversion: ['Activation / conversion', 'Activation / conversion'],
  retention: ['Rétention', 'Retention'], monetisation: ['Monétisation', 'Monetization'],
};
const _FAMILLES = {
  personnalisation: ['Personnalisation', 'Personalization'], generation: ['Génération', 'Generation'], conversation: ['Conversation', 'Conversation'],
  prediction: ['Prédiction', 'Prediction'], optimisation_automatisation: ['Optimisation / automatisation', 'Optimization / automation'],
};
const _IMPLEM = { custom: ['IA custom', 'Custom AI'], plateforme: ['Plateforme martech', 'Martech platform'], hybride: ['Hybride', 'Hybrid'] };
const _PREUVE_LABEL = {
  A: ['A — Résultats financiers', 'A — Financial results'], B: ['B — Étude de cas plateforme chiffrée', 'B — Quantified platform case study'],
  C: ['C — Presse citant la marque', 'C — Press naming the brand'], D: ['D — Déclaratif conférence', 'D — Conference statement'],
};
const _VIVANT = {
  confirme: { t: ['Vivant confirmé', 'Live confirmed'], c: 'ok' },
  signaux_mitiges: { t: ['Signaux mitigés', 'Mixed signals'], c: 'warn' },
  incertain: { t: ['Incertain', 'Uncertain'], c: 'bad' },
};
const _FIAB = {
  T1_primaire: { t: ['Primaire', 'Primary'], c: 't1', d: ['Document primaire : décision de justice, doc financier officiel, communiqué de la marque', 'Primary document: court ruling, official financial filing, brand press release'] },
  T2_officiel_interesse: { t: ['Officiel intéressé', 'Interested party'], c: 't2', d: ['Source officielle mais intéressée : customer story plateforme/vendor/intégrateur', 'Official but interested source: platform/vendor/integrator customer story'] },
  T3_presse_etablie: { t: ['Presse établie', 'Established press'], c: 't3', d: ['Presse majeure reconnue', 'Recognized major press'] },
  T4_secondaire: { t: ['Secondaire', 'Secondary'], c: 't4', d: ['Presse spécialisée ou analyse tierce', 'Trade press or third-party analysis'] },
};
const _MEDIA_SRC = { officielle: ['Vidéo officielle', 'Official video'], demo: ['Démonstration', 'Demo'], la_pub: ['La publicité (générée par IA)', 'The ad (AI-generated)'], couverture: ['Couverture presse', 'Press coverage'] };

// maps aplaties dans la langue courante (reconstruites par setLang)
let INDUSTRIES, LEVIERS, FAMILLES, IMPLEM, PREUVE_LABEL, VIVANT, FIAB, MEDIA_SRC, NAV;
function setLang(l) {
  LANG = l;
  const idx = l === 'en' ? 1 : 0;
  const flat = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v[idx]]));
  const flatObj = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, Array.isArray(vv) ? vv[idx] : vv]))]));
  INDUSTRIES = flat(_INDUSTRIES); LEVIERS = flat(_LEVIERS); FAMILLES = flat(_FAMILLES);
  IMPLEM = flat(_IMPLEM); PREUVE_LABEL = flat(_PREUVE_LABEL); MEDIA_SRC = flat(_MEDIA_SRC);
  VIVANT = flatObj(_VIVANT); FIAB = flatObj(_FIAB);
  NAV = _NAV.map(([href, fr, en]) => [href, l === 'en' ? en : fr]);
}

// ---------- utils ----------
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

// ---------- rendu SVG du flow (le schéma EST une donnée) ----------
function renderFlow(flow) {
  if (!flow || !flow.noeuds?.length) return '';
  const nodes = flow.noeuds;
  const NW = 190, NH = 84, GAP = 56, PADX = 24, PADY = 60;
  // layout par rang : ordre du tableau, wrap tous les 3
  const perRow = Math.min(3, nodes.length);
  const pos = {};
  nodes.forEach((n, i) => {
    const row = Math.floor(i / perRow), col = i % perRow;
    const dir = row % 2 === 0 ? 1 : -1; // serpentin
    const c = dir === 1 ? col : (perRow - 1 - col);
    pos[n.id] = { x: PADX + c * (NW + GAP), y: PADY + row * (NH + GAP), row };
  });
  const rows = Math.ceil(nodes.length / perRow);
  const W = PADX * 2 + perRow * NW + (perRow - 1) * GAP;
  const H = PADY * 2 + rows * NH + (rows - 1) * GAP;

  const roleClass = (r) => 'n-' + (r || 'default').replace(/_/g, '-');
  let defs = `<defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--flow-edge)"/>
    </marker>
    <marker id="arrow-loop" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)"/>
    </marker>
  </defs>`;

  let edges = '';
  for (const link of (flow.liens || [])) {
    const [a, b, label] = link;
    const pa = pos[a], pb = pos[b]; if (!pa || !pb) continue;
    const isLoop = !!label;
    const sx = pa.x + NW / 2, sy = pa.y + NH, ex = pb.x + NW / 2, ey = pb.y;
    let d;
    if (pa.row === pb.row) { // même rang : lien horizontal
      const y = pa.y + NH / 2;
      const fromRight = pb.x > pa.x;
      d = `M ${fromRight ? pa.x + NW : pa.x} ${y} L ${fromRight ? pb.x : pb.x + NW} ${y}`;
    } else if (isLoop && pb.row < pa.row) { // boucle de retour : contourne par la gauche
      const x = 8;
      d = `M ${pa.x} ${pa.y + NH / 2} L ${x} ${pa.y + NH / 2} L ${x} ${pb.y + NH / 2} L ${pb.x} ${pb.y + NH / 2}`;
    } else { // rang suivant : vertical
      d = `M ${sx} ${sy} C ${sx} ${sy + GAP / 2}, ${ex} ${ey - GAP / 2}, ${ex} ${ey}`;
    }
    edges += `<path d="${d}" fill="none" stroke="${isLoop ? 'var(--accent)' : 'var(--flow-edge)'}" stroke-width="2" ${isLoop ? 'stroke-dasharray="5 4"' : ''} marker-end="url(#${isLoop ? 'arrow-loop' : 'arrow'})"/>`;
    if (label) {
      const mx = pa.row === pb.row ? (pa.x + pb.x) / 2 + NW / 2 : 16;
      const my = pa.row === pb.row ? pa.y + NH / 2 - 8 : (pa.y + pb.y) / 2 + NH / 2;
      edges += `<text x="${mx}" y="${my}" class="flow-edge-label" text-anchor="middle">${esc(label)}</text>`;
    }
  }

  let boxes = '';
  nodes.forEach((n) => {
    const p = pos[n.id];
    const tool = n.outil_documente ? `<text x="${p.x + NW / 2}" y="${p.y + NH - 14}" class="flow-tool" text-anchor="middle">${esc(n.outil_documente)}</text>` : '';
    boxes += `<g class="flow-node ${roleClass(n.role_generique)}">
      <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="13"/>
      <rect class="flow-accent" x="${p.x + 10}" y="${p.y + 12}" width="${NW - 20}" height="3.5" rx="2"/>
      ${wrapText(n.label, p.x + NW / 2, p.y + (n.outil_documente ? 30 : 38), NW - 22, 'flow-label')}
      ${tool}
    </g>`;
  });

  return `<svg class="flow-svg" viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet">${defs}${edges}${boxes}</svg>`;
}

function wrapText(text, cx, y, maxw, cls) {
  const words = String(text).split(' ');
  const lines = []; let line = '';
  const cpl = Math.floor(maxw / 6.6);
  for (const w of words) {
    if ((line + ' ' + w).trim().length > cpl && line) { lines.push(line); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  const capped = lines.slice(0, 3);
  return capped.map((l, i) => `<text x="${cx}" y="${y + i * 14}" class="${cls}" text-anchor="middle">${esc(l)}</text>`).join('');
}

// ---------- composants HTML ----------
// Outils/plateformes -> domaine officiel (lien + logo automatiques sur toutes les fiches)
const TOOL_MAP = [
  [/advantage\+|meta conversion|meta ads/i, 'facebook.com/business'],
  [/performance max|demand gen|google ads/i, 'ads.google.com'],
  [/vertex|google cloud|bigquery|dialogflow|automl/i, 'cloud.google.com'],
  [/gemini/i, 'gemini.google.com'],
  [/openai|gpt|chatgpt|dall-e|\bsora\b/i, 'openai.com'],
  [/claude|anthropic/i, 'anthropic.com'],
  [/azure/i, 'azure.microsoft.com'],
  [/salesforce|einstein|agentforce|marketing cloud/i, 'salesforce.com'],
  [/adobe|firefly|genstudio|sensei/i, 'adobe.com'],
  [/aws|bedrock|sagemaker/i, 'aws.amazon.com'],
  [/klaviyo/i, 'klaviyo.com'], [/braze/i, 'braze.com'], [/bloomreach|loomi/i, 'bloomreach.com'],
  [/insider/i, 'useinsider.com'], [/dynamic yield/i, 'dynamicyield.com'], [/persado/i, 'persado.com'],
  [/vidmob/i, 'vidmob.com'], [/creativex/i, 'creativex.com'], [/tiktok/i, 'tiktok.com'],
  [/pinterest/i, 'pinterest.com'], [/criteo/i, 'criteo.com'], [/trade desk|kokai/i, 'thetradedesk.com'],
  [/watson|ibm/i, 'ibm.com'], [/nvidia|omniverse/i, 'nvidia.com'], [/databricks/i, 'databricks.com'],
  [/cognigy/i, 'cognigy.com'], [/sierra/i, 'sierra.ai'], [/decagon/i, 'decagon.ai'],
  [/kraken/i, 'kraken.tech'], [/cerence/i, 'cerence.com'], [/yellow\.ai/i, 'yellow.ai'],
  [/modiface/i, 'modiface.com'], [/fetcherr/i, 'fetcherr.io'], [/eagle eye/i, 'eagleeyesolutions.com'],
  [/dunnhumby/i, 'dunnhumby.com'], [/afresh/i, 'afresh.com'], [/smec|smarter ecommerce/i, 'smarter-ecommerce.com'],
  [/quartile/i, 'quartile.com'], [/nlx/i, 'nlx.ai'], [/\bgrip\b/i, 'grip.tools'],
  [/apply digital/i, 'applydigital.com'], [/whatsapp/i, 'business.whatsapp.com'], [/shopify/i, 'shopify.com'],
  [/liveramp/i, 'liveramp.com'], [/paradox/i, 'paradox.ai'], [/omilia/i, 'omilia.com'],
  [/illuin/i, 'illuin.tech'], [/teads/i, 'teads.com'], [/microsoft copilot|copilot studio/i, 'microsoft.com'],
];
function toolLink(name) {
  const hit = TOOL_MAP.find(([re]) => re.test(name));
  if (!hit) return `<li class="tool-chip">${esc(name)}</li>`;
  const domain = hit[1].split('/')[0];
  return `<li class="tool-chip"><a href="https://${esc(hit[1])}" target="_blank" rel="noopener"><img src="https://www.google.com/s2/favicons?sz=64&domain=${esc(domain)}" alt="" loading="lazy" onerror="this.remove()">${esc(name)}</a></li>`;
}

function initials(name = '') {
  const parts = name.replace(/[^A-Za-z0-9&' ]/g, '').split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}
function brandHue(name = '') { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
function brandLogo(c, cls = '') {
  const mono = `<span class="logo-mono" style="--h:${brandHue(c.marque)}">${esc(initials(c.marque))}</span>`;
  const img = c.logo_domain
    ? `<img class="logo-img" src="https://www.google.com/s2/favicons?sz=128&domain=${esc(c.logo_domain)}" alt="Logo ${esc(c.marque)}" loading="lazy" onerror="this.remove()">`
    : '';
  return `<span class="brand-logo ${cls}">${mono}${img}</span>`;
}
function ytId(url = '') {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
}
function mediaBlock(c) {
  const md = c.media;
  if (!md) return '';
  const label = MEDIA_SRC[md.source] || '';
  if (md.kind === 'video') {
    const id = ytId(md.url);
    if (!id) return '';
    return `<section class="block block-media">
      <div class="block-head"><h2>${t('Le cas en action', 'The case in action')}</h2><span class="media-tag">${esc(label)}</span></div>
      <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="${esc(md.titre || c.marque)}" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
      ${md.titre ? `<p class="media-cap">${esc(md.titre)} · <a href="${esc(md.url)}" target="_blank" rel="noopener">voir sur YouTube</a></p>` : ''}
    </section>`;
  }
  return `<section class="block block-media">
    <div class="block-head"><h2>Le cas en action</h2><span class="media-tag">${esc(label)}</span></div>
    <img class="media-img" src="${esc(md.url)}" alt="${esc(md.titre || c.marque)}" loading="lazy">
  </section>`;
}
const preuveBadge = (n) => `<span class="grade grade-${n}" title="${esc(PREUVE_LABEL[n] || '')}">${t('Preuve', 'Proof')} ${n}</span>`;
const fiabBadge = (f) => { const v = FIAB[f]; return v ? `<span class="fiab fiab-${v.c}" title="${esc(v.d)}">${v.t}</span>` : ''; };
const vivantBadge = (s) => { const v = VIVANT[s] || VIVANT.incertain; return `<span class="vivant v-${v.c}"><span class="dot"></span>${v.t}</span>`; };

function scoreBar(label, val) {
  const pct = (val / 5) * 100;
  return `<div class="score-row"><span class="score-lbl">${label}</span><span class="score-track"><span class="score-fill" style="width:${pct}%"></span></span><span class="score-num">${val}/5</span></div>`;
}

// Domaine de production : À REMPLACER au naming/déploiement (une seule constante).
const SITE = 'https://ai-showreel.com';
// Flag bilingue : passe à true quand le contenu EN (fiches + pages) est traduit et prêt à indexer.
// false = seul le FR est généré/indexé ; la machinerie i18n reste en place mais l'anglais n'est pas exposé.
const BILINGUAL = true;
const ORG_JSONLD = { '@type': 'Organization', '@id': SITE + '/#org', name: 'AI Showreel', url: SITE, description: 'Index indépendant des déploiements IA prouvés en marketing digital, noté sur une échelle de preuve publique.' };

const _NAV = [
  ['/', 'La base', 'The index'], ['/veille.html', 'Le radar', 'The radar'], ['/rapports.html', 'Les rapports', 'The reports'],
  ['/patterns.html', 'Les patterns', 'The patterns'], ['/outils.html', 'Les outils', 'The stack'],
  ['/perception.html', "L'acceptation", 'Acceptance'], ['/cimetiere.html', 'Le cimetière', 'The graveyard'],
];
function page(title, body, { desc = '', jsonld = '', canonical = '', path = '' } = {}) {
  const frUrl = SITE + (path || '/');
  const enUrl = SITE + enPath(path || '/');
  const url = LANG === 'en' ? enUrl : frUrl;
  const can = canonical || url;
  const altUrl = LANG === 'en' ? frUrl : enUrl;
  const ogImg = SITE + ((BILINGUAL && LANG === 'en') ? '/og-image-en.png' : '/og-image.png');
  const navHtml = NAV.map(([href, label]) => `<a href="${P()}${href}"${href === (path || '/') ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const org = { ...ORG_JSONLD, description: t('Index indépendant des déploiements IA prouvés en marketing digital, noté sur une échelle de preuve publique.', 'Independent index of AI deployments proven at scale in digital marketing, graded on a public evidence scale.') };
  const nodes = jsonld ? (() => { const p = JSON.parse(jsonld); return Array.isArray(p) ? p : [p]; })() : [];
  const graph = { '@context': 'https://schema.org', '@graph': [org, { '@type': 'WebSite', '@id': SITE + '/#site', url: SITE, name: 'AI Showreel', inLanguage: LANG, publisher: { '@id': SITE + '/#org' } }, ...nodes] };
  return normalizeHtmlText(`<!doctype html><html lang="${LANG}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.className+=' js-anim';try{document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="theme-color" content="#0A0E1A" media="(prefers-color-scheme: dark)"><meta name="theme-color" content="#0A0E1A">
<link rel="canonical" href="${esc(can)}">${BILINGUAL ? `
<link rel="alternate" hreflang="fr" href="${esc(frUrl)}">
<link rel="alternate" hreflang="en" href="${esc(enUrl)}">
<link rel="alternate" hreflang="x-default" href="${esc(enUrl)}">` : ''}
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website"><meta property="og:site_name" content="AI Showreel"><meta property="og:locale" content="${LANG === 'en' ? 'en_US' : 'fr_FR'}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(can)}">
<meta property="og:image" content="${ogImg}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${t('AI Showreel, les déploiements IA prouvés du marketing digital', 'AI Showreel, the proven AI deployments of digital marketing')}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${ogImg}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=${CSS_VER}">
<script type="application/ld+json">${JSON.stringify(graph)}</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/interactions.js?v=${JS_VER}"></script>
</head><body>
<a class="skip" href="#main">${t('Aller au contenu', 'Skip to content')}</a>
<header class="head-top" id="head-top">
  <a class="brand" href="${P()}/" translate="no"><span class="brand-mark" aria-hidden="true">◆</span> AI&nbsp;Showreel <span class="brand-sub">${t("l'analyse niveau grand cabinet, pour tout le monde", 'consulting-grade analysis, for everyone')}</span></a>
  <div class="nav-utils">${BILINGUAL ? `
    <div class="lang-switch" role="group" aria-label="${t('Langue', 'Language')}"><a href="${esc(frUrl)}" hreflang="fr"${LANG === 'fr' ? ' aria-current="true"' : ''}>FR</a><a href="${esc(enUrl)}" hreflang="en"${LANG === 'en' ? ' aria-current="true"' : ''}>EN</a></div>` : ''}
    <button class="theme-toggle" type="button" aria-label="${t('Basculer thème clair/sombre', 'Toggle light/dark theme')}" title="${t('Thème', 'Theme')}"><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 1.8 a8.2 8.2 0 0 1 0 16.4 z" fill="currentColor"/></svg></button>
    <button class="nav-burger" type="button" aria-label="${t('Ouvrir le menu', 'Open menu')}" aria-expanded="false" aria-controls="site-nav"><span class="burger" aria-hidden="true"></span></button>
  </div>
</header>
<div class="head-links" id="site-nav">
  <nav aria-label="${t('Navigation principale', 'Main navigation')}">${navHtml}</nav>
</div>
<main id="main" tabindex="-1">${body}</main>
<footer class="site-foot">
  <p><strong>AI Showreel</strong> ${t('— index indépendant des déploiements IA prouvés en marketing digital. Chaque cas est noté sur une échelle de preuve publique et vérifié vivant à sa date.', '— independent index of AI deployments proven at scale in digital marketing. Every case is graded on a public evidence scale and verified live at its date.')}</p>
  <p class="foot-links"><a href="${mailto('AI Showreel - proposer un cas ou une correction', 'Votre message :\n\n\nSi c\'est une correction, merci d\'indiquer la fiche concernée et une source.')}">${t('Proposer un cas ou une correction', 'Submit a case or a correction')}</a> · <a href="${P()}/methodologie.html">${t('Méthodologie', 'Methodology')}</a></p>
  <p class="foot-meta">${t('« L\'Evident du marketing digital » : un index éditorialement indépendant, sans biais vendeur ni sponsor.', 'The independent evidence index for AI in digital marketing. No vendor bias, no sponsor.')}</p>
</footer>
<script>(function(){
var tt=document.querySelector('.theme-toggle');if(tt)tt.addEventListener('click',function(){var d=document.documentElement;var eff=d.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var next=eff==='dark'?'light':'dark';d.setAttribute('data-theme',next);try{localStorage.setItem('theme',next);}catch(e){}});
var b=document.body,bg=document.querySelector('.nav-burger'),top=document.getElementById('head-top'),links=document.getElementById('site-nav');
function setHeadH(){if(top)document.documentElement.style.setProperty('--head-h',top.offsetHeight+'px');}
setHeadH();window.addEventListener('resize',setHeadH);
if(bg){function setOpen(o){b.classList.toggle('nav-open',o);bg.setAttribute('aria-expanded',o?'true':'false');}
bg.addEventListener('click',function(e){e.stopPropagation();setOpen(!b.classList.contains('nav-open'));});
document.querySelectorAll('#site-nav nav a').forEach(function(a){a.addEventListener('click',function(){setOpen(false);});});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&b.classList.contains('nav-open')){setOpen(false);bg.focus();}});
document.addEventListener('click',function(e){if(b.classList.contains('nav-open')&&!(top&&top.contains(e.target))&&!(links&&links.contains(e.target)))setOpen(false);});
var mq=matchMedia('(min-width: 781px)');mq.addEventListener('change',function(e){if(e.matches)setOpen(false);});}
/* barre de liens : cachee au scroll bas, revelee au scroll haut */
var lastY=window.scrollY,tick=false;window.addEventListener('scroll',function(){if(tick)return;tick=true;requestAnimationFrame(function(){var y=window.scrollY;if(y>lastY&&y>200){b.classList.add('nav-hidden');}else{b.classList.remove('nav-hidden');}lastY=y;tick=false;});},{passive:true});
})();</script>
</body></html>`);
}

// ---------- matrice des outils & IA (canonicalisation) ----------
// [regex, nom canonique, groupe (ia|plateforme|partenaire), domaine]
const CANON = [
  // IA / modèles
  [/openai|gpt|chatgpt|dall-?e/i, 'OpenAI (GPT / ChatGPT)', 'ia', 'openai.com'],
  [/gemini/i, 'Google Gemini', 'ia', 'deepmind.google'],
  [/claude|anthropic/i, 'Anthropic Claude', 'ia', 'anthropic.com'],
  [/firefly/i, 'Adobe Firefly', 'ia', 'adobe.com'],
  [/\bveo\b/i, 'Google Veo', 'ia', 'deepmind.google'],
  [/imagen/i, 'Google Imagen', 'ia', 'deepmind.google'],
  [/watson/i, 'IBM watsonx', 'ia', 'ibm.com'],
  [/llama/i, 'Meta Llama', 'ia', 'llama.com'],
  [/tensorflow/i, 'TensorFlow', 'ia', 'tensorflow.org'],
  [/xgboost/i, 'XGBoost', 'ia', 'xgboost.ai'],
  [/\bbert\b|distilbert/i, 'BERT / transformers', 'ia', 'huggingface.co'],
  [/deepar|mq-transformer|deep learning|reseaux de neurones|réseaux de neurones|apprentissage par renforcement/i, 'Deep learning maison', 'ia', ''],
  // Plateformes & outils martech
  [/vertex/i, 'Google Vertex AI', 'plateforme', 'cloud.google.com'],
  [/azure openai|azure ai|azure cognitive/i, 'Microsoft Azure OpenAI', 'plateforme', 'azure.microsoft.com'],
  [/bigquery/i, 'Google BigQuery', 'plateforme', 'cloud.google.com'],
  [/\bbedrock\b/i, 'AWS Bedrock', 'plateforme', 'aws.amazon.com'],
  [/advantage\+/i, 'Meta Advantage+', 'plateforme', 'facebook.com/business'],
  [/conversion lift/i, 'Meta Conversion Lift', 'plateforme', 'facebook.com/business'],
  [/pixel|conversions api|\bcapi\b/i, 'Meta Pixel + CAPI', 'plateforme', 'facebook.com/business'],
  [/performance max/i, 'Google Performance Max', 'plateforme', 'ads.google.com'],
  [/demand gen/i, 'Google Demand Gen', 'plateforme', 'ads.google.com'],
  [/google ads|smart bidding/i, 'Google Ads', 'plateforme', 'ads.google.com'],
  [/salesforce|agentforce|einstein/i, 'Salesforce (Agentforce / Einstein)', 'plateforme', 'salesforce.com'],
  [/adobe/i, 'Adobe Experience / GenStudio', 'plateforme', 'adobe.com'],
  [/cognigy/i, 'Cognigy', 'plateforme', 'cognigy.com'],
  [/\bsierra\b/i, 'Sierra', 'plateforme', 'sierra.ai'],
  [/decagon/i, 'Decagon', 'plateforme', 'decagon.ai'],
  [/modiface/i, 'ModiFace', 'plateforme', 'modiface.com'],
  [/kraken/i, 'Kraken (Octopus)', 'plateforme', 'kraken.tech'],
  [/nvidia|omniverse|triton|tensorrt/i, 'NVIDIA (Omniverse / Triton)', 'plateforme', 'nvidia.com'],
  [/databricks/i, 'Databricks', 'plateforme', 'databricks.com'],
  [/klaviyo/i, 'Klaviyo', 'plateforme', 'klaviyo.com'],
  [/braze/i, 'Braze', 'plateforme', 'braze.com'],
  [/bloomreach|loomi/i, 'Bloomreach', 'plateforme', 'bloomreach.com'],
  [/insider/i, 'Insider', 'plateforme', 'useinsider.com'],
  [/criteo/i, 'Criteo', 'plateforme', 'criteo.com'],
  [/tiktok/i, 'TikTok Ads', 'plateforme', 'tiktok.com'],
  [/pinterest/i, 'Pinterest Ads', 'plateforme', 'pinterest.com'],
  [/trade desk|kokai/i, 'The Trade Desk', 'plateforme', 'thetradedesk.com'],
  [/vidmob/i, 'VidMob', 'plateforme', 'vidmob.com'],
  [/creativex/i, 'CreativeX', 'plateforme', 'creativex.com'],
  [/persado/i, 'Persado', 'plateforme', 'persado.com'],
  [/yellow\.ai/i, 'Yellow.ai', 'plateforme', 'yellow.ai'],
  [/cerence/i, 'Cerence', 'plateforme', 'cerence.com'],
  [/\bnlx\b/i, 'NLX', 'plateforme', 'nlx.ai'],
  [/dynamic yield/i, 'Dynamic Yield', 'plateforme', 'dynamicyield.com'],
  [/\bgrip\b/i, 'Grip', 'plateforme', 'grip.tools'],
  [/fetcherr/i, 'Fetcherr', 'plateforme', 'fetcherr.io'],
  [/liveramp/i, 'LiveRamp', 'plateforme', 'liveramp.com'],
  [/\bstripe\b/i, 'Stripe', 'plateforme', 'stripe.com'],
  [/aws|sagemaker/i, 'AWS', 'plateforme', 'aws.amazon.com'],
  [/azure/i, 'Microsoft Azure', 'plateforme', 'azure.microsoft.com'],
  [/google cloud/i, 'Google Cloud', 'plateforme', 'cloud.google.com'],
  // Intégrateurs & agences
  [/accenture|artefact/i, 'Accenture / Artefact', 'partenaire', 'accenture.com'],
  [/boston consulting|\bbcg\b/i, 'Boston Consulting Group', 'partenaire', 'bcg.com'],
  [/publicis/i, 'Publicis Groupe', 'partenaire', 'publicis.com'],
  [/capgemini/i, 'Capgemini', 'partenaire', 'capgemini.com'],
  [/\bepam\b|empathy lab/i, 'EPAM', 'partenaire', 'epam.com'],
  [/\bwpp\b/i, 'WPP', 'partenaire', 'wpp.com'],
  [/\bomd\b|omnicom|hearts & science/i, 'Omnicom (OMD)', 'partenaire', 'omnicomgroup.com'],
  [/^microsoft$|microsoft \(/i, 'Microsoft (conseil)', 'partenaire', 'microsoft.com'],
];
function canonTool(nom = '', categorie = '') {
  const hit = CANON.find(([re]) => re.test(nom));
  if (hit) return { name: hit[1], groupe: hit[2], domain: hit[3] };
  const groupe = categorie === 'llm' ? 'ia' : categorie === 'integrateur' ? 'partenaire' : 'plateforme';
  return { name: nom.trim(), groupe, domain: '' };
}
function toolMatrix(cases) {
  const succ = cases.filter(c => c.type_fiche !== 'echec_retrait');
  const agg = new Map(); // name -> {name, groupe, domain, count, familles:{}}
  for (const c of succ) {
    const seen = new Set();
    for (const t of (c.stack_technique || [])) {
      const k = canonTool(t.nom, t.categorie);
      if (seen.has(k.name)) continue; // 1 comptage par cas
      seen.add(k.name);
      if (!agg.has(k.name)) agg.set(k.name, { ...k, count: 0, familles: {} });
      const e = agg.get(k.name);
      e.count++;
      const fam = c.axes?.famille || '?';
      e.familles[fam] = (e.familles[fam] || 0) + 1;
    }
  }
  return [...agg.values()].sort((a, b) => b.count - a.count);
}

function outilsPage(cases) {
  const all = toolMatrix(cases);
  const total = cases.filter(c => c.type_fiche !== 'echec_retrait').length;
  const logo = (dom) => dom ? `<img class="tool-logo" src="https://www.google.com/s2/favicons?sz=64&domain=${esc(dom)}" alt="" loading="lazy" onerror="this.remove()">` : '';
  const bar = (t, max) => {
    const nameHtml = t.domain ? `<a href="https://${esc(t.domain)}" target="_blank" rel="noopener">${logo(t.domain)}${esc(t.name)}</a>` : `<span>${esc(t.name)}</span>`;
    return `<div class="tool-row"><div class="tool-name">${nameHtml}</div><div class="tool-track"><span class="tool-fill" style="width:${Math.round(t.count / max * 100)}%"></span></div><div class="tool-count">${t.count}</div></div>`;
  };
  const section = (titre, sub, groupe) => {
    const items = all.filter(t => t.groupe === groupe).slice(0, 20);
    if (!items.length) return '';
    const max = items[0].count;
    return `<section class="section"><div class="section-head"><h2>${titre}</h2><p>${sub}</p></div><div class="tool-bars">${items.map(t => bar(t, max)).join('')}</div></section>`;
  };
  // matrice tools x familles (top 18 toutes catégories confondues hors partenaires)
  const fams = Object.keys(FAMILLES);
  const topTools = all.filter(t => t.groupe !== 'partenaire').slice(0, 18);
  const matMax = Math.max(...topTools.flatMap(t => fams.map(f => t.familles[f] || 0)), 1);
  const matrixRows = topTools.map(t => `<tr><th class="row-h">${t.domain ? logo(t.domain) : ''}${esc(t.name)}</th>${fams.map(f => {
    const n = t.familles[f] || 0;
    return `<td class="mcell"${n ? ` style="--i:${(n / matMax).toFixed(2)}"` : ''}>${n || ''}</td>`;
  }).join('')}</tr>`).join('');
  const matrix = `<div class="matrix-wrap"><table class="tool-matrix"><thead><tr><th></th>${fams.map(f => `<th class="col-h">${FAMILLES[f]}</th>`).join('')}</tr></thead><tbody>${matrixRows}</tbody></table></div>`;

  const body = `
  <section class="hero">
    <h1>${t("La stack réelle de l'IA <em>marketing</em>.", 'The real AI <em>marketing</em> stack.')}</h1>
    <p class="lede">${t(`Pas la théorie : les outils, plateformes et modèles effectivement déployés dans ${total} cas prouvés. Agrégé automatiquement depuis la stack technique de chaque fiche. Le décompte est en nombre de cas où l'outil apparaît.`, `Not theory: the tools, platforms and models actually deployed across ${total} proven cases. Aggregated automatically from each case's tech stack. The count is the number of cases where the tool appears.`)}</p>
  </section>
  ${section(t('Les IA et modèles les plus déployés', 'The most deployed AI and models'), t("Ce qui tourne réellement derrière, quand c'est publié.", 'What actually runs under the hood, when it is disclosed.'), 'ia')}
  ${section(t('Les plateformes et outils martech', 'Martech platforms and tools'), t('Là où se déploient les cas, du paid media au CRM.', 'Where the cases are deployed, from paid media to CRM.'), 'plateforme')}
  ${section(t('Les intégrateurs et agences', 'Integrators and agencies'), t("Qui aide les marques à déployer, quand c'est cité.", 'Who helps brands deploy, when it is named.'), 'partenaire')}
  <section class="section"><div class="section-head"><h2>${t("La matrice outils × type d'usage", 'The tools × use-case matrix')}</h2><p>${t("Quel outil sert quel type de use case. Plus la case est foncée, plus l'outil y est déployé.", 'Which tool serves which type of use case. The darker the cell, the more the tool is deployed there.')}</p></div>${matrix}</section>`;
  return page(t('La stack réelle de l\'IA marketing - AI Showreel', 'The real AI marketing stack - AI Showreel'), body, {
    desc: t('Les outils, plateformes et modèles IA effectivement déployés dans les cas marketing prouvés, agrégés et classés.', 'The AI tools, platforms and models actually deployed across proven marketing cases, aggregated and ranked.'), path: '/outils.html',
  });
}

// ---------- couche perception (l'acceptation cote clients) ----------
const PERCEPTION_DIR = join(ROOT, 'perception');
function loadPerception() {
  const load = (f) => { try { return JSON.parse(readFileSync(join(PERCEPTION_DIR, f), 'utf8')); } catch { return null; } };
  return { pays: load('pays.json'), usages: load('usages.json'), attentes: load('attentes.json') };
}
const PERCEPTION = loadPerception();

function statCard(ch) {
  return `<div class="p-stat"><div class="p-stat-val">${esc(ch.valeur)}</div><div class="p-stat-label">${esc(ch.stat)}${ch.annee ? ` <span class="p-stat-year">(${esc(ch.annee)})</span>` : ''}</div></div>`;
}
function sourcesLine(sources = []) {
  return sources.length ? `<p class="p-sources">${t('Sources : ', 'Sources: ')}${sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.institut)}${s.annee ? ' ' + esc(s.annee) : ''}</a>${s.fiabilite === 'T1_primaire' ? '' : ` <span class="fiab fiab-t3">${t('presse', 'press')}</span>`}`).join(' · ')}</p>` : '';
}

// Encart perception par famille, injecte automatiquement sur chaque fiche succes
function perceptionBlock(famille) {
  const u = PERCEPTION.usages?.usages?.find(x => x.famille === famille);
  if (!u) return '';
  return `<section class="block block-perception">
    <div class="block-head"><h2>${t("Comment vos clients perçoivent ce type d'usage", 'How your customers perceive this type of use')}</h2><span class="percep-tag">${t('Études sourcées', 'Sourced studies')}</span></div>
    <p>${esc(u.resume)}</p>
    <div class="p-stats">${(u.chiffres || []).slice(0, 3).map(statCard).join('')}</div>
    <div class="percep-cols">
      ${u.conditions_acceptation?.length ? `<div><h4>${t("Conditions d'acceptation", 'Acceptance conditions')}</h4><ul>${u.conditions_acceptation.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${u.lignes_rouges?.length ? `<div class="percep-rouge"><h4>${t('Lignes rouges', 'Red lines')}</h4><ul>${u.lignes_rouges.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </div>
    ${sourcesLine(u.sources)}
    <p class="percep-more"><a href="${P()}/perception.html">${t("Voir l'acceptation complète : par pays, par usage, par génération", 'See full acceptance: by country, by use, by generation')}</a></p>
  </section>`;
}

function perceptionPage() {
  const PC = PERCEPTION;
  if (!PC.pays || !PC.usages || !PC.attentes) return page(t('L\'acceptation - AI Showreel', 'Acceptance - AI Showreel'), `<p>${t('Données en cours de collecte.', 'Data being collected.')}</p>`, {});
  const paysBlocks = PC.pays.pays.map(p => `
    <div class="pays-card">
      <h3>${esc(p.nom)}</h3>
      <div class="p-stats">${(p.chiffres || []).slice(0, 3).map(statCard).join('')}</div>
      <p class="pays-lecture">${esc(p.lecture)}</p>
      ${sourcesLine(p.sources?.slice(0, 3))}
    </div>`).join('');

  const usageBlocks = PC.usages.usages.map(u => `
    <section class="pattern-group">
      <div class="pg-head"><h2>${esc(u.titre_lisible)}</h2></div>
      <p>${esc(u.resume)}</p>
      <div class="p-stats">${(u.chiffres || []).slice(0, 4).map(statCard).join('')}</div>
      <div class="percep-cols">
        ${u.conditions_acceptation?.length ? `<div><h4>Conditions d'acceptation</h4><ul>${u.conditions_acceptation.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${u.lignes_rouges?.length ? `<div class="percep-rouge"><h4>Lignes rouges</h4><ul>${u.lignes_rouges.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      </div>
      ${sourcesLine(u.sources)}
    </section>`).join('');

  const themeBlock = (t) => `
    <section class="pattern-group">
      <div class="pg-head"><h2>${esc(t.titre_lisible || t.theme)}</h2></div>
      <p>${esc(t.resume)}</p>
      <div class="p-stats">${(t.chiffres || []).slice(0, 4).map(statCard).join('')}</div>
      ${sourcesLine(t.sources)}
    </section>`;

  const body = `
  <section class="hero">
    <h1>${t('Ce que vos clients <em>acceptent</em> vraiment.', 'What your customers <em>actually accept</em>.')}</h1>
    <p class="lede">${t("D'un côté ce que les marques déploient (la base). De l'autre, ce que les clients en perçoivent : l'enthousiasme et la méfiance par pays, l'acceptation par type d'usage, et les conditions qu'ils posent. Tout est tiré d'études représentatives, sourcées et datées.", 'On one side, what brands deploy (the index). On the other, how customers perceive it: enthusiasm and distrust by country, acceptance by type of use, and the conditions they set. All drawn from representative studies, sourced and dated.')}</p>
  </section>
  <section class="section"><div class="section-head"><h2>${t("Par type d'usage", 'By type of use')}</h2><p>${t("L'acceptation n'est pas uniforme : chaque famille de la base a ses conditions et ses lignes rouges.", 'Acceptance is not uniform: each family in the index has its own conditions and red lines.')}</p></div>${usageBlocks}</section>
  <section class="section"><div class="section-head"><h2>${t('Par pays', 'By country')}</h2><p>${esc(PC.pays.note_methodologique || '')}</p></div><div class="pays-grid">${paysBlocks}</div></section>
  <section class="section"><div class="section-head"><h2>${t('Les attentes transverses', 'Cross-cutting expectations')}</h2></div>${(PC.attentes.attentes || []).map(themeBlock).join('')}</section>
  <section class="section"><div class="section-head"><h2>${t("L'adoption réelle", 'Actual adoption')}</h2><p>${t("L'écart entre la méfiance déclarée et l'usage effectif est l'insight le plus important de cette page.", 'The gap between stated distrust and actual usage is the most important insight on this page.')}</p></div>${(PC.attentes.adoption || []).map(themeBlock).join('')}</section>
  <section class="section"><div class="section-head"><h2>${t('Par génération', 'By generation')}</h2></div>${(PC.attentes.generations || []).map(themeBlock).join('')}</section>`;
  return page(t('L\'acceptation de l\'IA par les clients - AI Showreel', 'How customers accept AI - AI Showreel'), body, {
    desc: t('Comment les consommateurs perçoivent l\'IA : par pays, par type d\'usage, par génération. Études représentatives sourcées.', 'How consumers perceive AI: by country, by type of use, by generation. Representative, sourced studies.'), path: '/perception.html',
  });
}

// ---------- analyse cross-industrie (le coeur du produit) ----------
const groupKey = (c) => `${c.axes?.famille}|${c.axes?.levier}`;
const groupSlug = (c) => `${c.axes?.famille}-${c.axes?.levier}`.replace(/_/g, '-');
const groupLabel = (c) => `${FAMILLES[c.axes?.famille] || ''} × ${LEVIERS[c.axes?.levier] || ''}`;
function crossStats(c, all) {
  const succ = all.filter(x => x.type_fiche !== 'echec_retrait');
  const peers = succ.filter(x => groupKey(x) === groupKey(c));
  const covered = [...new Set(peers.map(x => x.industrie))];
  const weight = {}; for (const x of succ) weight[x.industrie] = (weight[x.industrie] || 0) + 1;
  const missing = Object.keys(INDUSTRIES).filter(i => i !== 'autre' && weight[i] && !covered.includes(i))
    .sort((x, y) => (weight[y] || 0) - (weight[x] || 0));
  return { peers, covered, missing };
}

// ---------- page fiche ----------
function fichePage(c, all = []) {
  const a = c.axes || {};
  // Contenu traduit : lit i18n.en en EN, retombe sur le FR sinon. Jamais valeur/dates/sources/citation_exacte.
  const L = LANG === 'en' ? (c.i18n?.en || {}) : null;
  const F = (fr, en) => (L && en != null) ? en : fr;
  const seo = c.seo || {};
  const eseo = L?.seo || {};
  const isEchec = c.type_fiche === 'echec_retrait';
  const topResult = (c.resultats || [])[0];
  const topMetric = F(topResult?.metrique, L?.resultats?.[0]?.metrique);
  const cross = crossStats(c, all);
  const related = all.filter(x => x.id !== c.id && x.type_fiche === c.type_fiche
    && x.axes?.famille === a.famille && x.axes?.levier === a.levier
    && x.industrie !== c.industrie).slice(0, 3);
  const crossBanner = (!isEchec && cross.covered.length >= 2) ? `
    <a class="cross-banner" href="${P()}/patterns.html#${groupSlug(c)}">
      <span class="cb-proof">${t('Pattern prouvé dans', 'Pattern proven in')} <strong>${cross.covered.length} ${t('industries', 'industries')}</strong></span>
      ${cross.missing.length ? `<span class="cb-gap">${t('encore vierge en', 'still untouched in')} ${cross.missing.slice(0, 3).map(i => INDUSTRIES[i]).join(', ')}${cross.missing.length > 3 ? ` +${cross.missing.length - 3}` : ''}</span>` : ''}
      <span class="cb-arrow">${t('Voir la carte du pattern', 'See the pattern map')}</span>
    </a>` : '';
  const chips = [
    [t('Industrie', 'Industry'), INDUSTRIES[c.industrie]], [t('Levier', 'Lever'), LEVIERS[a.levier]],
    [t('Famille', 'Family'), FAMILLES[a.famille]], [t('Implémentation', 'Implementation'), IMPLEM[c.implementation]],
    [t('Étape', 'Stage'), F(a.etape_parcours, L?.etape_parcours)],
  ].filter(([, v]) => v).map(([k, v]) => `<span class="chip"><span class="chip-k">${k}</span>${esc(v)}</span>`).join('');

  const results = (c.resultats || []).map((r, i) => `
    <div class="result-card">
      <div class="result-val${longStat(r.valeur) ? ' rv-long' : ''}">${esc(r.valeur)}</div>
      <div class="result-metric">${esc(F(r.metrique, L?.resultats?.[i]?.metrique))}</div>
      <div class="result-cite">“${esc(r.citation_exacte)}” <a href="#src-${esc(r.source_ref)}">${esc(r.source_ref)}</a></div>
    </div>`).join('');

  const sources = (c.sources || []).map(s => `
    <li id="src-${esc(s.ref)}"><span class="src-ref">${esc(s.ref)}</span>
      <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titre)}</a>
      ${fiabBadge(s.fiabilite)}
      <span class="src-meta">${esc(host(s.url))}${s.date_publication ? ' · ' + esc(s.date_publication) : ''} · ${t('consulté le', 'accessed')} ${esc(s.consulte_le)}</span>
      ${s.archive_url ? `<a class="src-archive" href="${esc(s.archive_url)}" target="_blank" rel="noopener">${t('archive', 'archive')}</a>` : `<span class="src-archive pending">${t('archive à générer', 'archive pending')}</span>`}
    </li>`).join('');

  const flow = c.schema_flow ? `
    <section class="block">
      <div class="block-head"><h2>${t('Comment ça fonctionne', 'How it works')}</h2>
        <span class="flow-mode flow-${c.schema_flow.statut}">${c.schema_flow.statut === 'documente' ? t('Architecture documentée', 'Documented architecture') : t('Approche-type inférée', 'Inferred typical approach')}</span>
      </div>
      ${c.schema_flow.statut === 'approche_type' ? `<p class="approche-note">${t("Le détail interne n'est pas public. Voici une approche éprouvée qui mène au même résultat — à adapter à votre stack.", 'The internal detail is not public. Here is a proven approach that leads to the same result, to adapt to your stack.')}</p>` : ''}
      <div class="flow-wrap">${renderFlow(c.schema_flow)}</div>
      ${c.stack_technique?.length ? `<div class="tech-detail"><h4>${t('La stack en détail', 'The stack in detail')}</h4><ul>${c.stack_technique.map((tk, i) => `
        <li><span class="tech-cat tech-${esc(tk.categorie)}">${esc(tk.categorie)}</span>
          ${tk.url ? `<a href="${esc(tk.url)}" target="_blank" rel="noopener"><strong>${esc(tk.nom)}</strong></a>` : `<strong>${esc(tk.nom)}</strong>`}
          ${tk.detail ? `<span class="tech-note">${esc(F(tk.detail, L?.stack_technique?.[i]?.detail))}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
    </section>` : '';

  const fo = c.fonctionnement_operationnel;
  const efo = L?.fonctionnement_operationnel;
  const acteurClass = (x = '') => {
    const s = x.toLowerCase();
    if (s.includes('ia') || s.includes('algo') || s.includes('modèle')) return 'act-ia';
    if (s.includes('data')) return 'act-data';
    if (s.includes('market') || s.includes('media') || s.includes('crm')) return 'act-mkt';
    if (s.includes('agence')) return 'act-agence';
    if (s.includes('client')) return 'act-client';
    return 'act-autre';
  };
  const foBlock = fo ? `
    <section class="block">
      <div class="block-head"><h2>${t('Comment ça tourne, concrètement', 'How it runs, concretely')}</h2><span class="ops-tag">${t('Pour les équipes ops', 'For ops teams')}</span></div>
      <div class="ops-meta">
        <div class="ops-kv"><span>${t('Cadence', 'Cadence')}</span><strong>${esc(F(fo.cadence, efo?.cadence))}</strong></div>
        <div class="ops-kv"><span>${t('Opéré par', 'Operated by')}</span><strong>${esc(F(fo.opere_par, efo?.opere_par))}</strong></div>
      </div>
      <ol class="ops-steps">
        ${(fo.etapes || []).map((e, i) => `<li class="${acteurClass(e.acteur)}">
          <div class="ops-num">${i + 1}</div>
          <div class="ops-body"><div class="ops-etape">${esc(F(e.etape, efo?.etapes?.[i]?.etape))} <span class="ops-acteur">${esc(F(e.acteur, efo?.etapes?.[i]?.acteur))}</span></div><p>${esc(F(e.detail, efo?.etapes?.[i]?.detail))}</p></div>
        </li>`).join('')}
      </ol>
      ${fo.signal_pilote ? `<div class="ops-signal"><span>${t('Le signal qui pilote', 'The signal that drives it')}</span><p>${esc(F(fo.signal_pilote, efo?.signal_pilote))}</p></div>` : ''}
    </section>` : '';

  const rep = c.replication;
  const erep = L?.replication;
  const repBlock = rep ? `
    <section class="block block-infere">
      <div class="block-head"><h2>${t('Comment répliquer', 'How to replicate')}</h2><span class="infere-tag">${t('Inférence — non sourcé', 'Inference, not sourced')}</span></div>
      <div class="rep-grid">
        <div><h4>${t('Prérequis data', 'Data prerequisites')}</h4><ul>${(F(rep.prerequis_data, erep?.prerequis_data) || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        ${rep.prerequis_orga?.length ? `<div><h4>${t('Prérequis orga', 'Org prerequisites')}</h4><ul>${(F(rep.prerequis_orga, erep?.prerequis_orga) || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <div><h4>${t('Stack possible', 'Possible stack')}</h4><ul>${(F(rep.stack_possible, erep?.stack_possible) || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      ${rep.equipe ? `<div class="rep-foot"><div class="rep-kv"><span>${t('Équipe pour opérer', 'Team to operate')}</span><strong>${esc(F(rep.equipe, erep?.equipe))}</strong></div></div>` : ''}
      ${rep.playbook?.length ? `<div class="playbook"><h4>${t('Le plan, étape par étape', 'The plan, step by step')}</h4><ol>${rep.playbook.map((p, i) => `
        <li><div class="pb-phase">${t('Étape', 'Step')} ${i + 1}</div>
          <div class="pb-body"><strong>${esc(F(p.action, erep?.playbook?.[i]?.action))}</strong>${p.livrable ? `<span class="pb-livrable">${t('Livrable :', 'Deliverable:')} ${esc(F(p.livrable, erep?.playbook?.[i]?.livrable))}</span>` : ''}</div></li>`).join('')}</ol></div>` : ''}
      <p class="rep-first"><strong>${t('Première étape :', 'First step:')}</strong> ${esc(F(rep.premiere_etape, erep?.premiere_etape))}</p>
    </section>` : '';

  const pm = c.post_mortem;
  const epm = L?.post_mortem;
  const pmBlock = pm ? `
    <section class="block block-pm">
      <div class="block-head"><h2>${t('Post-mortem', 'Post-mortem')}</h2><span class="pm-tag">${t('Cimetière', 'Graveyard')}</span></div>
      <h4>${t("Ce qui s'est passé", 'What happened')} <span class="src-flag">${t('sourcé', 'sourced')}</span></h4><p>${esc(F(pm.ce_qui_s_est_passe, epm?.ce_qui_s_est_passe))}</p>
      <h4>${t("Raison de l'échec", 'Reason for failure')} <span class="src-flag">${t('sourcé', 'sourced')}</span></h4><p>${esc(F(pm.raison_echec, epm?.raison_echec))}</p>
      ${pm.cout_estime ? `<h4>${t('Coût', 'Cost')} <span class="src-flag">${t('sourcé', 'sourced')}</span></h4><p>${esc(F(pm.cout_estime, epm?.cout_estime))}</p>` : ''}
      ${pm.signaux_avant_coureurs ? `<h4>${t('Signaux avant-coureurs', 'Warning signs')} <span class="infere-flag">${t('inféré', 'inferred')}</span></h4><p>${esc(F(pm.signaux_avant_coureurs, epm?.signaux_avant_coureurs))}</p>` : ''}
      <h4>${t('Leçons avec recul', 'Lessons in hindsight')} <span class="infere-flag">${t('inféré', 'inferred')}</span></h4><p>${esc(F(pm.lecons_avec_recul, epm?.lecons_avec_recul))}</p>
      ${pm.le_pattern_reste_il_valide ? `<div class="pm-verdict"><span>${t('Le pattern reste-t-il valide ?', 'Is the pattern still valid?')}</span><p>${esc(F(pm.le_pattern_reste_il_valide, epm?.le_pattern_reste_il_valide))}</p></div>` : ''}
    </section>` : '';

  const ue = c.transposable_ue;
  const resumeCitable = F(seo.resume_citable, eseo.resume_citable);
  const pointsCles = F(c.points_cles, L?.points_cles);
  const body = `
  <article class="fiche">
    <a class="back" href="${P()}/">${t('← La base', '← The index')}</a>
    <div class="fiche-top">
      <div class="fiche-top-main">
        <div class="badges">${preuveBadge(c.niveau_preuve?.niveau)} ${vivantBadge(c.statut_vivant?.statut)} ${isEchec ? `<span class="echec-badge">${t('Échec / retrait', 'Failure / pullback')}</span>` : ''}</div>
        <div class="fiche-title">${brandLogo(c, 'big')}<h1>${esc(c.marque)}</h1></div>
        <p class="pattern">${esc(F(a.pattern, L?.pattern) || '')}</p>
        <div class="chips">${chips}</div>
        ${crossBanner}
      </div>
      ${topResult ? `<div class="headline-stat ${isEchec ? 'hs-echec' : ''}">
        <div class="hs-val${longStat(topResult.valeur) ? ' hs-long' : ''}">${esc(topResult.valeur)}</div>
        <div class="hs-metric">${esc(topMetric)}</div>
        <div class="hs-src">“${esc(topResult.citation_exacte)}” <a href="#src-${esc(topResult.source_ref)}">${esc(topResult.source_ref)}</a></div>
      </div>` : ''}
    </div>

    <div class="fiche-cols">
      <div class="fiche-main">
        ${resumeCitable ? `<p class="citable-lead">${esc(resumeCitable)}</p>` : ''}
        ${pointsCles?.length ? `<section class="essentiel"><h2>${t("L'essentiel", 'Key points')}</h2><ul>${pointsCles.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>` : ''}
        <section class="block"><h2>${t('Objectif', 'Objective')}</h2><p>${esc(F(c.objectif_business, L?.objectif_business))}</p></section>
        <section class="block"><h2>${t('Le déploiement', 'The deployment')}</h2><p>${esc(F(c.description, L?.description))}</p></section>
        ${mediaBlock(c)}
        ${results ? `<section class="block"><h2>${t('Résultats', 'Results')} <span class="grade-inline">${preuveBadge(c.niveau_preuve?.niveau)}</span></h2><div class="results">${results}</div><p class="preuve-just">${esc(F(c.niveau_preuve?.justification, L?.niveau_preuve?.justification) || '')}</p></section>` : ''}
        ${flow}
        ${foBlock}
        ${pmBlock}
        ${perceptionBlock(a.famille)}
        ${repBlock}
        ${related.length ? `<section class="block block-related">
          <div class="block-head"><h2>${isEchec ? t('Le même piège, ailleurs', 'The same trap, elsewhere') : t("Le même pattern, prouvé dans d'autres industries", 'The same pattern, proven in other industries')}</h2></div>
          <div class="cards related-cards">${related.map(caseCard).join('')}</div>
          ${!isEchec && cross.missing.length ? `<p class="related-gap">${t('Aucun déploiement prouvé de ce pattern en', 'No proven deployment of this pattern in')} <strong>${cross.missing.slice(0, 5).map(i => INDUSTRIES[i]).join(', ')}</strong>${cross.missing.length > 5 ? t(` et ${cross.missing.length - 5} autres industries`, ` and ${cross.missing.length - 5} more industries`) : ''}${t(" : c'est là que se trouve la fenêtre.", ': that is where the opening is.')}</p>` : ''}
        </section>` : ''}
      </div>
      <aside class="fiche-side">
        <div class="side-card">
          <h3>${t('Preuve', 'Evidence')}</h3>
          <div class="side-kv"><span>${t('Niveau', 'Level')}</span>${preuveBadge(c.niveau_preuve?.niveau)}</div>
          <div class="side-kv"><span>${t('Vivacité', 'Liveness')}</span>${vivantBadge(c.statut_vivant?.statut)}</div>
          <p class="side-note">${esc(F(c.statut_vivant?.note, L?.statut_vivant?.note) || '')}</p>
        </div>
        <div class="side-card">
          <h3>${t('Dates', 'Dates')}</h3>
          <div class="side-kv"><span>${t('Lancement', 'Launch')}</span><strong>${esc(c.dates?.lancement || '—')}</strong></div>
          <div class="side-kv"><span>${t('Dernier signal', 'Last signal')}</span><strong>${esc(c.dates?.derniere_confirmation_activite || '—')}</strong></div>
          <div class="side-kv"><span>${t('Vérifié le', 'Verified on')}</span><strong>${esc(c.dates?.verifie_le || '—')}</strong></div>
        </div>
        <div class="side-card">
          <h3>${t('Stack / plateforme', 'Stack / platform')}</h3>
          <ul class="side-tags tools">${(a.plateforme_stack || []).map(toolLink).join('')}</ul>
        </div>
        ${ue ? `<div class="side-card side-ue ue-${ue.flag}">
          <h3>${t('Transposable UE', 'Transposable to EU')}</h3>
          <div class="ue-flag">${ue.flag.replace(/_/g, ' ')}</div>
          <p class="side-note">${esc(F(ue.note, L?.transposable_ue?.note))}</p>
        </div>` : ''}
        ${(c.type_fiche !== 'echec_retrait' && (c.marque_linkedin || c.intervenants?.length || c.agences?.length)) ? `<div class="side-card side-people">
          <h3>${t("Qui l'a porté", 'Who drove it')}</h3>
          ${c.marque_linkedin ? `<a class="li-company" href="${esc(c.marque_linkedin)}" target="_blank" rel="noopener"><span class="li-ic">in</span>${esc(c.marque)}</a>` : ''}
          ${c.intervenants?.length ? `<ul class="people">${c.intervenants.map(p => `
            <li>${p.linkedin_url ? `<a href="${esc(p.linkedin_url)}" target="_blank" rel="noopener"><span class="li-ic">in</span>${esc(p.nom)}</a>` : `<span class="person-noli">${esc(p.nom)}</span>`}
              <span class="person-role">${esc(p.role)} <a class="person-src" href="#src-${esc(p.source_ref)}">${esc(p.source_ref)}</a></span></li>`).join('')}</ul>` : ''}
          ${c.agences?.length ? `<div class="agences"><span class="agences-h">${t('Agences & partenaires', 'Agencies & partners')}</span><ul class="people">${c.agences.map(ag => `
            <li>${ag.linkedin_url ? `<a href="${esc(ag.linkedin_url)}" target="_blank" rel="noopener"><span class="li-ic">in</span>${esc(ag.nom)}</a>` : `<span class="person-noli">${esc(ag.nom)}</span>`}
              <span class="person-role">${esc(ag.role)} <a class="person-src" href="#src-${esc(ag.source_ref)}">${esc(ag.source_ref)}</a></span></li>`).join('')}</ul></div>` : ''}
        </div>` : ''}
        <div class="side-card side-visual">
          <h3>${t('Preuve visuelle', 'Visual proof')}</h3>
          ${c.preuve_visuelle?.url_capture ? `<img src="${esc(c.preuve_visuelle.url_capture)}" alt="capture ${esc(c.marque)}">` : `<div class="visual-pending">${t('Capture datée à générer (PeekShot)', 'Dated screenshot pending (PeekShot)')}</div>`}
        </div>
      </aside>
    </div>

    <section class="block block-sources"><h2>${t('Sources', 'Sources')}</h2><ol class="sources">${sources}</ol></section>

    <section class="feedback">
      <div>
        <h3>${t('Une erreur, une info plus récente, une source&nbsp;?', 'An error, newer info, a source?')}</h3>
        <p>${t("Cette fiche vit de sa justesse. Si un chiffre a bougé, si le déploiement a changé, ou si vous avez une source de meilleure qualité, dites-le nous. Toute correction sourcée est vérifiée avant publication.", 'This page lives on its accuracy. If a figure has moved, if the deployment has changed, or if you have a higher-quality source, tell us. Every sourced correction is verified before publication.')}</p>
      </div>
      <a class="feedback-btn" href="${feedbackLink(c)}">${t('Proposer une correction', 'Suggest a correction')}</a>
    </section>
  </article>`;

  const _url = SITE + P() + `/cas/${c.id}.html`;
  const _kw = [INDUSTRIES[c.industrie], LEVIERS[a.levier], FAMILLES[a.famille], F(a.pattern, L?.pattern), ...(c.stack_technique || []).map(tk => tk.nom)].filter(Boolean).join(', ');
  const _title = F(seo.title, eseo.title) || `${c.marque} - AI Showreel`;
  const _desc = F(seo.meta_description, eseo.meta_description) || resumeCitable || '';
  const nodes = [{
    '@type': 'Article',
    '@id': _url + '#article',
    headline: F(seo.title, eseo.title) || c.marque,
    description: _desc,
    about: { '@type': 'Thing', name: c.marque },
    keywords: _kw, inLanguage: LANG,
    datePublished: c.dates?.verifie_le, dateModified: c.dates?.verifie_le,
    mainEntityOfPage: _url, isPartOf: { '@id': SITE + '/#site' },
    author: { '@id': SITE + '/#org' }, publisher: { '@id': SITE + '/#org' },
    citation: (c.sources || []).map(s => ({ '@type': 'CreativeWork', name: s.titre, url: s.url })),
  }, {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('La base', 'The index'), item: SITE + P() + '/' },
      { '@type': 'ListItem', position: 2, name: INDUSTRIES[c.industrie], item: SITE + P() + `/rapport/${industrySlug(c.industrie)}.html` },
      { '@type': 'ListItem', position: 3, name: c.marque, item: _url },
    ],
  }];
  const efaq = F(seo.faq, eseo.faq);
  if (efaq?.length) nodes.push({ '@type': 'FAQPage', mainEntity: efaq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  return page(_title, body, { desc: _desc, jsonld: JSON.stringify(nodes), path: `/cas/${c.id}.html` });
}

// ---------- matrice de couverture ----------
function coverageMatrix(cases, { echec = false } = {}) {
  const inds = Object.keys(INDUSTRIES).filter(i => cases.some(c => c.industrie === i));
  const levs = Object.keys(LEVIERS);
  let rows = inds.map(ind => {
    const cells = levs.map(lev => {
      const hits = cases.filter(c => c.industrie === ind && c.axes?.levier === lev);
      const cross = `${INDUSTRIES[ind]} × ${LEVIERS[lev]}`;
      if (!hits.length) return `<td class="cell empty" data-row="${ind}" data-col="${lev}" data-empty="1" data-cross="${esc(cross)}" role="button" tabindex="0" aria-label="${t('Angle mort', 'Blind spot')} : ${esc(cross)} — ${t('aucun cas prouvé publiquement', 'no publicly proven case')}"></td>`;
      const best = hits.map(h => h.niveau_preuve?.niveau).sort()[0];
      return `<td class="cell filled g-${best}" data-row="${ind}" data-col="${lev}"><a class="mcell-link" href="${P()}/?ind=${ind}&lev=${lev}#cas" data-ind="${ind}" data-lev="${lev}" aria-label="${hits.length} ${t('cas prouvés', 'proven cases')} — ${esc(cross)}" title="${hits.length} ${t('cas prouvés', 'proven cases')} : ${esc(cross)}">${hits.length}</a></td>`;
    }).join('');
    return `<tr><th class="row-h" data-row="${ind}">${INDUSTRIES[ind]}</th>${cells}</tr>`;
  }).join('');
  const head = levs.map(l => `<th class="col-h" data-col="${l}">${LEVIERS[l]}</th>`).join('');
  return `<div class="matrix-wrap"><table class="matrix"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>
    <p class="matrix-legend"><span class="lg cell empty"></span> ${t('angle mort (opportunité)', 'blind spot (opportunity)')} &nbsp; <span class="lg cell filled g-A"></span> ${t('preuve forte', 'strong evidence')} &nbsp; ${t('le chiffre = nombre de cas prouvés', 'the number = count of proven cases')}</p></div>`;
}

// Rendu "texte lisible" (pas chiffre-heros geant) si la valeur est longue OU si elle ne contient
// aucun chiffre (resultat qualitatif) : on ne force jamais un non-chiffre en gros stat bleu.
const longStat = v => { const s = String(v || '').replace(/\s+/g, ' ').trim(); return s.length > 20 || !/[0-9]/.test(s); };

function caseCard(c) {
  const a = c.axes || {};
  const top = (c.resultats || [])[0];
  const en = LANG === 'en' ? (c.i18n?.en || {}) : null;
  const pat = (en && en.pattern != null) ? en.pattern : a.pattern;
  const metr = (en && en.resultats?.[0]?.metrique != null) ? en.resultats[0].metrique : top?.metrique;
  return `<a class="card" href="${P()}/cas/${c.id}.html" data-ind="${c.industrie}" data-lev="${a.levier || ''}">
    <div class="card-head">${brandLogo(c)}<div class="card-badges">${preuveBadge(c.niveau_preuve?.niveau)} ${vivantBadge(c.statut_vivant?.statut)}</div></div>
    <h3>${esc(c.marque)}</h3>
    <p class="card-pattern">${esc(pat || '')}</p>
    ${top ? `<div class="card-result"><strong${longStat(top.valeur) ? ' class="cr-long"' : ''}>${esc(top.valeur)}</strong> ${esc(metr)}</div>` : ''}
    <div class="card-foot"><span>${esc(INDUSTRIES[c.industrie] || '')}</span><span>${esc(FAMILLES[a.famille] || '')}</span></div>
  </a>`;
}

// ---------- index ----------
function indexPage(cases) {
  const succes = cases.filter(c => c.type_fiche !== 'echec_retrait');
  const hCas = succes.length;
  const hInd = new Set(succes.map(c => c.industrie)).size;
  const hAB = succes.filter(c => ['A', 'B'].includes(c.niveau_preuve?.niveau)).length;
  const lastUpd = cases.map(c => c.dates?.verifie_le).filter(Boolean).sort().pop() || '';
  const nextChk = cases.map(c => c.dates?.revoir_apres).filter(Boolean).sort()[0] || '';
  const body = `
  <section class="hero">
    <canvas class="hero-constellation" aria-hidden="true" data-dots="${hCas}"></canvas>
    <h1>${t('Ce que les leaders de votre secteur ont <em class="hero-shimmer">vraiment</em> déployé en IA.', 'What the leaders in your industry have <em class="hero-shimmer">actually</em> deployed in AI.')}</h1>
    <p class="lede">${t("Un index indépendant des déploiements IA à l'échelle en marketing digital. Chaque cas est noté sur une échelle de preuve publique, vérifié vivant à sa date, et mappé sur le parcours client. Pas de POC, pas de biais vendeur, pas de slides périmées.", 'An independent index of AI deployments at scale in digital marketing. Every case is graded on a public evidence scale, verified live at its date, and mapped to the customer journey. No POCs, no vendor bias, no stale slides.')}</p>
    <div class="hero-kpis">
      <div class="hero-kpi"><span class="type-kpi-giga num count-target" data-countup data-target="${hCas}">${hCas}</span><span class="type-kpi-label">${t('cas prouvés', 'proven cases')}</span></div>
      <span class="hero-kpi-sep" aria-hidden="true">·</span>
      <div class="hero-kpi"><span class="type-kpi-giga num count-target" data-countup data-target="${hInd}">${hInd}</span><span class="type-kpi-label">${t('industries', 'industries')}</span></div>
      <span class="hero-kpi-sep" aria-hidden="true">·</span>
      <div class="hero-kpi"><span class="type-kpi-giga num count-target" data-countup data-target="${hAB}">${hAB}</span><span class="type-kpi-label">${t('en preuve A/B', 'at evidence A/B')}</span></div>
    </div>
    <p class="hero-meta">${t('Dernière vérification', 'Last verified')} : <span class="num">${esc(lastUpd)}</span> · ${t('prochaine revue à partir de', 'next review from')} <span class="num">${esc(nextChk)}</span></p>
  </section>

  <section class="section">
    <div class="section-head"><h2>${t('La matrice de couverture', 'The coverage matrix')}</h2><p>${t("Où les leaders investissent — et où personne n'ose encore. Les cases vides sont vos angles morts.", 'Where leaders invest, and where no one dares yet. The empty cells are your blind spots.')}</p></div>
    ${coverageMatrix(succes)}
  </section>

  <section class="section" id="cas">
    <div class="section-head"><h2>${t('Les cas', 'The cases')}</h2><p>${t('Triés, sourcés, datés. Filtrez par levier, ou cliquez une case de la matrice.', 'Sorted, sourced, dated. Filter by growth lever, or click a matrix cell.')}</p></div>
    <div class="cas-filter" role="group" aria-label="${t('Filtrer par levier', 'Filter by lever')}">
      <button type="button" class="cf-btn is-on" data-lev="">${t('Tous', 'All')}</button>
      ${Object.entries(LEVIERS).map(([k, v]) => `<button type="button" class="cf-btn" data-lev="${k}">${esc(v)}</button>`).join('')}
      <span class="cf-count" aria-live="polite"></span>
    </div>
    <div class="cards">${succes.map(caseCard).join('')}</div>
  </section>

  <section class="feedback">
    <div><h3>${t("Faites référencer votre cas d'usage", 'Get your use case listed')}</h3><p>${t("Votre marque a déployé l'IA à l'échelle en marketing, avec un résultat public ? Proposez-le. S'il passe le filtre de preuve (chiffre public, source vérifiable), il entre dans l'index - au même titre que les autres, sans passe-droit ni biais vendeur.", 'Has your brand deployed AI at scale in marketing, with a public result? Submit it. If it passes the evidence filter (public figure, verifiable source), it enters the index on the same footing as the rest, no favors, no vendor bias.')}</p></div>
    <a class="feedback-btn" href="${mailto('AI Showreel - faire référencer un cas d\'usage', 'Marque :\nLe déploiement IA (en une phrase) :\nLe résultat chiffré et public :\nLa source (URL earnings, presse établie ou étude) :\n\nRappel : un cas entre dans l\'index uniquement s\'il passe le filtre de preuve.')}">${t('Proposer votre cas', 'Submit your case')}</a>
  </section>
  <script>
(function(){
var cards=[].slice.call(document.querySelectorAll('#cas .card')),cnt=document.querySelector('#cas .cf-count'),btns=[].slice.call(document.querySelectorAll('#cas .cf-btn'));
var CASWORD=${JSON.stringify(t('cas', 'cases'))};
function setBtn(l){btns.forEach(function(x){x.classList.toggle('is-on',(x.dataset.lev||'')===(l||''));});}
function apply(i,l){var n=0;cards.forEach(function(c){var ok=(!i||c.dataset.ind===i)&&(!l||c.dataset.lev===l);c.style.display=ok?'':'none';if(ok)n++;});setBtn(l||'');cnt.textContent=(i||l)?(n+' '+CASWORD):'';}
btns.forEach(function(bn){bn.addEventListener('click',function(){apply('',bn.dataset.lev||'');history.pushState('','',location.pathname+(bn.dataset.lev?('?lev='+bn.dataset.lev):'')+'#cas');});});
[].slice.call(document.querySelectorAll('.mcell-link')).forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();apply(a.dataset.ind,a.dataset.lev);history.pushState('','',location.pathname+'?ind='+a.dataset.ind+'&lev='+a.dataset.lev+'#cas');var el=document.getElementById('cas');if(el)el.scrollIntoView({behavior:'smooth'});});});
var q=new URLSearchParams(location.search);if(q.get('ind')||q.get('lev'))apply(q.get('ind')||'',q.get('lev')||'');})();
  </script>`;
  const years = cases.map(c => (c.dates?.verifie_le || '').slice(0, 4)).filter(Boolean).sort();
  const temporal = years.length ? `${years[0]}/${years[years.length - 1]}` : '';
  const nInd = new Set(succes.map(c => c.industrie)).size;
  const dataset = {
    '@type': 'Dataset',
    '@id': SITE + '/#dataset',
    name: t('AI Showreel - index des déploiements IA prouvés en marketing digital', 'AI Showreel - index of proven AI deployments in digital marketing'),
    description: t(`Index indépendant de ${succes.length} déploiements IA réellement prouvés à l'échelle par de grandes marques en marketing digital, sur ${nInd} industries. Chaque cas est noté sur une échelle de preuve publique (de A à D), vérifié vivant à sa date, sourcé, et mappé sur le parcours client.`, `An independent index of ${succes.length} AI deployments actually proven at scale by major brands in digital marketing, across ${nInd} industries. Every case is graded on a public evidence scale (A to D), verified live at its date, sourced, and mapped to the customer journey.`),
    url: SITE + P() + '/',
    inLanguage: LANG,
    isAccessibleForFree: true,
    creator: { '@id': SITE + '/#org' },
    publisher: { '@id': SITE + '/#org' },
    isPartOf: { '@id': SITE + '/#site' },
    keywords: t('IA marketing, intelligence artificielle, cas d\'usage IA, marketing digital, preuve publique', 'AI marketing, artificial intelligence, AI use cases, digital marketing, public evidence').split(', '),
    variableMeasured: t('industrie, levier growth, niveau de preuve public, statut de vivacité, stack technique', 'industry, growth lever, public evidence level, liveness status, tech stack').split(', '),
    ...(temporal ? { temporalCoverage: temporal } : {}),
  };
  return page(t('AI Showreel — les déploiements IA prouvés du marketing digital', 'AI Showreel — the proven AI deployments of digital marketing'), body, {
    desc: t('Index indépendant des déploiements IA à l\'échelle en marketing digital, noté sur une échelle de preuve publique et vérifié vivant.', 'An independent index of AI deployments at scale in digital marketing, graded on a public evidence scale and verified live.'), path: '/',
    jsonld: JSON.stringify(dataset),
  });
}

function cimetierePage(cases) {
  const echecs = cases.filter(c => c.type_fiche === 'echec_retrait');
  const body = `
  <section class="hero hero-pm">
    <h1>${t("Le cimetière des cas d'usage", 'The use-case graveyard')}</h1>
    <p class="lede">${t("Ce que personne ne montre : les déploiements IA de grandes marques qui ont échoué, été retirés, ou fait machine arrière. Avec, à chaque fois, la vraie question — le pattern était-il condamné, ou seulement son exécution&nbsp;?", 'What no one shows: AI deployments by major brands that failed, were pulled back, or reversed. Each time with the real question: was the pattern doomed, or only its execution?')}</p>
  </section>
  <section class="section">
    ${echecs.length ? `<div class="cards">${echecs.map(caseCard).join('')}</div>` : `<p class="empty-note">${t("Collecte en cours — les premiers post-mortems arrivent (Air Canada, Zillow Offers, McDonald's voice AI).", 'Collection in progress: the first post-mortems are coming (Air Canada, Zillow Offers, McDonald\'s voice AI).')}</p>`}
  </section>`;
  return page(t('Le cimetière des cas d\'usage IA — AI Showreel', 'The AI use-case graveyard — AI Showreel'), body, {
    desc: t('Les déploiements IA de grandes marques qui ont échoué ou été retirés, documentés avec les leçons à en tirer.', 'AI deployments by major brands that failed or were pulled, documented with the lessons to draw from them.'), path: '/cimetiere.html',
  });
}

// ---------- page patterns : la carte cross-industrie ----------
function patternsPage(cases) {
  const succ = cases.filter(c => c.type_fiche !== 'echec_retrait');
  const groups = new Map();
  for (const c of succ) {
    const k = groupKey(c);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const sorted = [...groups.entries()]
    .map(([k, list]) => ({ k, list, cross: crossStats(list[0], cases) }))
    .filter(g => g.list.length >= 2)
    .sort((x, y) => y.cross.covered.length - x.cross.covered.length);

  const sections = sorted.map(g => {
    const c0 = g.list[0];
    const top = [...g.list].sort((x, y) => (x.niveau_preuve?.niveau || 'D').localeCompare(y.niveau_preuve?.niveau || 'D')).slice(0, 3);
    return `<section class="pattern-group" id="${groupSlug(c0)}">
      <div class="pg-head">
        <h2>${esc(groupLabel(c0))}</h2>
        <div class="pg-stats"><strong>${g.cross.covered.length}</strong> ${t('industries prouvées', 'proven industries')} · <strong>${g.list.length}</strong> ${t('cas', 'cases')}</div>
      </div>
      <div class="pg-industries">
        ${g.cross.covered.map(i => `<span class="ind-chip covered">${esc(INDUSTRIES[i] || i)}</span>`).join('')}
        ${g.cross.missing.map(i => `<span class="ind-chip open">${esc(INDUSTRIES[i] || i)}</span>`).join('')}
      </div>
      ${g.cross.missing.length ? `<p class="pg-gap">${t('Encore aucun déploiement prouvé en', 'No proven deployment yet in')} ${g.cross.missing.slice(0, 4).map(i => INDUSTRIES[i]).join(', ')}${g.cross.missing.length > 4 ? ` (+${g.cross.missing.length - 4})` : ''}.</p>` : `<p class="pg-gap pg-full">${t('Pattern prouvé dans toutes les industries couvertes par la base.', 'Pattern proven in every industry the index covers.')}</p>`}
      <div class="cards related-cards">${top.map(caseCard).join('')}</div>
    </section>`;
  }).join('');

  const body = `
  <section class="hero">
    <h1>${t('La carte des <em>patterns</em> cross-industrie.', 'The cross-industry <em>pattern</em> map.')}</h1>
    <p class="lede">${t("Un pattern prouvé dans plusieurs industries et absent de la vôtre n'est pas un risque : c'est une fenêtre. Cette carte montre, pour chaque pattern, où il est prouvé (plein) et où personne ne l'a encore déployé (hachuré).", 'A pattern proven across several industries and absent from yours is not a risk: it is an opening. This map shows, for each pattern, where it is proven (filled) and where no one has deployed it yet (hatched).')}</p>
  </section>
  ${sections}`;
  return page(t('La carte des patterns cross-industrie - AI Showreel', 'The cross-industry pattern map - AI Showreel'), body, {
    desc: t('Chaque pattern IA marketing, les industries où il est prouvé, et celles où personne ne l\'a encore déployé.', 'Every AI marketing pattern, the industries where it is proven, and those where no one has deployed it yet.'), path: '/patterns.html',
  });
}

function methodoPage() {
  const body = `
  <section class="section prose">
    <h1>${t('La méthodologie <span class="is-product">est</span> le produit.', 'The methodology <span class="is-product">is</span> the product.')}</h1>
    <p class="lede">${t("N'importe qui peut lister des cas d'usage IA. La valeur n'est pas la liste — c'est le regard. Trois disciplines qu'aucun agrégateur ne s'impose.", 'Anyone can list AI use cases. The value is not the list, it is the lens. Three disciplines no aggregator imposes on itself.')}</p>

    <h2>${t('1. Un niveau de preuve public sur chaque cas', '1. A public evidence level on every case')}</h2>
    <p>${t("~90 % des « cas d'usage IA » en circulation viennent des acteurs qui vendent la techno. Nous notons chaque cas sur une échelle explicite, et nous l'affichons :", 'About 90% of the "AI use cases" in circulation come from the players selling the tech. We grade every case on an explicit scale, and we display it:')}</p>
    <ul class="grades-legend">
      <li>${preuveBadge('A')} ${t('Résultats financiers, earnings call, décision de justice — la preuve la plus dure.', 'Financial results, earnings call, court ruling: the hardest proof.')}</li>
      <li>${preuveBadge('B')} ${t('Étude de cas plateforme/vendor chiffrée — utile mais biaisée, plafonnée à B.', 'Quantified platform/vendor case study: useful but biased, capped at B.')}</li>
      <li>${preuveBadge('C')} ${t('Presse majeure citant nommément la marque.', 'Major press naming the brand.')}</li>
      <li>${preuveBadge('D')} ${t('Déclaratif en conférence.', 'Statement at a conference.')}</li>
    </ul>
    <p>${t('Plusieurs sources concordantes font monter le niveau. Chaque chiffre renvoie à sa source, datée et archivée.', 'Several concordant sources raise the level. Every figure links back to its source, dated and archived.')}</p>

    <h2>${t('2. Vérifié vivant, à une date', '2. Verified live, at a date')}</h2>
    <p>${t('Les marques annoncent fort et enterrent en silence. Chaque cas porte un statut de vivacité et une date de vérification. Un cas qui meurt ne disparaît pas : il part au', 'Brands announce loudly and bury quietly. Every case carries a liveness status and a verification date. A case that dies does not disappear: it goes to the')} <a href="${P()}/cimetiere.html">${t('cimetière', 'graveyard')}</a>.</p>

    <h2>${t('3. Mappé sur le parcours client', '3. Mapped to the customer journey')}</h2>
    <p>${t('Tous les autres classent par industrie et par techno. Nous croisons industrie × levier growth (acquisition, conversion, rétention, monétisation) × preuve, pour que la <strong>matrice de couverture</strong> rende visibles les angles morts — là où personne n\'investit encore.', 'Everyone else sorts by industry and tech. We cross industry × growth lever (acquisition, conversion, retention, monetization) × evidence, so the <strong>coverage matrix</strong> makes the blind spots visible, where no one invests yet.')}</p>

    <div class="callout">
      <p><strong>${t('Faits vs inférence.', 'Facts vs inference.')}</strong> ${t("Ce qui est sourcé et ce qui est notre analyse (« comment répliquer », schémas approche-type) sont toujours séparés visuellement. Une seule affirmation présentée comme un fait qui n'en est pas un, et toute la base perd sa valeur. La crédibilité est le produit.", 'What is sourced and what is our analysis ("how to replicate", typical-approach diagrams) are always visually separated. A single claim presented as a fact that is not one, and the whole index loses its value. Credibility is the product.')}</p>
    </div>
  </section>`;
  return page(t('Méthodologie — AI Showreel', 'Methodology — AI Showreel'), body, { desc: t('Niveau de preuve public, vérification de vivacité, mapping sur le parcours client : la méthodologie qui distingue AI Showreel d\'un catalogue.', 'Public evidence level, liveness verification, customer-journey mapping: the methodology that sets AI Showreel apart from a catalogue.'), path: '/methodologie.html' });
}

// ---------- build ----------
// ---------- le radar / veille (le coeur de rétention, Reforge) ----------
function yearOf(s = '') { const m = String(s).match(/\b(20\d{2})\b/); return m ? +m[1] : 0; }
function dateOf(s = '') { const m = String(s).match(/(20\d{2})-(\d{2})-(\d{2})/) || String(s).match(/(20\d{2})-(\d{2})/); return m ? m[0] : (yearOf(s) ? String(yearOf(s)) : ''); }
function veillePage(cases) {
  const succ = cases.filter(c => c.type_fiche !== 'echec_retrait');
  const echecs = cases.filter(c => c.type_fiche === 'echec_retrait');
  const aSurveiller = succ.filter(c => ['signaux_mitiges', 'incertain'].includes(c.statut_vivant?.statut))
    .sort((a, b) => (a.dates?.revoir_apres || '').localeCompare(b.dates?.revoir_apres || ''));
  const recents = [...succ].sort((a, b) => yearOf(b.dates?.lancement) - yearOf(a.dates?.lancement)).slice(0, 12);
  const cimetiereFil = [...echecs].sort((a, b) => dateOf(b.dates?.date_retrait).localeCompare(dateOf(a.dates?.date_retrait))).slice(0, 8);
  const aRevoir = [...succ].filter(c => c.dates?.revoir_apres).sort((a, b) => a.dates.revoir_apres.localeCompare(b.dates.revoir_apres)).slice(0, 15);

  const rpat = (c) => { const en = LANG === 'en' ? c.i18n?.en?.pattern : null; return en != null ? en : (c.axes?.pattern || ''); };
  const row = (c, extra = '') => `<a class="veille-row" href="${P()}/cas/${c.id}.html">${brandLogo(c)}<div class="vr-main"><div class="vr-marque">${esc(c.marque)}</div><div class="vr-pattern">${esc(rpat(c))}</div></div><div class="vr-meta">${extra}</div></a>`;

  const body = `
  <section class="hero">
    <h1>${t('Le <em>radar</em>.', 'The <em>radar</em>.')}</h1>
    <p class="lede">${t("Les marques annoncent fort et enterrent en silence. Le radar suit ce qui bouge : les déploiements à surveiller, ceux qui viennent de mourir, les plus récents, et le calendrier de re-vérification. La preuve, ce n'est pas une photo, c'est un flux.", 'Brands announce loudly and bury quietly. The radar tracks what moves: deployments to watch, those that just died, the most recent ones, and the re-verification calendar. Proof is not a snapshot, it is a stream.')}</p>
  </section>

  <section class="section">
    <div class="section-head"><h2>${t('À surveiller', 'To watch')}</h2><p>${aSurveiller.length} ${t("cas au statut fragile (signaux mitigés ou incertain). Prochains à basculer, dans un sens ou dans l'autre.", 'cases with a fragile status (mixed signals or uncertain). Next to tip, one way or the other.')}</p></div>
    <div class="veille-list">${aSurveiller.slice(0, 12).map(c => row(c, `${vivantBadge(c.statut_vivant?.statut)}${c.dates?.revoir_apres ? `<span class="vr-date">${t('à revoir', 'review by')} ${esc(c.dates.revoir_apres)}</span>` : ''}`)).join('')}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>${t('Le fil du cimetière', 'The graveyard feed')}</h2><p>${t("Les derniers déploiements retirés, échoués ou en backpedal. L'alerte que personne d'autre n'envoie.", 'The latest deployments pulled, failed or walked back. The alert no one else sends.')}</p></div>
    <div class="veille-list">${cimetiereFil.map(c => row(c, `<span class="echec-badge">${t('retiré', 'pulled')}</span><span class="vr-date">${esc(dateOf(c.dates?.date_retrait) || '')}</span>`)).join('')}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>${t('Les déploiements les plus récents', 'The most recent deployments')}</h2></div>
    <div class="veille-list">${recents.map(c => row(c, `${preuveBadge(c.niveau_preuve?.niveau)}<span class="vr-date">${esc(dateOf(c.dates?.lancement) || '')}</span>`)).join('')}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>${t('Prochaines re-vérifications', 'Next re-verifications')}</h2><p>${t('Notre calendrier de fraîcheur, à découvert. Chaque cas porte une date de péremption de sa vérification.', 'Our freshness calendar, in the open. Every case carries an expiry date on its verification.')}</p></div>
    <div class="veille-list">${aRevoir.map(c => row(c, `<span class="vr-date">${esc(c.dates.revoir_apres)}</span>`)).join('')}</div>
  </section>

  <section class="feedback">
    <div><h3>${t('Le radar, chaque mois, dans votre boîte', 'The radar, every month, in your inbox')}</h3><p>${t("Ce qui a bougé dans l'IA marketing : nouveaux cas prouvés, cas morts, patterns émergents. La veille gratuite. La version par périmètre (votre secteur, votre stack) alerte dès qu'un cas apparaît ou meurt dans VOTRE matrice.", 'What moved in AI marketing: new proven cases, dead cases, emerging patterns. The free watch. The scoped version (your sector, your stack) alerts you the moment a case appears or dies in YOUR matrix.')}</p></div>
    <a class="feedback-btn" href="${mailto('Radar AI Showreel - abonnement', 'Je veux recevoir le radar mensuel.\n\nEmail :\nSecteur qui m\'intéresse :')}">${t('Recevoir le radar', 'Get the radar')}</a>
  </section>`;
  return page(t('Le radar de l\'IA marketing : ce qui bouge - AI Showreel', 'The AI marketing radar: what moves - AI Showreel'), body, {
    desc: t('Le suivi vivant des déploiements IA marketing : à surveiller, retirés, récents, et le calendrier de re-vérification.', 'The live tracking of AI marketing deployments: to watch, pulled, recent, and the re-verification calendar.'), path: '/veille.html',
  });
}

// ---------- générateur de rapports sectoriels (brique 3, version programmatique) ----------
function industrySlug(i) { return i.replace(/_/g, '-'); }
function reportPage(ind, cases) {
  const succ = cases.filter(c => c.type_fiche !== 'echec_retrait');
  const mine = succ.filter(c => c.industrie === ind);
  if (mine.length < 2) return null;
  const label = INDUSTRIES[ind];
  const levs = ['acquisition', 'activation_conversion', 'retention', 'monetisation'];

  // Angles morts : patterns (famille×levier) prouvés ailleurs, absents ici
  const myKeys = new Set(mine.map(groupKey));
  const otherGroups = new Map();
  for (const c of succ) {
    if (c.industrie === ind) continue;
    const k = groupKey(c);
    if (myKeys.has(k)) continue;
    if (!otherGroups.has(k)) otherGroups.set(k, []);
    otherGroups.get(k).push(c);
  }
  const blindSpots = [...otherGroups.entries()]
    .map(([k, list]) => ({ k, list, inds: new Set(list.map(x => x.industrie)).size }))
    .sort((a, b) => b.inds - a.inds).slice(0, 5);

  // Outils les plus déployés dans ce secteur
  const toolAgg = new Map();
  for (const c of mine) { const seen = new Set(); for (const t of (c.stack_technique || [])) { const k = canonTool(t.nom, t.categorie); if (seen.has(k.name)) continue; seen.add(k.name); toolAgg.set(k.name, (toolAgg.get(k.name) || 0) + 1); } }
  const topTools = [...toolAgg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const byLev = levs.map(l => ({ l, cases: mine.filter(c => c.axes?.levier === l) })).filter(g => g.cases.length);
  const nAB = mine.filter(c => ['A', 'B'].includes(c.niveau_preuve?.niveau)).length;
  const resume = t(
    `En ${label}, AI Showreel recense ${mine.length} déploiements IA marketing prouvés (${nAB} en preuve forte A/B), couvrant ${byLev.length} des 4 leviers growth. ${blindSpots.length ? `${blindSpots.length} patterns prouvés dans d'autres industries n'y sont pas encore déployés.` : ''}`,
    `In ${label}, AI Showreel lists ${mine.length} proven AI marketing deployments (${nAB} at strong evidence A/B), covering ${byLev.length} of the 4 growth levers. ${blindSpots.length ? `${blindSpots.length} patterns proven in other industries are not deployed here yet.` : ''}`);

  const body = `
  <section class="hero">
    <a class="back" href="${P()}/rapports.html">${t('← Tous les rapports', '← All reports')}</a>
    <h1>${t('Le plan de bataille IA du', 'The AI battle plan for')} <em>${esc(label)}</em>.</h1>
    <p class="lede citable">${esc(resume)}</p>
    <div class="hero-stats">
      <div><strong>${mine.length}</strong> ${t('cas prouvés', 'proven cases')}</div>
      <div><strong>${nAB}</strong> ${t('en preuve A/B', 'at evidence A/B')}</div>
      <div><strong>${blindSpots.length}</strong> ${t('angles morts', 'blind spots')}</div>
    </div>
  </section>

  ${byLev.map(g => `<section class="section">
    <div class="section-head"><h2>${esc(LEVIERS[g.l])}</h2><p>${g.cases.length} ${t('cas prouvés en', 'proven cases in')} ${esc(label)}.</p></div>
    <div class="cards">${g.cases.slice(0, 6).map(caseCard).join('')}</div>
  </section>`).join('')}

  ${blindSpots.length ? `<section class="section">
    <div class="section-head"><h2>${t('Vos angles morts : prouvé ailleurs, absent chez vous', 'Your blind spots: proven elsewhere, absent here')}</h2><p>${t('Ces patterns fonctionnent dans d\'autres industries et ne sont pas encore déployés en', 'These patterns work in other industries and are not deployed yet in')} ${esc(label)}. ${t("C'est là que se cache l'avance.", 'That is where the head start hides.')}</p></div>
    <div class="cards">${blindSpots.map(b => {
    const ex = b.list.sort((x, y) => (x.niveau_preuve?.niveau || 'D').localeCompare(y.niveau_preuve?.niveau || 'D'))[0];
    return `<a class="card" href="${P()}/cas/${ex.id}.html">
        <div class="card-head"><span class="ind-chip open">${t('angle mort', 'blind spot')}</span><div class="card-badges">${preuveBadge(ex.niveau_preuve?.niveau)}</div></div>
        <h3>${esc(FAMILLES[ex.axes?.famille])} × ${esc(LEVIERS[ex.axes?.levier])}</h3>
        <p class="card-pattern">${t('Prouvé dans', 'Proven in')} ${b.inds} ${t('autre(s) industrie(s). Exemple :', 'other industr(ies). Example:')} ${esc(ex.marque)} (${esc(INDUSTRIES[ex.industrie])}).</p>
      </a>`;
  }).join('')}</div>
  </section>` : ''}

  ${topTools.length ? `<section class="section">
    <div class="section-head"><h2>${t('La stack du secteur', 'The sector stack')}</h2><p>${t('Les outils et IA les plus déployés en', 'The most deployed tools and AI in')} ${esc(label)}.</p></div>
    <ul class="side-tags tools report-tools">${topTools.map(([n, v]) => `<li class="tool-chip"><span>${esc(n)} <b>${v}</b></span></li>`).join('')}</ul>
  </section>` : ''}

  <section class="feedback">
    <div><h3>${t('La version adaptée à VOTRE stack', 'The version tailored to YOUR stack')}</h3><p>${t("Ce rapport est la vue publique du secteur. La version personnalisée croise votre stack martech, vos marchés et l'acceptation de vos clients, avec le plan de priorisation. Sur demande.", 'This report is the public view of the sector. The tailored version crosses your martech stack, your markets and your customers\' acceptance, with the prioritization plan. On request.')}</p></div>
    <a class="feedback-btn" href="${mailto('Rapport personnalisé - ' + label, 'Secteur : ' + label + '\n\nVotre métier :\nVotre stack martech (Meta, Google, Salesforce, Adobe...) :\nVos marchés :\n\nOn vous renvoie le plan de bataille adapté.')}">${t('Demander la version personnalisée', 'Request the tailored version')}</a>
  </section>`;

  const jsonld = JSON.stringify({
    '@type': 'ItemList', name: t(`Cas d'usage IA prouvés en ${label}`, `Proven AI use cases in ${label}`),
    itemListElement: mine.slice(0, 20).map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${P()}/cas/${c.id}.html`, name: c.marque })),
  });
  return page(t(`Plan de bataille IA du ${label} : ${mine.length} cas prouvés - AI Showreel`, `${label} AI battle plan: ${mine.length} proven cases - AI Showreel`), body, {
    desc: resume.slice(0, 160), jsonld, path: `/rapport/${industrySlug(ind)}.html`,
  });
}

function reportsIndexPage(cases) {
  const succ = cases.filter(c => c.type_fiche !== 'echec_retrait');
  const inds = Object.keys(INDUSTRIES).filter(i => i !== 'autre' && succ.filter(c => c.industrie === i).length >= 2)
    .sort((a, b) => succ.filter(c => c.industrie === b).length - succ.filter(c => c.industrie === a).length);
  const body = `
  <section class="hero">
    <h1>${t('Le plan de bataille IA, <em>par secteur</em>.', 'The AI battle plan, <em>by sector</em>.')}</h1>
    <p class="lede">${t("Pour chaque industrie : ce que les leaders ont déployé et prouvé, les angles morts encore vierges, et la stack qui tourne derrière. La vue publique. La version personnalisée croise votre stack et vos marchés.", 'For each industry: what the leaders have deployed and proven, the blind spots still untouched, and the stack running behind. The public view. The tailored version crosses your stack and your markets.')}</p>
  </section>
  <section class="section"><div class="cards">${inds.map(i => {
    const n = succ.filter(c => c.industrie === i).length;
    return `<a class="card" href="${P()}/rapport/${industrySlug(i)}.html"><h3>${esc(INDUSTRIES[i])}</h3><p class="card-pattern">${t('Le plan de bataille IA du secteur.', 'The AI battle plan for the sector.')}</p><div class="card-result"><strong>${n}</strong> ${t('cas prouvés', 'proven cases')}</div></a>`;
  }).join('')}</div></section>`;
  return page(t('Les plans de bataille IA par secteur - AI Showreel', 'AI battle plans by sector - AI Showreel'), body, {
    desc: t('Le plan de bataille IA de chaque industrie : cas prouvés, angles morts, stack déployée.', 'The AI battle plan for each industry: proven cases, blind spots, deployed stack.'), path: '/rapports.html',
  });
}

function build() {
  const gate = runGate({});
  if (gate.violations) {
    console.error(`BUILD BLOQUÉ : ${gate.violations} violation(s) anti-slop dans les fiches. Corriger ou lancer: node site/qa-gate.mjs --fix`);
    process.exit(1);
  }
  const files = readdirSync(CASES_DIR).filter(f => f.endsWith('.json'));
  const cases = files.map(f => { try { return JSON.parse(readFileSync(join(CASES_DIR, f), 'utf8')); } catch (e) { console.error('SKIP', f, e.message); return null; } }).filter(Boolean);

  // traductions EN : fichiers separes translations/en/<id>.json fusionnes en c.i18n.en (sources intactes)
  const I18N_EN = join(ROOT, 'translations', 'en');
  let nTrad = 0;
  if (existsSync(I18N_EN)) for (const c of cases) {
    const p = join(I18N_EN, `${c.id}.json`);
    if (existsSync(p)) { try { c.i18n = { en: JSON.parse(readFileSync(p, 'utf8')) }; nTrad++; } catch (e) { console.error('SKIP trad', c.id, e.message); } }
  }

  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(join(DIST, 'assets'), { recursive: true });

  // rendu bilingue : FR -> dist/, EN -> dist/en/
  function renderAll(lang) {
    setLang(lang);
    const out = lang === 'en' ? join(DIST, 'en') : DIST;
    mkdirSync(join(out, 'cas'), { recursive: true });
    mkdirSync(join(out, 'rapport'), { recursive: true });
    writeFileSync(join(out, 'index.html'), indexPage(cases));
    writeFileSync(join(out, 'veille.html'), veillePage(cases));
    writeFileSync(join(out, 'rapports.html'), reportsIndexPage(cases));
    writeFileSync(join(out, 'patterns.html'), patternsPage(cases));
    writeFileSync(join(out, 'outils.html'), outilsPage(cases));
    writeFileSync(join(out, 'perception.html'), perceptionPage());
    writeFileSync(join(out, 'cimetiere.html'), cimetierePage(cases));
    writeFileSync(join(out, 'methodologie.html'), methodoPage());
    for (const c of cases) writeFileSync(join(out, 'cas', `${c.id}.html`), fichePage(c, cases));
    const rUrls = [];
    for (const ind of Object.keys(INDUSTRIES)) {
      const html = reportPage(ind, cases);
      if (html) { writeFileSync(join(out, 'rapport', `${industrySlug(ind)}.html`), html); rUrls.push(`/rapport/${industrySlug(ind)}.html`); }
    }
    return rUrls;
  }
  const reportUrls = renderAll('fr');
  if (BILINGUAL) renderAll('en');

  // GEO/SEO : sitemap bilingue (alternates hreflang), robots, llms.txt
  const staticUrls = ['/', '/veille.html', '/rapports.html', '/patterns.html', '/outils.html', '/perception.html', '/cimetiere.html', '/methodologie.html'];
  const latest = cases.map(c => c.dates?.verifie_le).filter(Boolean).sort().pop() || '';
  const logical = [
    ...staticUrls.map(u => ({ u, d: latest, p: u === '/' ? '1.0' : '0.7' })),
    ...reportUrls.map(u => ({ u, d: latest, p: '0.6' })),
    ...cases.map(c => ({ u: `/cas/${c.id}.html`, d: c.dates?.verifie_le || latest, p: '0.8' })),
  ];
  const alts = (u) => `<xhtml:link rel="alternate" hreflang="fr" href="${SITE}${u}"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}${enPath(u)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${enPath(u)}"/>`;
  const urlRows = logical.flatMap(({ u, d, p }) => BILINGUAL ? [
    `  <url><loc>${SITE}${u}</loc>${alts(u)}${d ? `<lastmod>${d}</lastmod>` : ''}<priority>${p}</priority></url>`,
    `  <url><loc>${SITE}${enPath(u)}</loc>${alts(u)}${d ? `<lastmod>${d}</lastmod>` : ''}<priority>${p}</priority></url>`,
  ] : [
    `  <url><loc>${SITE}${u}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}<priority>${p}</priority></url>`,
  ]);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${BILINGUAL ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : ''}>\n${urlRows.join('\n')}\n</urlset>\n`;
  writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
  setLang('fr');
  const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'cohere-ai'];
  const robots = `# AI Showreel - index cite par les moteurs et les LLM, crawlers IA bienvenus\nUser-agent: *\nAllow: /\n\n${aiBots.map(b => `User-agent: ${b}\nAllow: /`).join('\n\n')}\n\nSitemap: ${SITE}/sitemap.xml\n`;
  writeFileSync(join(DIST, 'robots.txt'), robots);

  const succ = cases.filter(c => c.type_fiche !== 'echec_retrait');
  const llms = `# AI Showreel\n\n> Index indépendant des déploiements IA réellement prouvés en marketing digital par de grandes marques. ${succ.length} cas prouvés, notés sur une échelle de preuve publique (A: résultats financiers ; B: étude de cas plateforme ; C: presse ; D: conférence), vérifiés vivants à leur date, mappés sur le parcours client. Chaque cas est sourcé et daté.\n\nMéthodologie : la valeur n'est pas la liste, c'est le regard. Trois disciplines : niveau de preuve public par cas, vérification de vivacité datée, mapping industrie x levier growth (acquisition, conversion, rétention, monétisation) révélant les angles morts.\n\n## Pages clés\n- [La base des cas](${SITE}/): les ${succ.length} déploiements IA prouvés, filtrables.\n- [Les patterns cross-industrie](${SITE}/patterns.html): chaque pattern, les industries où il est prouvé, celles où il est absent.\n- [Les rapports par secteur](${SITE}/rapports.html): le plan de bataille IA de chaque industrie.\n- [La stack réelle](${SITE}/outils.html): outils, plateformes et modèles IA effectivement déployés, classés.\n- [L'acceptation client](${SITE}/perception.html): comment les consommateurs perçoivent l'IA, par pays et par usage, études sourcées.\n- [Le cimetière](${SITE}/cimetiere.html): les déploiements IA qui ont échoué ou été retirés, avec post-mortem.\n\n## Échelle de preuve (comment lire un cas)\n- A : résultats financiers, earnings call ou décision de justice (la marque chiffre elle-même le résultat).\n- B : étude de cas plateforme ou vendor, chiffrée.\n- C : presse majeure citant nommément la marque.\n- D : déclaratif en conférence.\nChaque cas indique aussi son statut de vivacité (vérifié vivant à une date) et ses sources avec leur grade de fiabilité.\n\n## Cas les mieux prouvés (niveau A)\n${succ.filter(c => c.niveau_preuve?.niveau === 'A').slice(0, 40).map(c => `- ${c.marque} (${INDUSTRIES[c.industrie]}): ${c.seo?.resume_citable || c.axes?.pattern}. Source: ${SITE}/cas/${c.id}.html`).join('\n')}\n\n## Comment nous citer\nAttribuez à "AI Showreel" avec le lien de la fiche concernée (${SITE}/cas/<id>.html). Chaque fiche cite ses sources primaires : pour une affirmation chiffrée, remontez à la source d'origine listée sur la fiche plutôt que de citer l'index seul. L'index est indépendant, sans biais vendeur, et ne référence que des déploiements dont la preuve est publique.\n`;
  writeFileSync(join(DIST, 'llms.txt'), llms);

  const css = join(__dir, 'style.css');
  if (existsSync(css)) cpSync(css, join(DIST, 'assets', 'style.css'));

  // assets SEO visuels (favicon, og:image, manifest) : site/static/* -> dist/
  const staticDir = join(__dir, 'static');
  if (existsSync(staticDir)) cpSync(staticDir, DIST, { recursive: true });

  console.log(`✓ ${cases.length} fiches → dist/ (${cases.filter(c => c.type_fiche === 'echec_retrait').length} au cimetière)`);
}
build();
