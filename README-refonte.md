# Refonte ai-showreel.com — dark mode AI-native

## Ce qui a changé
Reskin complet vers un dark mode "Bloomberg Terminal moderne" (dark par défaut, light = alternative impression), sans toucher au contenu : nouveau système de tokens (violet AI, vert "vivant", orange "angle mort"), typo serif Fraunces + mono JetBrains, et 22 micro-interactions vanilla (constellation, count-up, shimmer, focus mode matrice, tilt 3D, command palette ⌘K, pipeline méthodo). Zéro dépendance runtime, un seul `site/static/interactions.js` (~9 Ko).

## Comment tester
`node site/build.mjs` puis servir `dist/` (ex. `npx serve dist`). Le CSS et le JS sont cache-bustés par hash de contenu.

### Checklist des 24 micro-interactions
- [x] 1. Le mot "vraiment"/"actually" a un dégradé qui shift en 4s (`.hero-shimmer`)
- [x] 2. Les compteurs 212 / 16 / 139 s'animent depuis 0 (easeOutExpo, IntersectionObserver + filet anti-throttle)
- [x] 3. Le curseur custom grossit sur les éléments interactifs (off tactile / reduced-motion)
- [x] 4. La constellation pulse doucement derrière le hero (un point par cas, parallax, pause `document.hidden`)
- [x] 5. Hover d'une case matrice -> focus mode (les autres à 0.4)
- [x] 6. Hover d'un header ligne/colonne -> surlignage (data-row / data-col)
- [x] 7. Cases "angle mort" pulsent (breathe) + cliquables -> modal opportunité
- [x] 8. Cascade des cases au scroll (stagger 30ms, armée par JS, filet anti-blocage)
- [~] 9. Click case -> transition douce : filtre en place avec animation FLIP (choix : filtrer sans quitter la page est plus fluide qu'une navigation ; c'est le résultat visé par le brief)
- [x] 10. Hover carte -> tilt 3D + logo grayscale->couleur
- [x] 11. Badge vivant avec double ring pulse (`.status-dot`)
- [x] 12. Filtres -> FLIP animation (Web Animations API)
- [x] 13. Chiffres KPI s'animent dans les cartes — **uniquement les valeurs à chiffre simple** (regex stricte). Les valeurs composées ("de 27% à 87%", "~10 Md USD") ne sont jamais parsées/manglées : la donnée reste intacte.
- [x] 14. Footer "Built with" visible — **stack réelle** (build statique / zéro dépendance runtime / Vercel / vérification agentique), pas la stack d'exemple du brief (le site n'utilise ni Next.js, ni Supabase, ni pgvector).
- [x] 15. Timestamp "il y a X" sur chaque carte (Intl.RelativeTimeFormat, fallback = date réelle sans JS)
- [x] 16. Compteur temps réel top nav — **total réel + date de dernière vérification** ; pas de "+X cette semaine" (aucun champ de données ne le justifie honnêtement, donc non inventé)
- [x] 17. ⌘K ouvre le command palette (fetch `/cases.json`, recherche fuzzy vanilla, navigation clavier)
- [x] 18. Schéma méthodologie s'anime au scroll (collecte -> vérification -> scoring -> publication, tracé stroke-dashoffset)
- [x] 19. Bouton "Get the data" -> modal curl — **l'endpoint `/cases.json` est réellement généré et servi** (le signal n'est pas fictif)
- [ ] 20. Trail lumineux sur matrice (optionnel) — **volontairement non implémenté** : le brief demande de ne pas sur-animer la matrice, la lisibilité prime
- [x] 21. Smooth scroll (`scroll-behavior: smooth`, coupé en reduced-motion)
- [x] 22. Transitions par défaut 200ms partout (`* { transition ... }`, exceptions rAF)
- [x] 23. Focus states clavier visibles (`:focus-visible` accent, testé au Tab)
- [x] 24. Toggle dark/light persistant (localStorage, transition douce)

### Tests à faire manuellement
- [x] Tab au clavier — focus visible partout (empty cells = boutons accessibles)
- [x] `prefers-reduced-motion: reduce` — bloc CSS complet + gardes JS ; rien ne disparaît, tout se calme
- [x] Mobile 375px — matrice scrollable horizontalement (mask gradient), curseur/tilt off, nav compacte (compteur masqué, ⌘K en icône)
- [ ] Lighthouse mobile > 90 (perf / a11y / SEO) — à lancer côté humain dans Chrome DevTools
- [ ] Contraste WCAG AA (Stark / WebAIM) — à vérifier côté humain

## Ce qui n'a PAS été touché
- Aucun texte modifié — aucune donnée modifiée — aucun chiffre modifié — aucun lien modifié — aucune structure de contenu modifiée.
- Skin + interactions uniquement. Les seuls ajouts de texte sont des éléments de chrome que le brief spécifie lui-même (ligne meta de dates, timestamps, labels du pipeline), tous factuels et dérivés des données existantes.
