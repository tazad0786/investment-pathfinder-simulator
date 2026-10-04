import { addDays, formatShortDate } from './format';
import { gaussian, seededRng } from './random';

export type ChartRange = '1D' | '1W' | '1M' | '6M' | '1Y' | '3Y' | '5Y';

export const CHART_RANGES: ChartRange[] = ['1D', '1W', '1M', '6M', '1Y', '3Y', '5Y'];

const RANGE_CONFIG: Record<Exclude<ChartRange, '1D'>, { points: number; stepDays: number }> = {
  '1W': { points: 7, stepDays: 1 },
  '1M': { points: 30, stepDays: 1 },
  '6M': { points: 90, stepDays: 2 },
  '1Y': { points: 122, stepDays: 3 },
  '3Y': { points: 156, stepDays: 7 },
  '5Y': { points: 130, stepDays: 14 },
};

export interface SeriesPoint {
  label: string;
  value: number;
}

/**
 * Deterministic synthetic price history that ends exactly at `endValue`.
 * Walks backwards from the latest price so charts always agree with live quotes.
 */
export function generateSeries(
  seedKey: string,
  endValue: number,
  range: ChartRange,
  annualDriftPct: number,
  annualVolPct: number,
  endDate: string,
  startValue?: number,
): SeriesPoint[] {
  const rng = seededRng(`${seedKey}:${range}`);
  if (range === '1D') {
    const points = 76;
    const open = startValue ?? endValue;
    const sigma = (annualVolPct / 100) * Math.sqrt(1 / (252 * points));
    const walk: number[] = [0];
    for (let i = 1; i < points; i++) walk.push(walk[i - 1] + gaussian(rng) * sigma);
    const last = walk[points - 1];
    const totalLog = Math.log(endValue / open);
    return walk.map((w, i) => {
      // Brownian bridge so the series starts at the open and ends at the last price
      const bridged = w - (last * i) / (points - 1) + (totalLog * i) / (points - 1);
      const minutes = 9 * 60 + 15 + i * 5;
      const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mm = String(minutes % 60).padStart(2, '0');
      return { label: `${hh}:${mm}`, value: +(open * Math.exp(bridged)).toFixed(2) };
    });
  }
  const { points, stepDays } = RANGE_CONFIG[range];
  const dt = stepDays / 365;
  const mu = Math.log(1 + annualDriftPct / 100);
  const sigma = annualVolPct / 100;
  const values: number[] = new Array(points);
  values[points - 1] = endValue;
  for (let i = points - 2; i >= 0; i--) {
    const r = (mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * gaussian(rng);
    values[i] = Math.max(0.05, values[i + 1] / Math.exp(r));
  }
  return values.map((v, i) => ({
    label: formatShortDate(addDays(endDate, -(points - 1 - i) * stepDays)),
    value: +v.toFixed(v < 10 ? 4 : 2),
  }));
}

export function seriesReturnPct(series: SeriesPoint[]): number {
  if (series.length < 2) return 0;
  const first = series[0].value;
  return first > 0 ? ((series[series.length - 1].value - first) / first) * 100 : 0;
}
