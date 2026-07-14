# Run de collecte hebdomadaire — installation

Le moteur peut tourner tout seul chaque semaine via un job **launchd** (macOS) qui
appelle `claude` en headless sur le runbook docs/CRON-RUNBOOK.md.

- Cadence : **lundi 08:07** heure locale (weekly).
- Autonomie : **full auto A/B** — publie A/B automatiquement, C/D -> batch/_review/.
- Mecanique : `scripts/run-collecte.sh` -> `claude --print --permission-mode bypassPermissions`
  sur docs/CRON-RUNBOOK.md. Logs dans logs/.

## Pourquoi ce n'est pas installe automatiquement
Armer le job execute `claude` avec **--permission-mode bypassPermissions** sans
surveillance : ca desactive le systeme d'approbation pour ces runs. C'est une decision
de securite a prendre en conscience, donc l'installation est une action MANUELLE
(2 commandes ci-dessous). Le classifier de securite bloque volontairement l'auto-install.

## Installer (armer le run hebdo)
```
chmod +x "/Users/elevate/Desktop/Claude apprentissage/ai-showreel/scripts/run-collecte.sh"
cp "/Users/elevate/Desktop/Claude apprentissage/ai-showreel/scripts/com.conversionmentors.aishowreel-collecte.plist" ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.conversionmentors.aishowreel-collecte.plist
```

## Tester tout de suite (sans attendre lundi)
```
launchctl start com.conversionmentors.aishowreel-collecte
# puis surveiller :
tail -f "/Users/elevate/Desktop/Claude apprentissage/ai-showreel/logs/"collecte-*.log
```

## Desarmer / desinstaller
```
launchctl unload ~/Library/LaunchAgents/com.conversionmentors.aishowreel-collecte.plist
rm ~/Library/LaunchAgents/com.conversionmentors.aishowreel-collecte.plist
```

## Prerequis et limites (a savoir)
- **Rester connecte a Claude** : le headless utilise ta session Claude (Max). Si le token
  expire, le run echoue silencieusement -> verifier les logs de temps en temps.
- **Machine allumee** : launchd tire le job a l'heure dite si la machine est eveillee ;
  sinon au prochain reveil (StartCalendarInterval rattrape).
- **Consomme ta fenetre d'usage Max** chaque semaine (salve d'agents ~1M tokens/cycle).
- **bypassPermissions** : le run peut lancer Agent/Bash/Write sans approbation. Le runbook
  le cadre (collecte only, pas de deploy, pas de suppression, pas de .env), mais la garantie
  reste le contenu du runbook, pas un gate d'approbation.
- **Digest** : chaque run ecrit un bilan dans logs/collecte-runs.md.

## Variante plus prudente (si tu preferes un garde-fou)
Remplacer dans scripts/run-collecte.sh le `--permission-mode bypassPermissions` par un
allowlist d'outils : `--allowedTools "Agent" "WebSearch" "WebFetch" "Bash(node:*)" "Write"`.
Plus etroit, mais peut bloquer sur une action non prevue et laisser le run incomplet.
