# Browser Automation Speed Benchmark Summary

**Target:** https://toolsummary.com/submit-ai-tool/ (form with reCAPTCHA v3)

**Date:** January 2026

---

## Results (Fastest to Slowest)

### 1. Playwright Standalone (Headless) - 4,700ms ❌

| Metric | Time |
|--------|------|
| Browser Launch | 153ms |
| Page Navigation | 4,330ms |
| Form Fill | 172ms |
| Submit Click | 45ms |
| **Total** | **4,700ms** |

- **Pros:** Fastest overall, excellent API, TypeScript support
- **Cons:** Cannot bypass reCAPTCHA - submissions blocked
- **Verdict:** Fast but useless for protected forms

---

### 2. Rod (Go) - 5,451ms ❌

| Metric | Time |
|--------|------|
| Browser Launch | 1,217ms |
| Page Navigation | 3,804ms |
| Form Fill | 400ms |
| Submit Click | 228ms |
| **Total** | **5,451ms** |

- **Pros:** Very fast, most consistent (lowest stddev), written in Go
- **Cons:** Cannot bypass reCAPTCHA, Go required
- **Verdict:** Great for unprotected forms, blocked by CAPTCHA

---

### 3. Playwright CDP (Real Chrome) - 11,000ms ✅

| Metric | Time |
|--------|------|
| CDP Connect | 56ms |
| Page Navigation | 7,222ms |
| Form Fill | 482ms |
| Submit + Response | 3,191ms |
| **Total** | **~11,000ms** |

- **Pros:** Bypasses reCAPTCHA, uses real Chrome, still reasonably fast
- **Cons:** Requires Chrome running with `--remote-debugging-port=9222`
- **Verdict:** **Best option for protected forms** - fast AND works

---

### 4. Claude in Chrome (MCP) - ~240,000ms (4 min) ✅

| Metric | Time |
|--------|------|
| Form Fill (JS execution) | 1.3ms |
| Total (with tool round-trips) | ~240,000ms |

- **Pros:** Bypasses reCAPTCHA, uses real browser session, can handle complex interactions
- **Cons:** Extremely slow due to API round-trips (~15-20s per action)
- **Verdict:** Works but 20x slower than Playwright CDP

---

## Comparison Table

| Tool | Total Time | Form Fill | Can Submit w/ CAPTCHA? | Recommended |
|------|------------|-----------|------------------------|-------------|
| Playwright Standalone | 4.7s | 172ms | ❌ No | For unprotected forms |
| Rod (Go) | 5.5s | 400ms | ❌ No | For unprotected forms |
| **Playwright CDP** | **11s** | **482ms** | **✅ Yes** | **For protected forms** |
| Claude in Chrome | 240s | 1.3ms | ✅ Yes | Last resort only |

---

## Key Findings

1. **Playwright CDP is the winner** for real-world use - it's fast AND bypasses CAPTCHA by using a real Chrome instance.

2. **reCAPTCHA v3 detection** is based on:
   - Headless browser detection
   - Automation flags (webdriver, etc.)
   - Behavioral analysis

   Connecting to a real Chrome via CDP bypasses all of these.

3. **Claude in Chrome is 20x slower** than Playwright CDP due to:
   - API round-trips (~15-20s per action)
   - My thinking time between actions
   - No parallel execution

4. **Raw speed doesn't matter** if you can't complete the task. Playwright standalone is fastest but useless for protected forms.

---

## Setup for Playwright CDP

```bash
# 1. Start Chrome with debugging port
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug

# 2. Connect Playwright to it
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
```

---

## Recommendations

| Use Case | Recommended Tool |
|----------|------------------|
| Forms without CAPTCHA | Playwright Standalone (fastest) |
| Forms with reCAPTCHA | Playwright CDP |
| Need Go/compiled binary | Rod (for unprotected forms) |
| Complex multi-step flows | Claude in Chrome (if speed doesn't matter) |
