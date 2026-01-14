#!/bin/bash
set -e

# 1. Configuration
TASK_FILE="$1"
MAX_ITER="${2:-20}" # Default to 20 iterations if not specified
SLEEP_SEC=2
PROGRESS_FILE="progress.txt"

# 2. Input Validation
if [ -z "$TASK_FILE" ]; then
  echo "❌ Error: You must provide a task file."
  echo "Usage: $0 <path-to-task.md> [max-iterations]"
  exit 1
fi

if [ ! -f "$TASK_FILE" ]; then
  echo "❌ Error: File '$TASK_FILE' not found."
  exit 1
fi

echo "🤖 Starting Ralph on task: $TASK_FILE"
echo "🔄 Max iterations: $MAX_ITER"
echo "-------------------------------------------"

# 3. Create progress file if it doesn't exist (Claude needs it for context)
touch "$PROGRESS_FILE"

# 4. The Loop
for ((i=1; i<=$MAX_ITER; i++)); do
  echo "📝 Iteration $i of $MAX_ITER"
  
  # We construct the prompt dynamically to point to the specific TASK_FILE
  # We use --dangerously-skip-permissions for full autonomy (use --permission-mode acceptEdits for safety)
  
  result=$(claude --dangerously-skip-permissions -p "You are Ralph, an autonomous coding agent. 
  
CONTEXT FILES:
1. Task List: $(cat "$TASK_FILE")
2. Progress Log: $(cat "$PROGRESS_FILE")

YOUR GOAL:
Complete the items in '$TASK_FILE' one by one.

INSTRUCTIONS:
1. Read '$TASK_FILE' and find the first incomplete task (marked [ ]).
2. Read '$PROGRESS_FILE' to see what was recently done or failed.
3. Implement that ONE task only.
4. Run tests/typechecks.

CRITICAL RULES:
- If tests PASS: Mark the task [x] in '$TASK_FILE', commit changes, and append success notes to '$PROGRESS_FILE'.
- If tests FAIL: Do NOT mark [x]. Append failure notes to '$PROGRESS_FILE' so you can fix it next time.
- ONLY output <promise>COMPLETE</promise> if ALL tasks in '$TASK_FILE' are marked [x].
- If tasks remain, output nothing specific, just finish your turn.
")

  # 5. Output the result to the terminal so you can see what's happening
  echo "$result"
  echo "-------------------------------------------"

  # 6. Check for completion
  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "✅ All tasks in $TASK_FILE marked complete!"
    
    # Optional: Send a notification (macOS specific)
    if command -v osascript &> /dev/null; then
        osascript -e "display notification \"Ralph finished $TASK_FILE\" with title \"Task Complete\""
    fi
    exit 0
  fi

  sleep $SLEEP_SEC
done

echo "⚠️  Reached max iterations ($MAX_ITER) without finishing."
exit 1