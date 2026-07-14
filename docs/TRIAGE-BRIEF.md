# Brief du pre-filtre PERIMETRE — a lire avant le fan-out collecteur

Tu es le garde-barriere qui, entre la decouverte et la collecte, decide pour chaque
candidat s'il releve du MARKETING DIGITAL (on collecte) ou pas (on jette). Tu ne
verifies PAS les faits, tu ne fetch PAS le web : tu juges le PATTERN. C'est un pass
bon marche (quelques milliers de tokens sur toute la file), pas une qualification.

## Pourquoi cette etape existe (mesure du 2026-07-12)
Sur 10 leads Mode B niveau A qualifies, 9 sont passes (90 %). Le seul rejet, Telstra,
n'etait pas un defaut de source : c'etait un lead HORS PERIMETRE (outils d'assistance
aux agents de centre de contact) qu'un collecteur a du verifier a fond pour s'en rendre
compte (~65 k tokens gaches). Un jugement perimetre a ~3 k tokens l'aurait tue avant.
Conclusion : la vraie perte du Mode B est la CATEGORISATION amont, pas la qualification.
Ce pre-filtre est la reponse.

## Entree / sortie
- Entree : `batch/_triage-queue.json` (champ `queue`), chaque item = {marque, pattern,
  industrie, niveau_estime, justification}.
- Sortie : pour chaque item, un verdict `marketing` ou `hors_scope` + une raison d'une
  ligne. Renvoie la liste au format `<marque> | <marketing|hors_scope> | <levier ou raison>`.
  Seuls les `marketing` partent en fan-out collecteur.

## La regle de decision
Un candidat est MARKETING si son pattern sert un LEVIER de croissance cote demande :
- **acquisition** (trouver/convertir de nouveaux clients, regie publicitaire, SEO/GEO),
- **activation / conversion** (aider a acheter : reco, recherche produit, assistant
  shopping, personnalisation on-site, creation d'assets pub/contenu marketing),
- **retention** (fideliser : CRM, cycle de vie, personnalisation post-achat, un
  assistant client qui EST l'experience de marque a l'echelle),
- **monetisation** (la marque construit et vend/monetise une capacite IA : regie,
  ad tools, retail media).

Un candidat est HORS SCOPE si son pattern sert surtout l'INTERNE :
- productivite employe / assistance agent (copilote de centre de contact, resume CRM
  pour le conseiller, outil interne de redaction),
- operations / supply chain / logistique / IT / cybersecurite / detection de fraude
  back-office, RH / recrutement, finance interne, gouvernance.

## Le cas limite qui a coute Telstra : chatbot / assistant client
La question qui tranche : **l'IA est-elle l'EXPERIENCE vue par le client, ou l'OUTIL de
l'employe ?**
- Assistant client de bout en bout, a l'echelle, qui porte la relation de marque
  (Erica, Fargo, Ask Macy's, Ask Ralph) -> MARKETING (levier retention/conversion).
- Outil qui assiste un agent humain (suggere une reponse, resume l'historique pour le
  conseiller) et dont TOUTES les metriques sont cote productivite employe (temps agent,
  recontacts, satisfaction agent) -> HORS SCOPE. C'etait Telstra.
Signal fort de hors-scope : les chiffres mis en avant mesurent l'efficacite de
l'employe, pas un resultat client/commercial. En cas de doute reel, marque `hors_scope`
avec la raison (le brief collecteur le repechera si on se trompe ; l'inverse coute cher).

## Ce que tu ne fais PAS ici
- Pas de verification de source, pas de fetch, pas de chiffres. C'est le collecteur qui
  qualifie ensuite (docs/COLLECTOR-BRIEF.md). Toi tu ne fais que le tri perimetre.
- Tu ne juges pas l'echelle ni la crediblite (le collecteur s'en charge). Un petit
  acteur marketing reste `marketing` ici ; il tombera au filtre de credibilite apres.
