import { AssetType, Bond, FnoPosition, Holding, MutualFund, Stock } from '../types';
import { AppState, stockIdForTicker } from './state';
import { FNO_UNDERLYINGS } from '../data/markets';
import { contractLtp, positionPnl, underlyingSpot } from '../lib/fno';

export interface HoldingView {
  holding: Holding;
  name: string;
  symbol: string;
  subtitle: string;
  currentPrice: number;
  prevPrice: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
}

export function holdingView(state: AppState, h: Holding): HoldingView {
  let name = h.assetId;
  let symbol = h.assetId;
  let subtitle = '';
  let currentPrice = h.avgPrice;
  let prevPrice = h.avgPrice;
  if (h.assetType === 'stock') {
    const s = state.stocks.find((x) => x.id === h.assetId);
    const ipo = state.ipos.find((i) => stockIdForTicker(i.ticker) === h.assetId);
    name = s?.name ?? ipo?.company ?? h.assetId;
    symbol = s?.ticker ?? ipo?.ticker ?? h.assetId;
    subtitle = s ? `${s.instrument === 'ETF' ? 'ETF' : s.sector}` : 'Awaiting listing';
    if (s) {
      currentPrice = s.price;
      prevPrice = s.prevClose;
    }
  } else if (h.assetType === 'mf') {
    const f = state.funds.find((x) => x.id === h.assetId);
    if (f) {
      name = f.name;
      symbol = f.subCategory;
      subtitle = `${f.category} · ${f.subCategory}`;
      currentPrice = f.nav;
      prevPrice = f.prevNav;
    }
  } else {
    const b = state.bonds.find((x) => x.id === h.assetId);
    if (b) {
      name = b.name;
      symbol = b.type;
      subtitle = `${b.type} · ${b.rating}`;
      currentPrice = b.price;
      prevPrice = b.prevPrice;
    }
  }
  const currentValue = currentPrice * h.quantity;
  const pnl = currentValue - h.investedAmount;
  return {
    holding: h,
    name,
    symbol,
    subtitle,
    currentPrice,
    prevPrice,
    currentValue,
    pnl,
    pnlPct: h.investedAmount > 0 ? (pnl / h.investedAmount) * 100 : 0,
    dayChange: (currentPrice - prevPrice) * h.quantity,
  };
}

export function holdingsOfType(state: AppState, type: AssetType): HoldingView[] {
  return state.holdings.filter((h) => h.assetType === type).map((h) => holdingView(state, h));
}

export interface FnoView {
  position: FnoPosition;
  ltp: number;
  spot: number;
  pnl: number;
  /** Value that would come back to the wallet if closed now. */
  liquidationValue: number;
}

export function fnoView(state: AppState, p: FnoPosition): FnoView {
  const u = FNO_UNDERLYINGS.find((x) => x.symbol === p.underlying)!;
  const spot = underlyingSpot(u, state.indices, state.stocks);
  const ltp = contractLtp(u, p.kind, p.strike, p.expiry, spot, state.simDate);
  const pnl = positionPnl(p, ltp);
  const qty = p.lots * p.lotSize;
  let liquidationValue: number;
  if (p.kind === 'FUT') liquidationValue = p.marginBlocked + pnl;
  else liquidationValue = p.side === 'BUY' ? ltp * qty : p.marginBlocked - ltp * qty;
  return { position: p, ltp, spot, pnl, liquidationValue };
}

export interface PortfolioSummary {
  cash: number;
  blockedCash: number;
  invested: number;
  current: number;
  pnl: number;
  pnlPct: number;
  dayChange: number;
  netWorth: number;
  byClass: { name: string; invested: number; current: number }[];
  fnoPnl: number;
  fnoValue: number;
}

export function portfolioSummary(state: AppState): PortfolioSummary {
  const views = state.holdings.map((h) => holdingView(state, h));
  const classes: { type: AssetType; name: string }[] = [
    { type: 'stock', name: 'Stocks & ETFs' },
    { type: 'mf', name: 'Mutual Funds' },
    { type: 'bond', name: 'Bonds' },
  ];
  const byClass = classes.map(({ type, name }) => {
    const vs = views.filter((v) => v.holding.assetType === type);
    return {
      name,
      invested: vs.reduce((a, v) => a + v.holding.investedAmount, 0),
      current: vs.reduce((a, v) => a + v.currentValue, 0),
    };
  });
  const fno = state.fnoPositions.map((p) => fnoView(state, p));
  const fnoPnl = fno.reduce((a, f) => a + f.pnl, 0);
  const fnoValue = fno.reduce((a, f) => a + f.liquidationValue, 0);
  if (fno.length) byClass.push({ name: 'F&O', invested: fnoValue - fnoPnl, current: fnoValue });
  const invested = views.reduce((a, v) => a + v.holding.investedAmount, 0);
  const current = views.reduce((a, v) => a + v.currentValue, 0);
  const blockedCash =
    state.pendingOrders.reduce((a, o) => a + o.blockedAmount, 0) +
    state.ipoApplications.filter((a) => a.status === 'APPLIED').reduce((a, x) => a + x.amount, 0);
  return {
    cash: state.balance,
    blockedCash,
    invested,
    current,
    pnl: current - invested,
    pnlPct: invested > 0 ? ((current - invested) / invested) * 100 : 0,
    dayChange: views.reduce((a, v) => a + v.dayChange, 0),
    netWorth: state.balance + blockedCash + current + fnoValue,
    byClass,
    fnoPnl,
    fnoValue,
  };
}

export type SearchResult =
  | { kind: 'stock'; item: Stock }
  | { kind: 'mf'; item: MutualFund }
  | { kind: 'bond'; item: Bond };

export function searchAll(state: AppState, query: string, limit = 12): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (text: string, exact?: string) => {
    const t = text.toLowerCase();
    if (exact && exact.toLowerCase() === q) return 0;
    if (t.startsWith(q)) return 1;
    if (t.includes(` ${q}`)) return 2;
    if (t.includes(q)) return 3;
    return 99;
  };
  const results: { r: SearchResult; s: number }[] = [];
  for (const st of state.stocks) {
    const s = Math.min(score(st.ticker, st.ticker), score(st.name));
    if (s < 99) results.push({ r: { kind: 'stock', item: st }, s });
  }
  for (const f of state.funds) {
    const s = Math.min(score(f.name), score(f.subCategory) + 1, score(f.amc) + 1);
    if (s < 99) results.push({ r: { kind: 'mf', item: f }, s: s + 0.5 });
  }
  for (const b of state.bonds) {
    const s = Math.min(score(b.name), score(b.type) + 1, score(b.issuer) + 1);
    if (s < 99) results.push({ r: { kind: 'bond', item: b }, s: s + 0.7 });
  }
  return results.sort((a, b) => a.s - b.s).slice(0, limit).map((x) => x.r);
}
