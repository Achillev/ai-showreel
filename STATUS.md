# AI Showreel — STATUS

*Mis à jour : 2026-07-11*

## État

| Chantier | Statut |
|---|---|
| Brief validé (périmètre, 7 axes, 3 briques, loops, freemium) | ✅ [docs/BRIEF.md](docs/BRIEF.md) |
| Positionnement (« niveau grand cabinet, pour tout le monde », ex-Accenture, « l'Evident du marketing digital ») | ✅ BRIEF + [docs/MARCHE.md](docs/MARCHE.md) |
| Étude de marché | ✅ Verdict GO avec repositionnement — [docs/MARCHE.md](docs/MARCHE.md) |
| Schéma de fiche | ✅ [schema/fiche.schema.json](schema/fiche.schema.json) |
| Outillage arbitré (Buzzabout, PeekShot, MarkupGo, Junia, Firecrawl, Notte, TaskMagic) | ✅ [docs/TOOLING.md](docs/TOOLING.md) |
| Gisements + règles de collecte | ✅ [docs/GISEMENTS.md](docs/GISEMENTS.md) |
| Critères d'acceptation du pilote | ✅ [docs/PILOTE.md](docs/PILOTE.md) |
| Collecte pilote (12 candidats → 10 fiches) | 🔄 3/12 en staging (La Redoute, Renault, Vodafone) ; 3 agents en cours |
| Assemblage fiches + passage des 8 critères | ⏳ après collecte |
| Base publique + générateur | ⏳ après validation pilote |

## Décisions ouvertes (avec leur échéance)

1. **Nom + domaine** — avant mise en ligne publique. Le positionnement est fixé ; le naming peut passer par le skill dédié avec ce brief en input.
2. **Modèle économique** — ✅ stratégie définie le 2026-07-11 ([docs/OFFRE.md](docs/OFFRE.md)) : value ladder 4 étages (base publique → rapport gratuit contre profil → abonnement veille par périmètre → missions), value metric = périmètre surveillé, offre Hormozi avec garantie « cas mort = année offerte ». Restent à valider après pilote : les montants €, le nom de l'offre, le seuil du gate.
3. **Objectif de volume v1** — après le pilote, quand le coût/fiche réel sera connu (hypothèse de travail : 100-150 fiches avant mise en ligne).
4. **KPIs des loops** — au moment du build du site : trafic organique par hub, citations LLM détectées, rapports générés, leads. Inutile de les figer avant d'avoir le site.

## Points de vigilance

- **Fenêtre concurrentielle** : Evident s'étend au-delà de la banque, Gartner enrichit son outil. L'autorité sur la verticale marketing se prend maintenant.
- **Légal (léger, avant mise en ligne)** : captures d'écran de produits de marques = documentation factuelle, OK avec prudence ; ne jamais utiliser logos/marques déposées comme éléments de marque propre ; citations courtes attribuées uniquement.
- **Anti-showreel (« cimetière des cas d'usage »)** : promu de v1.1 → **v1** (l'étude de marché le confirme comme angle unique au monde et ultra-citable). Pas dans le pilote de 10 fiches, mais dans la première mise en ligne.

## Build v1 — base publique (fait le 2026-07-11, sous Opus)

Générateur statique schema-driven opérationnel : `site/build.mjs` lit `cases/*.json` → `dist/`. Aucune dépendance.
- **Pages** : index (hero + matrice de couverture + cartes), fiche (badges preuve/vivacité, chips 7 axes, résultats chiffrés avec citations, schéma de flow, réplication+score, sidebar, sources), cimetière, méthodologie.
- **Schéma de flow rendu en SVG maison** depuis la donnée (nœuds colorés par rôle, arêtes + boucle d'optimisation) — fidèle au principe « le schéma est une donnée ».
- **Séparation sourcé/inféré** visible (post-mortem : flags « sourcé » verts vs « inféré » gris ; bloc réplication tagué inférence).
- **6 fiches en ligne** : 3 succès (La Redoute, Renault, Vodafone) + 3 cimetière (Air Canada, Zillow, McDonald's).
- Design consulting-grade, light/dark, responsive. Vérifié via DOM : 0 erreur console, flow/scores/sources/post-mortem tous rendus. Preview : `python3 -m http.server` sur `dist/`.

## Écriture (ajouté 2026-07-11)

- **Règles anti-« odeur d'IA »** : [docs/REDACTION.md](docs/REDACTION.md) — bannit antithèses décoratives, règle de trois systématique, ouvertures de panorama, intensificateurs vides, méta-phrases, tirets cadratins en rafale. Gouverne le collecteur. Descriptions des 3 cas succès réécrites en conséquence.
- **Règles strictes du skill site-redesign importées** (REDACTION.md §0, consigne 2026-07-06) : em/en dash, ellipse unicode, guillemets courbes, flèches, puces exotiques, symboles, emojis = interdits dans tout texte visible. **QA gate mécanique** : [site/qa-gate.mjs](site/qa-gate.mjs) (`--fix` pour auto-corriger) ; le build ÉCHOUE si une fiche viole les règles ; le HTML rendu est normalisé (normalizeHtmlText) et scanné 100 % conforme. 60 champs nettoyés dans les 6 fiches. Guillemets français « » restent autorisés ; citations exactes préservées au mot près (typographie normalisée).
- **Section « Comment ça tourne, concrètement »** (champ `fonctionnement_operationnel`) : cadence + qui l'opère + signal qui pilote + étapes numérotées, chacune taguée par acteur (IA / data / marketing / agence / client, couleur par acteur). Pensée pour un directeur ops. Rendue sur les 3 cas succès.

## Attribution personnes/marques (ajouté 2026-07-11)

- Champs `marque_linkedin` + `intervenants[]` (nom, rôle, linkedin_url vérifiée, source_ref). Bloc « Qui l'a porté » en sidebar sur fiches succès.
- Règles ([docs/GISEMENTS.md](docs/GISEMENTS.md)) : URL LinkedIn jamais devinée ; personne seulement si publiquement/vérifiablement associée + sourcée ; **jamais d'individu sur une fiche cimetière** (bloc masqué sur echec_retrait — vérifié sur Zillow).
- Peuplé : La Redoute (page marque), Renault (page marque + Özlem Kılıçkaya, profil vérifié, citée dans S1), Vodafone (page marque). URLs entreprises vérifiées via recherche.

## Grade de fiabilité des sources + agences (ajouté 2026-07-11)

- **Chaque source graduée** : badge T1 Primaire (vert) / T2 Officiel intéressé (ambre) / T3 Presse établie / T4 Secondaire. Le bruit internet n'entre jamais (pas de grade). Garantit « que du réel ». Vérifié : Zillow S1 = Primaire (doc SEC), La Redoute = Officiel intéressé (customer stories Meta).
- **Agences créditées** dans « Qui l'a porté », sourcées (source_ref cliquable) : Ykone + The Cirqle (La Redoute), OMD + ClickThrough (Renault), Datatonic (Vodafone). Fiches succès uniquement.
- **Discipline factuelle durcie** : tout fait (personne, agence, chiffre) trace à une source ; inférence toujours marquée et séparée ; jamais d'URL ni de nom inventés.

## Architecture & distribution (ajouté 2026-07-11)

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** : phase 1 = fiches JSON en git (source de vérité, historique gratuit, corrections en diff reviewable) ; phase 2 = Supabase en runtime (tables cases, patterns, sources, verifications, corrections, profils_clients, rapports_generes, distribution_queue), git reste la chaîne de rédaction. Pipeline de fraîcheur : file de re-vérification par cadence (3/6/12 mois selon profil), chaîne Buzzabout→Notte→PeekShot, un cas qui meurt = jamais supprimé → cimetière + événement éditorial. Machine détecte/prépare, humain valide tout ce qui est publié comme fait.
- **[docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)** : amorçage LinkedIn (profil perso, 3 formats dérivés des fiches, drafts auto + publication humaine) + Reddit (value-first 90/10, snippets préparés, gros levier GEO car sur-cité par les LLMs) pendant que le SEO monte. Machine « 1 fiche = N assets » (og-image MarkupGo, drafts, snippets, item newsletter → distribution_queue, TaskMagic notifie). Newsletter mensuelle = MVP de la veille étage 2. Instrumentation par loop (returns/costs/scope), north star candidate : rapports générés/mois.

## Batch de collecte 100 (lancé 2026-07-11, sous Opus)

16 agents en parallele, chacun sur une tranche (industrie x famille + customer stories plateformes Meta/Google/martech + cimetiere lot 2 + emergents), ~6 fiches/agent. Chaque agent lit docs/COLLECTOR-BRIEF.md + schema/fiche.schema.json et applique : filtre de credibilite, grade de source T1-T4, niveau de preuve A-D, regles anti-slop, discipline factuel/source, intervenants+agences sources, jamais d'individu sur les echecs. Sortie = fichiers JSON dans batch/sliceNN/.

Pipeline de promotion pret : site/batch-promote.mjs (dry-run puis --commit) valide schema + enums, normalise l'anti-slop, dedoublonne (id + marque|pattern vs existant), rejette les non-conformes, promeut vers cases/. Puis qa-gate.mjs + build.mjs.

## Batch 100 rentre (2026-07-11) : 99 fiches en base

16 agents -> 96 fiches collectees -> 94 acceptees (2 doublons Klarna/Instacart, 0 rejet schema) + 6 pilote - 1 hors perimetre (Chipotle Ava Cado = recrutement) = **99 fiches** (90 succes + 9 cimetiere).
- Preuve : 12 A, 54 B, 33 C (67 pour cent A/B).
- Vivacite : 78 confirme, 17 signaux_mitiges, 4 incertain.
- Industries : retail 22, banque 13, luxe 11, media 11, telco 9, cpg 8, voyage 7, auto 7, food 6, autre 5.
- Familles : conversation 37, generation 19, optim 18, perso 16, prediction 9.
- Leviers : retention 32, acquisition 30, conversion 29, monetisation 8 (= angle mort transversal, visible dans la matrice).
- Enrichissement : intervenants sur 59, agences sur 42, marque_linkedin sur 30, 265 sources.
- QA gate anti-slop OK, build OK, matrice de couverture parlante (24 cellules pleines / 16 angles morts).

## Logos de marque (ajouté 2026-07-11)

Champ `logo_domain` par fiche (domaine officiel). Rendu : favicon Google 128px (`brandLogo()` dans build.mjs) sur cartes + en-tete de fiche, avec **monogramme colore de secours** (initiales) si le logo ne charge pas -> jamais d'image cassee. Clearbit teste puis abandonne (API fermee fin 2024). 156/157 marques mappees (script scratchpad/logos.mjs), Willy's Chocolate Experience en monogramme (pas de site). Productionisation : pour une mise en ligne, heberger de vrais logos HD (favicons parfois generiques, ex ADT=globe) et monogramme si favicon generique.

## Actionnabilite + effet wow (2026-07-11, feedback Achille)

Diagnostic : la fiche disait "quoi + preuve" mais pas "comment refaire lundi" ; stack en tags morts ; pas de modeles IA en detail ; pas de liens prestataires ; rien ne saute aux yeux. Corrections :
- **Schema** : + `stack_technique[]` (nom/categorie/detail/url - FACTUEL, le LLM exact si source) ; + `replication.playbook[]` (phase/action/livrable - INFERE), + `budget_estime`, + `equipe`.
- **Rendu** (build.mjs) : stat-titre en tres grand des l'arrivee (headline-stat) ; stack sidebar cliquable avec favicons (TOOL_MAP ~45 plateformes -> domaines officiels, automatique sur toutes les fiches) ; bloc "La stack en detail" (LLM/plateforme/outil/integrateur avec liens) ; playbook en timeline semaine par semaine avec livrables ; budget+equipe dans les KV ; bloc **"Le meme pattern, prouve dans d'autres industries"** (3 cartes auto : meme famille x levier, industrie differente - l'argument angle mort par fiche).
- Demo validee sur La Redoute (screenshot OK). **Enrichissement TERMINE (13 agents)** : 212/212 fiches avec stack_technique, 194/194 succes avec playbook + equipe.
- **Regle factuelle durcie (Achille)** : jamais de delais/budgets/scores inferes dans la replication. Rendu purge (plus de time_to_value/budget/effort/scores affiches, playbook en Etape N sans durees) + donnees purgees (site/purge-chiffres-inferes.mjs : 209 fiches nettoyees, 0 chiffre infere restant). Schema + briefs mis a jour (champs obsoletes documentes).
- **Couche PERCEPTION LIVREE (2026-07-11)** : 3 datasets dans perception/ - pays.json (11 pays, 85 chiffres : Ipsos AI Monitor 2026, Pew 2025, KPMG/Melbourne 47 pays), usages.json (5 familles, 36 chiffres, conditions d'acceptation + lignes rouges : Salesforce, Gartner, Qualtrics, Yahoo/Publicis, NIQ...), attentes.json (52 chiffres : transparence, adoption reelle, generations - insight cle : ecart mefiance declaree vs usage reel mesure 4 fois). Quasi tout en T1_primaire.
- **Rendu perception** : page /perception.html (« L'acceptation » dans la nav : par usage, par pays, attentes, adoption, generations - 97 stats, 82 liens sources) + **encart auto sur chaque fiche par famille** (« Comment vos clients percoivent ce type d'usage » : resume, 3 stats, conditions, lignes rouges, sources). Zero ecriture sur les fiches (rattachement par famille au build).
- Backlog images : captures PeekShot datees (preuve visuelle) + og-images MarkupGo - necessitent les APIs, pas fait dans ce tour.

## Cross-industrie rendu VISIBLE (2026-07-11, feedback Achille)

Le potentiel cross-industrie (l'argument central « prouve ailleurs, absent chez vous ») etait enterre en bas de fiche. Corrections (tout calcule automatiquement depuis la base, fonction crossStats dans build.mjs) :
- **Bandeau en haut de chaque fiche succes** : « Pattern prouve dans N industries - encore vierge en X, Y, Z » + lien vers la carte.
- **Page /patterns.html** (« Les patterns » dans la nav) : 19 groupes famille x levier, chacun avec industries prouvees (chips vertes) vs vierges (chips hachurees) + phrase d'opportunite + top 3 cas. Ex : Conversation x Retention = 10 industries prouvees / 6 vierges, 33 cas.
- **Bloc bas de fiche renforce** : « Aucun deploiement prouve de ce pattern en [industries] : c'est la que se trouve la fenetre. »
- Limite assumee : le « pattern » est approxime par famille x levier (le champ pattern est du texte libre). Prochain cran propre : taxonomie pattern_id canonique (~25-30 patterns) + passe d'assignation, APRES la fin des agents d'enrichissement (conflits d'ecriture sinon).

## Matrice outils/IA + démos vidéo + fix corruption (2026-07-11)

- **Page /outils.html (« Les outils » dans la nav)** : la stack réelle agrégée depuis stack_technique des 194 cas succès, avec normalisation canonique (CANON dans build.mjs, ~55 regex fusionnent les variantes : OpenAI=37 cas, Gemini=12, Google Cloud=14...). 3 classements (IA/modèles, plateformes martech, intégrateurs/agences) + **matrice outils x famille** (top 18 outils, cellule = nb de cas, intensité par color-mix). OpenAI domine la conversation (24), génération (7).
- **Démos vidéo** : champ `media` (kind/url/source/titre, FACTUEL vérifié). Rendu = lecteur YouTube-nocookie intégré (bloc « Le cas en action »). 4 cas peuplés avec vidéos officielles vérifiées (Wendy's/Google Cloud, Sephora Virtual Artist, Spotify AI DJ, L'Oreal ModiFace). Limite honnête : seuls les cas grand public ont une vidéo ; les cas internes/B2B n'ont que le schéma de flow. Scalable via agent (chasse aux vidéos officielles) ou PeekShot (captures live).
- **Corruption réparée** : un ancien qa-gate bugué avait transformé des guillemets fermants » en -> dans ~5 fiches (« ... -> au lieu de « ... »). Corrigé (9 occurrences + citation CEO Zillow), guillemets rééquilibrés, QA OK.

## Générateur de rapports (brique 3) + GEO/SEO (2026-07-11, « go »)

- **Générateur de rapports sectoriels** (version programmatique) : `reportPage()` génère 16 pages `/rapport/<industrie>.html` (« Le plan de bataille IA du [secteur] »). Chaque rapport = résumé citable + cas prouvés groupés par levier + **section angles morts** (patterns prouvés ailleurs, absents dans ce secteur) + stack du secteur + CTA « version personnalisée adaptée à votre stack » (le gate/conversion). Index /rapports.html dans la nav. C'EST le générateur rendu concret + des pages programmatiques SEO/GEO. La version interactive personnalisée (profil client live) reste à faire (besoin form/back).
- **Couche GEO/SEO technique** (docs/GEO-SEO.md) : sitemap.xml (235 URLs), robots.txt (crawlers LLM autorisés), llms.txt (standard émergent), JSON-LD enrichi sitewide (Organization+WebSite) + par fiche (Article+FAQPage+citations) + ItemList sur rapports, meta OG/Twitter, canonical par page, résumé citable visible. Constante `SITE` = placeholder à remplacer au naming (bloqueur unique).
- **Stratégie de listing rapide** : Bing Webmaster+IndexNow (ChatGPT/Copilot = index Bing, canal le plus rapide), GSC, Reddit value-first (LLMs sur-indexent Reddit), pages programmatiques, cimetière+cross-industrie comme aimants à liens. Détail docs/GEO-SEO.md.

## Le radar / veille (2026-07-11, cœur de rétention Reforge)

Page /veille.html (« Le radar » dans la nav) = la surface qui donne une raison de revenir entre deux décisions annuelles (le trou de rétention n°1 identifié par la revue Reforge). 4 sections générées auto depuis les données : **À surveiller** (25 cas signaux_mitiges/incertain, triés par revoir_apres), **Le fil du cimetière** (échecs récents), **Les plus récents** (par lancement), **Prochaines re-vérifications** (calendrier de fraîcheur à découvert = signal de crédibilité). CTA « Recevoir le radar » (newsletter, le point d'entrée du loop de rétention). Alimente la newsletter mensuelle (DISTRIBUTION.md). Nav du site = 7 pages : Base / Radar / Rapports / Patterns / Outils / Acceptation / Cimetière.
LIMITE : version publique/MVP. Le vrai loop (alerte par périmètre « ce qui a bougé dans VOTRE matrice ») nécessite le backend (abonné + change-tracking snapshot-à-snapshot, cf. ARCHITECTURE.md).

## Moteur de collecte — couche découverte (2026-07-11)

- Design complet : [docs/MOTEUR-COLLECTE.md](docs/MOTEUR-COLLECTE.md) (5 couches + orchestrateur programmé ; enjeu = découverte, pas mécanique ; gate humain = auto-publie seulement A/B+2 sources).
- **Module découverte construit** : `site/discover.mjs` — crawle 8 gisements (customer stories Meta/Google/Google Cloud/Microsoft/Salesforce/Adobe/IBM/AWS) via Firecrawl /v1/map, extrait candidats, dédoublonne contre la base (198 marques + 562 URLs sources connues), classe (marque nouvelle > marque connue nouvelle source), écrit batch/_candidates.json. Testé : dry-run OK (index dédup construit), logique dédup/tri prouvée sur candidats fictifs (La Redoute skip / Nike connue / Decathlon nouvelle).
- **Firecrawl BRANCHÉ et testé en réel (2026-07-11)** : clé dans .env (gitignoré), 1er crawl OK sur 7/8 gisements (Adobe 429 persistant), 370 candidats classés par pertinence-marketing dans batch/_candidates.json. Top = annonceurs Meta réels (Dr Squatch, PureGym, Aerie...).
- **CONSTAT majeur** : le crawl brut = marketing-mais-PME (Meta) OU gros-mais-infra (GCloud/IBM/AWS). Nos grands cas ne viennent pas des index customer-stories -> il faut un **mode B de découverte : recherche ciblée agent-driven** (earnings/presse/Buzzabout sur grandes marques nommées), le mode qui a rempli les 212 fiches. Mode A (crawl) = volume mid-market ; Mode B = les grandes marques. Détail docs/MOTEUR-COLLECTE.md.
- Reste : mode B à construire ; couche 3 (collecteurs sur candidats) à lancer sur une slice curée pour mesurer le rendement (ne PAS firer 370 agents en aveugle) ; Adobe 429 (URL alternative ou backoff long).
- .gitignore créé (.env, batch/, dist/, node_modules/).

## Reste (verification, avant mise en ligne)

1. Fiches `signaux_mitiges`/`incertain` (21) : re-check vivacite (Notte/Buzzabout) ou retrograder.
2. URLs primaires 403 au fetch auto (SEC, communiques) signalees par plusieurs agents : re-verifier (Notte/manuel) pour confirmer les chiffres A.
3. Archives archive.org (a cabler) + captures PeekShot datees (pending sur toutes).
4. Concentration de marque a surveiller (L'Oreal apparait 5x sur patterns distincts - OK mais a noter).
5. Rapport de pilote a Achille (validation n1 : format de fiche a industrialiser) + brique 3 (generateur de rapports).
6. Nettoyer batch/ (staging) une fois valide.
