# Idée à creuser — la couche exécutant (par métier)

*Proposée par Achille 2026-07-11. Statut : à creuser, cadrée, séquencée en v2. Ne rien construire avant validation + rétention du cœur décideur.*

## L'idée brute
En parallèle de la vue décideur (CMO : ce que les leaders ont déployé), une vue **exécutant par métier** : lister les automatisations, skills, repos GitHub de référence, outils pratiques par cas d'usage. Une librairie dynamique pratico-pratique pour ceux qui construisent, pas ceux qui décident.

## Le piège (pourquoi ne PAS le faire naïvement)
- **Contamination de crédibilité** : le moat = uniquement du prouvé-à-l'échelle, sourcé, vérifié. Repos/automatisations/skills = POC/outils non prouvés (épistémologie inverse). Les mélanger dilue la valeur. Les catalogues d'outils IA sont un marché saturé, moat ~0.
- **Split d'audience** (Dunford) : décideur veut décider, exécutant veut construire. Servir les deux sans cadre brouille le positionnement.

## Le cadrage gagnant
NE PAS faire une librairie parallèle de repos flottants. L'ancrer comme **extension de la couche `replication`** déjà existante : pour chaque pattern PROUVÉ, la vue exécutant approfondit avec les ressources pour le bâtir.
- **Un dataset, deux vues** : décideur (quel pattern / accepté ? / angle mort) vs exécutant par métier (stack + playbook + ressources gradées).
- **Axe métier** (nouveau lens) : media buyer / paid, CRM-lifecycle-rétention, créa-contenu, SEO-growth, data-analytics, CRO-produit, service client-CX ops. Dérivable en partie des axes existants (levier/famille) + tag à ajouter.
- **Ressources gradées** : maintenu / stars / dernière MAJ / licence ; officiel-vendor vs communauté. Visuellement séparées des faits sourcés (comme l'inférence). Même rigueur que le grade de source.

## Pourquoi c'est fort (Reforge)
- **Rétention** : l'exécutant a une fréquence naturelle bien meilleure que le CMO (build hebdo vs décision annuelle) — comble le trou de rétention n°1.
- **Loop communautaire** : les praticiens contribuent (repos, automatisations) → loop de contenu, pas 100 % fuel humain. C'est le loop praticien concret.
- **Monétisation add-on** : tier « build kit » pour les ops, distinct du rapport board.

## Séquencement (garde-fous)
1. Pas de fork d'audience avant que le cœur décideur ait sa rétention (veille + générateur). Retention drives acquisition.
2. Grader les ressources avec la même rigueur que les sources, sinon retour au catalogue-de-bruit.

## Prototype minimal quand on y va
- Ajouter un tag `metier[]` sur les fiches (dérivable/semi-auto).
- Étendre `replication` avec `ressources_pratiques[]` : {type: repo|automatisation|skill|outil, nom, url, grade_maintenance, licence, officiel|communaute, source_ref}.
- Vue `/par-metier/<metier>.html` : mêmes cas, réorganisés, avec les ressources en avant.
- Démo sur 1 métier (ex. media buyer) + 5 cas, pour valider le format avant d'industrialiser.

## RECADRAGE MAJEUR (Achille 2026-07-11) — la version « corporate-validé / stack fermée »
La bonne version de la couche exécutant n'est PAS les repos GitHub (bidouille, saturé, justement ce que l'IT bloque). C'est : **ce qui est faisable DANS les outils déjà validés par l'IT du client** (Copilot Enterprise, Gemini for Workspace, ChatGPT Enterprise, Salesforce Einstein/Agentforce, Adobe, régies natives Meta/Google). Répond au vrai blocage des grands groupes : IT / sécurité / achats. Reste du décision-support (pas un fork d'audience).

Mappe sur le champ `implementation` existant :
- **Faisable sans IT (autonomie marketing)** : IA native des régies (Advantage+, PMax, TikTok Smart+) — accès direct.
- **Faisable si écosystème sanctionné** : Copilot/Gemini/ChatGPT Enterprise, IA du martech déjà licencié (Einstein, Adobe, ESP).
- **Bloqué sans IT/achats** : build custom, nouveau vendor, self-hosted, shadow-IT.

Tag à ajouter (léger, dérivable du stack_technique) : `faisabilite_it` = {ecosysteme_sanctionne: [microsoft|google|salesforce|adobe|regies|...], nouveau_vendor_requis: bool}. 
Vue tueuse : **« Ce que vous pouvez faire dans [écosystème verrouillé] sans faire valider un nouvel outil »**.
Garde-fou : distinguer FAIT (« déployé via tel outil sanctionné », vérifiable depuis le stack) de CONSEIL (« refaisable dans votre Copilot », inféré/labellisé).
Monétisation : add-on **rapport de faisabilité IT** — « dans votre écosystème, les N déploiements lançables ce trimestre sans un ticket IT ». Fort willingness-to-pay en grand groupe.
Verdict : rentre pleinement dans le concept ; c'est la forme enterprise-crédible de la couche exécutant, à préférer à la version repos.

## Question ouverte
Est-ce une extension (une couche du même produit) ou un produit compagnon distinct (frame of reference différent) qui partage le dataset ? À trancher au moment d'y aller — pencher extension d'abord, spin-off si la traction praticien le justifie.
