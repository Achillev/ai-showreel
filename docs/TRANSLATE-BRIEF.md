# Brief de traduction EN — à lire avant de traduire

Tu traduis en **anglais** la prose de fiches d'un index de cas d'usage IA en marketing digital, à destination de CMO/directeurs digitaux de grandes marques. L'anglais doit être **professionnel, sobre, niveau analyste** (pas marketing, pas ampoulé). Tu ne changes AUCUN fait.

## Ce que tu produis
Pour chaque fiche source `cases/<id>.json`, tu écris UN fichier `translations/en/<id>.json` contenant UNIQUEMENT le bloc de traduction (un objet JSON). Tu ne touches JAMAIS au fichier source.

## Règle d'or : traduire, jamais réécrire ni inventer
- Tu traduis fidèlement le sens. Tu ne rajoutes, n'enlèves, ni ne « améliores » aucun fait, chiffre ou nuance.
- **NE JAMAIS traduire ni inclure** : `marque`, les chiffres (`resultats[].valeur`), `resultats[].citation_exacte` (preuve verbatim, reste dans la langue d'origine), `source_ref`, les dates, les sources (url/titre), `niveau_preuve.niveau`, les clés d'axes (famille/levier), `logo_domain`, les ids. Ces champs ne figurent PAS dans ton fichier de sortie.
- Les noms propres d'outils/plateformes/produits restent tels quels (ex. "Advantage+", "Performance Max", "Gemini").

## Écriture (mêmes règles anti-slop que le FR)
- INTERDIT : tiret cadratin (—) et demi-cadratin (–) -> tiret simple (-). Ellipse unicode (…) -> (...). Guillemets courbes -> guillemets droits. Apostrophe typographique -> apostrophe droite. Flèches, puces exotiques, symboles, emojis. Espaces insécables, doubles espaces.
- Anglais US, ton d'analyste : noms concrets, verbes simples, phrases de longueur variée. Pas de superlatifs vides, pas d'antithèse décorative en rafale.

## Schéma de sortie `translations/en/<id>.json`
Inclure UNIQUEMENT les clés dont le champ source existe dans la fiche (omets les autres). Structure :

```json
{
  "seo": {
    "title": "…",              // traduit de seo.title
    "meta_description": "…",    // traduit de seo.meta_description
    "resume_citable": "…",      // traduit de seo.resume_citable
    "faq": [{ "q": "…", "a": "…" }]   // seulement si seo.faq existe
  },
  "pattern": "…",               // traduit de axes.pattern
  "etape_parcours": "…",        // traduit de axes.etape_parcours (souvent un libellé court)
  "objectif_business": "…",
  "description": "…",
  "points_cles": ["…", "…"],    // seulement si points_cles existe (même nombre d'items)
  "resultats": [{ "metrique": "…" }, { "metrique": "…" }],  // 1 objet PAR resultat, dans l'ordre, UNIQUEMENT metrique
  "niveau_preuve": { "justification": "…" },
  "stack_technique": [{ "detail": "…" }],   // 1 objet PAR entrée stack qui a un detail ; {} si pas de detail
  "fonctionnement_operationnel": {
    "cadence": "…", "opere_par": "…", "signal_pilote": "…",
    "etapes": [{ "etape": "…", "detail": "…", "acteur": "…" }]
  },
  "replication": {
    "prerequis_data": ["…"], "prerequis_orga": ["…"], "stack_possible": ["…"],
    "equipe": "…",
    "playbook": [{ "action": "…", "livrable": "…" }],
    "premiere_etape": "…"
  },
  "post_mortem": {
    "ce_qui_s_est_passe": "…", "raison_echec": "…", "cout_estime": "…",
    "signaux_avant_coureurs": "…", "lecons_avec_recul": "…", "le_pattern_reste_il_valide": "…"
  },
  "statut_vivant": { "note": "…" },
  "transposable_ue": { "note": "…" }
}
```

Règles de correspondance :
- `resultats` : garde le MÊME nombre d'objets et le MÊME ordre que la fiche source ; chaque objet ne contient que `metrique` (jamais valeur/citation). Si un resultat n'a pas de metrique, mets `{ "metrique": "" }` pour garder l'alignement d'index.
- `stack_technique` : même ordre ; chaque objet = `{ "detail": "…" }` seulement si l'entrée source a un `detail`, sinon `{}` pour garder l'index.
- `playbook`, `etapes` : même nombre, même ordre.
- Les tableaux de chaînes (`points_cles`, `prerequis_data`, etc.) : même nombre d'items, même ordre.
- Une fiche d'échec a `post_mortem` et pas de `fonctionnement_operationnel`/`replication` -> omets ces clés.

## Sortie
Écris chaque fichier JSON valide dans `translations/en/`. Nom = `<id>.json` (le même id que la fiche source). Aucun texte hors des fichiers. À la fin, retourne juste la liste des ids traduits, un par ligne.
