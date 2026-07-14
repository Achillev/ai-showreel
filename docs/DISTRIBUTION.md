# Distribution — amorçage Reddit/LinkedIn + machine automatique

*2026-07-11. Cadre Reforge : les loops (SEO/GEO, rapport viral) composent mais démarrent lentement — le problème des premiers mois est un problème de cold start. On l'attaque par du seeding manuel qui devient systématique, puis semi-automatique. On n'automatise jamais ce qui doit rester authentique.*

## 1. Le séquencement (pourquoi Reddit/LinkedIn d'abord)

Le SEO programmatique (loop 1) met 3 à 6 mois à produire. Pendant ce délai, deux canaux donnent du trafic immédiat ET servent le GEO :

- **LinkedIn** : là où vivent les CMO/directeurs digitaux. Porte le founder-brand ex-Accenture (E-E-A-T incarné).
- **Reddit** : massivement crawlé et cité par les LLMs (accords Google/OpenAI). Chaque mention utile de la base dans une réponse Reddit est un signal GEO — en plus du trafic.

Ordre : LinkedIn + Reddit dès la mise en ligne de l'étage 0 → newsletter dès les premières visites → le SEO monte en puissance derrière.

## 2. Playbook LinkedIn (semi-automatisé)

**Le compte** : profil personnel (le founder ex-Accenture), pas une page entreprise — l'algorithme et la confiance favorisent les personnes.

**Les 3 formats récurrents** (tous dérivés des fiches, jamais de contenu hors-base) :
1. **Le cas chiffré** — la stat + comment c'est mesuré + le niveau de preuve. L'angle « voici ce que dit vraiment la source » se démarque du feed IA habituel.
2. **Le post-mortem cimetière** — probablement le format le plus performant : personne ne publie les échecs sourcés. « Le chatbot d'Air Canada a inventé une politique de remboursement. Un tribunal a tranché. Voici ce que ça change pour vous. »
3. **L'angle mort** — une case vide de la matrice : « 3 industries ont prouvé ce pattern. La vôtre ne l'a pas encore touché. »

**Cadence** : 2-3 posts/semaine. **Règle d'écriture** : REDACTION.md s'applique aux posts aussi.

**Ce qui est automatisé** : à la publication d'une fiche, le pipeline génère le **draft de post** (3 variantes) + l'**og-image** (MarkupGo). **Ce qui reste humain** : le choix, la retouche, la publication, et les réponses en commentaires (l'engagement de la première heure fait l'algo — inautomatisable sans se griller).

**Boucle** : post → visites profil + base → rapport généré → PDF qui circule en interne (loop 3) → nouveaux followers → post suivant porte plus loin.

## 3. Playbook Reddit (le plus manuel, le plus rentable en GEO)

Reddit déteste l'auto-promotion et la sanctionne. Le play est **value-first strict** :

- **Subreddits cibles** : r/marketing, r/digital_marketing, r/PPC, r/ecommerce, r/bigseo, r/CRO, r/askmarketing (à affiner selon où les questions IA se posent réellement).
- **Le geste** : répondre aux questions (« est-ce que Advantage+ marche vraiment ? », « des exemples d'IA en rétention ? ») avec **la donnée sourcée de la base** — chiffre, source, niveau de preuve, nuance. Le lien vers la fiche seulement quand il répond littéralement à la question.
- **Ratio 90/10** : neuf contributions sans lien pour une avec. Compte unique, karma construit avant tout lien. Jamais de drop à froid, jamais de compte jetable.
- **Ce qui est automatisé** : le pipeline prépare des **snippets de réponse prêts à coller** (la stat + la source + la nuance, format Reddit). **Ce qui reste humain** : trouver les threads, adapter, poster. Un monitoring des questions pertinentes (mots-clés sur les subreddits cibles) peut être automatisé pour alimenter une file « threads à répondre ».

**Pourquoi ça vaut l'effort manuel** : une bonne réponse Reddit ranke dans Google, se fait citer par les LLMs, et vit des années. C'est du GEO composé, pas du social jetable.

## 4. La machine : « 1 fiche = N assets »

Le modèle automatique demandé. À chaque publication ou mise à jour de fiche, le pipeline génère et range dans `distribution_queue` :

| Asset | Outil | Auto ? |
|---|---|---|
| og-image (marque, stat clé, niveau de preuve) | MarkupGo | ✅ full auto |
| 3 drafts LinkedIn (cas chiffré / cimetière / angle mort selon le type) | LLM + REDACTION.md | ✅ génération auto, publication humaine |
| 2-3 snippets réponse Reddit | LLM + REDACTION.md | ✅ génération auto, usage humain |
| Item newsletter (2 phrases + lien) | LLM | ✅ auto, assemblage mensuel |
| Ping sitemap / IndexNow | code | ✅ full auto |

Orchestration : le build détecte les fiches nouvelles/modifiées → génère les assets → TaskMagic notifie « X assets en attente d'approbation ». **La règle homme/machine est la même que pour la maintenance : la machine prépare, l'humain publie.**

## 5. La newsletter — le chaînon owned

La **veille mensuelle gratuite** (« ce qui a bougé ce mois-ci : nouveaux cas prouvés, cas morts, patterns émergents ») :
- MVP de l'étage 2 (on vend ensuite la version par périmètre, temps réel, personnalisée stack) ;
- capture d'emails dès le premier mois ;
- assemblée automatiquement depuis les diffs de la base (les items de veille du pipeline de maintenance).

C'est le canal qui relie tout : Reddit/LinkedIn -> visite -> newsletter -> rapport -> lead.

### Où elle vit : maison vs vitrine (décidé 2026-07-11)

- **Maison = notre domaine, via beehiiv (ou ESP équivalent API-first).** Raisons : API officielle de création/publication de posts (l'assemblage automatique depuis les diffs en dépend), custom domain (l'autorité SEO reste chez nous), et surtout la liste + les PROFILS (industrie/métier/stack) restent notre actif. Substack n'a pas d'API officielle de publication et ne capture qu'un email : en faire la maison dégraderait la data loop et donnerait la relation (plus 10 % du payant) à la plateforme.
- **Substack = vitrine de republication** (comme Reddit/LinkedIn) : cross-post mensuel manuel (~30 min/mois) pour capter son réseau de découverte (recommandations, Notes, app), avec liens vers la base et le générateur. Signal d'arrêt : 3 mois sans abonnés ni rapports générés -> on coupe. Signal de scale : ça convertit -> on y pousse les posts cimetière en éclaireurs.

## 6. Instrumentation (loop analysis Reforge : returns / costs / scope)

À poser dès la mise en ligne, un tableau par loop :

| Loop | Métrique de retour | Coût | Signal d'arrêt/scale |
|---|---|---|---|
| SEO/GEO (1-2) | Sessions organiques par hub ; citations LLM (plus tard, Peec/Otterly) | Coût de collecte/fiche | Un hub qui ne ranke pas en 6 mois → revoir la requête cible |
| LinkedIn | Visites référées, abonnés, DM entrants | ~2h/sem | Si les posts cimetière surperforment → doubler la cadence dessus |
| Reddit | Trafic référé + mentions dans réponses LLM | ~2h/sem | Karma qui stagne ou modérations → revoir le ratio valeur/lien |
| Rapport viral (3) | Rapports générés/mois, % de profils multi-visiteurs même domaine | Build du générateur | — |
| Newsletter (beehiiv, maison) | Abonnés, taux d'ouverture, clics vers fiches | Quasi nul (auto) | — |
| Substack (vitrine) | Abonnés référés, rapports générés issus du canal | ~30 min/mois | 3 mois sans conversion -> couper ; ça convertit -> posts cimetière en éclaireurs |

**North star candidate : rapports générés / mois** — c'est le point où toutes les loops convergent et l'entrée de la monétisation.

## 7. Ce qu'on n'automatise jamais (garde-fous)

- Publication LinkedIn et Reddit (authenticité + risque de bannissement + c'est là que se joue la confiance).
- Réponses aux commentaires et DM.
- Merge de toute correction ou mise à jour de fiche (cf. ARCHITECTURE.md).
- Le ton : REDACTION.md s'applique à tout asset généré — un draft qui « sent l'IA » se réécrit ou se jette.
