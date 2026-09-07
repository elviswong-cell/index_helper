#!/bin/bash
set -euo pipefail

# Only relevant for Claude Code on the web -- each session starts from a
# fresh clone, so node_modules and the mcp-server build never carry over.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Main Next.js app dependencies.
npm install

# Build the helper-recruitment MCP server (registered in .mcp.json) so
# `node mcp-server/dist/index.js` is ready as soon as the session starts.
if [ -d "mcp-server" ]; then
  (cd mcp-server && npm install && npm run build)
fi
