export interface FormFillMetrics {
  name: number;
  email: number;
  toolUrl: number;
  category: number;
  pricing: number;
  description: number;
}

export interface TimingMetrics {
  browserLaunch: number;
  pageNavigation: number;
  formFill: FormFillMetrics;
  submitClick: number;
  totalFormFill: number;
  totalTest: number;
  totalWithLaunch: number;
}

export interface BenchmarkRun {
  tool: 'playwright' | 'puppeteer' | 'cypress' | 'rod';
  mode: 'headless' | 'headed';
  iteration: number;
  timestamp: string;
  metrics: TimingMetrics;
  success: boolean;
  error?: string;
}

export interface BenchmarkConfig {
  iterations: number;
  warmupRuns: number;
  targetUrl: string;
  modes: ('headless' | 'headed')[];
  delayBetweenRuns: number;
}

export interface BenchmarkSummary {
  tool: string;
  mode: string;
  avgBrowserLaunch: number;
  avgPageNavigation: number;
  avgTotalFormFill: number;
  avgTotalTest: number;
  avgTotalWithLaunch: number;
  minTotalTest: number;
  maxTotalTest: number;
  stdDevTotalTest: number;
  successRate: number;
}

export interface BenchmarkResults {
  config: BenchmarkConfig;
  runs: BenchmarkRun[];
  summaries: BenchmarkSummary[];
}
