#!/bin/bash
# Start Chrome with remote debugging port for Playwright CDP connection

echo "=========================================="
echo "  HYBRID AUTOMATION - CHROME SETUP"
echo "=========================================="
echo ""
echo "IMPORTANT: This will restart Chrome with debug port enabled."
echo "Your existing tabs will be preserved."
echo ""

# macOS Chrome path
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Use the user's default Chrome profile (preserves login sessions)
DEFAULT_PROFILE="$HOME/Library/Application Support/Google/Chrome"

# Check if Chrome is running
if pgrep -x "Google Chrome" > /dev/null; then
    echo "Chrome is currently running."
    echo ""
    read -p "Close Chrome and restart with debug port? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Closing Chrome..."
        osascript -e 'tell application "Google Chrome" to quit'
        sleep 2
    else
        echo "Aborted. Chrome needs to be restarted with debug port."
        exit 1
    fi
fi

echo "Starting Chrome with debug port 9222..."
echo ""

# Start Chrome with debugging using default profile
"$CHROME" \
  --remote-debugging-port=9222 \
  --restore-last-session \
  &

sleep 3

# Verify connection
if curl -s http://127.0.0.1:9222/json/version > /dev/null 2>&1; then
    echo "✅ Chrome started successfully!"
    echo "   Debug port: http://127.0.0.1:9222"
    echo ""
    echo "You should still be logged into Twitter."
    echo "Run 'npm start' to begin hybrid automation."
else
    echo "❌ Failed to connect to Chrome debug port"
    echo "   Try closing Chrome manually and running this script again."
fi
