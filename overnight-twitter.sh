#!/bin/bash

# Overnight Twitter engagement automation
# Uses Claude Code with Claude in Chrome browser automation tools

cd /Users/paulhayes/repositories/reel

SCRIPT_DIR="$(dirname "$0")"
INSTRUCTIONS_FILE="${SCRIPT_DIR}/claudeinchrome.twitter.md"

echo "=== Starting Twitter Engagement Session ==="
echo "Time: $(date)"
echo "Instructions: ${INSTRUCTIONS_FILE}"
echo ""

# Simple prompt that tells Claude to read and follow the instructions file
claude -p "Read the file scripts/claudeinchrome.twitter.md and follow those instructions exactly. Use the Claude in Chrome browser automation tools (mcp__claude-in-chrome__*) to complete the task."

echo ""
echo "=== Session complete at $(date) ==="
