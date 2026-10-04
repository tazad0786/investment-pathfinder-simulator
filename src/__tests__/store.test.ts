import { describe, expect, it } from 'vitest';
import { createInitialState, deserializeState, serializeState, AppState, stockIdForTicker } from '../store/state';
import { Action, reducer, validateAction } from '../store/reducer';
import { portfolioSummary } from '../store/selectors';
import { FNO_UNDERLYINGS } from '../data/markets';
import { atmStrike, getExpiries, underlyingSpot } from '../lib/fno';
import { FUND_CATEGORIES } from '../data/funds';
import { BOND_TYPES } from '../data/bonds';

const TODAY = '2026-10-05'; // Monday
const fresh = () => createInitialState(TODAY);
const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s);

describe('catalog', () => {
  const s = fresh();
  it('has a broad, unique instrument universe', () => {
    expect(s.stocks.length).toBeGreaterThanOrEqual(200);
    expect(s.stocks.filter((x) => x.instrument === 'ETF').length).toBeGreaterThanOrEqual(10);
    expect(new Set(s.stocks.map((x) => x.id)).size).toBe(s.stocks.length);
    expect(s.funds.length).toBeGreaterThanOrEqual(80);
    expect(new Set(s.funds.map((x) => x.id)).size).toBe(s.funds.length);
    for (const c of FUND_CATEGORIES) expect(s.funds.some((f) => f.category === c)).toBe(true);
    for (const t of BOND_TYPES) expect(s.bonds.some((b) => b.type === t)).toBe(true);
    expect(s.ipos.length).toBeGreaterThan(0);
  });
  it('is deterministic', () => {
    expect(fresh().stocks.map((x) => x.price)).toEqual(s.stocks.map((x) => x.price));
  });
  it('every F&O underlying resolves to a spot price', () => {
    for (const u of FNO_UNDERLYINGS) expect(underlyingSpot(u, s.indices, s.stocks)).toBeGreaterThan(0);
  });
});

describe('stock trading', () => {
  it('market buy and sell update cash and holdings', () => {
    let s = fresh();
    const tcs = s.stocks.find((x) => x.ticker === 'TCS')!;
    const cash = s.balance;
    s = run(s, { type: 'STOCK_ORDER', stockId: tcs.id, side: 'BUY', quantity: 4, orderType: 'MARKET' });
    expect(s.balance).toBeCloseTo(cash - tcs.price * 4, 2);
    expect(s.holdings.find((h) => h.assetId === tcs.id)?.quantity).toBe(4);
    s = run(s, { type: 'STOCK_ORDER', stockId: tcs.id, side: 'SELL', quantity: 4, orderType: 'MARKET' });
    expect(s.balance).toBeCloseTo(cash, 2);
    expect(s.holdings.find((h) => h.assetId === tcs.id)).toBeUndefined();
  });

  it('rejects overselling and insufficient balance', () => {
    const s = fresh();
    const mrf = s.stocks.find((x) => x.ticker === 'MRF')!;
    expect(validateAction(s, { type: 'STOCK_ORDER', stockId: mrf.id, side: 'SELL', quantity: 1, orderType: 'MARKET' })).toMatch(/sell at most/);
    expect(validateAction(s, { type: 'STOCK_ORDER', stockId: mrf.id, side: 'BUY', quantity: 10000, orderType: 'MARKET' })).toMatch(/Insufficient/);
    expect(reducer(s, { type: 'STOCK_ORDER', stockId: mrf.id, side: 'BUY', quantity: 10000, orderType: 'MARKET' })).toBe(s);
  });

  it('limit orders block cash and are refunded when cancelled or expired', () => {
    let s = fresh();
    const st = s.stocks.find((x) => x.ticker === 'INFY')!;
    const cash = s.balance;
    const limit = Math.round(st.price * 0.9 * 20) / 20;
    s = run(s, { type: 'STOCK_ORDER', stockId: st.id, side: 'BUY', quantity: 10, orderType: 'LIMIT', limitPrice: limit });
    expect(s.pendingOrders).toHaveLength(1);
    expect(s.balance).toBeCloseTo(cash - limit * 10, 2);
    const cancelled = run(s, { type: 'CANCEL_ORDER', orderId: s.pendingOrders[0].id });
    expect(cancelled.balance).toBeCloseTo(cash, 2);
    // Day order expiry at end of day (may also fill at the next open)
    const next = run(s, { type: 'NEXT_DAY', seed: 1, days: 1 });
    expect(next.pendingOrders).toHaveLength(0);
  });
});

describe('mutual funds', () => {
  it('SIP invests immediately and then monthly', () => {
    let s = fresh();
    const f = s.funds.find((x) => x.subCategory === 'Mid Cap')!;
    s = run(s, { type: 'FUND_INVEST', fundId: f.id, amount: 2000, mode: 'SIP', dayOfMonth: 10 });
    const sip = s.sips.find((x) => x.fundId === f.id)!;
    expect(sip.installments).toBe(1);
    expect(sip.nextDate).toBe('2026-10-10');
    s = run(s, { type: 'NEXT_DAY', seed: 7, days: 40 });
    expect(s.sips.find((x) => x.id === sip.id)!.installments).toBe(3); // Oct 10, Nov 10
    expect(s.transactions.filter((t) => t.kind === 'SIP' && t.assetId === f.id)).toHaveLength(3);
  });

  it('enforces minimums, exit load and ELSS lock-in', () => {
    let s = fresh();
    const elss = s.funds.find((x) => x.subCategory === 'ELSS')!;
    expect(validateAction(s, { type: 'FUND_INVEST', fundId: elss.id, amount: 1, mode: 'LUMPSUM' })).toMatch(/Minimum/);
    s = run(s, { type: 'FUND_INVEST', fundId: elss.id, amount: 10000, mode: 'LUMPSUM' });
    const units = s.holdings.find((h) => h.assetId === elss.id)!.quantity;
    expect(validateAction(s, { type: 'FUND_REDEEM', fundId: elss.id, units })).toMatch(/lock-in/);

    const eq = s.funds.find((x) => x.exitLoadPct > 0 && !x.lockInYears && !s.holdings.some((h) => h.assetId === x.id))!;
    s = run(s, { type: 'FUND_INVEST', fundId: eq.id, amount: 10000, mode: 'LUMPSUM' });
    const u2 = s.holdings.find((h) => h.assetId === eq.id)!.quantity;
    const before = s.balance;
    s = run(s, { type: 'FUND_REDEEM', fundId: eq.id, units: u2 });
    expect(s.balance - before).toBeCloseTo(u2 * eq.nav * (1 - eq.exitLoadPct / 100), 1);
  });
});

describe('F&O', () => {
  it('opening and closing immediately is roughly cash neutral', () => {
    let s = fresh();
    const u = FNO_UNDERLYINGS.find((x) => x.symbol === 'NIFTY')!;
    const spot = underlyingSpot(u, s.indices, s.stocks);
    const expiry = getExpiries(u, s.simDate)[0];
    const cash = s.balance;
    for (const action of [
      { kind: 'CE' as const, side: 'BUY' as const },
      { kind: 'PE' as const, side: 'SELL' as const },
      { kind: 'FUT' as const, side: 'SELL' as const },
    ]) {
      s = run(s, { type: 'FNO_OPEN', underlying: u.symbol, kind: action.kind, strike: action.kind === 'FUT' ? 0 : atmStrike(spot, u.strikeStep), expiry, side: action.side, lots: 1 });
    }
    expect(s.fnoPositions).toHaveLength(3);
    expect(portfolioSummary(s).netWorth).toBeCloseTo(portfolioSummary(fresh()).netWorth, 0);
    for (const p of [...s.fnoPositions]) s = run(s, { type: 'FNO_CLOSE', positionId: p.id });
    expect(s.fnoPositions).toHaveLength(0);
    expect(s.balance).toBeCloseTo(cash, 0);
  });

  it('settles expired contracts at intrinsic value', () => {
    let s = fresh();
    const u = FNO_UNDERLYINGS.find((x) => x.symbol === 'NIFTY')!;
    const spot = underlyingSpot(u, s.indices, s.stocks);
    const expiry = getExpiries(u, s.simDate)[0];
    s = run(s, { type: 'FNO_OPEN', underlying: 'NIFTY', kind: 'CE', strike: atmStrike(spot, u.strikeStep) - 500, expiry, side: 'BUY', lots: 1 });
    s = run(s, { type: 'NEXT_DAY', seed: 3, days: 10 });
    expect(s.fnoPositions).toHaveLength(0);
    expect(s.transactions.some((t) => t.kind === 'FNO_SETTLE')).toBe(true);
  });
});

describe('bonds, IPOs and wallet', () => {
  it('credits T-Bill face value at maturity', () => {
    let s = fresh();
    const tb = s.bonds.find((b) => b.type === 'T-Bill')!;
    s = run(s, { type: 'BOND_ORDER', bondId: tb.id, side: 'BUY', units: 100 });
    s = run(s, { type: 'NEXT_DAY', seed: 9, days: 400 });
    expect(s.holdings.some((h) => h.assetId === tb.id)).toBe(false);
    const maturity = s.transactions.find((t) => t.kind === 'MATURITY' && t.assetId === tb.id);
    expect(maturity?.amount).toBeCloseTo(tb.faceValue * 100, 2);
  });

  it('IPO application blocks funds, then allots or refunds, then lists', () => {
    let s = fresh();
    const open = s.ipos.find((i) => i.openDate <= s.simDate && i.closeDate >= s.simDate);
    if (!open) return;
    const cash = s.balance;
    s = run(s, { type: 'IPO_APPLY', ipoId: open.id, lots: 2 });
    expect(s.balance).toBeCloseTo(cash - 2 * open.lotSize * open.priceHigh, 2);
    expect(validateAction(s, { type: 'IPO_APPLY', ipoId: open.id, lots: 1 })).toMatch(/already applied/);
    s = run(s, { type: 'NEXT_DAY', seed: 11, days: 15 });
    expect(s.ipoApplications[0].status).not.toBe('APPLIED');
    expect(s.stocks.some((x) => x.id === stockIdForTicker(open.ticker))).toBe(true);
  });

  it('wallet deposit and withdrawal validation', () => {
    let s = fresh();
    s = run(s, { type: 'DEPOSIT', amount: 5000 }, { type: 'WITHDRAW', amount: 2000 });
    expect(s.balance).toBe(fresh().balance + 3000);
    expect(validateAction(s, { type: 'WITHDRAW', amount: s.balance + 1 })).toMatch(/exceeds/);
  });
});

describe('persistence', () => {
  it('round-trips through serialisation', () => {
    let s = fresh();
    s = run(s, { type: 'TICK', seed: 5 }, { type: 'NEXT_DAY', seed: 6, days: 3 }, { type: 'DEPOSIT', amount: 1234 });
    const restored = deserializeState(serializeState(s))!;
    expect(restored).not.toBeNull();
    expect(restored.balance).toBe(s.balance);
    expect(restored.simDate).toBe(s.simDate);
    expect(restored.holdings).toEqual(s.holdings);
    expect(restored.stocks.map((x) => x.price)).toEqual(s.stocks.map((x) => x.price));
    expect(restored.funds.map((x) => x.nav)).toEqual(s.funds.map((x) => x.nav));
    expect(deserializeState('{"version":1}')).toBeNull();
    expect(deserializeState('not json')).toBeNull();
  });
});
