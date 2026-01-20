import { chromium, Browser, Page } from 'playwright';
import { Timer } from '../shared/metrics.js';
import { TEST_DATA, TARGET_URL, SELECTORS } from '../shared/test-data.js';
import { TimingMetrics, BenchmarkRun, FormFillMetrics } from '../shared/types.js';

async function measureFill(
  page: Page,
  timer: Timer,
  label: string,
  selector: string,
  value: string
): Promise<number> {
  timer.mark(`${label}_start`);
  await page.fill(selector, value);
  timer.mark(`${label}_end`);
  return timer.measure(`${label}_start`, `${label}_end`);
}

async function measureChoicesSelect(
  page: Page,
  timer: Timer,
  label: string,
  value: string
): Promise<number> {
  timer.mark(`${label}_start`);
  // Click to open Choices.js dropdown
  await page.click(SELECTORS.pricingContainer);
  // Wait for dropdown to be visible
  await page.waitForSelector(SELECTORS.pricingDropdown, { state: 'visible' });
  // Click the option
  await page.click(SELECTORS.pricingOption(value));
  timer.mark(`${label}_end`);
  return timer.measure(`${label}_start`, `${label}_end`);
}

export async function runPlaywrightBenchmark(
  iteration: number,
  headless: boolean
): Promise<BenchmarkRun> {
  const timer = new Timer();
  const metrics: Partial<TimingMetrics> = {};
  let browser: Browser | null = null;
  let success = false;
  let error: string | undefined;

  try {
    // Measure browser launch
    timer.mark('browserLaunch_start');
    browser = await chromium.launch({ headless });
    timer.mark('browserLaunch_end');
    metrics.browserLaunch = timer.measure('browserLaunch_start', 'browserLaunch_end');

    const page = await browser.newPage();

    // Measure page navigation
    timer.mark('navigation_start');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle' });
    timer.mark('navigation_end');
    metrics.pageNavigation = timer.measure('navigation_start', 'navigation_end');

    // Measure individual form fills
    const formFill: FormFillMetrics = {
      name: await measureFill(page, timer, 'name', SELECTORS.name, TEST_DATA.name),
      email: await measureFill(page, timer, 'email', SELECTORS.email, TEST_DATA.email),
      toolUrl: await measureFill(page, timer, 'toolUrl', SELECTORS.toolUrl, TEST_DATA.toolUrl),
      category: await measureFill(page, timer, 'category', SELECTORS.category, TEST_DATA.category),
      pricing: await measureChoicesSelect(page, timer, 'pricing', TEST_DATA.pricing),
      description: await measureFill(page, timer, 'description', SELECTORS.description, TEST_DATA.description),
    };
    metrics.formFill = formFill;

    // Calculate total form fill time
    metrics.totalFormFill = Object.values(formFill).reduce((a, b) => a + b, 0);

    // Measure submit click (just the click, not waiting for response)
    timer.mark('submit_start');
    await page.click(SELECTORS.submit);
    timer.mark('submit_end');
    metrics.submitClick = timer.measure('submit_start', 'submit_end');

    metrics.totalTest = (metrics.pageNavigation ?? 0) + (metrics.totalFormFill ?? 0) + (metrics.submitClick ?? 0);
    metrics.totalWithLaunch = (metrics.browserLaunch ?? 0) + metrics.totalTest;

    success = true;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    if (browser) await browser.close();
  }

  return {
    tool: 'playwright',
    mode: headless ? 'headless' : 'headed',
    iteration,
    timestamp: new Date().toISOString(),
    metrics: metrics as TimingMetrics,
    success,
    error,
  };
}

// Allow running directly
if (process.argv[1]?.includes('playwright')) {
  const iteration = parseInt(process.argv[2] || '0');
  const headless = process.argv[3] !== 'false';
  runPlaywrightBenchmark(iteration, headless).then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}
