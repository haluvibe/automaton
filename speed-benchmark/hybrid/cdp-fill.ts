import { chromium } from 'playwright';
import { performance } from 'perf_hooks';

const TARGET_URL = 'https://toolsummary.com/submit-ai-tool/';

const TEST_DATA = {
  name: 'Paul X',
  email: 'thereactdev@gmail.com',
  toolUrl: 'https://www.xcwizard.com',
  category: 'AI Productivity',
  pricing: 'Free',
  description: 'XC Wizard is an AI-powered cross-country planning tool for paraglider pilots. It uses AI to analyze weather patterns, terrain, and airspace to suggest optimal flight routes for cross-country soaring.',
};

const SELECTORS = {
  name: '#wpforms-148-field_0',
  email: '#wpforms-148-field_1',
  toolUrl: '#wpforms-148-field_3',
  category: '#wpforms-148-field_5',
  pricingContainer: '.choices[data-type="select-one"]',
  pricingOption: (value: string) => `.choices__item--choice[data-value="${value}"]`,
  description: '#wpforms-148-field_2',
  submit: '#wpforms-submit-148',
};

async function main() {
  const startTime = performance.now();

  console.log('Connecting to Chrome via CDP...');

  // Connect to existing Chrome instance (not launching new browser)
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const connectTime = performance.now();
  console.log(`Connected in ${Math.round(connectTime - startTime)}ms`);

  // Get the default context and create a new page
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // Navigate to form
  const navStart = performance.now();
  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
  const navEnd = performance.now();
  console.log(`Navigation: ${Math.round(navEnd - navStart)}ms`);

  // Fill form fields
  const fillStart = performance.now();

  await page.fill(SELECTORS.name, TEST_DATA.name);
  await page.fill(SELECTORS.email, TEST_DATA.email);
  await page.fill(SELECTORS.toolUrl, TEST_DATA.toolUrl);
  await page.fill(SELECTORS.category, TEST_DATA.category);

  // Handle Choices.js dropdown
  await page.click(SELECTORS.pricingContainer);
  await page.waitForSelector('.choices__list--dropdown', { state: 'visible' });
  await page.click(SELECTORS.pricingOption(TEST_DATA.pricing));

  await page.fill(SELECTORS.description, TEST_DATA.description);

  const fillEnd = performance.now();
  console.log(`Form fill: ${Math.round(fillEnd - fillStart)}ms`);

  const totalTime = performance.now() - startTime;
  console.log(`\nTotal time: ${Math.round(totalTime)}ms`);
  console.log('\n✅ FORM FILLED - READY FOR CLAUDE IN CHROME TO SUBMIT');
  console.log('The submit button is ready to be clicked.');

  // Don't close browser - leave it open for Claude in Chrome to submit
  // await browser.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  console.log('\nMake sure Chrome is running with: --remote-debugging-port=9222');
  process.exit(1);
});
