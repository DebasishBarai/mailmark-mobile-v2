#!/bin/bash
# SessionStart hook for Claude Code on the web.
#
# Remote sessions start from a fresh container, so two things have to be
# re-established every time: the Expo skills plugin and node_modules.
#
# .claude/settings.json enables expo@claude-plugins-official, but that only
# flips the switch. The marketplace entry is a `git-subdir` source pointing at
# github.com/expo/skills, and Claude Code does not auto-install an
# external-source plugin that only project settings enable -- someone has to
# run the install. That is what this hook is for.
set -euo pipefail

# Local checkouts already have their own setup; this is web-session only.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

PLUGIN="expo@claude-plugins-official"

if claude plugin list 2>/dev/null | grep -q "$PLUGIN"; then
  echo "$PLUGIN already installed"
else
  echo "Installing $PLUGIN ..."
  claude plugin install "$PLUGIN" --scope project
fi

if command -v bun >/dev/null 2>&1; then
  echo "Installing dependencies with bun ..."
  bun install
else
  echo "bun not found, falling back to npm ..."
  npm install
fi

echo "Session setup complete"
