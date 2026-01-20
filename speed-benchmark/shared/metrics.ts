import { performance } from 'perf_hooks';

export class Timer {
  private marks: Map<string, number> = new Map();

  mark(label: string): void {
    this.marks.set(label, performance.now());
  }

  measure(startLabel: string, endLabel: string): number {
    const start = this.marks.get(startLabel);
    const end = this.marks.get(endLabel);
    if (start === undefined || end === undefined) {
      throw new Error(`Missing mark: ${startLabel} or ${endLabel}`);
    }
    return end - start;
  }

  elapsed(label: string): number {
    const start = this.marks.get(label);
    if (start === undefined) {
      throw new Error(`Missing mark: ${label}`);
    }
    return performance.now() - start;
  }
}

export function calculateStats(values: number[]): {
  mean: number;
  min: number;
  max: number;
  stdDev: number;
} {
  const n = values.length;
  if (n === 0) return { mean: 0, min: 0, max: 0, stdDev: 0 };

  const mean = values.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return { mean, min, max, stdDev };
}

export function formatMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}
