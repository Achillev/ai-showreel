# Architecture — base de données & maintien des informations

*2026-07-11. Principe directeur : le contenu est du code. Les fiches vivent en git, la base runtime les indexe.*

## 1. Structure de la donnée

### Phase 1 — maintenant, jusqu'à ~150 fiches (« content as code »)

`cases/*.json` en git = **la source de vérité unique**. Le site statique se build depuis les fichiers.

Pourquoi c'est le bon choix au démarrage, et pas une facilité :
- **git log = historique complet de chaque fiche** (qui a changé quoi, quand). La traçabilité — notre produit — est gratuite.
- Validation mécanique par `schema/fiche.schema.json` avant tout build.
- Une correction externe = un diff reviewable avant publication (la garantie Hormozi a besoin de ce contrôle).
- Zéro infra à maintenir pendant qu'on valide le format.

### Phase 2 — base vivante (générateur + veille + profils), sur Supabase

Déclencheur : le générateur de rapports (il a besoin de requêtes croisées et de profils clients) ou le passage à ~150+ fiches. Stack : Supabase (déjà maîtrisé via auditcro). **Git reste la chaîne de rédaction/review ; Supabase est le runtime.** Sync automatique au merge.

Tables :

| Table | Contenu | Clés |
|---|---|---|
| `cases` | La fiche complète en JSONB + colonnes extraites pour filtres (industrie, levier, famille, pattern, niveau_preuve, statut_vivant, type_fiche, dates) | id (slug) |
| `patterns` | Référentiel niveau 2 cross-industrie (famille, nom, description) — les fiches y pointent ; c'est ce qui permet « prouvé dans 3 industries, absent de la vôtre » | pattern_id |
| `sources` | Sources normalisées : url, type, fiabilite (T1-T4), archive_url, date_consultation, **statut_lien** (vivant / mort / redirigé) | source_id, case_id |
| `verifications` | Log de chaque check de vivacité : date, méthode (Buzzabout / Notte / PeekShot / manuel), résultat, capture_url | case_id, date |
| `corrections` | Feedback entrant : fiche, texte, source proposée, statut (reçu / vérifié / mergé / rejeté + motif) | correction_id |
| `profils_clients` | Entrées du générateur : industrie, métier, stack martech, maturité, email | profil_id |
| `rapports_generes` | Chaque rapport : profil, cases incluses, date, url du PDF | rapport_id |
| `distribution_queue` | Assets générés par fiche (og-image, draft LinkedIn, snippets, item newsletter) + statut (généré / approuvé / posté) | asset_id, case_id |

Deux remarques de conception :
- `verifications` et `corrections` ne sont pas de la tuyauterie : ce sont **les preuves publiques de la méthodologie**. À terme, la fiche peut afficher « vérifié 3 fois, dernière le… » — personne d'autre ne peut l'afficher.
- `profils_clients` × `cases.plateforme_stack` = le croisement qui rend le rapport tueur (« vous payez déjà Salesforce, ces 4 cas sont activables »).

## 2. Maintien des informations — le pipeline de fraîcheur

C'est ici que la base gagne ou perd sa valeur. Règle d'or : **la maintenance n'est pas un coût, c'est le produit de l'étage 2** — chaque changement détecté est un item de veille vendable et un contenu de distribution.

### La file de re-vérification

Pilotée par `dates.revoir_apres`, avec une cadence par profil de cas :

| Type de cas | Cadence de re-vérification |
|---|---|
| `statut_vivant = signaux_mitiges` | 3 mois |
| Cas plateforme (la feature évolue vite) | 6 mois |
| Cas custom stabilisé | 12 mois |
| Cimetière (`echec_retrait`) | 12 mois (le « pattern reste-t-il valide ? » peut évoluer) |

Un script liste les fiches périmées → relance le collecteur en mode re-check → chaîne de vivacité : **Buzzabout** (signal social < 12 mois) → **Notte** (la feature répond-elle encore ?) → **PeekShot** (capture datée) → mise à jour de `verifie_le` / `revoir_apres` / `statut_vivant`.

### Ce qui se passe quand un cas bouge

- **Chiffre mis à jour, nouveau marché, nouvelle source** → fiche mise à jour (diff git) + item de veille.
- **Signal de dégradation** → `statut_vivant` passe à `signaux_mitiges`, cadence resserrée à 3 mois.
- **Retrait documenté** → la fiche ne se supprime JAMAIS : elle devient `echec_retrait`, gagne son post-mortem, part au cimetière. L'historique git garde la version « succès ». **Un cas qui meurt est un événement éditorial** (alerte de veille + post cimetière) — c'est l'alerte que personne d'autre au monde ne peut envoyer.
- **Lien source mort** → `statut_lien` bascule, l'archive.org prend le relais (d'où l'archivage systématique à la collecte, à câbler).

### Les corrections entrantes (bouton feedback)

Triage humain obligatoire : vérifier la source proposée → grade de fiabilité → merge en diff git → réponse au contributeur. Jamais de merge automatique : la garantie repose sur ce contrôle. SLA cible : réponse sous 7 jours (c'est un engagement de marque, pas de l'ops).

### Niveaux d'automatisation (règle de partage homme/machine)

- **Automatique** : détection (Buzzabout, monitors), capture (PeekShot), archivage, génération des assets de distribution, listes de fiches périmées.
- **Humain obligatoire** : tout changement du contenu d'une fiche, tout merge de correction, tout passage au cimetière. La machine détecte et prépare ; l'humain valide ce qui est publié comme un fait.
