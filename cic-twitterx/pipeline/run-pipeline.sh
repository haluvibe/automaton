#!/bin/bash
set -e

# Kanban Pipeline for Twitter DM Automation
# Uses Claude in Chrome MCP (existing logged-in browser session)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

MAX_USERS="${1:-20}"
SLEEP_SEC=3

echo "========================================"
echo "  TWITTER DM PIPELINE"
echo "========================================"
echo ""
echo "Max users to process: $MAX_USERS"
echo ""

# ============================================
# STAGE A: Collect all replies
# ============================================
echo "=== STAGE A: Collecting replies ==="
echo ""

STAGE_A_RESULT=$(claude --chrome --dangerously-skip-permissions -p "$(cat stage-a-collector.md)" 2>&1)
echo "$STAGE_A_RESULT" | tail -20

if [[ "$STAGE_A_RESULT" == *"<stage>A_COMPLETE</stage>"* ]]; then
    echo ""
    echo "Stage A complete!"
else
    echo "Stage A may have issues - check queue-a.json"
fi

sleep $SLEEP_SEC

# ============================================
# STAGE B: Enrich users one-by-one
# ============================================
echo ""
echo "=== STAGE B: Enriching users ==="
echo ""

for ((i=1; i<=MAX_USERS; i++)); do
    echo "--- Processing user $i/$MAX_USERS ---"

    STAGE_B_RESULT=$(claude --chrome --dangerously-skip-permissions -p "$(cat stage-b-enricher.md)" 2>&1)
    echo "$STAGE_B_RESULT" | tail -10

    # Check if all users processed
    if [[ "$STAGE_B_RESULT" == *"<stage>B_COMPLETE</stage>"* ]]; then
        echo ""
        echo "All users enriched!"
        break
    fi

    sleep $SLEEP_SEC
done

# ============================================
# STAGE C: Send DMs to available users
# ============================================
echo ""
echo "=== STAGE C: Sending DMs ==="
echo ""

STAGE_C_RESULT=$(claude --chrome --dangerously-skip-permissions -p "$(cat stage-c-messenger.md)" 2>&1)
echo "$STAGE_C_RESULT" | tail -20

if [[ "$STAGE_C_RESULT" == *"<stage>C_COMPLETE</stage>"* ]]; then
    echo ""
    echo "Stage C complete!"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "========================================"
echo "  PIPELINE COMPLETE"
echo "========================================"
echo ""
echo "Check these files for results:"
echo "  - pipeline/queue-a.json (collected replies)"
echo "  - pipeline/queue-b.json (enriched data)"
echo "  - progress.md (DMs sent)"
echo ""

# macOS notification
if command -v osascript &> /dev/null; then
    osascript -e 'display notification "Twitter DM Pipeline finished" with title "Pipeline Complete"'
fi
