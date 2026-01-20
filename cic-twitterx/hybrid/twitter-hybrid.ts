/**
 * Hybrid Twitter DM Automation
 *
 * Combines:
 * - Playwright CDP for fast browser actions (~11s)
 * - Claude Code CLI for intelligent decisions (~20s)
 *
 * Total: ~30-40s per user vs ~240s with pure Claude in Chrome
 */

import { chromium, Browser, Page } from 'playwright';
import { spawnSync } from 'child_process';
import { readFileSync, appendFileSync } from 'fs';
import { performance } from 'perf_hooks';

const CONFIG = {
  targetPost: 'https://x.com/MS_BASE44/status/2011484472328290692',
  progressFile: '../progress.md',
  cdpUrl: 'http://127.0.0.1:9222',
  maxUsers: 5,
};

interface TwitterReply {
  username: string;
  displayName: string;
  replyText: string;
}

interface DMDecision {
  selectedUser: string | null;
  dmMessage: string | null;
  reason: string;
}

/**
 * FAST LAYER: Playwright CDP
 * Handles all mechanical browser operations
 */
class TwitterPlaywright {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async connect(): Promise<void> {
    const start = performance.now();
    this.browser = await chromium.connectOverCDP(CONFIG.cdpUrl);
    const context = this.browser.contexts()[0];
    this.page = await context.newPage();
    console.log(`CDP connect: ${Math.round(performance.now() - start)}ms`);
  }

  async navigateToPost(): Promise<void> {
    if (!this.page) throw new Error('Not connected');
    const start = performance.now();
    await this.page.goto(CONFIG.targetPost, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000); // Wait for replies to load
    console.log(`Navigation: ${Math.round(performance.now() - start)}ms`);
  }

  async extractReplies(): Promise<TwitterReply[]> {
    if (!this.page) throw new Error('Not connected');
    const start = performance.now();

    // Scroll to load more replies
    for (let i = 0; i < 3; i++) {
      await this.page.mouse.wheel(0, 500);
      await this.page.waitForTimeout(500);
    }

    // Extract reply data from DOM
    const replies = await this.page.evaluate(() => {
      const results: { username: string; displayName: string; replyText: string }[] = [];

      // Twitter's reply structure (may need adjustment based on DOM)
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      articles.forEach((article, index) => {
        if (index === 0) return; // Skip original post

        const userLink = article.querySelector('a[href^="/"]');
        const textDiv = article.querySelector('[data-testid="tweetText"]');
        const displayNameSpan = article.querySelector('span');

        if (userLink && textDiv) {
          const href = userLink.getAttribute('href') || '';
          const username = href.replace('/', '').split('/')[0];

          if (username && !username.includes('status')) {
            results.push({
              username: `@${username}`,
              displayName: displayNameSpan?.textContent || username,
              replyText: textDiv.textContent || '',
            });
          }
        }
      });

      return results;
    });

    console.log(`Extract replies: ${Math.round(performance.now() - start)}ms (found ${replies.length})`);
    return replies;
  }

  async clickOnUser(username: string): Promise<boolean> {
    if (!this.page) throw new Error('Not connected');
    const start = performance.now();

    try {
      // Click on the username link
      const cleanUsername = username.replace('@', '');
      await this.page.click(`a[href="/${cleanUsername}"]`, { timeout: 5000 });
      await this.page.waitForTimeout(1500);
      console.log(`Click user: ${Math.round(performance.now() - start)}ms`);
      return true;
    } catch {
      console.log(`Failed to click on ${username}`);
      return false;
    }
  }

  async clickMessageButton(): Promise<'available' | 'restricted' | 'verification_needed'> {
    if (!this.page) throw new Error('Not connected');
    const start = performance.now();

    try {
      // Look for message button on profile
      const messageButton = await this.page.$('[data-testid="sendDMFromProfile"]');

      if (!messageButton) {
        console.log(`Message button check: ${Math.round(performance.now() - start)}ms - RESTRICTED`);
        return 'restricted';
      }

      await messageButton.click();
      await this.page.waitForTimeout(1000);

      // Check for verification modal
      const verificationModal = await this.page.$('text=Get verified to message');
      if (verificationModal) {
        // Click discard/close
        await this.page.keyboard.press('Escape');
        console.log(`Message button check: ${Math.round(performance.now() - start)}ms - VERIFICATION NEEDED`);
        return 'verification_needed';
      }

      console.log(`Message button check: ${Math.round(performance.now() - start)}ms - AVAILABLE`);
      return 'available';
    } catch {
      return 'restricted';
    }
  }

  async sendDM(message: string): Promise<boolean> {
    if (!this.page) throw new Error('Not connected');
    const start = performance.now();

    try {
      // Type the message
      const textbox = await this.page.$('[data-testid="dmComposerTextInput"]');
      if (!textbox) {
        console.log('DM textbox not found');
        return false;
      }

      await textbox.fill(message);
      await this.page.waitForTimeout(500);

      // Click send
      const sendButton = await this.page.$('[data-testid="dmComposerSendButton"]');
      if (!sendButton) {
        console.log('Send button not found');
        return false;
      }

      await sendButton.click();
      await this.page.waitForTimeout(1000);

      console.log(`Send DM: ${Math.round(performance.now() - start)}ms`);
      return true;
    } catch (e) {
      console.log(`Failed to send DM: ${e}`);
      return false;
    }
  }

  async goBack(): Promise<void> {
    if (!this.page) throw new Error('Not connected');
    await this.page.goBack();
    await this.page.waitForTimeout(1000);
  }

  async close(): Promise<void> {
    // Don't close - keep browser session alive
  }
}

/**
 * INTELLIGENCE LAYER: Claude Code CLI
 * Handles all decisions requiring understanding
 */
class ClaudeDecisionMaker {

  selectUserAndComposeDM(
    replies: TwitterReply[],
    progressContent: string
  ): DMDecision | null {
    const start = performance.now();

    // Build prompt for Claude - using array args to avoid shell injection
    const prompt = `You are helping compose a Twitter DM. Given these replies to a Base44 post:

REPLIES:
${replies.map(r => `- ${r.username}: "${r.replyText}"`).join('\n')}

ALREADY CONTACTED (from progress.md):
${progressContent}

TASK:
1. Select ONE user who is NOT in the "already contacted" list
2. Compose a personalized DM (~2-3 sentences) that:
   - References their specific reply/question
   - Introduces xcwizard.com (Base44 for Native Apple apps - iPhone, iPad, iWatch, Vision Pro, MacOS)
   - Is friendly and conversational

OUTPUT FORMAT (JSON only, no markdown):
{"selectedUser": "@username", "dmMessage": "Your composed message here", "reason": "Why you chose this user"}

If no valid users remain, output: {"selectedUser": null, "dmMessage": null, "reason": "All users already contacted"}`;

    try {
      // Use spawnSync with array args to prevent shell injection
      const result = spawnSync('claude', ['-p', prompt], {
        encoding: 'utf-8',
        timeout: 60000,
      });

      if (result.error || result.status !== 0) {
        console.log('Claude CLI error:', result.stderr || result.error);
        return null;
      }

      // Parse JSON from response
      const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('Failed to parse Claude response');
        return null;
      }

      const decision = JSON.parse(jsonMatch[0]) as DMDecision;
      console.log(`Claude decision: ${Math.round(performance.now() - start)}ms`);
      return decision;
    } catch (e) {
      console.log(`Claude error: ${e}`);
      return null;
    }
  }
}

/**
 * ORCHESTRATOR: Combines both layers
 */
async function runHybridTwitterDM() {
  console.log('\n========================================');
  console.log('  HYBRID TWITTER DM AUTOMATION');
  console.log('========================================\n');

  const totalStart = performance.now();
  const playwright = new TwitterPlaywright();
  const claude = new ClaudeDecisionMaker();

  try {
    // Phase 1: Fast Playwright operations
    console.log('--- PLAYWRIGHT PHASE (Fast) ---');
    await playwright.connect();
    await playwright.navigateToPost();
    const replies = await playwright.extractReplies();

    if (replies.length === 0) {
      console.log('No replies found!');
      return;
    }

    // Phase 2: Claude decision
    console.log('\n--- CLAUDE PHASE (Intelligence) ---');
    const progressContent = readFileSync(CONFIG.progressFile, 'utf-8');
    const decision = claude.selectUserAndComposeDM(replies, progressContent);

    if (!decision || !decision.selectedUser) {
      console.log('No user selected (all contacted or error)');
      return;
    }

    console.log(`Selected: ${decision.selectedUser}`);
    console.log(`Message: ${decision.dmMessage}`);
    console.log(`Reason: ${decision.reason}`);

    // Phase 3: Fast Playwright to send DM
    console.log('\n--- PLAYWRIGHT PHASE (Send DM) ---');
    const clicked = await playwright.clickOnUser(decision.selectedUser);
    if (!clicked) {
      console.log('Failed to click on user');
      return;
    }

    const dmStatus = await playwright.clickMessageButton();

    if (dmStatus === 'available') {
      const sent = await playwright.sendDM(decision.dmMessage!);
      if (sent) {
        console.log('\n✅ DM SENT SUCCESSFULLY');

        // Log to progress
        const logEntry = `\n### ${decision.selectedUser}\n- **Status**: DM sent via hybrid automation\n- **Message**: ${decision.dmMessage}\n`;
        appendFileSync(CONFIG.progressFile, logEntry);
      }
    } else {
      console.log(`\n❌ DM ${dmStatus.toUpperCase()}`);
      const logEntry = `\n### ${decision.selectedUser}\n- **Status**: ${dmStatus}\n`;
      appendFileSync(CONFIG.progressFile, logEntry);
    }

  } finally {
    await playwright.close();
  }

  const totalTime = performance.now() - totalStart;
  console.log(`\n========================================`);
  console.log(`  TOTAL TIME: ${Math.round(totalTime)}ms`);
  console.log(`  (vs ~240,000ms with pure Claude in Chrome)`);
  console.log(`========================================\n`);
}

// Run
runHybridTwitterDM().catch(console.error);
