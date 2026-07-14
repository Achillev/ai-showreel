# Stratégie GEO + SEO — être vite listé dans les LLMs et Google

*2026-07-11. Objectif : que ChatGPT, Perplexity, Gemini, Copilot ET Google citent AI Showreel comme LA source des cas d'usage IA marketing prouvés. La bonne nouvelle : notre discipline de preuve est déjà l'arme GEO la plus forte — les LLMs sur-citent les sources qui affichent une méthodologie de vérification.*

## Bloqueur unique avant tout
La constante `SITE` dans `site/build.mjs` = `https://ai-showreel.example` (placeholder). À remplacer par le vrai domaine au naming, en une ligne, avant tout déploiement et toute soumission. Rien ne se soumet sans domaine réel.

## 1. Fondation technique — DÉJÀ EN PLACE (build v1)
- **sitemap.xml** : 235 URLs (base, rapports secteur, patterns, outils, perception, cimetière, 212 fiches).
- **robots.txt** : autorise tous les crawlers + pointe le sitemap. (Ne PAS bloquer GPTBot, ClaudeBot, PerplexityBot, Google-Extended — on VEUT être crawlé par les LLMs.)
- **llms.txt** : le standard émergent (llmstxt.org) — résumé du site, pages clés, top cas niveau A, en markdown propre que les LLMs ingèrent directement.
- **JSON-LD sur chaque page** : Organization + WebSite sitewide ; Article + FAQPage + citations sur chaque fiche ; ItemList sur les rapports secteur. (Vérifié : une fiche porte Article, FAQPage, Question/Answer, Organization, WebSite.)
- **Meta OG + Twitter card**, **canonical** par page, **HTML sémantique statique** (rapide, parfait pour le crawl), **résumé citable** rendu visible en haut de fiche (les LLMs pompent ces phrases stat-denses autoportantes).

## 2. Ce qui fait citer par un LLM (GEO), et pourquoi on l'a
Les LLMs citent une source quand elle est : (a) structurée et parsable, (b) porteuse de signaux d'autorité/méthodologie, (c) stat-dense avec des phrases autoportantes, (d) elle-même citée ailleurs, (e) fraîche et datée.
- (a) ✅ JSON-LD + HTML sémantique. (b) ✅ page Méthodologie + niveau de preuve affiché + fondateur ex-Accenture (E-E-A-T). (c) ✅ `resume_citable` par fiche + résumés citables par rapport. (d) → tactiques ci-dessous. (e) ✅ `verifie_le` daté partout.

## 3. Les tactiques pour être listé VITE (par ordre de rapidité d'effet)
1. **Bing Webmaster Tools + IndexNow** (effet le plus rapide sur les LLMs) : ChatGPT Search et Copilot s'appuient sur l'index Bing. Soumettre le sitemap à Bing, activer IndexNow (ping instantané à chaque publication/mise à jour). C'est le canal le plus sous-estimé et le plus rapide vers ChatGPT.
2. **Google Search Console** : soumettre le sitemap, demander l'indexation des pages piliers (accueil, rapports secteur, patterns, cimetière). Google-Extended crawle pour Gemini.
3. **Reddit, en value-first** (cf. DISTRIBUTION.md) : les LLMs sur-indexent Reddit (accords Google/OpenAI). Une bonne réponse sourcée dans r/marketing, r/PPC, r/CRO qui cite une fiche = signal GEO composé + trafic. Ratio 90/10.
4. **Pages programmatiques = surface d'entrée massive** : 212 fiches + 16 rapports secteur + patterns, chacun cible une requête réelle (« AI use case retail », « Klarna AI results », « dynamic pricing AI cases »). Chaque page est une porte d'entrée LLM/SEO.
5. **Se faire citer par d'autres** (le plus dur, le plus durable) : le cimetière (post-mortems introuvables ailleurs) et l'angle cross-industrie sont les deux contenus qui gagnent des liens et des reprises. Concentrer la production LinkedIn/PR dessus.
6. **Wikipedia / sources de référence** : à terme, si un post-mortem devient LA référence sur un échec (Air Canada, Zillow), viser une citation dans les articles concernés.

## 4. SEO on-page (déjà solide, à maintenir)
- **Long-tail programmatique** : chaque fiche = « [Marque] : [pattern] — [résultat] » ; chaque rapport = « Plan de bataille IA du [secteur] ». Titres et meta descriptions calés dessus (champ `seo` des fiches).
- **Maillage interne dense** : bandeau cross-industrie, bloc « même pattern ailleurs », related, nav vers patterns/outils/perception. Chaque fiche pointe vers 5+ pages internes → distribue l'autorité.
- **Fraîcheur** : les dates `verifie_le` et le pipeline de re-vérification (ARCHITECTURE.md) gardent les pages fraîches — signal SEO ET GEO. Ajouter une page « Ce qui a bougé » (changelog daté) renforce les deux.
- **Cœur = angles morts + cimetière** : les deux seuls contenus à value promise unique (Reforge) ; c'est là que se concentre le SEO qui gagne des liens.

## 5. Ce qui reste à câbler (post-domaine)
- Remplacer `SITE`, déployer (Vercel), soumettre sitemap à GSC + Bing, activer IndexNow (ping au build).
- **og-images programmatiques** (MarkupGo) : une carte par fiche/rapport (marque + stat + niveau de preuve) → CTR SERP et partages sociaux.
- **Suivi des citations LLM** : requêtes manuelles récurrentes (ou Peec AI / Otterly) — « quels sont les cas d'usage IA prouvés en retail ? » et voir si on est cité.
- **Author entity** : page fondateur (ex-Accenture) avec schema.org Person + sameAs LinkedIn, signant chaque fiche/rapport → E-E-A-T.

## Mesure (north star GEO/SEO)
Nombre de requêtes-cibles où un LLM cite AI Showreel + sessions organiques par rapport secteur. À instrumenter dès la mise en ligne.
