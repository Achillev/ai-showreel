# AI Showreel — Brief validé

*Version validée du 2026-07-11. Nom/domaine : à trancher avant mise en ligne publique (jamais « Elevate » dans un livrable).*

## Positionnement de marque (décidé 2026-07-11)

**« L'analyse niveau grand cabinet, pour tout le monde. Créé par un ex-Accenture. »**

- Promesse : le niveau d'analyse d'un BCG/Accenture — preuves vérifiées, mapping parcours, priorisation — sans les 6 mois ni les 300 k€. Le rapport personnalisé arrive en minutes.
- Formulation publique : *consulting-grade AI intelligence* / « l'analyse niveau grand cabinet, sans le cabinet ». ⚠️ Ne jamais utiliser « BCG » ou « Accenture » comme tagline littéral (marques déposées, posture d'imitateur) — le « ex-Accenture » vit dans la bio fondateur, fait biographique incontestable.
- Founder-brand = actif E-E-A-T : entité auteur réelle (schema.org author, LinkedIn, bio), signe chaque fiche et chaque rapport → carburant des citations Google/LLM (loops 1-2) et de la circulation des rapports (loop 3).
- Double segment résolu par « pour tout le monde » : ETI/scale-ups (accès à ce que seul le CAC40 se payait) + CMO grands comptes (contre-expertise de leurs propres cabinets).

## Le produit en une phrase

Une base publique de cas d'usage IA **réellement déployés à l'échelle** par de grandes marques en digital marketing, croisée sur 7 axes, avec un générateur de rapports personnalisés par industrie/métier/stack — à destination des directeurs digitaux, e-commerce et CMO.

## Périmètre

- **La frontière est la fonction, pas l'industrie** : digital marketing au sens large (acquisition → activation/conversion → rétention → monétisation).
- Collecte large **cross-industries** dès le départ ; les patterns sont cross-industrie par nature.
- Grandes marques uniquement. Exclus : startups/micro-boîtes, POC sans preuve, intentions et roadmaps, pays sans déploiement réel.

## Filtre de crédibilité (condition d'entrée de chaque cas)

Un cas n'existe dans la base que s'il a une **preuve de passage à l'échelle** :
chiffre public, mention en résultats financiers, déploiement multi-marchés, ou 12 mois+ en production — **et** est encore vivant à la date de vérification (les marques annoncent fort et enterrent en silence).

**Échelle de preuve** (figée) :
- **A** — résultats financiers / earnings call
- **B** — étude de cas plateforme/vendor chiffrée
- **C** — presse citant la marque
- **D** — déclaratif conférence

Sources multiples concordantes ⇒ le niveau monte. Chaque source = citation exacte + lien + snapshot archivé + date de consultation (la preuve doit survivre à son lien).

## Le modèle à deux niveaux

- Le **cas** est instancié : une marque, une industrie, des chiffres.
- Le **type de projet (pattern)** est cross-industrie : « agent client genAI », « pricing dynamique »…

C'est le niveau pattern qui produit l'argument le plus vendeur : *« prouvé dans 3 industries, absent de la vôtre »*.

## Les 7 axes de tag

1. **Industrie** — retail/e-com, voyage, banque/assurance, telco, media, luxe/beauté, auto, CPG/D2C…
2. **Levier growth** — acquisition, activation/conversion, rétention, monétisation
3. **Touchpoint / étape du parcours** — paid media, SEO/contenu, site/app, CRM/email, service client, social, retail media…
4. **Type de projet** — hiérarchique : **famille** (personnalisation, génération, conversation, prédiction, optimisation/automatisation — provisoire, à valider sur le pilote) → **pattern**
5. **Type d'IA** — genAI texte/image/vidéo, ML prédictif, reco, agents, vision, voice…
6. **Plateforme / stack martech** — Meta, Google, Salesforce, WhatsApp, Adobe, Klaviyo… ou custom/in-house. Flag par fiche : **custom** (répliquer = projet) vs **plateforme** (répliquer = activer la feature) vs hybride.
7. **Objectif / métrique** — CAC, CVR, AOV, LTV, churn, coût de production, NPS…

Collecte à plat ; les matrices (industrie × pattern, industrie × levier…) émergent seules. La matrice de couverture révèle les angles morts = les opportunités.

## La fiche (voir `schema/fiche.schema.json`)

Chaque cas : identité + 7 axes + description concrète + résultats chiffrés avec citations + niveau de preuve + dates + statut vivant + sources archivées + **schéma de fonctionnement** + **section réplication** + champs SEO/GEO.

### Le schéma de fonctionnement
- Stocké comme **donnée structurée** (flow JSON : nœuds + liens), rendu automatiquement — jamais une image dessinée.
- Deux modes affichés explicitement : **documenté** (architecture publiée, sourcé) vs **approche-type** (« le détail n'est pas public, voici une approche éprouvée qui mène au même résultat »).
- **Adaptation au stack client** : les nœuds génériques (CDP, canal conversationnel…) sont substitués par les outils déclarés du client → le même pattern se rend en version Salesforce+WhatsApp ou Klaviyo+Meta.

### La règle sourcé / inféré
Les faits sourcés et l'inférence (« comment répliquer », schémas approche-type) sont **visuellement séparés**. Une seule affirmation présentée comme un fait qui n'en est pas un, et la crédibilité de toute la base saute — or la crédibilité est le produit.

## Les trois briques

1. **Le collecteur** — pipeline qui trouve, filtre (crédibilité), structure et dédoublonne (1 cas = 1 fiche multi-sources). Gisements : voir `docs/GISEMENTS.md`.
2. **La base publique** — toutes les fiches, filtrables sur les 7 axes ; pages hub par cellule de matrice.
3. **Le générateur de rapports** — entrée : profil client (industrie, métier, stack martech, maturité data) → sortie : rapport agrégé priorisé par **score de réplicabilité** (impact prouvé × effort × prérequis data) → grille quick wins / paris structurants.

## Distribution : les growth loops (méthodologie Reforge)

Le projet ne vit que par les recherches en ligne. Trois loops :

- **Loop 1 — Content/SEO programmatique** : fiche = page publique, cellule de matrice = page hub ; **la taxonomie 7 axes = l'architecture d'URL**. Trafic organique (« AI use case retail personnalisation ») → conversion sur le générateur de rapport (email + profil stack) → leads → missions → financent la collecte → plus de pages.
- **Loop 2 — GEO / citation LLM** : structure + preuves + dates + citations = le format exact que ChatGPT/Perplexity citent. Le filtre de crédibilité EST l'arme GEO.
- **Loop 3 — Le rapport qui circule** : le rapport généré (PDF/URL signé) circule en interne du compte → nouveaux visiteurs qualifiés. Les stacks déclarés enrichissent la base.

**Ligne freemium** : fiches + hubs = publics (carburant des loops 1-2). Générateur + adaptation stack = gatés derrière profil (moment de conversion). Le moat n'est pas le secret de la liste : c'est la fraîcheur, la discipline de preuve, la marque citée, et la couche personnalisée.

## Conformité / géographie

Cible européenne ⇒ chaque fiche porte ses **marchés de déploiement** + un flag **transposable UE** (RGPD, AI Act). Un cas non transposable présenté sans ce flag détruit la crédibilité en un rendez-vous.

## Refresh

Chaque cas est daté (`vérifié le`, `à revérifier après`). Relance du collecteur à la demande ; pas de monitors automatiques avant preuve d'usage commercial.

## Anti-showreel — promu en v1 (2026-07-11)

**Le « cimetière des cas d'usage »** : ~10 cas d'échec publics documentés (features retirées, backlash, chatbots débranchés). L'étude de marché ([MARCHE.md](MARCHE.md)) le confirme : personne au monde ne le fait, et c'est l'angle éditorial le plus citable par les LLMs. Pas dans le pilote de 10 fiches, mais dans la première mise en ligne.

## Backlog v1.1

- Monitors de refresh automatiques (Firecrawl) si l'asset gagne ses premiers rendez-vous.
- Décision marque + domaine avant mise en ligne publique.
- Suivi des citations LLM (Peec AI / Otterly).
