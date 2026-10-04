import { FnoKind, FnoPosition, FnoUnderlying, MarketIndex, OptionKind, Stock, TradeSide } from '../types';
import { blackScholes, OptionGreeks } from './finance';
import { addDays, daysBetween, parseDate, toISODate } from './format';
import { hashString, roundTick } from './random';

export const RISK_FREE_RATE = 6.5;
export const MARGIN_RATE = 0.13;

function lastWeekdayOfMonth(year: number, month: number, weekday: number): string {
  const d = new Date(year, month + 1, 0);
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
  return toISODate(d);
}

/** Upcoming expiries: weekly contracts (if any) plus the next three monthly contracts. */
export function getExpiries(u: FnoUnderlying, simDate: string): string[] {
  const out = new Set<string>();
  const today = parseDate(simDate);
  if (u.weekly) {
    const d = new Date(today);
    while (d.getDay() !== u.expiryWeekday) d.setDate(d.getDate() + 1);
    for (let i = 0; i < 4; i++) {
      out.add(toISODate(d));
      d.setDate(d.getDate() + 7);
    }
  }
  let added = 0;
  for (let m = 0; added < 3 && m < 6; m++) {
    const exp = lastWeekdayOfMonth(today.getFullYear(), today.getMonth() + m, u.expiryWeekday);
    if (exp >= simDate) {
      out.add(exp);
      added++;
    }
  }
  return Array.from(out).sort();
}

export function underlyingSpot(u: FnoUnderlying, indices: MarketIndex[], stocks: Stock[]): number {
  if (u.type === 'INDEX') return indices.find((i) => i.id === u.refId)?.value ?? 0;
  return stocks.find((s) => s.id === u.refId)?.price ?? 0;
}

export function underlyingPrevClose(u: FnoUnderlying, indices: MarketIndex[], stocks: Stock[]): number {
  if (u.type === 'INDEX') return indices.find((i) => i.id === u.refId)?.prevClose ?? 0;
  return stocks.find((s) => s.id === u.refId)?.prevClose ?? 0;
}

export function yearsToExpiry(simDate: string, expiry: string): number {
  return Math.max((daysBetween(simDate, expiry) + 0.35) / 365, 0.0001);
}

/** Implied volatility with a simple smile and put skew. */
export function impliedVol(u: FnoUnderlying, spot: number, strike: number): number {
  const m = Math.log(strike / spot);
  const skew = strike < spot ? 2.2 * Math.abs(m) : 0;
  return +(u.baseIv * (1 + 3 * Math.abs(m) + skew)).toFixed(2);
}

export interface OptionQuote extends OptionGreeks {
  iv: number;
  ltp: number;
}

export function optionQuote(
  u: FnoUnderlying,
  kind: OptionKind,
  spot: number,
  strike: number,
  expiry: string,
  simDate: string,
): OptionQuote {
  const iv = impliedVol(u, spot, strike);
  const g = blackScholes(kind, spot, strike, yearsToExpiry(simDate, expiry), RISK_FREE_RATE, iv);
  return { ...g, iv, ltp: roundTick(g.price) };
}

export function futuresPrice(spot: number, simDate: string, expiry: string): number {
  return roundTick(spot * Math.exp((RISK_FREE_RATE / 100) * yearsToExpiry(simDate, expiry)));
}

export function contractLtp(
  u: FnoUnderlying,
  kind: FnoKind,
  strike: number,
  expiry: string,
  spot: number,
  simDate: string,
): number {
  if (kind === 'FUT') return futuresPrice(spot, simDate, expiry);
  return optionQuote(u, kind, spot, strike, expiry, simDate).ltp;
}

export function atmStrike(spot: number, step: number): number {
  return Math.round(spot / step) * step;
}

export function strikesAround(spot: number, step: number, count = 10): number[] {
  const atm = atmStrike(spot, step);
  const out: number[] = [];
  for (let i = -count; i <= count; i++) {
    const k = atm + i * step;
    if (k > 0) out.push(k);
  }
  return out;
}

/** Synthetic open interest (in contracts) peaking near the money. */
export function syntheticOi(u: FnoUnderlying, kind: OptionKind, strike: number, spot: number, expiry: string): number {
  const m = (strike - spot) / spot;
  const centre = kind === 'CE' ? 0.02 : -0.02;
  const base = u.type === 'INDEX' ? 120000 : 9000;
  const noise = 0.6 + ((hashString(`${u.symbol}${kind}${strike}${expiry}`) % 1000) / 1000) * 0.8;
  return Math.round(base * Math.exp(-(((m - centre) / 0.03) ** 2)) * noise + base * 0.03);
}

export function contractLabel(p: Pick<FnoPosition, 'underlying' | 'kind' | 'strike' | 'expiry'>): string {
  const d = parseDate(p.expiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return p.kind === 'FUT' ? `${p.underlying} ${d} FUT` : `${p.underlying} ${d} ${p.strike} ${p.kind}`;
}

export function marginFor(kind: FnoKind, side: TradeSide, spot: number, qty: number): number {
  if (kind !== 'FUT' && side === 'BUY') return 0;
  return +(MARGIN_RATE * spot * qty).toFixed(2);
}

/** Cash movement when opening a position (negative = debit). */
export function openCashFlow(kind: FnoKind, side: TradeSide, price: number, qty: number, margin: number): number {
  if (kind === 'FUT') return -margin;
  return side === 'BUY' ? -price * qty : price * qty - margin;
}

/** Cash movement when closing `qty` of a position at `exitPrice`. */
export function closeCashFlow(p: FnoPosition, exitPrice: number, qty: number): number {
  const marginShare = p.marginBlocked * (qty / (p.lots * p.lotSize));
  if (p.kind === 'FUT') {
    const dir = p.side === 'BUY' ? 1 : -1;
    return marginShare + (exitPrice - p.avgPrice) * qty * dir;
  }
  return p.side === 'BUY' ? exitPrice * qty : marginShare - exitPrice * qty;
}

export function positionPnl(p: FnoPosition, ltp: number): number {
  const dir = p.side === 'BUY' ? 1 : -1;
  return (ltp - p.avgPrice) * p.lots * p.lotSize * dir;
}

export function intrinsicValue(kind: FnoKind, strike: number, spot: number): number {
  if (kind === 'FUT') return spot;
  return kind === 'CE' ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
}

/** P&L of a set of positions at expiry for each spot in the grid. */
export function payoffAtExpiry(positions: FnoPosition[], spots: number[]): { spot: number; pnl: number }[] {
  return spots.map((spot) => ({
    spot: Math.round(spot),
    pnl: Math.round(positions.reduce((sum, p) => sum + positionPnl(p, intrinsicValue(p.kind, p.strike, spot)), 0)),
  }));
}

export function nextExpiryAfter(simDate: string, days: number): string {
  return addDays(simDate, days);
}
