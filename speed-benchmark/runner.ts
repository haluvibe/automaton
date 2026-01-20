import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { BenchmarkConfig, BenchmarkRun, BenchmarkResults, BenchmarkSummary } from './shared/types.js';
import { calculateStats } from './shared/metrics.js';
import { runPlaywrightBenchmark } from './playwright/benchmark.js';
import { runPuppeteerBenchmark } from './puppeteer/benchmark.js';

const DEFAULT_CONFIG: BenchmarkConfig = {
  iterations: 10,
  warmupRuns: 2,
  targetUrl: 'https://toolsummary.com/submit-ai-tool/',
  modes: ['headless', 'headed'],
  delayBetweenRuns: 2000,
};

class BenchmarkRunner {
  private config: BenchmarkConfig;
  private results: BenchmarkRun[] = [];
  private baseDir: string;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseDir = process.cwd();

    // Ensure results directory exists
    const resultsDir = join(this.baseDir, 'results');
    if (!existsSync(resultsDir)) {
      mkdirSync(resultsDir, { recursive: true });
    }
  }

  async runAllBenchmarks(): Promise<void> {
    console.log('\n========================================');
    console.log('  BROWSER AUTOMATION SPEED BENCHMARK');
    console.log('========================================\n');
    console.log(`Configuration:`);
    console.log(`  Iterations: ${this.config.iterations} (+ ${this.config.warmupRuns} warmup)`);
    console.log(`  Modes: ${this.config.modes.join(', ')}`);
    console.log(`  Target: ${this.config.targetUrl}\n`);

    const tools = ['playwright', 'puppeteer', 'cypress', 'rod'] as const;

    for (const mode of this.config.modes) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`  MODE: ${mode.toUpperCase()}`);
      console.log('='.repeat(50));

      for (const tool of tools) {
        console.log(`\n--- ${tool.toUpperCase()} (${mode}) ---`);
        await this.runToolBenchmark(tool, mode === 'headless');
      }
    }

    // Generate final report
    this.generateReport();
  }

  private async runToolBenchmark(
    tool: 'playwright' | 'puppeteer' | 'cypress' | 'rod',
    headless: boolean
  ): Promise<void> {
    const totalRuns = this.config.iterations + this.config.warmupRuns;

    for (let i = 0; i < totalRuns; i++) {
      const isWarmup = i < this.config.warmupRuns;
      const displayNum = isWarmup ? `W${i + 1}` : `${i - this.config.warmupRuns + 1}`;

      process.stdout.write(`  Run ${displayNum}/${this.config.iterations}${isWarmup ? ' (warmup)' : ''}... `);

      try {
        let result: BenchmarkRun;

        switch (tool) {
          case 'playwright':
            result = await runPlaywrightBenchmark(i, headless);
            break;
          case 'puppeteer':
            result = await runPuppeteerBenchmark(i, headless);
            break;
          case 'cypress':
            result = await this.runCypress(i, headless);
            break;
          case 'rod':
            result = await this.runRod(i, headless);
            break;
        }

        if (result.success) {
          console.log(
            `${Math.round(result.metrics.totalWithLaunch)}ms ` +
            `(launch: ${Math.round(result.metrics.browserLaunch)}ms, ` +
            `test: ${Math.round(result.metrics.totalTest)}ms)`
          );

          // Only record non-warmup runs
          if (!isWarmup) {
            this.results.push(result);
          }
        } else {
          console.log(`FAILED: ${result.error}`);
        }

        // Delay between runs
        await this.delay(this.config.delayBetweenRuns);
      } catch (error) {
        console.log(`ERROR: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  private async runCypress(iteration: number, headless: boolean): Promise<BenchmarkRun> {
    const mode = headless ? 'headless' : 'headed';
    const resultsFile = join(this.baseDir, 'results', `cypress-${mode}-${iteration}.json`);

    try {
      // Using hardcoded command - no user input
      const cypressArgs = headless
        ? ['cypress', 'run', '--env', `ITERATION=${iteration}`]
        : ['cypress', 'run', '--headed', '--env', `ITERATION=${iteration}`];

      execSync(['npx', ...cypressArgs].join(' '), {
        cwd: this.baseDir,
        stdio: 'pipe',
        timeout: 60000,
      });

      // Read results from file
      if (existsSync(resultsFile)) {
        const resultData = readFileSync(resultsFile, 'utf-8');
        return JSON.parse(resultData);
      }
    } catch {
      // Cypress may exit with non-zero but still write results
      if (existsSync(resultsFile)) {
        const resultData = readFileSync(resultsFile, 'utf-8');
        return JSON.parse(resultData);
      }
    }

    return {
      tool: 'cypress',
      mode,
      iteration,
      timestamp: new Date().toISOString(),
      metrics: {
        browserLaunch: 0,
        pageNavigation: 0,
        formFill: { name: 0, email: 0, toolUrl: 0, category: 0, pricing: 0, description: 0 },
        submitClick: 0,
        totalFormFill: 0,
        totalTest: 0,
        totalWithLaunch: 0,
      },
      success: false,
      error: 'Cypress run failed or no results file',
    };
  }

  private async runRod(iteration: number, headless: boolean): Promise<BenchmarkRun> {
    const mode = headless ? 'headless' : 'headed';

    try {
      // Using hardcoded command with sanitized numeric inputs
      const output = execSync(`go run . ${Number(iteration)} ${Boolean(headless)}`, {
        cwd: join(this.baseDir, 'rod'),
        encoding: 'utf-8',
        timeout: 60000,
      });

      return JSON.parse(output.trim());
    } catch (e) {
      return {
        tool: 'rod',
        mode,
        iteration,
        timestamp: new Date().toISOString(),
        metrics: {
          browserLaunch: 0,
          pageNavigation: 0,
          formFill: { name: 0, email: 0, toolUrl: 0, category: 0, pricing: 0, description: 0 },
          submitClick: 0,
          totalFormFill: 0,
          totalTest: 0,
          totalWithLaunch: 0,
        },
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(70));
    console.log('  BENCHMARK RESULTS SUMMARY');
    console.log('='.repeat(70));

    const summaries: BenchmarkSummary[] = [];
    const tools = ['playwright', 'puppeteer', 'cypress', 'rod'] as const;
    const modes: ('headless' | 'headed')[] = ['headless', 'headed'];

    for (const tool of tools) {
      for (const mode of modes) {
        const toolResults = this.results.filter(r => r.tool === tool && r.mode === mode && r.success);
        if (toolResults.length === 0) continue;

        const launchTimes = toolResults.map(r => r.metrics.browserLaunch);
        const navTimes = toolResults.map(r => r.metrics.pageNavigation);
        const formFillTimes = toolResults.map(r => r.metrics.totalFormFill);
        const testTimes = toolResults.map(r => r.metrics.totalTest);
        const totalTimes = toolResults.map(r => r.metrics.totalWithLaunch);

        const testStats = calculateStats(testTimes);

        const summary: BenchmarkSummary = {
          tool,
          mode,
          avgBrowserLaunch: calculateStats(launchTimes).mean,
          avgPageNavigation: calculateStats(navTimes).mean,
          avgTotalFormFill: calculateStats(formFillTimes).mean,
          avgTotalTest: testStats.mean,
          avgTotalWithLaunch: calculateStats(totalTimes).mean,
          minTotalTest: testStats.min,
          maxTotalTest: testStats.max,
          stdDevTotalTest: testStats.stdDev,
          successRate: (toolResults.length / this.config.iterations) * 100,
        };

        summaries.push(summary);
      }
    }

    // Print table
    this.printResultsTable(summaries);

    // Save full results
    const fullResults: BenchmarkResults = {
      config: this.config,
      runs: this.results,
      summaries,
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = join(this.baseDir, 'results', `benchmark-${timestamp}.json`);
    writeFileSync(resultsPath, JSON.stringify(fullResults, null, 2));
    console.log(`\nFull results saved to: ${resultsPath}`);
  }

  private printResultsTable(summaries: BenchmarkSummary[]): void {
    console.log('\n');
    console.log(
      'Tool'.padEnd(12) +
      'Mode'.padEnd(10) +
      'Avg Launch'.padEnd(12) +
      'Avg Nav'.padEnd(10) +
      'Avg Form'.padEnd(10) +
      'Avg Test'.padEnd(10) +
      'Avg Total'.padEnd(12) +
      'StdDev'.padEnd(10) +
      'Success'
    );
    console.log('-'.repeat(96));

    for (const s of summaries) {
      console.log(
        s.tool.padEnd(12) +
        s.mode.padEnd(10) +
        `${Math.round(s.avgBrowserLaunch)}ms`.padEnd(12) +
        `${Math.round(s.avgPageNavigation)}ms`.padEnd(10) +
        `${Math.round(s.avgTotalFormFill)}ms`.padEnd(10) +
        `${Math.round(s.avgTotalTest)}ms`.padEnd(10) +
        `${Math.round(s.avgTotalWithLaunch)}ms`.padEnd(12) +
        `${Math.round(s.stdDevTotalTest)}ms`.padEnd(10) +
        `${Math.round(s.successRate)}%`
      );
    }

    // Find winners
    console.log('\n--- WINNERS ---');

    const headless = summaries.filter(s => s.mode === 'headless' && s.successRate > 0);
    const headed = summaries.filter(s => s.mode === 'headed' && s.successRate > 0);

    if (headless.length > 0) {
      const fastest = headless.reduce((a, b) =>
        a.avgTotalWithLaunch < b.avgTotalWithLaunch ? a : b
      );
      console.log(`Headless: ${fastest.tool.toUpperCase()} (${Math.round(fastest.avgTotalWithLaunch)}ms avg)`);
    }

    if (headed.length > 0) {
      const fastest = headed.reduce((a, b) =>
        a.avgTotalWithLaunch < b.avgTotalWithLaunch ? a : b
      );
      console.log(`Headed:   ${fastest.tool.toUpperCase()} (${Math.round(fastest.avgTotalWithLaunch)}ms avg)`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
const config: Partial<BenchmarkConfig> = {
  iterations: parseInt(process.env.ITERATIONS || '10'),
  warmupRuns: parseInt(process.env.WARMUP_RUNS || '2'),
  modes: (process.env.MODES?.split(',') || ['headless', 'headed']) as ('headless' | 'headed')[],
};

const runner = new BenchmarkRunner(config);
runner.runAllBenchmarks().catch(console.error);
