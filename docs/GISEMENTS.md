# Gisements de collecte

La qualité de la base = la qualité de cette liste. Chaque gisement est mappé sur le niveau de preuve qu'il peut produire au mieux.

## Niveau A — résultats financiers
- **Earnings calls / rapports annuels** des grands groupes (transcripts : Seeking Alpha, Motley Fool, IR des groupes). Requêtes type : "AI" + nom du groupe dans les transcripts trimestriels.
- Documents réglementaires (10-K, URD européens) — sections "technology" / "strategy".

## Niveau B — études de cas plateformes (biaisées mais chiffrées)
- **Meta for Business** — success stories (Advantage+, WhatsApp Business).
- **Think with Google / Google Ads** — case studies (PMax, Demand Gen).
- **Salesforce** — customer stories (Einstein, Agentforce, Marketing Cloud).
- **Microsoft** — customer stories Azure OpenAI (très riche en cas retail/e-com).
- **OpenAI / Anthropic** — pages clients & case studies.
- **Adobe, Klaviyo, Braze, Insider, Bloomreach** — customer stories CRM/perso.
- Règle : niveau B max, sauf confirmation croisée ailleurs (⇒ monte).

## Niveau C — presse citant la marque
- Presse business/marketing : Reuters, Bloomberg, WSJ, FT ; Digiday, AdAge, Marketing Week, Retail Dive, Modern Retail ; en France : LSA, Journal du Net, Republik Retail, Stratégies.
- Interviews de dirigeants (podcasts, presse) où un chiffre est cité.

## Niveau D — déclaratif conférence
- NRF Big Show, DMEXCO, Cannes Lions, Shoptalk, VivaTech, World Retail Congress — talks et couverture presse associée.

## Complémentaires (contexte, jamais preuve seule)
- Engineering blogs des marques (Zalando, Booking, Netflix, Spotify…) — souvent la seule source du "comment" (⇒ alimente le mode « documenté » du schéma de flow).
- Études sectorielles (McKinsey, BCG, Bain) — pour repérer des cas, à re-sourcer ensuite en primaire.

## LinkedIn — règle explicite (décidé 2026-07-11)
LinkedIn a deux usages valides et une ligne rouge.
- ✅ **Signal de vivacité** : un post récent d'un dirigeant/employé sur un déploiement est souvent la meilleure preuve qu'un cas est *encore vivant* — mieux qu'une customer story jamais mise à jour.
- ✅ **Piste de découverte** : repérer un cas sur LinkedIn, puis le sourcer ailleurs.
- ⛔ **Jamais une preuve autonome.** Un post est de l'auto-promotion sans méthodo ni contradicteur. Laisser entrer un chiffre LinkedIn comme preuve rouvrirait le biais vendeur qu'on reproche au marché.
- **Plafond de niveau : D** (déclaratif). Un cas ne peut PAS exister sur la seule foi d'un post LinkedIn (échoue au filtre de crédibilité). Un post peut *dater* ou *corroborer* un cas déjà sourcé ailleurs (et faire monter le niveau si concordant).
- **Distinction** : post depuis la **page officielle de la marque** = traité comme un communiqué (proche `blog_officiel`) ; post d'un individu = `declaratif` (D).

## Attribution des personnes et des marques (décidé 2026-07-11)
Mettre en avant les praticiens réels renforce l'E-E-A-T et l'angle « déploiements réels par des gens réels ». Champs : `marque_linkedin`, `intervenants[]`.
- ✅ **Marque** : URL LinkedIn officielle, VÉRIFIÉE (jamais devinée). Affichée sur les fiches succès uniquement.
- ✅ **Personnes** : uniquement celles publiquement et vérifiablement associées au projet — citées dans la source, intervenues en conf, auteurs du blog technique. Chaque nom trace à une `source_ref`.
- ⛔ **Jamais d'URL LinkedIn fabriquée.** Un lien vers le mauvais profil est pire que pas de lien. Si l'URL n'est pas confirmée : nom + rôle seuls (sourcés), pas de lien.
- ⛔ **Jamais d'individu sur une fiche `echec_retrait`.** On ne pointe pas un échec public sur une personne nommée (injuste + risque). Sur le cimetière, ni personne ni page marque : le bloc n'apparaît pas.
- Exemple validé : Renault → Özlem Kılıçkaya (Renault Mais), citée dans l'étude Think with Google (S1), profil vérifié.

## Grade de fiabilité par source (décidé 2026-07-11)
Chaque source porte un grade `fiabilite`, distinct du niveau de preuve du cas. But : garantir qu'on n'a que du réel, jamais du bruit internet.
- **T1 — Primaire** : document non-interprété (décision de justice, doc SEC / résultats financiers, communiqué officiel de la marque-sujet).
- **T2 — Officiel intéressé** : source officielle mais vendeuse (customer story plateforme/vendor/intégrateur — Meta, Google, Datatonic…).
- **T3 — Presse établie** : presse majeure reconnue.
- **T4 — Secondaire** : presse spécialisée / analyse tierce.
- **Exclu — bruit internet** : listicle recyclé, agrégateur anonyme, SEO spam, contenu généré non sourcé. N'a pas de grade : il n'entre jamais dans la base.

## Attribution : factuel uniquement (durci 2026-07-11)
- Tout élément présenté comme un FAIT (personne, agence, chiffre, événement) trace à une `source_ref` cliquable. Jamais d'affirmation « X a travaillé sur le projet » sans source explicite.
- Les seules parties inférées (`replication`, `post_mortem.signaux/lecons/pattern`) sont marquées « inféré » et visuellement séparées. Aucune déduction déguisée en fait.
- **Agences/partenaires** (`agences[]`) : uniquement si cités dans le cas, avec `source_ref`. Rendus dans « Qui l'a porté » (fiches succès). Exemples sourcés : Ykone + The Cirqle (La Redoute), OMD + ClickThrough (Renault), Datatonic (Vodafone).

## Règles de collecte
1. **Dédoublonnage** : un même cas raconté par plusieurs sources = UNE fiche multi-sources ; la concordance fait monter le niveau de preuve.
2. **Archivage** : chaque URL est snapshotée (archive.org) au moment de la collecte — la preuve doit survivre au lien.
3. **Vérification de vivacité** : chercher un signal < 12 mois (mention récente, feature toujours en ligne, offre d'emploi liée). Sinon : statut `signaux_mitiges` ou `incertain`.
4. **Traçabilité** : date de consultation sur chaque source ; `revoir_apres` sur chaque fiche.
