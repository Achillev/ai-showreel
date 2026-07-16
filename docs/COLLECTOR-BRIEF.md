# Brief du collecteur — à lire avant toute collecte

Tu produis des fiches de cas d'usage IA en marketing digital pour un index indépendant à destination des CMO/directeurs digitaux. Ta production doit être irréprochable sur la SOURCE et la FORME. Lis aussi `schema/fiche.schema.json` (structure exacte) et `docs/REDACTION.md` (écriture).

## Mission
Trouver des déploiements IA RÉELS et À L'ÉCHELLE par de grandes marques, dans la fonction marketing digital (acquisition, activation/conversion, rétention, monétisation). Recherche via WebSearch + WebFetch sur des sources primaires et établies.

## Filtre de crédibilité (une fiche n'existe QUE si elle passe)
Preuve de passage à l'échelle : chiffre public, mention en résultats financiers, déploiement multi-marchés, OU 12 mois+ en production. Et vérifier que c'est encore vivant (signal < 12 mois si possible).
EXCLUS : startups/micro-boîtes, POC sans preuve, intentions/roadmaps (« on va lancer »), pays sans déploiement réel, cas non sourçables.

## Règle d'or : factuel, sourcé, jamais inventé
- Tout FAIT (marque, chiffre, personne, agence, date, événement) trace à une source réelle que tu as VÉRIFIÉE (URL qui existe). Jamais de chiffre approximatif présenté comme exact, jamais d'URL fabriquée, jamais « X a travaillé sur le projet » sans source explicite.
- Les seules parties inférées sont `replication` et, pour les échecs, `post_mortem.signaux_avant_coureurs / lecons_avec_recul / le_pattern_reste_il_valide`. Tu les marques comme inférées (c'est leur rôle), tu ne déguises jamais une déduction en fait.
- Si tu n'es pas sûr d'un chiffre ou d'une source : tu ne le mets pas.

## Niveau de preuve du CAS (`niveau_preuve.niveau`)
- A = résultats financiers / earnings call / décision de justice
- B = étude de cas plateforme/vendor chiffrée
- C = presse majeure citant nommément la marque
- D = déclaratif conférence
Plusieurs sources concordantes = niveau plus haut. Justifie en une phrase.

## Résultats (`resultats[]`) — `valeur` = chiffre compact, `metrique` = le libellé
Chaque résultat a une `valeur` (le chiffre-clé, affiché EN GROS sur la fiche) et une `metrique` (ce que ce chiffre mesure). Garde `valeur` COURTE et chiffrée (< 20 caractères) : « 87% », « +64% », « 245M », « de 27% à 87% », « -26% de coût ». Le contexte, la comparaison, le détail vont dans `metrique` (ou dans `citation_exacte`), JAMAIS dans `valeur`. Mauvais : valeur = « plus de 96%, taux d'erreur 3,6% (contre environ 8% humain) ». Bon : valeur = « 96%+ d'exactitude », metrique = « taux d'erreur 3,6% contre environ 8% humain ». Une `valeur` trop longue casse le rendu (elle perd son statut de chiffre-héros et s'affiche en petit).

## Grade de fiabilité par SOURCE (`sources[].fiabilite`)
- T1_primaire : document non-interprété (décision de justice, doc SEC/résultats financiers, communiqué officiel de la marque-sujet)
- T2_officiel_interesse : customer story plateforme/vendor/intégrateur (Meta, Google, Salesforce, Microsoft, intégrateur…)
- T3_presse_etablie : presse majeure reconnue
- T4_secondaire : presse spécialisée / analyse tierce
JAMAIS de bruit internet : pas de listicle recyclé, pas d'agrégateur anonyme, pas de contenu SEO généré. Minimum 2 sources par fiche, URLs réelles vérifiées.

## Personnes et agences (facultatif mais précieux)
- `intervenants[]` : uniquement des personnes citées/associées publiquement au projet dans une source (avec `source_ref`). URL LinkedIn seulement si tu la trouves et la vérifies, sinon l'omettre. JAMAIS sur une fiche d'échec.
- `agences[]` : agences/intégrateurs/partenaires cités dans le cas, avec `source_ref`.
- `marque_linkedin` : page LinkedIn officielle de la marque si vérifiée. Pas sur les fiches d'échec.
- `logo_domain` : le domaine officiel de la marque (ex: nike.com, laredoute.fr) pour afficher son logo. Pas besoin de vérifier au pixel : le rendu retombe sur un monogramme si le logo ne charge pas.

## Réplication : que du qualitatif (règle dure 2026-07-11)
Dans `replication` : JAMAIS de délais, budgets, efforts chiffrés ou scores inférés (pas de « 4-8 semaines », pas de « 10-30 k EUR », pas de time_to_value, pas de score). Un chiffre n'existe que s'il est sourcé dans le cas, et il vit alors dans `resultats`/`description`. La réplication contient : prérequis data/orga, stack possible, playbook en étapes ordonnées SANS durées, équipe (profils qualitatifs), première étape.

## Schéma de flow (`schema_flow`)
Nœuds (role_generique : data_source/modele_ia/paid_platform/cdp/crm/site_app/humain) + liens [[from,to],[from,to,"label boucle"]]. statut : "documente" si l'archi est publiée, sinon "approche_type".

## Fonctionnement opérationnel (`fonctionnement_operationnel`, cas succès)
cadence + opere_par + signal_pilote + etapes[] (chaque étape : etape, detail, acteur). Ton = mode d'emploi pour un directeur ops. Distinct de la description.

## ÉCRITURE — règles strictes (voir REDACTION.md)
- INTERDIT dans tout texte : tiret cadratin (—) et demi-cadratin (–) → utilise le tiret simple (-). Ellipse unicode (…) → (...). Guillemets courbes et apostrophe typographique → droits. Flèches décoratives, puces exotiques, symboles, emojis. Espaces insécables, doubles espaces.
- Autorisé : guillemets français « » dans la prose FR ; tiret simple ; apostrophe droite.
- Style : pas d'antithèse décorative en rafale (« ce n'est pas X, c'est Y »), pas de règle de trois systématique, pas d'intensificateurs vides (« véritable », « puissant »), pas de méta-phrases. Noms concrets, chiffres réels, verbes simples, longueur de phrase variée. Écris comme un analyste, pas comme un modèle.
- Les `citation_exacte` restent exactes au mot près, dans la langue d'origine, courtes (< 15 mots).

## `citation_exacte` : la règle qui casse le plus souvent (audit 2026-07-16)
Un audit mécanique des 780 citations du corpus a trouvé **195 citations absentes de leur source** (28% des citations vérifiables). Dans ~70% des cas le CHIFFRE était juste : c'est la citation qui avait été **réécrite**. Le champ n'est donc pas compris. Il l'est maintenant :

`citation_exacte` = **une sous-chaîne littérale et contiguë de la source**. Tu dois pouvoir faire Ctrl+F dans la page et la trouver telle quelle. Ce n'est PAS un résumé du fait, PAS une reformulation, PAS un collage de deux bouts de phrase.

Les 4 façons de se tromper, toutes vues en vrai dans le corpus :
1. **Résumer** : la source dit « Return on ad spend improved by 66% in low-funnel and 81% in mid-funnel campaigns », tu écris « improved return on ad spend by 81% in mid-funnel campaigns ». Le fait est juste, la citation est fausse.
2. **Coller deux fragments** : « from 1.25X to 2.08X » alors que la source dit « from 1.25X in January to 2.08X by the end of May ». Une citation ne saute pas de mots.
3. **Citer le journaliste au lieu de la personne** : la prose non guillemetée d'un article n'est pas une déclaration de la marque.
4. **Amputer le sujet** : la source dit « the solution touts a 3-5% increase », tu gardes « a 3-5% increase ». Tu viens de transformer un claim vendeur en résultat de marque. C'est le cas le plus grave : la troncature change le sens.

Si aucune phrase courte de la source ne dit proprement le fait : **cite une phrase plus longue, ou ne mets pas de citation**. Une citation absente est acceptable ; une citation inventée ne l'est pas.

Vérifie-toi avant de rendre : `node site/verify-citations.mjs --only <id>`. Verdict attendu : 0 ABSENTE.

## L'essentiel (`points_cles`) — résumé scannable
Ajoute un champ `points_cles` : un tableau de 3 à 4 puces courtes (une phrase chacune, < 20 mots) qui résument le cas pour une lecture rapide sur mobile. Chaque puce = un fait tiré du contenu que tu as déjà sourcé (marque + déploiement, résultat chiffré, mécanisme/stack, niveau de preuve ou vivacité). JAMAIS de chiffre ou de fait absent des sources, jamais d'inférence déguisée. C'est une reformulation condensée de la fiche, pas un ajout d'information. Ordre : ce qui a été fait -> avec quoi -> le résultat chiffré -> le statut/preuve.

## Sortie
Écris chaque fiche comme un fichier JSON individuel valide, conforme au schéma, dans le dossier qu'on t'indique. Nom de fichier = le slug (id). Un objet JSON par fichier. Ne mets aucun texte hors des fichiers. À la fin, retourne juste la liste des slugs créés et, pour chacun, marque + niveau de preuve, en une ligne chacun.

## Bilingue (traduction EN en aval)
Le site est bilingue FR/EN. Tu écris la fiche en **français** normalement. Un step de traduction dédié (voir `docs/TRANSLATE-BRIEF.md`, exécuté après la promotion) produit `translations/en/<id>.json` à partir de ta fiche. Tu n'as donc rien à traduire toi-même. Conséquence pour toi : écris une prose FR claire et bien structurée (elle sera traduite fidèlement), et garde `citation_exacte` dans sa langue d'origine (jamais traduite, ni par toi ni en aval).

## Ne re-collecte PAS ces cas (déjà en base)
La Redoute (Advantage+), Renault (Performance Max), Vodafone (churn AI Booster), Air Canada (chatbot), Zillow Offers, McDonald's (voice AI drive).
