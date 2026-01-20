# Hybrid Twitter DM Automation

**6-8x faster** than pure Claude in Chrome by splitting work between:
- **Playwright CDP** (~11s) - Fast mechanical browser operations
- **Claude CLI** (~20s) - Intelligent decisions

## Performance Comparison

| Approach | Time per User | Notes |
|----------|--------------|-------|
| Pure Claude in Chrome | ~240s | API round-trips per action |
| **Hybrid** | ~30-40s | 6-8x faster |

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  PLAYWRIGHT CDP (Fast)        │  CLAUDE CLI (Intelligence)  │
├───────────────────────────────┼─────────────────────────────┤
│  • Navigate to post           │  • Pick user to DM          │
│  • Scroll & load replies      │  • Compose personalized msg │
│  • Extract all usernames      │  • Handle edge cases        │
│  • Click on user profile      │                             │
│  • Click Message button       │                             │
│  • Type & send DM             │                             │
└───────────────────────────────┴─────────────────────────────┘
```

## Quick Start

### 1. Start Chrome with Debug Port

```bash
./start-chrome-debug.sh
```

Or manually:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-hybrid-debug
```

### 2. Log into Twitter

In the Chrome window that opens, log into your Twitter account.

### 3. Run the Hybrid Automation

```bash
npm install  # First time only
npm start
```

## Files

- `twitter-hybrid.ts` - Main hybrid automation script
- `start-chrome-debug.sh` - Helper to start Chrome with debug port
- `package.json` - Dependencies

## Requirements

- Node.js 18+
- Chrome browser
- `claude` CLI installed and authenticated
- Twitter account logged in
