# Règles de rédaction — anti-« odeur d'IA » + détail opérationnel

## 0. Règles de mise en forme strictes (héritées du skill site-redesign, consigne Achille 2026-07-06)

S'appliquent à tout texte visible : champs des fiches, pages générées, drafts LinkedIn/Reddit, newsletter, rapports. **Vérifiées mécaniquement par la QA gate du build** (`site/qa-gate.mjs`) : le build échoue si un caractère interdit apparaît dans le texte visible.

Interdits : tiret cadratin "—" et demi-cadratin "–" (utiliser "-") · points de suspension unicode "…" (utiliser "...") · guillemets courbes et apostrophe typographique (utiliser les droits) · espaces insécables et doubles espaces · flèches décoratives (→ ➜ ➤, utiliser "->") · puces exotiques (• ◦ ▪ ▶) · symboles décoratifs (✓ ✗ ★ ✅ ❌ ⚠️) · emojis décoratifs.

Structure : pas d'intro qui annonce le plan, pas de section conclusion/résumé/points-clés, pas de gras en début de chaque bullet, pas de tableau réflexe, pas de labels décoratifs ("Note :", "Important :"). Paragraphes fluides par défaut ; en cas de doute, moins de formatage.

Exception verbatim : les citations exactes (`citation_exacte`) restent exactes au mot près, mais leur typographie est normalisée (em dash -> "-"). Les guillemets français « » restent autorisés dans la prose FR. Le code (CSS/JS/SVG interne) n'est pas concerné, seul le texte lisible l'est.

Ces règles s'appliquent à chaque fiche (champ `description`, `objectif_business`, `fonctionnement_operationnel`, `post_mortem`). Le collecteur les suit à l'écriture. But : une fiche doit se lire comme si un analyste senior l'avait écrite, pas un modèle.

## A. Les tics à bannir (ce qui trahit une écriture IA)

1. **L'antithèse décorative** : « ce n'est pas X, c'est Y », « non pas X mais Y ». Une par fiche maximum, et seulement si elle porte une vraie idée.
2. **La règle de trois systématique** : trois adjectifs, trois groupes, trois exemples à la chaîne. Varier : parfois un, parfois deux, parfois quatre.
3. **Les ouvertures de panorama** : « à l'ère de », « dans un monde où », « à l'heure où », « le paysage de », « force est de constater ».
4. **Les intensificateurs vides** : « véritable », « incontournable », « révolutionnaire », « puissant », « robuste », « transformateur », « clé ». Si le mot ne porte pas d'info, le couper.
5. **Les méta-phrases** : « il est important de noter », « il convient de souligner », « notons que ». Dire la chose directement.
6. **Les chaînes de flèches** dans le texte courant (`A → B → C`). Réservées aux schémas et aux scores, pas à la prose.
7. **Les conclusions en résumé** : « en somme », « en définitive », « in fine », « pour conclure ». Une fiche n'a pas de péroraison.
8. **Le parallélisme parfait des listes** : éviter que chaque puce commence par le même verbe et fasse la même longueur. Casser le rythme.
9. **Les attributions floues** : « les experts s'accordent », « il est communément admis ». Une affirmation = une source ou rien.
10. **Le tiret cadratin en rafale** : au plus un ou deux par paragraphe. Sinon, point ou virgule.

## B. Ce qu'on fait à la place

- **Noms concrets, chiffres réels, verbes simples.** « Meta choisit les placements » plutôt que « la plateforme orchestre un déploiement optimisé ».
- **Longueur de phrase variée.** Une courte après deux longues. C'est ce qui distingue une voix humaine.
- **Couper les adjectifs qui ne mesurent rien.** Garder ceux qui portent une donnée (« mesuré en incrémental », « sur 8 marchés »).
- **Nommer les acteurs.** Qui fait le geste : l'équipe data, l'agence, l'algorithme, le client.
- **Assumer l'incertitude quand elle existe**, sans la maquiller en nuance élégante. « On ne connaît pas l'impact churn en points » vaut mieux qu'une pirouette.

## C. Le détail opérationnel (champ `fonctionnement_operationnel`)

La `description` raconte ce qui a été fait. Le `fonctionnement_operationnel` explique **comment ça tourne au quotidien**, pour une équipe qui voudrait le faire tourner chez elle. Il répond à :

- **Cadence** : temps réel, batch quotidien, par campagne, réentraînement mensuel…
- **Qui l'opère** : quelle équipe tient la main sur le système une fois lancé.
- **Les étapes**, chacune avec : ce qui se passe, et **qui le fait** (IA, équipe data, marketing, agence, client). On distingue toujours le geste automatique du geste humain.
- **Le signal qui pilote** : sur quelle donnée le système s'optimise, et ce qui se casse si ce signal manque.

Ton : celui d'un mode d'emploi pour un directeur ops, pas d'une brochure. Un opérationnel doit pouvoir dire « ok, je vois ce que ça demande à mon équipe lundi matin ».
