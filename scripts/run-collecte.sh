#!/bin/bash
# Run de collecte hebdomadaire AI Showreel, en headless.
# Appele par launchd (com.conversionmentors.aishowreel-collecte) ou a la main.
# Invoque claude en mode --print (non-interactif), permission bypass, sur le runbook.

set -euo pipefail

DIR="/Users/elevate/Desktop/Claude apprentissage/ai-showreel"
CLAUDE="/opt/homebrew/bin/claude"
LOG="$DIR/logs/collecte-$(date +%Y%m%d-%H%M%S).log"

cd "$DIR"
mkdir -p "$DIR/logs"

echo "=== Run collecte $(date) ===" >> "$LOG"

# Le runbook est passe comme prompt ; --permission-mode bypassPermissions autorise les
# outils (Agent/WebSearch/WebFetch/Bash/Write) sans intervention. --print sort et loggue.
"$CLAUDE" --print \
  --permission-mode bypassPermissions \
  --output-format text \
  "$(cat "$DIR/docs/CRON-RUNBOOK.md")

Execute ce runbook maintenant, de bout en bout, sans me poser de question." \
  >> "$LOG" 2>&1

echo "=== Fin $(date) (exit $?) ===" >> "$LOG"
