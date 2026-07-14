# Brief d'enrichissement — rendre chaque fiche actionnable

Tu enrichis des fiches JSON existantes dans `cases/`. Objectif : qu'un directeur ops puisse dire « je vois exactement comment faire ce use case chez moi ». Lis aussi `docs/REDACTION.md` (règles d'écriture strictes : apostrophe droite, pas de tiret cadratin, pas d'ellipse unicode, pas de guillemets courbes).

## Pour CHAQUE fiche de ta liste

Lis le fichier, puis ajoute ces champs SANS toucher aux champs existants :

### 1. `stack_technique` (FACTUEL — succès ET échecs)
Tableau d'objets `{nom, categorie, detail, url}` avec `categorie` dans : llm | plateforme | outil | integrateur | infra.
- Détaille ce que la fiche mentionne déjà (plateforme_stack, type_ia, description, sources) : le modèle/LLM EXACT si nommé (GPT-4o, Gemini, Claude, Llama, XGBoost...), la plateforme (Vertex AI, Azure OpenAI, Bedrock...), les outils, les intégrateurs.
- `url` : page produit ou domaine OFFICIEL du vendeur uniquement (openai.com, cloud.google.com/vertex-ai, salesforce.com/agentforce...). Si tu n'es pas sûr de l'URL canonique, mets juste le domaine racine officiel. JAMAIS d'URL devinée vers une page profonde incertaine.
- Si la fiche ne nomme pas le modèle exact, n'invente pas : décris au niveau où c'est sourcé (« ML propriétaire de Meta »).
- 3 à 6 entrées par fiche.

### 2. `replication.playbook` (INFÉRÉ — fiches succès uniquement, PAS les echec_retrait)
4 à 6 étapes `{action, livrable}` :
- RÈGLE DURE (2026-07-11) : JAMAIS de durées ni de temporalité (« Semaine 1-2 », « 3 mois »...) — un délai inventé est un chiffre faux. Les étapes sont ORDONNÉES, le rendu les numérote. Ne remplis PAS le champ `phase`.
- `action` : le geste concret de cette étape.
- `livrable` : ce qui existe à la fin de l'étape (vérifiable).
- Dérive le contenu de `replication` et `fonctionnement_operationnel` existants — c'est une mise en plan, pas une invention de faits. Pour un cas plateforme (Advantage+, PMax...), le plan commence par les prérequis data et finit par la mesure. Pour un cas custom, il commence par le cadrage data et finit par le test contrôlé.

### 3. `replication.equipe` (INFÉRÉ qualitatif — succès uniquement)
- `equipe` : profils minimum pour opérer (« 1 media buyer + 1 dev CAPI », « data scientists + PM + équipe CRM »). QUALITATIF uniquement.
- INTERDIT (règle 2026-07-11) : `budget_estime`, `time_to_value`, `effort`, `score` — aucun délai, budget ou score chiffré inféré, jamais. Un chiffre n'existe que s'il est sourcé dans le cas, et il vit alors dans les faits (resultats/description), pas dans la réplication.

### Fiches `echec_retrait`
Seulement `stack_technique`. Pas de playbook/budget/equipe (le post_mortem couvre déjà les leçons).

## Règles dures
- Écriture : apostrophes droites ('), jamais de tiret cadratin ni d'ellipse unicode ni de guillemets courbes. Chiffres réels, verbes simples.
- Le playbook et le budget sont de l'inférence ASSUMÉE (ils vivent dans `replication`, la page les marque « inféré ») — mais ils doivent être plausibles pour un praticien senior, pas du remplissage.
- JSON valide, indentation 2 espaces, réécris le fichier en place.
- Interdiction de modifier : description, resultats, sources, niveau_preuve, dates, post_mortem, seo, ou tout autre champ existant.

## Sortie
À la fin, réponds uniquement : la liste des fichiers enrichis + pour chacun le nombre d'entrées stack_technique et d'étapes playbook (ou « échec : stack seulement »).
