# L'orchestrateur du moteur de collecte

*2026-07-12. Design concret du "cerveau" qui enchaine les 5 couches de
docs/MOTEUR-COLLECTE.md en un run cadence. Informe par les deux mesures du 2026-07-12
(Mode A vs Mode B = 12 % vs 90 % ; taux de survie qualification Mode B = 90 %). Ce
document est un RUNBOOK executable, pas une intention.*

## Le principe : un runbook Claude qui pilote des mains deterministes
Le fan-out de collecte et le pre-filtre perimetre ont besoin de Claude (jugement +
recherche). Un script Node ne peut pas les faire seul. Donc l'orchestrateur = une
session Claude (interactive, ou `claude -p` en headless pour le cron) qui suit ce
runbook, appelle les scripts Node pour tout ce qui est deterministe, et n'utilise des
agents que pour les deux etapes qui l'exigent. Rien n'est publie comme un fait sans le
gate.

Les mains deterministes (scripts, 0 dependance, deja la sauf mention) :
- `site/discover.mjs` - Mode A : crawl des gisements -> `batch/_candidates.json` (necessite FIRECRAWL_API_KEY).
- `site/triage.mjs` - **NOUVEAU (2026-07-12)** : normalise A+B, dedoublonne vs base, trie par preuve, plafonne, separe les voies -> `batch/_triage-queue.json`.
- `site/batch-promote.mjs` - valide/normalise anti-slop/dedoublonne/promeut `batch/slice*` -> `cases/`.
- `site/qa-gate.mjs` - bloque si typographie interdite.
- `site/build.mjs` - `cases/` -> `dist/`.

Les briefs lus par les agents :
- `docs/TRIAGE-BRIEF.md` - **NOUVEAU** : pre-filtre perimetre (marketing vs hors-scope), bon marche.
- `docs/COLLECTOR-BRIEF.md` - qualification + redaction de fiche.

## Le run, dans l'ordre

### 0. Decouverte (alimente les files brutes)
- **Mode B (coeur, agent-driven)** : selon la cadence, lancer 1-2 agents de recherche
  ciblee (earnings du trimestre en cours + presse etablie standing queries) qui ecrivent
  des leads dans `batch/modeB/*.json` au format {marque, pattern, industrie_probable,
  source_urls, niveau_preuve_estime, justification}. C'est ce qui a produit les 27 leads
  du 2026-07-12.
- **Mode A (filet de largeur, opportuniste)** : `node site/discover.mjs` si la cle
  Firecrawl est presente. Rappel mesure : conversion ~12 %, gisements a pre-filtrer
  (exclure infra). Ne pas en faire le coeur.

### 1. Triage deterministe
```
node site/triage.mjs --cap <K>
```
Produit `batch/_triage-queue.json` avec trois issues :
- `queue` (les NOUVELLES marques, triees par niveau de preuve estime, plafonnees a K) -> vont au pre-filtre puis au fan-out.
- `revue_distinction` (marque DEJA en base, pattern peut-etre distinct) -> voie separee, PAS de collecteur avant un check.
- doublons base -> jetes silencieusement (comptes dans `stats`).
Le cap K est le levier de cout du run (voir modele de cout).

### 2. Pre-filtre PERIMETRE (1 agent bon marche)
Un seul agent lit `docs/TRIAGE-BRIEF.md` + le champ `queue`, et rend pour chaque item
`marketing` ou `hors_scope` + raison. Cout ~3 k tokens pour toute la file. C'est
l'etage ne de la mesure : il tue les Telstra (hors-scope) AVANT de depenser un
collecteur a ~90 k. Ne garder que les `marketing`.

### 2bis. Revue de distinction (1 agent bon marche, optionnel)
Pour `revue_distinction` : un agent verifie, sans fetch lourd, si le pattern du lead est
DEJA couvert par la fiche existante de cette marque. Si oui -> jete. Si nouveau pattern
distinct -> rejoint la file marketing. Evite de recollecter (ex. Pinterest/MercadoLibre
qu'on vient de promouvoir remontent ici, pas au fan-out).

### 3. Fan-out collecteur (N agents, N = taille de la file marketing)
Un agent collecteur par lead retenu, lisant `docs/COLLECTOR-BRIEF.md` + `schema/
fiche.schema.json` + `docs/REDACTION.md`, ecrivant dans `batch/slice<AAAAMMJJ>/`.
Consigne cle (validee le 2026-07-12) : filtre de credibilite HONNETE, fiche OU rejet
motive, jamais de fabrication ; rejeter les chiffres du lead non retrouves a la source ;
remplacer les sources faibles ; tenir l'anti-doublon. Retour d'une ligne par agent :
`PROMU: <slug> | <marque> | niveau <x>` ou `REJECTED: <marque> | <raison>`.

### 4. Gate (promotion, la ou l'humain protege le moat)
```
node site/batch-promote.mjs            # dry-run : lit ce qui passe le schema + dedup
node site/batch-promote.mjs --commit   # ecrit dans cases/
```
Regle d'auto-publication (docs/MOTEUR-COLLECTE.md couche 4) : n'auto-publier que le
HAUTE CONFIANCE (niveau A/B + >=2 sources verifiees). Tout C/D ou source unique ->
file de revue humaine, pas de publication auto. La garantie "cas mort = annee offerte"
interdit de publier du non-verifie automatiquement. En run headless, le commit des C/D
reste suspendu a une validation humaine.

### 5. Build + (deploy)
```
node site/qa-gate.mjs && node site/build.mjs
```
Puis deploy Vercel quand la cible existe (BLOQUEUR actuel : constante SITE placeholder,
voir plus bas). Aujourd'hui le build est local (`dist/`).

### 6. Digest
Resume du run : X nouveaux cas promus (dont niveaux), Y en file de revue humaine, Z
hors-scope tues au pre-filtre, cout tokens estime, doublons ecartes. Sert de journal et
de signal de rendement (voir plus bas : on affine le cout/cycle avec ces chiffres).

## Modele de cout (issu des mesures du 2026-07-12)
- Un collecteur = ~80-105 k tokens / lead (10 agents observes). C'est le poste dominant.
- Le pre-filtre perimetre = ~3 k tokens pour toute la file. ROI : il evite les
  collecteurs hors-scope (Telstra a coute 65 k pour un rejet evitable).
- Sur des leads Mode B niveau A pre-tries : survie 90 %. Donc un run de K collecteurs sur
  la partie haute de la file rend ~0,9 K fiches pour ~K x 90 k tokens + un pre-filtre.
- **Non encore mesure** : la survie des leads B/C/D (elle chutera sous 90 %). Tant qu'on
  ne l'a pas, plafonner le cap sur la partie NIVEAU A/B de la file et laisser le digest
  accumuler le rendement reel par niveau avant d'ouvrir le robinet plus bas.

## Cadences (calees sur la nature des sources)
- **Mode B earnings : trimestriel**, cale sur les saisons de resultats (c'est la que
  tombent les chiffres niveau A). Le run le plus rentable.
- **Mode B presse : hebdomadaire** (standing queries), volume regulier de niveau B/C.
- **Mode A crawl : mensuel**, opportuniste, filet de largeur pre-filtre.
- **Fraicheur (couche 5) : quotidienne**, traite les `revoir_apres` echus du jour ;
  boucle separee, ne passe pas par la decouverte.

## Ordonnancement : ce qu'on branche, et quand
Le fan-out a besoin de Claude, donc l'ordonnanceur enveloppe un appel `claude -p` qui
joue ce runbook (ou une invocation de skill `/collecte`). Options disponibles :
CronCreate / MCP scheduled-tasks pour le cron, TaskMagic pour un declencheur externe.
**Recommandation : NE PAS cron-ifier tout de suite.** Deux raisons : (1) le deploy est
bloque tant que le domaine/nom n'est pas tranche (constante `SITE` placeholder dans
build.mjs, cf. docs/GEO-SEO.md) ; (2) l'auto-publication des C/D exige une validation
humaine par design. Donc a ce stade : declenchement MANUEL du runbook (moi, a la
demande), le temps d'accumuler quelques cycles de digest et de trancher le nom. On cable
le cron une fois le nom pose et le seuil d'auto-publish confirme.

## Etat de construction
- **Construit et teste (2026-07-12)** : `site/triage.mjs` (couche 2 complete : normalise
  A+B, dedup 3 voies, tri preuve, cap, nettoyage bruit). Teste sur 399 candidats reels
  -> file de 12 leads B nouveaux, revue de distinction de 20, doublons ecartes.
  `docs/TRIAGE-BRIEF.md` (pre-filtre perimetre). Les mains deterministes 3-5 existaient
  deja et sont eprouvees (223 fiches promues a ce jour).
- **Pilote par le runbook (pas de code, ce sont des etapes agent)** : decouverte Mode B,
  pre-filtre perimetre, revue de distinction, fan-out collecteur, digest. Le runbook
  ci-dessus EST leur specification ; ils se lancent a la main aujourd'hui.
- **Attend une cle / decision** : Firecrawl (Mode A auto), cible de deploy + nom de
  domaine (debloque le cron et le deploy), branchement Buzzabout/Notte/PeekShot pour la
  couche 5 fraicheur, seuil d'auto-publish confirme (recommande : A/B + 2 sources).

## Garde-fous (non negociables)
- Jamais d'auto-publication sous le haute confiance ; le gate humain protege le moat.
- Le cap K borne le cout de chaque run ; le digest journalise ce qui a ete traite et
  ce qui a ete ecarte (jamais de troncature silencieuse).
- Tout ce que le moteur ecrit passe qa-gate (anti-slop) et batch-promote (schema/dedup),
  memes regles que le manuel.
- La regle dure replication tient (aucun delai/budget/effort/score infere).
- Le moteur detecte et prepare ; l'humain valide ce qui est publie comme un fait.
