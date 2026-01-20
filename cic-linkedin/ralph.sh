#!/bin/bash
set -e

# 1. Configuration
TASK_FILE="$1"
MAX_ITER="${2:-20}" # Default to 20 iterations if not specified
SLEEP_SEC=2
PROGRESS_FILE="progress.md"

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
  
  result=$(claude --chrome --dangerously-skip-permissions -p "You are Ralph, an autonomous browser automation agent using Claude in Chrome.

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
5. Complete that ONE task using the Claude in Chrome browser tools (navigate, read_page, find, computer, form_input, etc.)
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
- If a task fails, append failure notes to '$PROGRESS_FILE' so you can retry next iteration
- ONLY output <promise>COMPLETE</promise> when ALL tasks are done
- If tasks remain, just finish your turn without the promise tag
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