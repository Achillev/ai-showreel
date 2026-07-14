# RUNBOOK — run de collecte hebdomadaire (headless)

Tu executes le run de collecte hebdomadaire du moteur AI Showreel, en autonomie
(pas d'humain qui te repond). Suis ces etapes DANS L'ORDRE. Le design complet est
dans docs/ORCHESTRATEUR.md ; ce runbook en est l'execution operationnelle.

Regles dures qui ne changent jamais : que du factuel, jamais rien d'invente ; dans
la partie replication JAMAIS de delais/budgets/efforts/scores inferes ; anti-slop
(pas de tiret cadratin, guillemets courbes, ellipse unicode) ; ne jamais ecrire
"Elevate" (marque = ConversionMentors). Filtre de credibilite applique honnetement :
une fiche OU un rejet motive, jamais de fabrication.

## Etapes

1. **Decouverte (Mode B).** Lance 1 a 2 agents de recherche ciblee (Agent tool). Chacun
   cherche via WebSearch/WebFetch des deploiements IA marketing REELS et A L'ECHELLE
   par de GRANDES marques, annonces recemment (earnings calls du trimestre + presse
   etablie), qui ne sont PAS deja en base (cases/*.json). Chaque agent ecrit ses leads
   dans un fichier JSON dans batch/modeB/ au format :
   {marque, pattern, industrie_probable, source_urls[], niveau_preuve_estime (A/B/C/D),
   justification}. Vise des leads niveau A/B (chiffres publics/earnings).

2. **Triage deterministe.** `node site/triage.mjs --cap 12`
   -> produit batch/_triage-queue.json (voie `queue` = nouveaux, `revue_distinction`
   = marque deja en base, doublons jetes).

3. **Pre-filtre perimetre.** Un agent lit docs/TRIAGE-BRIEF.md + le champ `queue` de
   batch/_triage-queue.json, et rend pour chaque lead `marketing` ou `hors_scope` + raison.
   Ne garde que les `marketing` pour la suite. (Regle qui tranche : l'IA est-elle
   l'experience CLIENT = marketing, ou l'outil de l'EMPLOYE = hors_scope.)

4. **Revue de distinction (si `revue_distinction` non vide).** Un agent verifie, sans
   fetch lourd, si le pattern de chaque lead est deja couvert par la fiche existante de
   cette marque. S'il est vraiment distinct, il rejoint la file marketing ; sinon jete.

5. **Fan-out collecteur.** Cree le dossier batch/sliceB-$(date +%Y%m%d). Un agent
   collecteur par lead marketing retenu : il lit docs/COLLECTOR-BRIEF.md +
   schema/fiche.schema.json + docs/REDACTION.md, verifie ses sources (chaque URL existe,
   chaque chiffre a sa source), et ecrit la fiche JSON conforme (nom = slug) dans
   batch/sliceB-$(date +%Y%m%d)/. S'il echoue le filtre de credibilite : aucune fiche,
   il renvoie REJECTED + raison. Il rejette les chiffres du lead non corrobores, remplace
   les sources faibles, tient l'anti-doublon.

6. **Gate d'auto-publication.** `node site/batch-promote.mjs --auto` (dry-run pour voir),
   puis `node site/batch-promote.mjs --auto --commit`. En mode --auto : seul le niveau
   A/B (>=2 sources) est publie dans cases/ ; le C/D part en batch/_review/ (revue humaine,
   jamais publie en auto).

7. **Build.** `node site/qa-gate.mjs && node site/build.mjs`. Si qa-gate bloque, corrige
   la typographie fautive dans les fiches concernees puis rebuild.

8. **Digest.** Ecris une ligne de bilan dans logs/collecte-runs.md (cree-le s'il manque),
   format : `- AAAA-MM-JJ : X leads decouverts, Y marketing, Z promus (A/B), C en revue,
   base -> N fiches`. Puis termine.

Ne deploie pas (pas de domaine encore). Ne supprime jamais de fiche existante. Ne touche
pas au .env ni aux secrets.
