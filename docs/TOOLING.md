# Outillage du pipeline — qui fait quoi

Principe : chaque étape du pipeline a UN outil désigné. ✅ = déjà dispo chez Achille · 🔧 = à configurer · ⏳ = plus tard (v1.1+).

## Brique 1 — Le collecteur

| Étape | Outil | Statut | Rôle exact |
|---|---|---|---|
| Découverte de cas émergents | **Buzzabout** (MCP connecté) | ✅ | Social listening sur « AI + [marque/industrie/pattern] » : détecte les cas dont on parle avant qu'ils soient dans les études de cas ; datasets par industrie |
| Recherche & sourcing | WebSearch/WebFetch (Claude) + agents | ✅ | Earnings calls, customer stories plateformes, presse — le gros de la collecte |
| Scraping structuré des gisements | **Firecrawl** (décidé — pas TaskMagic : le crawl est un problème de données, pas de RPA) | 🔧 | Crawl systématique des customer stories Meta/Google/Salesforce/Microsoft (des centaines de cas au même format) ; monitors trimestriels en v1.1 |
| Orchestration / glue (plus tard) | **TaskMagic** (MCP connecté) | ⏳ | Déclenchement des relances trimestrielles, push d'une fiche validée vers Notion, alertes quand un check de vivacité échoue — jamais pour le crawl lui-même |
| Crawl interactif / pages dynamiques | **Notte / anything-API** | ✅ | Là où Firecrawl s'arrête : pages nécessitant une interaction (ouvrir le chatbot, déclencher l'assistant, contenu derrière du JS lourd) — le site devient une API actionnable |
| **Check de vivacité** | **Buzzabout** (mentions < 12 mois) + **Notte** (la feature répond-elle encore ?) + **PeekShot** | ✅ | Buzzabout : signal social récent. Notte : interaction réelle avec la feature. PeekShot : **capture datée de la feature en prod** = la preuve de vivacité la plus forte qui existe |
| Preuve visuelle par fiche | **PeekShot** | ✅ | Screenshot du cas vivant (le chatbot Sephora en ligne, l'assistant Zalando…) → champ `preuve_visuelle` de la fiche + illustration de la page |
| Archivage des sources | archive.org Save Page Now (API gratuite) | 🔧 | Snapshot de chaque URL source au moment de la collecte — la preuve survit au lien |
| Stockage des fiches | JSON dans git (ce repo) | ✅ | Pilote et v1 : fichiers `cases/*.json` validés par `schema/fiche.schema.json` ; base réelle (Supabase, déjà maîtrisé via auditcro) seulement si le volume l'exige |

## Brique 2 — La base publique (loops 1 & 2)

| Étape | Outil | Statut | Rôle exact |
|---|---|---|---|
| Site programmatique | Astro ou Next.js statique + Vercel | ✅ (stack maîtrisée) | 1 fiche = 1 page ; 1 cellule de matrice = 1 hub ; build depuis les JSON |
| Rendu des schémas de flow | Mermaid (ou SVG custom) | ✅ (gratuit) | Le flow JSON de la fiche se rend automatiquement ; la substitution stack client = re-rendu du même JSON |
| Données structurées SEO/GEO | JSON-LD schema.org généré au build | ✅ (code) | Article + FAQPage + Organization ; sitemap auto ; llms.txt |
| **og:images programmatiques** | **MarkupGo** | ✅ | Une carte visuelle générée par fiche/hub (marque, stat clé, niveau de preuve) → CTR dans les SERP et les partages ; c'est du HTML→image, exactement son métier |
| Recherche de mots-clés / priorisation des hubs | **Junia AI** | ✅ | Quelles cellules de la matrice ont du volume de recherche (« AI use case retail », « churn prediction telco »…) → ordre de publication des hubs ; meta descriptions à l'échelle |
| Contenu éditorial d'appui | **Junia AI** (avec garde-fou) | ⏳ | Guides et articles chapeau (« State of AI in retail 2026 ») autour des fiches. ⚠️ JAMAIS pour les fiches elles-mêmes : elles sont générées depuis nos données structurées — du contenu SEO générique est exactement ce que la base est censée battre |
| Suivi citations LLM (GEO) | Peec AI / Otterly ou requêtes manuelles | ⏳ | Mesurer si ChatGPT/Perplexity citent la base — utile seulement une fois en ligne |

## Brique 3 — Le générateur de rapports (loop 3)

| Étape | Outil | Statut | Rôle exact |
|---|---|---|---|
| Génération du rapport | Template HTML + LLM (assemblage) | ✅ | Croise profil client (industrie/métier/stack) × base → sélection + priorisation par score de réplicabilité |
| **Rapport PDF signé** | **MarkupGo** | ✅ | HTML → PDF brandé : l'artefact qui circule en interne chez le client (loop 3). Aussi : version image des pages clés pour le partage |
| Capture de leads | Formulaire + ESP | ⏳ | Après mise en ligne ; le profil stack déclaré alimente la base (data loop) |

## Ce qui manque vraiment (à régler avant l'industrialisation, pas pour le pilote)

1. **Clé Firecrawl active** — le crawl des gisements plateformes est le multiplicateur de volume.
2. **Compte archive.org** (Save Page Now par API, gratuit) — à câbler dans le collecteur dès la fiche 11.
3. Rien d'autre : pas d'achat d'outil nécessaire. Buzzabout + PeekShot + MarkupGo couvrent découverte/vivacité/preuve visuelle/PDF/og-images, le reste est du code.

## Règle qualité transverse

Un outil n'entre dans le pipeline que s'il sert un des 3 juges : **le CMO** (crédibilité : preuve visuelle datée, PDF impeccable), **Google** (og:images, structured data, fraîcheur), **les LLMs** (structure, citations, dates). Tout le reste est du confort.
