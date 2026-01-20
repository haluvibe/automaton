#!/bin/bash
set -e

# Configuration
TASK_FILE="$1"
MAX_ITER="${2:-20}"
WARMUP_RUNS="${3:-0}"
SLEEP_SEC=2
PROGRESS_FILE="progress.md"
RESULTS_DIR="results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="$RESULTS_DIR/benchmark-$TIMESTAMP.json"

# Input Validation
if [ -z "$TASK_FILE" ]; then
  echo "Error: You must provide a task file."
  echo "Usage: $0 <path-to-task.md> [max-iterations] [warmup-runs]"
  exit 1
fi

if [ ! -f "$TASK_FILE" ]; then
  echo "Error: File '$TASK_FILE' not found."
  exit 1
fi

# Create results directory
mkdir -p "$RESULTS_DIR"
touch "$PROGRESS_FILE"

# Initialize results JSON
echo '{
  "config": {
    "taskFile": "'"$TASK_FILE"'",
    "maxIterations": '"$MAX_ITER"',
    "warmupRuns": '"$WARMUP_RUNS"',
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  },
  "runs": [' > "$RESULTS_FILE"

echo "========================================"
echo "  RALPH BENCHMARK RUNNER"
echo "========================================"
echo ""
echo "Configuration:"
echo "  Task File: $TASK_FILE"
echo "  Iterations: $MAX_ITER (+ $WARMUP_RUNS warmup)"
echo "  Results: $RESULTS_FILE"
echo "----------------------------------------"

# Metrics tracking
TOTAL_RUNS=0
SUCCESSFUL_RUNS=0
FAILED_RUNS=0
declare -a RUN_TIMES
FIRST_RUN=true

# Main benchmark loop
echo "--- BENCHMARK PHASE ---"
for ((i=1; i<=$MAX_ITER; i++)); do
  echo ""
  echo "Run $i/$MAX_ITER..."

  START_TIME=$(python3 -c 'import time; print(int(time.time() * 1000))')

  RESULT=$(claude --chrome --dangerously-skip-permissions -p "You are Ralph, an autonomous browser automation agent using Claude in Chrome.

CONTEXT FILES:
1. Task List: $(cat "$TASK_FILE")
2. Progress Log: $(cat "$PROGRESS_FILE")

YOUR GOAL:
Complete the browser automation tasks in '$TASK_FILE' one by one using Claude in Chrome MCP tools.

INSTRUCTIONS:
1. First call mcp__claude-in-chrome__tabs_context_mcp to get available tabs
2. Create a new tab with mcp__claude-in-chrome__tabs_create_mcp if needed
3. Find the first incomplete task in the task list
4. Read '$PROGRESS_FILE' to see what was recently done or failed
5. Complete that ONE task using the Claude in Chrome browser tools
6. After completing a task, append success notes to '$PROGRESS_FILE'

AVAILABLE BROWSER TOOLS:
- mcp__claude-in-chrome__tabs_context_mcp - Get tab context (CALL THIS FIRST)
- mcp__claude-in-chrome__tabs_create_mcp - Create new tab
- mcp__claude-in-chrome__navigate - Navigate to URL
- mcp__claude-in-chrome__read_page - Read page accessibility tree
- mcp__claude-in-chrome__find - Find elements by natural language
- mcp__claude-in-chrome__computer - Click, type, scroll, screenshot
- mcp__claude-in-chrome__form_input - Fill form fields
- mcp__claude-in-chrome__get_page_text - Extract page text

CRITICAL RULES:
- Use Claude in Chrome MCP tools for ALL browser interactions
- After completing a task, append success notes to '$PROGRESS_FILE'
- If a task fails, append failure notes so you can retry next iteration
- ONLY output <promise>COMPLETE</promise> when ALL tasks are done
- Output <metric>DM_SENT</metric> when you successfully send a DM
- Output <metric>DM_RESTRICTED</metric> when DM is not available
- Output <metric>FOLLOWED</metric> when you follow a user
- If tasks remain, just finish your turn without the promise tag
" 2>&1)

  END_TIME=$(python3 -c 'import time; print(int(time.time() * 1000))')
  DURATION=$((END_TIME - START_TIME))

  # Parse metrics from output
  DM_SENT=$(echo "$RESULT" | grep -c "<metric>DM_SENT</metric>" || echo 0)
  DM_RESTRICTED=$(echo "$RESULT" | grep -c "<metric>DM_RESTRICTED</metric>" || echo 0)
  FOLLOWED=$(echo "$RESULT" | grep -c "<metric>FOLLOWED</metric>" || echo 0)
  IS_COMPLETE=$(echo "$RESULT" | grep -c "<promise>COMPLETE</promise>" || echo 0)

  # Determine success
  SUCCESS=false
  if [[ "$DM_SENT" -gt 0 ]] || [[ "$FOLLOWED" -gt 0 ]] || [[ "$IS_COMPLETE" -gt 0 ]]; then
    SUCCESS=true
  fi

  # Output summary
  echo "$RESULT" | tail -20
  echo "---"
  echo "Duration: ${DURATION}ms | DM Sent: $DM_SENT | DM Restricted: $DM_RESTRICTED | Followed: $FOLLOWED"
  echo "----------------------------------------"

  # Append to results file
  if [ "$FIRST_RUN" = true ]; then
    FIRST_RUN=false
  else
    echo "," >> "$RESULTS_FILE"
  fi

  cat >> "$RESULTS_FILE" << EOF
    {
      "iteration": $i,
      "durationMs": $DURATION,
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "metrics": {
        "dmSent": $DM_SENT,
        "dmRestricted": $DM_RESTRICTED,
        "followed": $FOLLOWED
      },
      "success": $SUCCESS,
      "complete": $([ "$IS_COMPLETE" -gt 0 ] && echo true || echo false)
    }
EOF

  # Track stats
  ((TOTAL_RUNS++)) || true
  RUN_TIMES+=($DURATION)

  if [ "$SUCCESS" = true ]; then
    ((SUCCESSFUL_RUNS++)) || true
  else
    ((FAILED_RUNS++)) || true
  fi

  # Check for completion
  if [ "$IS_COMPLETE" -gt 0 ]; then
    echo "All tasks marked complete!"
    break
  fi

  sleep $SLEEP_SEC
done

# Calculate statistics
if [ ${#RUN_TIMES[@]} -gt 0 ]; then
  TOTAL_TIME=0
  MIN_TIME=${RUN_TIMES[0]}
  MAX_TIME=${RUN_TIMES[0]}

  for t in "${RUN_TIMES[@]}"; do
    TOTAL_TIME=$((TOTAL_TIME + t))
    [ "$t" -lt "$MIN_TIME" ] && MIN_TIME=$t
    [ "$t" -gt "$MAX_TIME" ] && MAX_TIME=$t
  done

  AVG_TIME=$((TOTAL_TIME / ${#RUN_TIMES[@]}))
  if [ "$TOTAL_RUNS" -gt 0 ]; then
    SUCCESS_RATE=$((SUCCESSFUL_RUNS * 100 / TOTAL_RUNS))
  else
    SUCCESS_RATE=0
  fi
else
  AVG_TIME=0
  MIN_TIME=0
  MAX_TIME=0
  SUCCESS_RATE=0
fi

# Close runs array and add summary
echo '
  ],
  "summary": {
    "totalRuns": '"$TOTAL_RUNS"',
    "successfulRuns": '"$SUCCESSFUL_RUNS"',
    "failedRuns": '"$FAILED_RUNS"',
    "successRate": '"$SUCCESS_RATE"',
    "avgDurationMs": '"$AVG_TIME"',
    "minDurationMs": '"$MIN_TIME"',
    "maxDurationMs": '"$MAX_TIME"'
  }
}' >> "$RESULTS_FILE"

# Print summary
echo ""
echo "========================================"
echo "  BENCHMARK SUMMARY"
echo "========================================"
echo ""
echo "Runs:         $TOTAL_RUNS"
echo "Successful:   $SUCCESSFUL_RUNS"
echo "Failed:       $FAILED_RUNS"
echo "Success Rate: $SUCCESS_RATE%"
echo ""
echo "Timing:"
echo "  Average:    ${AVG_TIME}ms"
echo "  Min:        ${MIN_TIME}ms"
echo "  Max:        ${MAX_TIME}ms"
echo ""
echo "Results saved to: $RESULTS_FILE"
echo "========================================"

# macOS notification
if command -v osascript &> /dev/null; then
  osascript -e "display notification \"Ralph completed $TOTAL_RUNS runs ($SUCCESS_RATE% success)\" with title \"Benchmark Complete\""
fi

exit 0
