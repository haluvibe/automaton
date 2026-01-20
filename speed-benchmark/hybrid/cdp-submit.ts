import { chromium } from 'playwright';
import { performance } from 'perf_hooks';

async function main() {
  const startTime = performance.now();

  console.log('Connecting to Chrome via CDP...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

  // Get existing pages
  const contexts = browser.contexts();
  const pages = contexts[0].pages();

  // Find the toolsummary page
  const page = pages.find(p => p.url().includes('toolsummary.com'));

  if (!page) {
    console.log('Available pages:', pages.map(p => p.url()));
    throw new Error('ToolSummary page not found. Run cdp-fill.js first.');
  }

  console.log('Found page:', page.url());

  // Click submit
  const submitStart = performance.now();
  await page.click('#wpforms-submit-148');
  console.log(`Submit clicked in ${Math.round(performance.now() - submitStart)}ms`);

  // Wait for response
  console.log('Waiting for form response...');
  await page.waitForTimeout(3000);

  // Check for success message
  const content = await page.content();
  if (content.includes('Thanks for submitting')) {
    console.log('\n✅ SUCCESS! Form submitted successfully.');
  } else if (content.includes('error') || content.includes('Error')) {
    console.log('\n❌ Form submission may have failed (check page)');
  } else {
    console.log('\n⚠️ Unknown result - check the page manually');
  }

  const totalTime = performance.now() - startTime;
  console.log(`\nTotal submit time: ${Math.round(totalTime)}ms`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
