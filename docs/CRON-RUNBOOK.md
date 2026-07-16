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

0. **Cibler les angles morts (AVANT de chercher).** `node site/gaps.mjs --brief` (et `--json`
   pour batch/_gaps.json). Le script lit la matrice de couverture et sort les croisements
   industrie x levier VIDES, priorises par levier le plus pauvre. La carte des angles morts EST
   le produit qu'on vend : elle doit piloter la collecte, sinon on renforce le gras (retail /
   acquisition) et les trous restent. Colle ce brief dans les agents de l'etape 1.
   Prepare aussi l'anti-doublon : liste des marques deja en base ->
   `node -e "..."` vers batch/_existing-brands.txt (ou equivalent).

1. **Decouverte (Mode B), pilotee par les gaps.** Lance 1 a 2 agents de recherche ciblee
   (Agent tool). Chacun cherche via WebSearch/WebFetch des deploiements IA marketing REELS et
   A L'ECHELLE par de GRANDES marques, qui ne sont PAS deja en base (cases/*.json). **Donne a
   chaque agent le brief de l'etape 0 : il doit chercher EN PRIORITE sur les croisements vides**
   (un cas en `energie x monetisation` vaut plus qu'un enieme cas retail). Garde un agent sur la
   veille large (earnings du trimestre + presse etablie) pour ne pas rater les gros signaux.
   Chaque agent ecrit ses leads dans un fichier JSON dans batch/modeB/ au format :
   {marque, pattern, industrie_probable, source_urls[], niveau_preuve_estime (A/B/C/D),
   justification}. Vise des leads niveau A/B (chiffres publics/earnings). Regle qui ne bouge pas :
   si un croisement vide ne donne rien de solide, on le laisse vide - un angle mort honnete est
   une information, un cas force est une faute.

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

6bis. **Traduction EN (site bilingue).** `node site/translate-check.mjs` liste les fiches de
   cases/ sans traduction EN. Si la liste n'est PAS vide (fiches fraichement promues) : fan-out
   d'un agent par fiche (ou petits lots), chacun lit docs/TRANSLATE-BRIEF.md + la fiche source
   cases/<id>.json et ecrit translations/en/<id>.json (prose UNIQUEMENT ; JAMAIS marque, valeur,
   citation_exacte, source_ref, dates, sources, niveau_preuve.niveau, cles d'axes, ids). Objectif :
   `node site/translate-check.mjs --count` renvoie 0 avant le build. Sans ca les nouvelles fiches
   s'affichent en EN avec fallback FR (pas casse, mais pas traduit).

7. **Build.** `node site/qa-gate.mjs && node site/build.mjs`. Si qa-gate bloque, corrige
   la typographie fautive dans les fiches concernees puis rebuild. Anti-slop s'applique aussi
   aux traductions EN (guillemets droits, tiret simple).

8. **Digest.** Ecris une ligne de bilan dans logs/collecte-runs.md (cree-le s'il manque),
   format : `- AAAA-MM-JJ : X leads decouverts, Y marketing, Z promus (A/B), C en revue,
   base -> N fiches`. Puis termine.

9. **Deploiement.** Le site est live sur ai-showreel.com (Vercel connecte a GitHub). Publie
   les nouvelles fiches : `git add -A && git commit -m "collecte hebdo AAAA-MM-JJ : +Z fiches"
   && git push origin main`. Le push declenche l'auto-deploy Vercel (build + mise en ligne FR+EN).
   Verifie que translate-check.mjs renvoie 0 AVANT de pousser (pas de fiche EN non traduite en prod).

Ne supprime jamais de fiche existante. Ne touche pas au .env ni aux secrets. Ne commit jamais
.env, batch/, dist/, translations/en n'est PAS ignore (il DOIT etre commite avec les fiches).
