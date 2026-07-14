// AI Showreel — générateur statique schema-driven.
// Lit ../cases/*.json, écrit ../dist/*.html. Aucune dépendance externe.
// node site/build.mjs

import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runGate, normalizeHtmlText } from './qa-gate.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
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

// ---------- libellés ----------
const INDUSTRIES = {
  retail_ecom: 'Retail & e-commerce', voyage_hospitality: 'Voyage & hospitality',
  banque_assurance_fintech: 'Banque, assurance & fintech', telco: 'Télécoms',
  media_entertainment: 'Média & entertainment', luxe_beaute: 'Luxe & beauté',
  auto: 'Automobile', cpg_d2c: 'CPG & D2C', food_beverage: 'Food & beverage',
  sante_pharma: 'Santé & pharma', tech_saas: 'Tech & SaaS',
  energie_utilities: 'Énergie & utilities', immobilier: 'Immobilier', sport_fitness: 'Sport & fitness',
  education: 'Éducation', secteur_public: 'Secteur public', autre: 'Autre',
};
const LEVIERS = {
  acquisition: 'Acquisition', activation_conversion: 'Activation / conversion',
  retention: 'Rétention', monetisation: 'Monétisation',
};
const FAMILLES = {
  personnalisation: 'Personnalisation', generation: 'Génération', conversation: 'Conversation',
  prediction: 'Prédiction', optimisation_automatisation: 'Optimisation / automatisation',
};
const IMPLEM = { custom: 'IA custom', plateforme: 'Plateforme martech', hybride: 'Hybride' };
const PREUVE_LABEL = {
  A: 'A — Résultats financiers', B: 'B — Étude de cas plateforme chiffrée',
  C: 'C — Presse citant la marque', D: 'D — Déclaratif conférence',
};
const VIVANT = {
  confirme: { t: 'Vivant confirmé', c: 'ok' },
  signaux_mitiges: { t: 'Signaux mitigés', c: 'warn' },
  incertain: { t: 'Incertain', c: 'bad' },
};

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
const MEDIA_SRC = { officielle: 'Vidéo officielle', demo: 'Démonstration', la_pub: 'La publicité (générée par IA)', couverture: 'Couverture presse' };
function mediaBlock(c) {
  const md = c.media;
  if (!md) return '';
  const label = MEDIA_SRC[md.source] || '';
  if (md.kind === 'video') {
    const id = ytId(md.url);
    if (!id) return '';
    return `<section class="block block-media">
      <div class="block-head"><h2>Le cas en action</h2><span class="media-tag">${esc(label)}</span></div>
      <div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="${esc(md.titre || c.marque)}" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
      ${md.titre ? `<p class="media-cap">${esc(md.titre)} · <a href="${esc(md.url)}" target="_blank" rel="noopener">voir sur YouTube</a></p>` : ''}
    </section>`;
  }
  return `<section class="block block-media">
    <div class="block-head"><h2>Le cas en action</h2><span class="media-tag">${esc(label)}</span></div>
    <img class="media-img" src="${esc(md.url)}" alt="${esc(md.titre || c.marque)}" loading="lazy">
  </section>`;
}
const preuveBadge = (n) => `<span class="grade grade-${n}" title="${esc(PREUVE_LABEL[n] || '')}">Preuve ${n}</span>`;
const FIAB = {
  T1_primaire: { t: 'Primaire', c: 't1', d: 'Document primaire : décision de justice, doc financier officiel, communiqué de la marque' },
  T2_officiel_interesse: { t: 'Officiel intéressé', c: 't2', d: 'Source officielle mais intéressée : customer story plateforme/vendor/intégrateur' },
  T3_presse_etablie: { t: 'Presse établie', c: 't3', d: 'Presse majeure reconnue' },
  T4_secondaire: { t: 'Secondaire', c: 't4', d: 'Presse spécialisée ou analyse tierce' },
};
const fiabBadge = (f) => { const v = FIAB[f]; return v ? `<span class="fiab fiab-${v.c}" title="${esc(v.d)}">${v.t}</span>` : ''; };
const vivantBadge = (s) => { const v = VIVANT[s] || VIVANT.incertain; return `<span class="vivant v-${v.c}"><span class="dot"></span>${v.t}</span>`; };

function scoreBar(label, val) {
  const pct = (val / 5) * 100;
  return `<div class="score-row"><span class="score-lbl">${label}</span><span class="score-track"><span class="score-fill" style="width:${pct}%"></span></span><span class="score-num">${val}/5</span></div>`;
}

// Domaine de production : À REMPLACER au naming/déploiement (une seule constante).
const SITE = 'https://ai-showreel.com';
const ORG_JSONLD = { '@type': 'Organization', '@id': SITE + '/#org', name: 'AI Showreel', url: SITE, description: 'Index indépendant des déploiements IA prouvés en marketing digital, noté sur une échelle de preuve publique.' };

const NAV = [
  ['/', 'La base'], ['/veille.html', 'Le radar'], ['/rapports.html', 'Les rapports'],
  ['/patterns.html', 'Les patterns'], ['/outils.html', 'Les outils'],
  ['/perception.html', "L'acceptation"], ['/cimetiere.html', 'Le cimetière'],
];
function page(title, body, { desc = '', jsonld = '', canonical = '', path = '' } = {}) {
  const url = SITE + (path || '');
  const navHtml = NAV.map(([href, label]) => `<a href="${href}"${href === (path || '/') ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const nodes = jsonld ? (() => { const p = JSON.parse(jsonld); return Array.isArray(p) ? p : [p]; })() : [];
  const graph = { '@context': 'https://schema.org', '@graph': [ORG_JSONLD, { '@type': 'WebSite', '@id': SITE + '/#site', url: SITE, name: 'AI Showreel', publisher: { '@id': SITE + '/#org' } }, ...nodes] };
  return normalizeHtmlText(`<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="theme-color" content="#f7f6f3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e1116" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="${esc(canonical || url)}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta property="og:type" content="website"><meta property="og:site_name" content="AI Showreel"><meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical || url)}">
<meta property="og:image" content="${SITE}/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="AI Showreel, les déploiements IA prouvés du marketing digital">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${SITE}/og-image.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,600&display=swap">
<link rel="stylesheet" href="/assets/style.css">
<script type="application/ld+json">${JSON.stringify(graph)}</script>
<script defer src="/_vercel/insights/script.js"></script>
</head><body>
<a class="skip" href="#main">Aller au contenu</a>
<header class="site-head">
  <a class="brand" href="/" translate="no"><span class="brand-mark" aria-hidden="true">◆</span> AI&nbsp;Showreel <span class="brand-sub">l'analyse niveau grand cabinet, pour tout le monde</span></a>
  <nav aria-label="Navigation principale">${navHtml}</nav>
</header>
<main id="main" tabindex="-1">${body}</main>
<footer class="site-foot">
  <p><strong>AI Showreel</strong> — index indépendant des déploiements IA prouvés en marketing digital. Chaque cas est noté sur une échelle de preuve publique et vérifié vivant à sa date.</p>
  <p class="foot-links"><a href="${mailto('AI Showreel - proposer un cas ou une correction', 'Votre message :\n\n\nSi c\'est une correction, merci d\'indiquer la fiche concernée et une source.')}">Proposer un cas ou une correction</a> · <a href="/methodologie.html">Méthodologie</a></p>
  <p class="foot-meta">« L'Evident du marketing digital » : un index éditorialement indépendant, sans biais vendeur ni sponsor.</p>
</footer>
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
    <h1>La stack réelle de l'IA <em>marketing</em>.</h1>
    <p class="lede">Pas la théorie : les outils, plateformes et modèles effectivement déployés dans ${total} cas prouvés. Agrégé automatiquement depuis la stack technique de chaque fiche. Le décompte est en nombre de cas où l'outil apparaît.</p>
  </section>
  ${section('Les IA et modèles les plus déployés', 'Ce qui tourne réellement derrière, quand c\'est publié.', 'ia')}
  ${section('Les plateformes et outils martech', 'Là où se déploient les cas, du paid media au CRM.', 'plateforme')}
  ${section('Les intégrateurs et agences', 'Qui aide les marques à déployer, quand c\'est cité.', 'partenaire')}
  <section class="section"><div class="section-head"><h2>La matrice outils × type d'usage</h2><p>Quel outil sert quel type de use case. Plus la case est foncée, plus l'outil y est déployé.</p></div>${matrix}</section>`;
  return page('La stack réelle de l\'IA marketing - AI Showreel', body, {
    desc: 'Les outils, plateformes et modèles IA effectivement déployés dans les cas marketing prouvés, agrégés et classés.', path: '/outils.html',
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
  return sources.length ? `<p class="p-sources">Sources : ${sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.institut)}${s.annee ? ' ' + esc(s.annee) : ''}</a>${s.fiabilite === 'T1_primaire' ? '' : ' <span class="fiab fiab-t3">presse</span>'}`).join(' · ')}</p>` : '';
}

// Encart perception par famille, injecte automatiquement sur chaque fiche succes
function perceptionBlock(famille) {
  const u = PERCEPTION.usages?.usages?.find(x => x.famille === famille);
  if (!u) return '';
  return `<section class="block block-perception">
    <div class="block-head"><h2>Comment vos clients perçoivent ce type d'usage</h2><span class="percep-tag">Études sourcées</span></div>
    <p>${esc(u.resume)}</p>
    <div class="p-stats">${(u.chiffres || []).slice(0, 3).map(statCard).join('')}</div>
    <div class="percep-cols">
      ${u.conditions_acceptation?.length ? `<div><h4>Conditions d'acceptation</h4><ul>${u.conditions_acceptation.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${u.lignes_rouges?.length ? `<div class="percep-rouge"><h4>Lignes rouges</h4><ul>${u.lignes_rouges.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </div>
    ${sourcesLine(u.sources)}
    <p class="percep-more"><a href="/perception.html">Voir l'acceptation complète : par pays, par usage, par génération</a></p>
  </section>`;
}

function perceptionPage() {
  const P = PERCEPTION;
  if (!P.pays || !P.usages || !P.attentes) return page('L\'acceptation - AI Showreel', '<p>Données en cours de collecte.</p>', {});
  const paysBlocks = P.pays.pays.map(p => `
    <div class="pays-card">
      <h3>${esc(p.nom)}</h3>
      <div class="p-stats">${(p.chiffres || []).slice(0, 3).map(statCard).join('')}</div>
      <p class="pays-lecture">${esc(p.lecture)}</p>
      ${sourcesLine(p.sources?.slice(0, 3))}
    </div>`).join('');

  const usageBlocks = P.usages.usages.map(u => `
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
    <h1>Ce que vos clients <em>acceptent</em> vraiment.</h1>
    <p class="lede">D'un côté ce que les marques déploient (la base). De l'autre, ce que les clients en perçoivent : l'enthousiasme et la méfiance par pays, l'acceptation par type d'usage, et les conditions qu'ils posent. Tout est tiré d'études représentatives, sourcées et datées.</p>
  </section>
  <section class="section"><div class="section-head"><h2>Par type d'usage</h2><p>L'acceptation n'est pas uniforme : chaque famille de la base a ses conditions et ses lignes rouges.</p></div>${usageBlocks}</section>
  <section class="section"><div class="section-head"><h2>Par pays</h2><p>${esc(P.pays.note_methodologique || '')}</p></div><div class="pays-grid">${paysBlocks}</div></section>
  <section class="section"><div class="section-head"><h2>Les attentes transverses</h2></div>${(P.attentes.attentes || []).map(themeBlock).join('')}</section>
  <section class="section"><div class="section-head"><h2>L'adoption réelle</h2><p>L'écart entre la méfiance déclarée et l'usage effectif est l'insight le plus important de cette page.</p></div>${(P.attentes.adoption || []).map(themeBlock).join('')}</section>
  <section class="section"><div class="section-head"><h2>Par génération</h2></div>${(P.attentes.generations || []).map(themeBlock).join('')}</section>`;
  return page('L\'acceptation de l\'IA par les clients - AI Showreel', body, {
    desc: 'Comment les consommateurs perçoivent l\'IA : par pays, par type d\'usage, par génération. Études représentatives sourcées.', path: '/perception.html',
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
  const isEchec = c.type_fiche === 'echec_retrait';
  const topResult = (c.resultats || [])[0];
  const cross = crossStats(c, all);
  const related = all.filter(x => x.id !== c.id && x.type_fiche === c.type_fiche
    && x.axes?.famille === a.famille && x.axes?.levier === a.levier
    && x.industrie !== c.industrie).slice(0, 3);
  const crossBanner = (!isEchec && cross.covered.length >= 2) ? `
    <a class="cross-banner" href="/patterns.html#${groupSlug(c)}">
      <span class="cb-proof">Pattern prouvé dans <strong>${cross.covered.length} industries</strong></span>
      ${cross.missing.length ? `<span class="cb-gap">encore vierge en ${cross.missing.slice(0, 3).map(i => INDUSTRIES[i]).join(', ')}${cross.missing.length > 3 ? ` +${cross.missing.length - 3}` : ''}</span>` : ''}
      <span class="cb-arrow">Voir la carte du pattern</span>
    </a>` : '';
  const chips = [
    ['Industrie', INDUSTRIES[c.industrie]], ['Levier', LEVIERS[a.levier]],
    ['Famille', FAMILLES[a.famille]], ['Implémentation', IMPLEM[c.implementation]],
    ['Étape', a.etape_parcours],
  ].filter(([, v]) => v).map(([k, v]) => `<span class="chip"><span class="chip-k">${k}</span>${esc(v)}</span>`).join('');

  const results = (c.resultats || []).map(r => `
    <div class="result-card">
      <div class="result-val${longStat(r.valeur) ? ' rv-long' : ''}">${esc(r.valeur)}</div>
      <div class="result-metric">${esc(r.metrique)}</div>
      <div class="result-cite">“${esc(r.citation_exacte)}” <a href="#src-${esc(r.source_ref)}">${esc(r.source_ref)}</a></div>
    </div>`).join('');

  const sources = (c.sources || []).map(s => `
    <li id="src-${esc(s.ref)}"><span class="src-ref">${esc(s.ref)}</span>
      <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.titre)}</a>
      ${fiabBadge(s.fiabilite)}
      <span class="src-meta">${esc(host(s.url))}${s.date_publication ? ' · ' + esc(s.date_publication) : ''} · consulté le ${esc(s.consulte_le)}</span>
      ${s.archive_url ? `<a class="src-archive" href="${esc(s.archive_url)}" target="_blank" rel="noopener">archive</a>` : `<span class="src-archive pending">archive à générer</span>`}
    </li>`).join('');

  const flow = c.schema_flow ? `
    <section class="block">
      <div class="block-head"><h2>Comment ça fonctionne</h2>
        <span class="flow-mode flow-${c.schema_flow.statut}">${c.schema_flow.statut === 'documente' ? 'Architecture documentée' : 'Approche-type inférée'}</span>
      </div>
      ${c.schema_flow.statut === 'approche_type' ? `<p class="approche-note">Le détail interne n'est pas public. Voici une approche éprouvée qui mène au même résultat — à adapter à votre stack.</p>` : ''}
      <div class="flow-wrap">${renderFlow(c.schema_flow)}</div>
      ${c.stack_technique?.length ? `<div class="tech-detail"><h4>La stack en détail</h4><ul>${c.stack_technique.map(t => `
        <li><span class="tech-cat tech-${esc(t.categorie)}">${esc(t.categorie)}</span>
          ${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener"><strong>${esc(t.nom)}</strong></a>` : `<strong>${esc(t.nom)}</strong>`}
          ${t.detail ? `<span class="tech-note">${esc(t.detail)}</span>` : ''}</li>`).join('')}</ul></div>` : ''}
    </section>` : '';

  const fo = c.fonctionnement_operationnel;
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
      <div class="block-head"><h2>Comment ça tourne, concrètement</h2><span class="ops-tag">Pour les équipes ops</span></div>
      <div class="ops-meta">
        <div class="ops-kv"><span>Cadence</span><strong>${esc(fo.cadence)}</strong></div>
        <div class="ops-kv"><span>Opéré par</span><strong>${esc(fo.opere_par)}</strong></div>
      </div>
      <ol class="ops-steps">
        ${(fo.etapes || []).map((e, i) => `<li class="${acteurClass(e.acteur)}">
          <div class="ops-num">${i + 1}</div>
          <div class="ops-body"><div class="ops-etape">${esc(e.etape)} <span class="ops-acteur">${esc(e.acteur)}</span></div><p>${esc(e.detail)}</p></div>
        </li>`).join('')}
      </ol>
      ${fo.signal_pilote ? `<div class="ops-signal"><span>Le signal qui pilote</span><p>${esc(fo.signal_pilote)}</p></div>` : ''}
    </section>` : '';

  const rep = c.replication;
  const repBlock = rep ? `
    <section class="block block-infere">
      <div class="block-head"><h2>Comment répliquer</h2><span class="infere-tag">Inférence — non sourcé</span></div>
      <div class="rep-grid">
        <div><h4>Prérequis data</h4><ul>${(rep.prerequis_data || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        ${rep.prerequis_orga?.length ? `<div><h4>Prérequis orga</h4><ul>${rep.prerequis_orga.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <div><h4>Stack possible</h4><ul>${(rep.stack_possible || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
      ${rep.equipe ? `<div class="rep-foot"><div class="rep-kv"><span>Équipe pour opérer</span><strong>${esc(rep.equipe)}</strong></div></div>` : ''}
      ${rep.playbook?.length ? `<div class="playbook"><h4>Le plan, étape par étape</h4><ol>${rep.playbook.map((p, i) => `
        <li><div class="pb-phase">Étape ${i + 1}</div>
          <div class="pb-body"><strong>${esc(p.action)}</strong>${p.livrable ? `<span class="pb-livrable">Livrable : ${esc(p.livrable)}</span>` : ''}</div></li>`).join('')}</ol></div>` : ''}
      <p class="rep-first"><strong>Première étape :</strong> ${esc(rep.premiere_etape)}</p>
    </section>` : '';

  const pm = c.post_mortem;
  const pmBlock = pm ? `
    <section class="block block-pm">
      <div class="block-head"><h2>Post-mortem</h2><span class="pm-tag">Cimetière</span></div>
      <h4>Ce qui s'est passé <span class="src-flag">sourcé</span></h4><p>${esc(pm.ce_qui_s_est_passe)}</p>
      <h4>Raison de l'échec <span class="src-flag">sourcé</span></h4><p>${esc(pm.raison_echec)}</p>
      ${pm.cout_estime ? `<h4>Coût <span class="src-flag">sourcé</span></h4><p>${esc(pm.cout_estime)}</p>` : ''}
      ${pm.signaux_avant_coureurs ? `<h4>Signaux avant-coureurs <span class="infere-flag">inféré</span></h4><p>${esc(pm.signaux_avant_coureurs)}</p>` : ''}
      <h4>Leçons avec recul <span class="infere-flag">inféré</span></h4><p>${esc(pm.lecons_avec_recul)}</p>
      ${pm.le_pattern_reste_il_valide ? `<div class="pm-verdict"><span>Le pattern reste-t-il valide ?</span><p>${esc(pm.le_pattern_reste_il_valide)}</p></div>` : ''}
    </section>` : '';

  const ue = c.transposable_ue;
  const body = `
  <article class="fiche">
    <a class="back" href="/">← La base</a>
    <div class="fiche-top">
      <div class="fiche-top-main">
        <div class="badges">${preuveBadge(c.niveau_preuve?.niveau)} ${vivantBadge(c.statut_vivant?.statut)} ${isEchec ? '<span class="echec-badge">Échec / retrait</span>' : ''}</div>
        <div class="fiche-title">${brandLogo(c, 'big')}<h1>${esc(c.marque)}</h1></div>
        <p class="pattern">${esc(a.pattern || '')}</p>
        <div class="chips">${chips}</div>
        ${crossBanner}
      </div>
      ${topResult ? `<div class="headline-stat ${isEchec ? 'hs-echec' : ''}">
        <div class="hs-val${longStat(topResult.valeur) ? ' hs-long' : ''}">${esc(topResult.valeur)}</div>
        <div class="hs-metric">${esc(topResult.metrique)}</div>
        <div class="hs-src">“${esc(topResult.citation_exacte)}” <a href="#src-${esc(topResult.source_ref)}">${esc(topResult.source_ref)}</a></div>
      </div>` : ''}
    </div>

    <div class="fiche-cols">
      <div class="fiche-main">
        ${c.seo?.resume_citable ? `<p class="citable-lead">${esc(c.seo.resume_citable)}</p>` : ''}
        ${c.points_cles?.length ? `<section class="essentiel"><h2>L'essentiel</h2><ul>${c.points_cles.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>` : ''}
        <section class="block"><h2>Objectif</h2><p>${esc(c.objectif_business)}</p></section>
        <section class="block"><h2>Le déploiement</h2><p>${esc(c.description)}</p></section>
        ${mediaBlock(c)}
        ${results ? `<section class="block"><h2>Résultats <span class="grade-inline">${preuveBadge(c.niveau_preuve?.niveau)}</span></h2><div class="results">${results}</div><p class="preuve-just">${esc(c.niveau_preuve?.justification || '')}</p></section>` : ''}
        ${flow}
        ${foBlock}
        ${pmBlock}
        ${perceptionBlock(a.famille)}
        ${repBlock}
        ${related.length ? `<section class="block block-related">
          <div class="block-head"><h2>${isEchec ? 'Le même piège, ailleurs' : 'Le même pattern, prouvé dans d\'autres industries'}</h2></div>
          <div class="cards related-cards">${related.map(caseCard).join('')}</div>
          ${!isEchec && cross.missing.length ? `<p class="related-gap">Aucun déploiement prouvé de ce pattern en <strong>${cross.missing.slice(0, 5).map(i => INDUSTRIES[i]).join(', ')}</strong>${cross.missing.length > 5 ? ` et ${cross.missing.length - 5} autres industries` : ''} : c'est là que se trouve la fenêtre.</p>` : ''}
        </section>` : ''}
      </div>
      <aside class="fiche-side">
        <div class="side-card">
          <h3>Preuve</h3>
          <div class="side-kv"><span>Niveau</span>${preuveBadge(c.niveau_preuve?.niveau)}</div>
          <div class="side-kv"><span>Vivacité</span>${vivantBadge(c.statut_vivant?.statut)}</div>
          <p class="side-note">${esc(c.statut_vivant?.note || '')}</p>
        </div>
        <div class="side-card">
          <h3>Dates</h3>
          <div class="side-kv"><span>Lancement</span><strong>${esc(c.dates?.lancement || '—')}</strong></div>
          <div class="side-kv"><span>Dernier signal</span><strong>${esc(c.dates?.derniere_confirmation_activite || '—')}</strong></div>
          <div class="side-kv"><span>Vérifié le</span><strong>${esc(c.dates?.verifie_le || '—')}</strong></div>
        </div>
        <div class="side-card">
          <h3>Stack / plateforme</h3>
          <ul class="side-tags tools">${(a.plateforme_stack || []).map(toolLink).join('')}</ul>
        </div>
        ${ue ? `<div class="side-card side-ue ue-${ue.flag}">
          <h3>Transposable UE</h3>
          <div class="ue-flag">${ue.flag.replace(/_/g, ' ')}</div>
          <p class="side-note">${esc(ue.note)}</p>
        </div>` : ''}
        ${(c.type_fiche !== 'echec_retrait' && (c.marque_linkedin || c.intervenants?.length || c.agences?.length)) ? `<div class="side-card side-people">
          <h3>Qui l'a porté</h3>
          ${c.marque_linkedin ? `<a class="li-company" href="${esc(c.marque_linkedin)}" target="_blank" rel="noopener"><span class="li-ic">in</span>${esc(c.marque)}</a>` : ''}
          ${c.intervenants?.length ? `<ul class="people">${c.intervenants.map(p => `
            <li>${p.linkedin_url ? `<a href="${esc(p.linkedin_url)}" target="_blank" rel="noopener"><span class="li-ic">in</span>${esc(p.nom)}</a>` : `<span class="person-noli">${esc(p.nom)}</span>`}
              <span class="person-role">${esc(p.role)} <a class="person-src" href="#src-${esc(p.source_ref)}">${esc(p.source_ref)}</a></span></li>`).join('')}</ul>` : ''}
          ${c.agences?.length ? `<div class="agences"><span class="agences-h">Agences & partenaires</span><ul class="people">${c.agences.map(ag => `
            <li>${ag.linkedin_url ? `<a href="${esc(ag.linkedin_url)}" target="_blank" rel="noopener"><span class="li-ic">in</span>${esc(ag.nom)}</a>` : `<span class="person-noli">${esc(ag.nom)}</span>`}
              <span class="person-role">${esc(ag.role)} <a class="person-src" href="#src-${esc(ag.source_ref)}">${esc(ag.source_ref)}</a></span></li>`).join('')}</ul></div>` : ''}
        </div>` : ''}
        <div class="side-card side-visual">
          <h3>Preuve visuelle</h3>
          ${c.preuve_visuelle?.url_capture ? `<img src="${esc(c.preuve_visuelle.url_capture)}" alt="capture ${esc(c.marque)}">` : `<div class="visual-pending">Capture datée à générer (PeekShot)</div>`}
        </div>
      </aside>
    </div>

    <section class="block block-sources"><h2>Sources</h2><ol class="sources">${sources}</ol></section>

    <section class="feedback">
      <div>
        <h3>Une erreur, une info plus récente, une source&nbsp;?</h3>
        <p>Cette fiche vit de sa justesse. Si un chiffre a bougé, si le déploiement a changé, ou si vous avez une source de meilleure qualité, dites-le nous. Toute correction sourcée est vérifiée avant publication.</p>
      </div>
      <a class="feedback-btn" href="${feedbackLink(c)}">Proposer une correction</a>
    </section>
  </article>`;

  const _url = SITE + `/cas/${c.id}.html`;
  const _kw = [INDUSTRIES[c.industrie], LEVIERS[a.levier], FAMILLES[a.famille], a.pattern, ...(c.stack_technique || []).map(t => t.nom)].filter(Boolean).join(', ');
  const nodes = [{
    '@type': 'Article',
    '@id': _url + '#article',
    headline: c.seo?.title || c.marque,
    description: c.seo?.meta_description || c.seo?.resume_citable || '',
    about: { '@type': 'Thing', name: c.marque },
    keywords: _kw, inLanguage: 'fr',
    datePublished: c.dates?.verifie_le, dateModified: c.dates?.verifie_le,
    mainEntityOfPage: _url, isPartOf: { '@id': SITE + '/#site' },
    author: { '@id': SITE + '/#org' }, publisher: { '@id': SITE + '/#org' },
    citation: (c.sources || []).map(s => ({ '@type': 'CreativeWork', name: s.titre, url: s.url })),
  }, {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'La base', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: INDUSTRIES[c.industrie], item: SITE + `/rapport/${industrySlug(c.industrie)}.html` },
      { '@type': 'ListItem', position: 3, name: c.marque, item: _url },
    ],
  }];
  if (c.seo?.faq?.length) nodes.push({ '@type': 'FAQPage', mainEntity: c.seo.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  return page(c.seo?.title || `${c.marque} - AI Showreel`, body, { desc: c.seo?.meta_description || '', jsonld: JSON.stringify(nodes), path: `/cas/${c.id}.html` });
}

// ---------- matrice de couverture ----------
function coverageMatrix(cases, { echec = false } = {}) {
  const inds = Object.keys(INDUSTRIES).filter(i => cases.some(c => c.industrie === i));
  const levs = Object.keys(LEVIERS);
  let rows = inds.map(ind => {
    const cells = levs.map(lev => {
      const hits = cases.filter(c => c.industrie === ind && c.axes?.levier === lev);
      if (!hits.length) return `<td class="cell empty" title="Angle mort : aucun cas prouvé"></td>`;
      const best = hits.map(h => h.niveau_preuve?.niveau).sort()[0];
      return `<td class="cell filled g-${best}"><a class="mcell-link" href="/?ind=${ind}&lev=${lev}#cas" data-ind="${ind}" data-lev="${lev}" title="${hits.length} cas prouvés : ${INDUSTRIES[ind]} × ${LEVIERS[lev]}">${hits.length}</a></td>`;
    }).join('');
    return `<tr><th class="row-h">${INDUSTRIES[ind]}</th>${cells}</tr>`;
  }).join('');
  const head = levs.map(l => `<th class="col-h">${LEVIERS[l]}</th>`).join('');
  return `<div class="matrix-wrap"><table class="matrix"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>
    <p class="matrix-legend"><span class="lg cell empty"></span> angle mort (opportunité) &nbsp; <span class="lg cell filled g-A"></span> preuve forte &nbsp; le chiffre = nombre de cas prouvés</p></div>`;
}

// Rendu "texte lisible" (pas chiffre-heros geant) si la valeur est longue OU si elle ne contient
// aucun chiffre (resultat qualitatif) : on ne force jamais un non-chiffre en gros stat bleu.
const longStat = v => { const s = String(v || '').replace(/\s+/g, ' ').trim(); return s.length > 20 || !/[0-9]/.test(s); };

function caseCard(c) {
  const a = c.axes || {};
  const top = (c.resultats || [])[0];
  return `<a class="card" href="/cas/${c.id}.html" data-ind="${c.industrie}" data-lev="${a.levier || ''}">
    <div class="card-head">${brandLogo(c)}<div class="card-badges">${preuveBadge(c.niveau_preuve?.niveau)} ${vivantBadge(c.statut_vivant?.statut)}</div></div>
    <h3>${esc(c.marque)}</h3>
    <p class="card-pattern">${esc(a.pattern || '')}</p>
    ${top ? `<div class="card-result"><strong${longStat(top.valeur) ? ' class="cr-long"' : ''}>${esc(top.valeur)}</strong> ${esc(top.metrique)}</div>` : ''}
    <div class="card-foot"><span>${esc(INDUSTRIES[c.industrie] || '')}</span><span>${esc(FAMILLES[a.famille] || '')}</span></div>
  </a>`;
}

// ---------- index ----------
function indexPage(cases) {
  const succes = cases.filter(c => c.type_fiche !== 'echec_retrait');
  const body = `
  <section class="hero">
    <h1>Ce que les leaders de votre secteur ont <em>vraiment</em> déployé en IA.</h1>
    <p class="lede">Un index indépendant des déploiements IA à l'échelle en marketing digital. Chaque cas est noté sur une échelle de preuve publique, vérifié vivant à sa date, et mappé sur le parcours client. Pas de POC, pas de biais vendeur, pas de slides périmées.</p>
    <div class="hero-stats">
      <div><strong>${succes.length}</strong> cas prouvés</div>
      <div><strong>${new Set(succes.map(c => c.industrie)).size}</strong> industries</div>
      <div><strong>${succes.filter(c => ['A', 'B'].includes(c.niveau_preuve?.niveau)).length}</strong> en preuve A/B</div>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>La matrice de couverture</h2><p>Où les leaders investissent — et où personne n'ose encore. Les cases vides sont vos angles morts.</p></div>
    ${coverageMatrix(succes)}
  </section>

  <section class="section" id="cas">
    <div class="section-head"><h2>Les cas</h2><p>Triés, sourcés, datés. Cliquez une case de la matrice pour filtrer par industrie x levier.</p></div>
    <div class="cas-filter" hidden></div>
    <div class="cards">${succes.map(caseCard).join('')}</div>
  </section>

  <section class="feedback">
    <div><h3>Faites référencer votre cas d'usage</h3><p>Votre marque a déployé l'IA à l'échelle en marketing, avec un résultat public ? Proposez-le. S'il passe le filtre de preuve (chiffre public, source vérifiable), il entre dans l'index - au même titre que les autres, sans passe-droit ni biais vendeur.</p></div>
    <a class="feedback-btn" href="${mailto('AI Showreel - faire référencer un cas d\'usage', 'Marque :\nLe déploiement IA (en une phrase) :\nLe résultat chiffré et public :\nLa source (URL earnings, presse établie ou étude) :\n\nRappel : un cas entre dans l\'index uniquement s\'il passe le filtre de preuve.')}">Proposer votre cas</a>
  </section>
  <script>
(function(){var I=${JSON.stringify(INDUSTRIES)},L=${JSON.stringify(LEVIERS)};
var cards=[].slice.call(document.querySelectorAll('#cas .card')),b=document.querySelector('#cas .cas-filter');
function clr(){cards.forEach(function(c){c.style.display='';});b.hidden=true;}
function ap(i,l){if(!i&&!l){clr();return;}var n=0;cards.forEach(function(c){var ok=(!i||c.dataset.ind===i)&&(!l||c.dataset.lev===l);c.style.display=ok?'':'none';if(ok)n++;});b.hidden=false;b.innerHTML='<span><strong>'+n+'</strong> cas filtres . '+((I[i]||'')+(i&&l?' x ':'')+(L[l]||''))+'</span><button type="button" class="cas-clear">Tout afficher</button>';b.querySelector('.cas-clear').onclick=function(){clr();history.pushState('','',location.pathname);};}
[].slice.call(document.querySelectorAll('.mcell-link')).forEach(function(a){a.addEventListener('click',function(e){e.preventDefault();ap(a.dataset.ind,a.dataset.lev);history.pushState('','','/?ind='+a.dataset.ind+'&lev='+a.dataset.lev+'#cas');var t=document.getElementById('cas');if(t)t.scrollIntoView({behavior:'smooth'});});});
var q=new URLSearchParams(location.search);if(q.get('ind')||q.get('lev'))ap(q.get('ind'),q.get('lev'));})();
  </script>`;
  const years = cases.map(c => (c.dates?.verifie_le || '').slice(0, 4)).filter(Boolean).sort();
  const temporal = years.length ? `${years[0]}/${years[years.length - 1]}` : '';
  const dataset = {
    '@type': 'Dataset',
    '@id': SITE + '/#dataset',
    name: 'AI Showreel - index des déploiements IA prouvés en marketing digital',
    description: `Index indépendant de ${succes.length} déploiements IA réellement prouvés à l'échelle par de grandes marques en marketing digital, sur ${new Set(succes.map(c => c.industrie)).size} industries. Chaque cas est noté sur une échelle de preuve publique (de A à D), vérifié vivant à sa date, sourcé, et mappé sur le parcours client.`,
    url: SITE + '/',
    inLanguage: 'fr',
    isAccessibleForFree: true,
    creator: { '@id': SITE + '/#org' },
    publisher: { '@id': SITE + '/#org' },
    isPartOf: { '@id': SITE + '/#site' },
    keywords: ['IA marketing', 'intelligence artificielle', "cas d'usage IA", 'marketing digital', 'preuve publique', "déploiement à l'échelle"],
    variableMeasured: ['industrie', 'levier growth', 'niveau de preuve public', 'statut de vivacité', 'stack technique'],
    ...(temporal ? { temporalCoverage: temporal } : {}),
  };
  return page('AI Showreel — les déploiements IA prouvés du marketing digital', body, {
    desc: 'Index indépendant des déploiements IA à l\'échelle en marketing digital, noté sur une échelle de preuve publique et vérifié vivant.', path: '/',
    jsonld: JSON.stringify(dataset),
  });
}

function cimetierePage(cases) {
  const echecs = cases.filter(c => c.type_fiche === 'echec_retrait');
  const body = `
  <section class="hero hero-pm">
    <h1>Le cimetière des cas d'usage</h1>
    <p class="lede">Ce que personne ne montre : les déploiements IA de grandes marques qui ont échoué, été retirés, ou fait machine arrière. Avec, à chaque fois, la vraie question — le pattern était-il condamné, ou seulement son exécution&nbsp;?</p>
  </section>
  <section class="section">
    ${echecs.length ? `<div class="cards">${echecs.map(caseCard).join('')}</div>` : `<p class="empty-note">Collecte en cours — les premiers post-mortems arrivent (Air Canada, Zillow Offers, McDonald's voice AI).</p>`}
  </section>`;
  return page('Le cimetière des cas d\'usage IA — AI Showreel', body, {
    desc: 'Les déploiements IA de grandes marques qui ont échoué ou été retirés, documentés avec les leçons à en tirer.', path: '/cimetiere.html',
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
        <div class="pg-stats"><strong>${g.cross.covered.length}</strong> industries prouvées · <strong>${g.list.length}</strong> cas</div>
      </div>
      <div class="pg-industries">
        ${g.cross.covered.map(i => `<span class="ind-chip covered">${esc(INDUSTRIES[i] || i)}</span>`).join('')}
        ${g.cross.missing.map(i => `<span class="ind-chip open">${esc(INDUSTRIES[i] || i)}</span>`).join('')}
      </div>
      ${g.cross.missing.length ? `<p class="pg-gap">Encore aucun déploiement prouvé en ${g.cross.missing.slice(0, 4).map(i => INDUSTRIES[i]).join(', ')}${g.cross.missing.length > 4 ? ` (+${g.cross.missing.length - 4})` : ''}.</p>` : `<p class="pg-gap pg-full">Pattern prouvé dans toutes les industries couvertes par la base.</p>`}
      <div class="cards related-cards">${top.map(caseCard).join('')}</div>
    </section>`;
  }).join('');

  const body = `
  <section class="hero">
    <h1>La carte des <em>patterns</em> cross-industrie.</h1>
    <p class="lede">Un pattern prouvé dans plusieurs industries et absent de la vôtre n'est pas un risque : c'est une fenêtre. Cette carte montre, pour chaque pattern, où il est prouvé (plein) et où personne ne l'a encore déployé (hachuré).</p>
  </section>
  ${sections}`;
  return page('La carte des patterns cross-industrie - AI Showreel', body, {
    desc: 'Chaque pattern IA marketing, les industries où il est prouvé, et celles où personne ne l\'a encore déployé.', path: '/patterns.html',
  });
}

function methodoPage() {
  const body = `
  <section class="section prose">
    <h1>La méthodologie <span class="is-product">est</span> le produit.</h1>
    <p class="lede">N'importe qui peut lister des cas d'usage IA. La valeur n'est pas la liste — c'est le regard. Trois disciplines qu'aucun agrégateur ne s'impose.</p>

    <h2>1. Un niveau de preuve public sur chaque cas</h2>
    <p>~90 % des « cas d'usage IA » en circulation viennent des acteurs qui vendent la techno. Nous notons chaque cas sur une échelle explicite, et nous l'affichons :</p>
    <ul class="grades-legend">
      <li>${preuveBadge('A')} Résultats financiers, earnings call, décision de justice — la preuve la plus dure.</li>
      <li>${preuveBadge('B')} Étude de cas plateforme/vendor chiffrée — utile mais biaisée, plafonnée à B.</li>
      <li>${preuveBadge('C')} Presse majeure citant nommément la marque.</li>
      <li>${preuveBadge('D')} Déclaratif en conférence.</li>
    </ul>
    <p>Plusieurs sources concordantes font monter le niveau. Chaque chiffre renvoie à sa source, datée et archivée.</p>

    <h2>2. Vérifié vivant, à une date</h2>
    <p>Les marques annoncent fort et enterrent en silence. Chaque cas porte un statut de vivacité et une date de vérification. Un cas qui meurt ne disparaît pas : il part au <a href="/cimetiere.html">cimetière</a>.</p>

    <h2>3. Mappé sur le parcours client</h2>
    <p>Tous les autres classent par industrie et par techno. Nous croisons industrie × levier growth (acquisition, conversion, rétention, monétisation) × preuve, pour que la <strong>matrice de couverture</strong> rende visibles les angles morts — là où personne n'investit encore.</p>

    <div class="callout">
      <p><strong>Faits vs inférence.</strong> Ce qui est sourcé et ce qui est notre analyse (« comment répliquer », schémas approche-type) sont toujours séparés visuellement. Une seule affirmation présentée comme un fait qui n'en est pas un, et toute la base perd sa valeur. La crédibilité est le produit.</p>
    </div>
  </section>`;
  return page('Méthodologie — AI Showreel', body, { desc: 'Niveau de preuve public, vérification de vivacité, mapping sur le parcours client : la méthodologie qui distingue AI Showreel d\'un catalogue.', path: '/methodologie.html' });
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

  const row = (c, extra = '') => `<a class="veille-row" href="/cas/${c.id}.html">${brandLogo(c)}<div class="vr-main"><div class="vr-marque">${esc(c.marque)}</div><div class="vr-pattern">${esc(c.axes?.pattern || '')}</div></div><div class="vr-meta">${extra}</div></a>`;

  const body = `
  <section class="hero">
    <h1>Le <em>radar</em>.</h1>
    <p class="lede">Les marques annoncent fort et enterrent en silence. Le radar suit ce qui bouge : les déploiements à surveiller, ceux qui viennent de mourir, les plus récents, et le calendrier de re-vérification. La preuve, ce n'est pas une photo, c'est un flux.</p>
  </section>

  <section class="section">
    <div class="section-head"><h2>À surveiller</h2><p>${aSurveiller.length} cas au statut fragile (signaux mitigés ou incertain). Prochains à basculer, dans un sens ou dans l'autre.</p></div>
    <div class="veille-list">${aSurveiller.slice(0, 12).map(c => row(c, `${vivantBadge(c.statut_vivant?.statut)}${c.dates?.revoir_apres ? `<span class="vr-date">à revoir ${esc(c.dates.revoir_apres)}</span>` : ''}`)).join('')}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Le fil du cimetière</h2><p>Les derniers déploiements retirés, échoués ou en backpedal. L'alerte que personne d'autre n'envoie.</p></div>
    <div class="veille-list">${cimetiereFil.map(c => row(c, `<span class="echec-badge">retiré</span><span class="vr-date">${esc(dateOf(c.dates?.date_retrait) || '')}</span>`)).join('')}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Les déploiements les plus récents</h2></div>
    <div class="veille-list">${recents.map(c => row(c, `${preuveBadge(c.niveau_preuve?.niveau)}<span class="vr-date">${esc(dateOf(c.dates?.lancement) || '')}</span>`)).join('')}</div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Prochaines re-vérifications</h2><p>Notre calendrier de fraîcheur, à découvert. Chaque cas porte une date de péremption de sa vérification.</p></div>
    <div class="veille-list">${aRevoir.map(c => row(c, `<span class="vr-date">${esc(c.dates.revoir_apres)}</span>`)).join('')}</div>
  </section>

  <section class="feedback">
    <div><h3>Le radar, chaque mois, dans votre boîte</h3><p>Ce qui a bougé dans l'IA marketing : nouveaux cas prouvés, cas morts, patterns émergents. La veille gratuite. La version par périmètre (votre secteur, votre stack) alerte dès qu'un cas apparaît ou meurt dans VOTRE matrice.</p></div>
    <a class="feedback-btn" href="${mailto('Radar AI Showreel - abonnement', 'Je veux recevoir le radar mensuel.\n\nEmail :\nSecteur qui m\'intéresse :')}">Recevoir le radar</a>
  </section>`;
  return page('Le radar de l\'IA marketing : ce qui bouge - AI Showreel', body, {
    desc: 'Le suivi vivant des déploiements IA marketing : à surveiller, retirés, récents, et le calendrier de re-vérification.', path: '/veille.html',
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
  const resume = `En ${label}, AI Showreel recense ${mine.length} déploiements IA marketing prouvés (${nAB} en preuve forte A/B), couvrant ${byLev.length} des 4 leviers growth. ${blindSpots.length ? `${blindSpots.length} patterns prouvés dans d'autres industries n'y sont pas encore déployés.` : ''}`;

  const body = `
  <section class="hero">
    <a class="back" href="/rapports.html">← Tous les rapports</a>
    <h1>Le plan de bataille IA du <em>${esc(label)}</em>.</h1>
    <p class="lede citable">${esc(resume)}</p>
    <div class="hero-stats">
      <div><strong>${mine.length}</strong> cas prouvés</div>
      <div><strong>${nAB}</strong> en preuve A/B</div>
      <div><strong>${blindSpots.length}</strong> angles morts</div>
    </div>
  </section>

  ${byLev.map(g => `<section class="section">
    <div class="section-head"><h2>${esc(LEVIERS[g.l])}</h2><p>${g.cases.length} cas prouvés en ${esc(label)}.</p></div>
    <div class="cards">${g.cases.slice(0, 6).map(caseCard).join('')}</div>
  </section>`).join('')}

  ${blindSpots.length ? `<section class="section">
    <div class="section-head"><h2>Vos angles morts : prouvé ailleurs, absent chez vous</h2><p>Ces patterns fonctionnent dans d'autres industries et ne sont pas encore déployés en ${esc(label)}. C'est là que se cache l'avance.</p></div>
    <div class="cards">${blindSpots.map(b => {
    const ex = b.list.sort((x, y) => (x.niveau_preuve?.niveau || 'D').localeCompare(y.niveau_preuve?.niveau || 'D'))[0];
    return `<a class="card" href="/cas/${ex.id}.html">
        <div class="card-head"><span class="ind-chip open">angle mort</span><div class="card-badges">${preuveBadge(ex.niveau_preuve?.niveau)}</div></div>
        <h3>${esc(FAMILLES[ex.axes?.famille])} × ${esc(LEVIERS[ex.axes?.levier])}</h3>
        <p class="card-pattern">Prouvé dans ${b.inds} autre(s) industrie(s). Exemple : ${esc(ex.marque)} (${esc(INDUSTRIES[ex.industrie])}).</p>
      </a>`;
  }).join('')}</div>
  </section>` : ''}

  ${topTools.length ? `<section class="section">
    <div class="section-head"><h2>La stack du secteur</h2><p>Les outils et IA les plus déployés en ${esc(label)}.</p></div>
    <ul class="side-tags tools report-tools">${topTools.map(([n, v]) => `<li class="tool-chip"><span>${esc(n)} <b>${v}</b></span></li>`).join('')}</ul>
  </section>` : ''}

  <section class="feedback">
    <div><h3>La version adaptée à VOTRE stack</h3><p>Ce rapport est la vue publique du secteur. La version personnalisée croise votre stack martech, vos marchés et l'acceptation de vos clients, avec le plan de priorisation. Sur demande.</p></div>
    <a class="feedback-btn" href="${mailto('Rapport personnalisé - ' + label, 'Secteur : ' + label + '\n\nVotre métier :\nVotre stack martech (Meta, Google, Salesforce, Adobe...) :\nVos marchés :\n\nOn vous renvoie le plan de bataille adapté.')}">Demander la version personnalisée</a>
  </section>`;

  const jsonld = JSON.stringify({
    '@type': 'ItemList', name: `Cas d'usage IA prouvés en ${label}`,
    itemListElement: mine.slice(0, 20).map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/cas/${c.id}.html`, name: c.marque })),
  });
  return page(`Plan de bataille IA du ${label} : ${mine.length} cas prouvés - AI Showreel`, body, {
    desc: resume.slice(0, 160), jsonld, path: `/rapport/${industrySlug(ind)}.html`,
  });
}

function reportsIndexPage(cases) {
  const succ = cases.filter(c => c.type_fiche !== 'echec_retrait');
  const inds = Object.keys(INDUSTRIES).filter(i => i !== 'autre' && succ.filter(c => c.industrie === i).length >= 2)
    .sort((a, b) => succ.filter(c => c.industrie === b).length - succ.filter(c => c.industrie === a).length);
  const body = `
  <section class="hero">
    <h1>Le plan de bataille IA, <em>par secteur</em>.</h1>
    <p class="lede">Pour chaque industrie : ce que les leaders ont déployé et prouvé, les angles morts encore vierges, et la stack qui tourne derrière. La vue publique. La version personnalisée croise votre stack et vos marchés.</p>
  </section>
  <section class="section"><div class="cards">${inds.map(i => {
    const n = succ.filter(c => c.industrie === i).length;
    return `<a class="card" href="/rapport/${industrySlug(i)}.html"><h3>${esc(INDUSTRIES[i])}</h3><p class="card-pattern">Le plan de bataille IA du secteur.</p><div class="card-result"><strong>${n}</strong> cas prouvés</div></a>`;
  }).join('')}</div></section>`;
  return page('Les plans de bataille IA par secteur - AI Showreel', body, {
    desc: 'Le plan de bataille IA de chaque industrie : cas prouvés, angles morts, stack déployée.', path: '/rapports.html',
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

  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(join(DIST, 'cas'), { recursive: true });
  mkdirSync(join(DIST, 'assets'), { recursive: true });

  mkdirSync(join(DIST, 'rapport'), { recursive: true });
  writeFileSync(join(DIST, 'index.html'), indexPage(cases));
  writeFileSync(join(DIST, 'veille.html'), veillePage(cases));
  writeFileSync(join(DIST, 'rapports.html'), reportsIndexPage(cases));
  writeFileSync(join(DIST, 'patterns.html'), patternsPage(cases));
  writeFileSync(join(DIST, 'outils.html'), outilsPage(cases));
  writeFileSync(join(DIST, 'perception.html'), perceptionPage());
  writeFileSync(join(DIST, 'cimetiere.html'), cimetierePage(cases));
  writeFileSync(join(DIST, 'methodologie.html'), methodoPage());
  for (const c of cases) writeFileSync(join(DIST, 'cas', `${c.id}.html`), fichePage(c, cases));

  // Rapports sectoriels
  const reportUrls = [];
  for (const ind of Object.keys(INDUSTRIES)) {
    const html = reportPage(ind, cases);
    if (html) { writeFileSync(join(DIST, 'rapport', `${industrySlug(ind)}.html`), html); reportUrls.push(`/rapport/${industrySlug(ind)}.html`); }
  }

  // GEO/SEO : sitemap, robots, llms.txt
  const staticUrls = ['/', '/veille.html', '/rapports.html', '/patterns.html', '/outils.html', '/perception.html', '/cimetiere.html', '/methodologie.html'];
  const caseUrls = cases.map(c => `/cas/${c.id}.html`);
  const latest = cases.map(c => c.dates?.verifie_le).filter(Boolean).sort().pop() || '';
  const entries = [
    ...staticUrls.map(u => ({ u, d: latest, p: u === '/' ? '1.0' : '0.7' })),
    ...reportUrls.map(u => ({ u, d: latest, p: '0.6' })),
    ...cases.map(c => ({ u: `/cas/${c.id}.html`, d: c.dates?.verifie_le || latest, p: '0.8' })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(({ u, d, p }) => `  <url><loc>${SITE}${u}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}<priority>${p}</priority></url>`).join('\n')}\n</urlset>\n`;
  writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
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
