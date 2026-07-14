# Le moteur de collecte continue

*2026-07-11. Comment automatiser ce qu'on a fait à la main (3 vagues de fan-out) en un moteur programmé. Principe : le moteur RÉUTILISE l'existant (docs/COLLECTOR-BRIEF.md, site/batch-promote.mjs, site/qa-gate.mjs, site/build.mjs). Ce n'est pas du streaming, c'est un batch cadencé avec un gate humain là où la crédibilité l'exige.*

## Le vrai enjeu : la découverte, pas la mécanique
La collecte (candidat -> fiche) est déjà résolue (les agents + le brief). L'automatisation dure, c'est **trouver des candidats nouveaux ET prouvés** sans noyer le moteur de bruit. La qualité du moteur = la qualité de sa couche de découverte.

## Les 5 couches

### 0. MESURE (2026-07-12) : Mode A vs Mode B, chiffré
Test tranche exécuté pour trancher la stratégie du moteur.
- **Mode A (crawl gisements)** : 8 candidats du crawl qualifiés par agent. Résultat = 1 fiche depuis la source crawlée (Sinsay, Advantage+ omnicanal, niveau B). Toyota a aussi produit une fiche (B) MAIS en abandonnant l'URL crawlée (Salesforce Automotive Cloud, CRM interne) pour un cas marketing trouvé par recherche — un pivot type Mode B. => conversion pure du crawl ≈ **1/8 (12%)** ; rendement fiche max 2/8 (25%). Rejets typiques : test vendor 2 semaines, POC sans preuve, CRM/copilote interne sans chiffre client, pattern déjà en base. S'ajoute la perte amont : le crawl de 370 candidats était déjà majoritairement SMB (Meta) ou infra (cloud).
- **Mode B (recherche ciblée earnings + presse)** : 2 agents -> 29 candidats bruts -> **27 uniques**, TOUS grandes marques on-target, ~12 en niveau A avec chiffres publics/earnings. Secteurs neufs remplis (hôtellerie Hilton/Marriott, spiritueux Diageo, adtech Pinterest/Trade Desk/Reddit). Candidats non encore qualifiés (ce sont des leads), mais qualité-source très supérieure (earnings/presse établie chiffrée vs customer story vendor).
- **VERDICT** : le moteur se construit autour du **Mode B** (earnings trimestriel + presse standing queries). Mode A rétrogradé en filet de largeur opportuniste, pré-filtré (exclure gisements infra), à ~12% assumé.

### 0bis. MESURE (2026-07-12) : taux de survie de qualification du Mode B = 90%
Salve de qualification sur les 10 leads niveau A uniques du Mode B (Pinterest, The Trade Desk, MercadoLibre, Wells Fargo, Reddit, Yum! Brands, Macy's, H&M, Telstra, Lidl), un agent collecteur par lead, filtre de crédibilité appliqué honnêtement (fiche OU rejet motivé, jamais de fabrication).
- **9 promues / 10 = 90% de survie** (base 214 -> 223). Répartition finale : 6 en niveau A (Pinterest, Trade Desk, MercadoLibre, Wells Fargo, Reddit, Yum), 2 en B (Macy's, Lidl), 1 en C (H&M).
- **1 seul rejet : Telstra**, et pour la BONNE raison : hors périmètre marketing (Ask Telstra / One Sentence Summary = assistance agent en centre de contact, 100% des métriques côté productivité employé), PAS un défaut de source. Le lead était mal catégorisé à la découverte, pas faux.
- Discipline observée chez les agents (ce qui valide la qualité du Mode B) : rétrogradations de niveau honnêtes quand le lead surestimait (Macy's/Lidl/H&M A->B/C car pas d'earnings isolant), rejet des chiffres du lead non corroborés à la source (Yum a jeté +20%/+15%, Reddit a jeté 28M req/jour et +84%, Pinterest a corrigé "SKUs x5" en "+100% YoY"), remplacement des sources faibles (H&M : agrégateurs SEO -> communiqué H&M Group T1 + FashionUnited/BoF), anti-doublon tenu (MercadoLibre distinct de Naranja X, Yum distinct du drive-thru vocal, Wells Fargo distinct d'Erica).
- **CONSÉQUENCE POUR LE BUDGET/CYCLE** : Mode B convertit ~9x mieux que Mode A (90% vs ~12% conversion pure du crawl) sur des leads pré-qualifiés niveau A. Un collecteur = ~80-105k tokens / lead. Pour un cycle, budgéter le fan-out sur la file de leads Mode B triée par niveau de preuve estimé ; le rendement chute mécaniquement sous les niveau A (les leads B/C/D de batch/modeB/ restent à mesurer séparément avant de fixer un plafond par cycle sur toute la file). La perte réelle du Mode B n'est pas la qualification (90%) mais la CATÉGORISATION amont (le lead Telstra hors-scope) -> ajouter un pré-filtre périmètre marketing à la découverte.

### 1. Découverte (trouver des candidats) — DEUX MODES
CONSTAT du 1er crawl réel (2026-07-11, site/discover.mjs sur 370 candidats) : le crawl brut des customer stories tombe soit sur du MARKETING-mais-PME (Meta success stories = surtout des SMB : Dr Squatch, Buddyfit...), soit sur du GROS-mais-INFRA (Google Cloud/IBM/AWS = migrations, pas IA marketing). Nos grands cas (Klarna, L'Oreal, Vodafone) ne viennent PAS de ces index. => Il faut deux modes de découverte :
- **Mode A — crawl de gisements (construit, discover.mjs)** : Firecrawl /v1/map sur les sections customer stories -> volume, mid-market, bon pour la largeur. Pondéré par pertinence-marketing du vendor (Meta/Google 3, Salesforce/Adobe 2, Microsoft/GCloud 1, IBM/AWS 0). Le filtre de crédibilité (couche collecteur) écarte les trop-petits.
- **Mode B — recherche ciblée (agent-driven, à construire)** : monitorer earnings calls + presse + Buzzabout sur les GRANDES marques nommées et leurs déploiements IA marketing. C'est ce qui a rempli les 212 fiches manuelles. Plus haut rendement pour notre barre « grande marque + scale », mais agent-driven (pas pur script). 
Les deux modes écrivent dans la meme file batch/_candidates.json.

Par ordre de fiabilité (un candidat = {marque, pattern, url_source} PAS déjà en base) :
- **Crawl des gisements structurés (Firecrawl, le plus fiable)** : les pages customer stories de Meta for Business, Think with Google, Salesforce, Microsoft, Adobe, IBM. Centaines de cas au même format, et elles GROSSISSENT dans le temps. Crawl périodique -> diff vs base -> nouveaux candidats. C'est la source auto la plus rentable.
- **Earnings calls (cadence trimestrielle, prévisible)** : monitorer les transcripts (Seeking Alpha, Motley Fool) sur mots-clés IA-marketing par grand groupe. Un chiffre en earnings = niveau de preuve A.
- **Veille presse (RSS / Google News)** : requêtes standing (« [secteur] AI marketing results », « AI use case [industrie] »).
- **Buzzabout (social listening)** : détecter les déploiements émergents dont on parle avant les études de cas + signaux de bad buzz (candidats cimetière).
- **Conférences (saisonnier)** : NRF, DMEXCO, Cannes, Shoptalk -> pics de nouveaux cas.
- **Demand loop (Reforge)** : les profils de rapports demandés + requêtes de recherche -> prioriser la découverte là où est la demande réelle.

### 2. Triage (dédoublonner + filtrer le bruit AVANT de dépenser du budget de recherche) — CONSTRUIT : site/triage.mjs
- **Déterministe (site/triage.mjs, 2026-07-12)** : normalise les candidats des deux modes, dédup vs `cases/*.json` (marque + marque|pattern + URL), écarte le bruit marque-vide, écrase les collisions de marque (garde le meilleur niveau estimé), trie par potentiel de preuve, plafonne à K, et SÉPARE trois voies -> `batch/_triage-queue.json` : `queue` (marques nouvelles, au fan-out), `revue_distinction` (marque déjà en base, pattern à vérifier avant tout collecteur), doublons jetés.
- **Pré-filtre PÉRIMÈTRE (agent bon marché, docs/TRIAGE-BRIEF.md, 2026-07-12)** : né de la mesure (le seul rejet Mode B, Telstra, était un hors-scope amont, pas un défaut de source). Un agent juge marketing vs hors-scope sur toute la file pour ~3k tokens, AVANT le fan-out à ~90k/lead. La règle qui tranche le cas chatbot : l'IA est-elle l'expérience vue par le client (marketing) ou l'outil de l'employé (hors-scope) ?
- Le cap K = le levier de coût du run. Prioriser : niveau de preuve estimé (earnings > presse), voie `queue` avant `revue_distinction`.

### 3. Collecte (candidat -> fiche)
- Un agent collecteur par candidat retenu, qui lit COLLECTOR-BRIEF + schema et écrit la fiche dans `batch/`. Déjà éprouvé (26 agents sur 3 vagues).
- Applique tout : filtre de crédibilité, grade de source, anti-slop, sourcé/inféré, logo_domain, faisabilité IT à terme.

### 4. Gate (le point humain qui protège le moat)
- `batch-promote.mjs` (schéma + enums + normalisation anti-slop + dédup) = automatique.
- **Règle de publication** : auto-accepter uniquement le HAUTE CONFIANCE (>=2 sources vérifiées + niveau A/B). Tout C/D ou source unique -> file de revue humaine (`batch/_review/`). La garantie « cas mort = année offerte » interdit de publier du non-vérifié en auto.
- Puis qa-gate + build + deploy.

### 5. Fraîcheur (re-vérifier l'existant)
- Piloté par `dates.revoir_apres` (le calendrier du Radar). Pour les cas échus : chaîne Buzzabout -> Notte (la feature répond-elle ?) -> PeekShot (capture datée) -> maj `verifie_le`/`statut_vivant`.
- Cas mort -> jamais supprimé -> passe au cimetière + événement Radar/newsletter.

## L'orchestrateur : une routine programmée — RUNBOOK DÉTAILLÉ : docs/ORCHESTRATEUR.md
Le « cerveau » = un runbook Claude (session interactive, ou `claude` headless pour le cron) qui pilote des mains déterministes. Le fan-out et le pré-filtre exigent Claude ; les scripts Node font le reste. Séquence du run : découverte -> triage.mjs -> pré-filtre périmètre (agent) -> revue de distinction (agent) -> fan-out collecteur (N agents) -> gate (batch-promote) -> qa-gate + build -> (deploy) -> digest. **Détail complet, modèle de coût, cadences, ordonnancement et état de construction dans docs/ORCHESTRATEUR.md.** Recommandation d'ordonnancement (2026-07-12) : déclenchement MANUEL tant que le nom/domaine n'est pas tranché (deploy bloqué) et que le seuil d'auto-publish C/D n'est pas validé humainement ; on câble le cron après.

Cadence proposée : découverte + collecte **hebdomadaire** ; fraîcheur **quotidienne** (traite les revoir_apres échus du jour) ; earnings **trimestriel** (calé sur les saisons de résultats).

## Ce qui est buildable MAINTENANT vs ce qui attend
- **Maintenant (sans dépendance)** : le script orchestrateur `site/collecte-run.mjs` qui enchaîne triage -> (fan-out via agents) -> promote -> gate -> build, avec la file de revue. La couche découverte peut démarrer en WebSearch (déjà utilisé) avant Firecrawl.
- **Attend une clé/API** : Firecrawl (crawl des gisements), un compte Buzzabout branché, archive.org Save Page Now, Notte, PeekShot.
- **Attend une décision** : cible de deploy (domaine/Vercel), et le seuil d'auto-publication (je recommande A/B + 2 sources).

## Phasage (ne pas tout faire d'un coup)
1. **v1 — collecte semi-auto** : routine hebdo qui prend une liste de candidats (WebSearch + 1-2 gisements) -> fan-out -> promote -> gate -> rebuild. Humain valide la file de revue. C'est 80 % de la valeur pour 20 % de l'effort.
2. **v2 — découverte automatisée** : Firecrawl sur les gisements + earnings + Buzzabout, diff auto, priorisation par demande.
3. **v3 — fraîcheur en boucle** : le calendrier revoir_apres traité chaque jour, vivacité auto, morts au cimetière.
4. **v4 — demand loop** : les rapports demandés pilotent la découverte.

## Garde-fous (non négociables, Reforge + crédibilité)
- Jamais d'auto-publication sous le haute confiance. Le gate humain protège le moat.
- Plafond de candidats/run (coût maîtrisé).
- Tout ce que le moteur écrit passe qa-gate (anti-slop) et batch-promote (schéma/dédup) — mêmes règles que le manuel.
- Le moteur détecte et prépare ; l'humain valide ce qui est publié comme un fait (règle machine/humain de ARCHITECTURE.md).
