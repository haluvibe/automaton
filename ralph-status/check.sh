#!/bin/bash
# Quick script to check Ralph Loop status
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$DIR/node_modules/.bin/tsc" -p "$DIR/tsconfig.json" 2>/dev/null
node "$DIR/dist/index.js"
