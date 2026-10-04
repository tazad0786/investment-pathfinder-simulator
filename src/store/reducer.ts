import { AssetType, FnoKind, Goal, Holding, Sip, Stock, TradeSide, Transaction, UserProfile } from '../types';
import { AppState, createInitialState, ipoListingPrice, listIpoStock, stockIdForTicker } from './state';
import { FNO_UNDERLYINGS } from '../data/markets';
import { fundExpectedReturn } from '../data/funds';
import { priceBond } from '../data/bonds';
import {
  closeCashFlow,
  contractLabel,
  contractLtp,
  getExpiries,
  intrinsicValue,
  marginFor,
  openCashFlow,
  underlyingSpot,
} from '../lib/fno';
import { addDays, addMonths, daysBetween, parseDate } from '../lib/format';
import { gaussian, mulberry32, round, roundTick, Rng } from '../lib/random';

export type Action =
  | { type: 'TICK'; seed: number }
  | { type: 'NEXT_DAY'; seed: number; days: number }
  | { type: 'STOCK_ORDER'; stockId: string; side: TradeSide; quantity: number; orderType: 'MARKET' | 'LIMIT'; limitPrice?: number }
  | { type: 'CANCEL_ORDER'; orderId: string }
  | { type: 'FUND_INVEST'; fundId: string; amount: number; mode: 'SIP' | 'LUMPSUM'; dayOfMonth?: number; stepUpPercent?: number }
  | { type: 'FUND_REDEEM'; fundId: string; units: number }
  | { type: 'SIP_UPDATE'; sipId: string; changes: Partial<Pick<Sip, 'amount' | 'status' | 'stepUpPercent' | 'dayOfMonth'>> }
  | { type: 'SIP_CANCEL'; sipId: string }
  | { type: 'BOND_ORDER'; bondId: string; side: TradeSide; units: number }
  | { type: 'FNO_OPEN'; underlying: string; kind: FnoKind; strike: number; expiry: string; side: TradeSide; lots: number }
  | { type: 'FNO_CLOSE'; positionId: string; lots?: number }
  | { type: 'IPO_APPLY'; ipoId: string; lots: number }
  | { type: 'DEPOSIT'; amount: number }
  | { type: 'WITHDRAW'; amount: number }
  | { type: 'GOAL_SAVE'; goal: Goal }
  | { type: 'GOAL_DELETE'; goalId: string }
  | { type: 'TOGGLE_WATCHLIST'; key: string }
  | { type: 'SET_PROFILE'; profile: UserProfile }
  | { type: 'RESET'; today?: string };

const EPS = 1e-6;

export function ipoStatus(ipo: { openDate: string; closeDate: string; listingDate: string }, simDate: string) {
  if (simDate < ipo.openDate) return 'Upcoming' as const;
  if (simDate <= ipo.closeDate) return 'Open' as const;
  if (simDate < ipo.listingDate) return 'Closed' as const;
  return 'Listed' as const;
}

export function sipInstallmentAmount(sip: Sip): number {
  const years = Math.floor(sip.installments / 12);
  return Math.round(sip.amount * Math.pow(1 + sip.stepUpPercent / 100, years));
}

export function exitLoadApplies(fund: { exitLoadPct: number; exitLoadDays: number }, firstBuyDate: string, simDate: string) {
  return fund.exitLoadPct > 0 && daysBetween(firstBuyDate, simDate) < fund.exitLoadDays;
}

export function isLockedIn(fund: { lockInYears: number }, firstBuyDate: string, simDate: string) {
  if (!fund.lockInYears) return false;
  return simDate < addMonths(firstBuyDate, fund.lockInYears * 12);
}

function holdingOf(state: AppState, assetType: AssetType, assetId: string): Holding | undefined {
  return state.holdings.find((h) => h.assetType === assetType && h.assetId === assetId);
}

function reservedSellQty(state: AppState, stockId: string): number {
  return state.pendingOrders.filter((o) => o.stockId === stockId && o.side === 'SELL').reduce((a, o) => a + o.quantity, 0);
}

/** Returns a human readable error if the action cannot be executed, otherwise null. */
export function validateAction(state: AppState, action: Action): string | null {
  switch (action.type) {
    case 'STOCK_ORDER': {
      const stock = state.stocks.find((s) => s.id === action.stockId);
      if (!stock) return 'Stock not found.';
      if (!Number.isInteger(action.quantity) || action.quantity <= 0) return 'Quantity must be a positive whole number.';
      if (action.orderType === 'LIMIT') {
        if (!action.limitPrice || action.limitPrice <= 0) return 'Enter a valid limit price.';
        const band = stock.prevClose * 0.2;
        if (Math.abs(action.limitPrice - stock.prevClose) > band) return 'Limit price is outside the 20% circuit band.';
      }
      if (action.side === 'BUY') {
        const px = action.orderType === 'LIMIT' ? action.limitPrice! : stock.price;
        if (px * action.quantity > state.balance + EPS) return 'Insufficient balance. Add funds to your wallet.';
      } else {
        const owned = holdingOf(state, 'stock', stock.id)?.quantity ?? 0;
        if (action.quantity > owned - reservedSellQty(state, stock.id)) return `You can sell at most ${owned - reservedSellQty(state, stock.id)} shares.`;
      }
      return null;
    }
    case 'CANCEL_ORDER':
      return state.pendingOrders.some((o) => o.id === action.orderId) ? null : 'Order not found.';
    case 'FUND_INVEST': {
      const fund = state.funds.find((f) => f.id === action.fundId);
      if (!fund) return 'Fund not found.';
      if (!(action.amount > 0)) return 'Enter a valid amount.';
      const min = action.mode === 'SIP' ? fund.minSip : fund.minLumpsum;
      if (action.amount < min) return `Minimum ${action.mode === 'SIP' ? 'SIP' : 'lumpsum'} amount is ₹${min}.`;
      if (action.amount > state.balance + EPS) return 'Insufficient balance. Add funds to your wallet.';
      if (action.mode === 'SIP' && action.dayOfMonth && (action.dayOfMonth < 1 || action.dayOfMonth > 28)) return 'SIP date must be between 1 and 28.';
      return null;
    }
    case 'FUND_REDEEM': {
      const fund = state.funds.find((f) => f.id === action.fundId);
      const h = holdingOf(state, 'mf', action.fundId);
      if (!fund || !h) return 'You do not hold this fund.';
      if (!(action.units > 0) || action.units > h.quantity + EPS) return `You can redeem at most ${h.quantity.toFixed(3)} units.`;
      if (isLockedIn(fund, h.firstBuyDate, state.simDate))
        return `Units are under a ${fund.lockInYears}-year lock-in until ${addMonths(h.firstBuyDate, fund.lockInYears * 12)}.`;
      return null;
    }
    case 'SIP_UPDATE': {
      const sip = state.sips.find((s) => s.id === action.sipId);
      if (!sip) return 'SIP not found.';
      const fund = state.funds.find((f) => f.id === sip.fundId);
      if (action.changes.amount !== undefined && fund && action.changes.amount < fund.minSip) return `Minimum SIP amount is ₹${fund.minSip}.`;
      return null;
    }
    case 'SIP_CANCEL':
      return state.sips.some((s) => s.id === action.sipId) ? null : 'SIP not found.';
    case 'BOND_ORDER': {
      const bond = state.bonds.find((b) => b.id === action.bondId);
      if (!bond) return 'Bond not found.';
      if (!Number.isInteger(action.units) || action.units <= 0) return 'Units must be a positive whole number.';
      if (state.simDate >= bond.maturityDate) return 'This bond has matured.';
      if (action.side === 'BUY') {
        if (bond.price * action.units > state.balance + EPS) return 'Insufficient balance. Add funds to your wallet.';
      } else {
        if (bond.type === 'Floating Rate') return 'RBI Floating Rate Bonds are non-tradable and held till maturity.';
        const owned = holdingOf(state, 'bond', bond.id)?.quantity ?? 0;
        if (action.units > owned) return `You can sell at most ${owned} units.`;
      }
      return null;
    }
    case 'FNO_OPEN': {
      const u = FNO_UNDERLYINGS.find((x) => x.symbol === action.underlying);
      if (!u) return 'Unknown underlying.';
      if (!Number.isInteger(action.lots) || action.lots <= 0) return 'Lots must be a positive whole number.';
      if (!getExpiries(u, state.simDate).includes(action.expiry)) return 'Contract expiry is not available.';
      if (action.kind !== 'FUT' && (action.strike <= 0 || action.strike % u.strikeStep !== 0)) return 'Invalid strike price.';
      const spot = underlyingSpot(u, state.indices, state.stocks);
      const price = contractLtp(u, action.kind, action.strike, action.expiry, spot, state.simDate);
      if (action.kind !== 'FUT' && price < 0.05) return 'Contract has no premium to trade.';
      const qty = action.lots * u.lotSize;
      const margin = marginFor(action.kind, action.side, spot, qty);
      const flow = openCashFlow(action.kind, action.side, price, qty, margin);
      if (-flow > state.balance + EPS) return `Insufficient margin. Required ₹${Math.round(-flow).toLocaleString('en-IN')}.`;
      return null;
    }
    case 'FNO_CLOSE': {
      const p = state.fnoPositions.find((x) => x.id === action.positionId);
      if (!p) return 'Position not found.';
      if (action.lots !== undefined && (!Number.isInteger(action.lots) || action.lots <= 0 || action.lots > p.lots)) return `You can exit at most ${p.lots} lots.`;
      return null;
    }
    case 'IPO_APPLY': {
      const ipo = state.ipos.find((i) => i.id === action.ipoId);
      if (!ipo) return 'IPO not found.';
      if (ipoStatus(ipo, state.simDate) !== 'Open') return 'This IPO is not open for subscription.';
      if (state.ipoApplications.some((a) => a.ipoId === ipo.id)) return 'You have already applied to this IPO.';
      if (!Number.isInteger(action.lots) || action.lots <= 0) return 'Lots must be a positive whole number.';
      const amount = action.lots * ipo.lotSize * ipo.priceHigh;
      if (amount > 200000) return 'Retail applications are capped at ₹2,00,000.';
      if (amount > state.balance + EPS) return 'Insufficient balance to block for this IPO.';
      return null;
    }
    case 'DEPOSIT':
      if (!(action.amount > 0)) return 'Enter a valid amount.';
      if (action.amount > 10000000) return 'Maximum single deposit is ₹1 Cr.';
      return null;
    case 'WITHDRAW':
      if (!(action.amount > 0)) return 'Enter a valid amount.';
      if (action.amount > state.balance + EPS) return 'Withdrawal exceeds available balance.';
      return null;
    case 'GOAL_SAVE':
      if (!action.goal.name.trim()) return 'Give your goal a name.';
      if (!(action.goal.targetAmount > 0)) return 'Target amount must be positive.';
      if (action.goal.targetYear <= parseDate(state.simDate).getFullYear()) return 'Target year must be in the future.';
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------- helpers

function uid(s: AppState, prefix: string): string {
  s.seq += 1;
  return `${prefix}-${s.seq}`;
}

function addTx(s: AppState, tx: Omit<Transaction, 'id' | 'date'>) {
  s.transactions = [{ id: uid(s, 'tx'), date: s.simDate, ...tx }, ...s.transactions].slice(0, 400);
}

function addToHolding(s: AppState, assetType: AssetType, assetId: string, qty: number, amount: number) {
  const idx = s.holdings.findIndex((h) => h.assetType === assetType && h.assetId === assetId);
  if (idx === -1) {
    s.holdings = [
      ...s.holdings,
      { id: uid(s, 'h'), assetType, assetId, quantity: qty, avgPrice: round(amount / qty, 4), investedAmount: round(amount), firstBuyDate: s.simDate },
    ];
    return;
  }
  const h = s.holdings[idx];
  const quantity = round(h.quantity + qty, 4);
  const investedAmount = round(h.investedAmount + amount);
  s.holdings = s.holdings.map((x, i) => (i === idx ? { ...h, quantity, investedAmount, avgPrice: round(investedAmount / quantity, 4) } : x));
}

function removeFromHolding(s: AppState, assetType: AssetType, assetId: string, qty: number) {
  const h = s.holdings.find((x) => x.assetType === assetType && x.assetId === assetId);
  if (!h) return;
  const quantity = round(h.quantity - qty, 4);
  if (quantity <= 0.0005) {
    s.holdings = s.holdings.filter((x) => x !== h);
    return;
  }
  s.holdings = s.holdings.map((x) => (x === h ? { ...h, quantity, investedAmount: round(h.avgPrice * quantity) } : x));
}

function credit(s: AppState, amount: number) {
  s.balance = round(s.balance + amount);
}

function executeStockTrade(s: AppState, stock: Stock, side: TradeSide, qty: number, price: number, note?: string) {
  const amount = round(price * qty);
  if (side === 'BUY') {
    addToHolding(s, 'stock', stock.id, qty, amount);
    addTx(s, { kind: 'BUY', assetType: 'stock', assetId: stock.id, name: stock.ticker, quantity: qty, price, amount: -amount, note });
  } else {
    removeFromHolding(s, 'stock', stock.id, qty);
    credit(s, amount);
    addTx(s, { kind: 'SELL', assetType: 'stock', assetId: stock.id, name: stock.ticker, quantity: qty, price, amount, note });
  }
}

function processPendingOrders(s: AppState) {
  if (!s.pendingOrders.length) return;
  const remaining = [];
  for (const o of s.pendingOrders) {
    const stock = s.stocks.find((x) => x.id === o.stockId);
    if (!stock) continue;
    const hit = o.side === 'BUY' ? stock.price <= o.limitPrice : stock.price >= o.limitPrice;
    if (!hit) {
      remaining.push(o);
      continue;
    }
    if (o.side === 'BUY') {
      // Blocked cash was debited at placement; refund any price improvement
      credit(s, o.blockedAmount - round(stock.price * o.quantity));
    }
    executeStockTrade(s, stock, o.side, o.quantity, stock.price, `Limit order @ ₹${o.limitPrice} executed`);
  }
  s.pendingOrders = remaining;
}

function investInFund(s: AppState, fundId: string, amount: number, kind: 'SIP' | 'LUMPSUM') {
  const fund = s.funds.find((f) => f.id === fundId)!;
  const units = round(amount / fund.nav, 4);
  credit(s, -amount);
  addToHolding(s, 'mf', fund.id, units, amount);
  addTx(s, { kind, assetType: 'mf', assetId: fund.id, name: fund.name, quantity: units, price: fund.nav, amount: -amount });
}

function settleFnoPosition(s: AppState, positionId: string, exitPrice: number, lots: number, kind: 'FNO_CLOSE' | 'FNO_SETTLE') {
  const p = s.fnoPositions.find((x) => x.id === positionId);
  if (!p) return;
  const qty = lots * p.lotSize;
  const flow = closeCashFlow(p, exitPrice, qty);
  const marginShare = p.marginBlocked * (lots / p.lots);
  credit(s, flow);
  const dir = p.side === 'BUY' ? 1 : -1;
  const pnl = round((exitPrice - p.avgPrice) * qty * dir);
  addTx(s, {
    kind,
    assetType: 'fno',
    assetId: p.id,
    name: contractLabel(p),
    quantity: qty,
    price: exitPrice,
    amount: round(flow),
    note: `${p.side === 'BUY' ? 'Sold' : 'Bought back'} ${lots} lot(s) · P&L ${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString('en-IN')}`,
  });
  if (lots >= p.lots) s.fnoPositions = s.fnoPositions.filter((x) => x.id !== p.id);
  else
    s.fnoPositions = s.fnoPositions.map((x) =>
      x.id === p.id ? { ...x, lots: x.lots - lots, marginBlocked: round(x.marginBlocked - marginShare) } : x,
    );
}

function moveStock(stock: Stock, factor: number): Stock {
  const lower = stock.prevClose * 0.8;
  const upper = stock.prevClose * 1.2;
  const price = roundTick(Math.min(upper, Math.max(lower, stock.price * factor)));
  const sparkline = [...stock.sparkline];
  sparkline[sparkline.length - 1] = price;
  return {
    ...stock,
    price,
    dayHigh: Math.max(stock.dayHigh, price),
    dayLow: Math.min(stock.dayLow, price),
    change: round(price - stock.prevClose),
    changePercent: round(((price - stock.prevClose) / stock.prevClose) * 100),
    week52High: Math.max(stock.week52High, price),
    week52Low: Math.min(stock.week52Low, price),
    sparkline,
  };
}

function betaFor(stock: Stock): number {
  if (stock.instrument === 'ETF') {
    if (stock.sector.includes('Index') || stock.sector.includes('Thematic') || stock.sector.includes('Sectoral')) return 0.95;
    return 0;
  }
  return stock.capCategory === 'Large' ? 0.75 : 0.6;
}

function tickMarket(s: AppState, rng: Rng, scale: number, fullUpdate: boolean) {
  const m = gaussian(rng);
  s.indices = s.indices.map((idx) => {
    const sigma = (idx.volatility / 100) * scale;
    const z = idx.id === 'indiavix' ? -2.5 * m + gaussian(rng) * 0.5 : 0.9 * m + 0.44 * gaussian(rng);
    const value = round(idx.value * Math.exp(sigma * z));
    return { ...idx, value, dayHigh: Math.max(idx.dayHigh, value), dayLow: Math.min(idx.dayLow, value) };
  });
  s.stocks = s.stocks.map((stock) => {
    if (!fullUpdate && rng() > 0.55) return stock;
    const beta = betaFor(stock);
    const sigma = (stock.volatility / 100) * scale;
    const z = beta * m + Math.sqrt(1 - beta * beta) * gaussian(rng);
    const next = moveStock(stock, Math.exp(sigma * z));
    return fullUpdate ? next : { ...next, volume: next.volume + Math.round(rng() * next.volume * 0.002) };
  });
}

function isCouponDate(maturity: string, frequency: number, date: string): boolean {
  if (!frequency) return false;
  const md = parseDate(maturity);
  const d = parseDate(date);
  const monthDiff = (md.getFullYear() - d.getFullYear()) * 12 + (md.getMonth() - d.getMonth());
  if (monthDiff <= 0 || monthDiff % (12 / frequency) !== 0) return false;
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getDate() === Math.min(md.getDate(), lastDay);
}

function advanceOneDay(s: AppState, rng: Rng) {
  // 1. End of day: expire day orders and settle contracts expiring today
  for (const o of s.pendingOrders) {
    if (o.side === 'BUY') credit(s, o.blockedAmount);
    const stock = s.stocks.find((x) => x.id === o.stockId);
    addTx(s, { kind: 'LIMIT_CANCELLED', assetType: 'stock', assetId: o.stockId, name: stock?.ticker ?? o.stockId, quantity: o.quantity, price: o.limitPrice, amount: o.side === 'BUY' ? o.blockedAmount : 0, note: 'Day order expired unexecuted' });
  }
  s.pendingOrders = [];
  for (const p of [...s.fnoPositions]) {
    if (p.expiry > s.simDate) continue;
    const u = FNO_UNDERLYINGS.find((x) => x.symbol === p.underlying);
    const spot = u ? underlyingSpot(u, s.indices, s.stocks) : 0;
    settleFnoPosition(s, p.id, round(intrinsicValue(p.kind, p.strike, spot)), p.lots, 'FNO_SETTLE');
  }

  // 2. Move the calendar
  s.simDate = addDays(s.simDate, 1);
  const weekday = parseDate(s.simDate).getDay();
  const tradingDay = weekday !== 0 && weekday !== 6;

  // 3. Market close -> next open
  if (tradingDay) {
    s.stocks = s.stocks.map((st) => ({ ...st, prevClose: st.price, dayOpen: st.price, dayHigh: st.price, dayLow: st.price }));
    s.indices = s.indices.map((i) => ({ ...i, prevClose: i.value, dayHigh: i.value, dayLow: i.value }));
    tickMarket(s, rng, 1 / Math.sqrt(252), true);
    s.stocks = s.stocks.map((st) => ({
      ...st,
      dayOpen: st.price,
      volume: Math.round(st.volume * (0.7 + rng() * 0.6)),
      sparkline: [...st.sparkline.slice(-20), st.price],
    }));
    const market = gaussian(rng);
    s.funds = s.funds.map((f) => {
      const mu = fundExpectedReturn(f) / 100;
      const sigma = f.volatility / 100;
      const beta = f.category === 'Debt' || f.subCategory === 'Arbitrage' || f.category === 'Commodity' ? 0 : 0.85;
      const z = beta * market + Math.sqrt(1 - beta * beta) * gaussian(rng);
      const nav = round(f.nav * Math.exp((mu - (sigma * sigma) / 2) / 252 + (sigma / Math.sqrt(252)) * z), 4);
      return { ...f, prevNav: f.nav, nav };
    });
    s.bonds = s.bonds.map((b) => {
      if (b.type === 'SGB') {
        const price = round(b.price * Math.exp(0.1 / 252 + (0.14 / Math.sqrt(252)) * gaussian(rng)));
        return { ...b, prevPrice: b.price, price };
      }
      if (b.type === 'Floating Rate') return { ...b, prevPrice: b.price };
      const ytm = round(Math.max(3, b.ytm + gaussian(rng) * 0.015), 3);
      return { ...b, ytm, prevPrice: b.price, price: priceBond({ ...b, ytm }, s.simDate) };
    });
    processPendingOrders(s);
  }

  // 4. SIP instalments
  for (const sip of s.sips) {
    if (sip.status !== 'ACTIVE' || sip.nextDate > s.simDate) continue;
    const fund = s.funds.find((f) => f.id === sip.fundId);
    const amount = sipInstallmentAmount(sip);
    const nextDate = addMonths(sip.nextDate, 1, sip.dayOfMonth);
    if (!fund) continue;
    if (s.balance + EPS < amount) {
      addTx(s, { kind: 'SIP_FAILED', assetType: 'mf', assetId: fund.id, name: fund.name, amount: 0, note: `Insufficient balance for ₹${amount} instalment` });
      s.sips = s.sips.map((x) => (x.id === sip.id ? { ...x, nextDate } : x));
      continue;
    }
    investInFund(s, fund.id, amount, 'SIP');
    s.sips = s.sips.map((x) => (x.id === sip.id ? { ...x, nextDate, installments: x.installments + 1 } : x));
  }

  // 5. Bond coupons and maturities
  for (const h of s.holdings.filter((x) => x.assetType === 'bond')) {
    const bond = s.bonds.find((b) => b.id === h.assetId);
    if (!bond) continue;
    if (s.simDate >= bond.maturityDate) {
      const perUnit = bond.type === 'SGB' ? bond.price : bond.faceValue;
      const coupon = bond.couponFrequency ? (bond.faceValue * bond.couponRate) / 100 / bond.couponFrequency : 0;
      const amount = round((perUnit + coupon) * h.quantity);
      credit(s, amount);
      removeFromHolding(s, 'bond', bond.id, h.quantity);
      addTx(s, { kind: 'MATURITY', assetType: 'bond', assetId: bond.id, name: bond.name, quantity: h.quantity, price: perUnit, amount, note: 'Redeemed at maturity' });
    } else if (isCouponDate(bond.maturityDate, bond.couponFrequency, s.simDate)) {
      const amount = round(((bond.faceValue * bond.couponRate) / 100 / bond.couponFrequency) * h.quantity);
      credit(s, amount);
      addTx(s, { kind: 'COUPON', assetType: 'bond', assetId: bond.id, name: bond.name, quantity: h.quantity, amount, note: `${bond.couponRate}% coupon credited` });
    }
  }

  // 6. IPO allotment and listing
  for (const app of s.ipoApplications) {
    const ipo = s.ipos.find((i) => i.id === app.ipoId);
    if (!ipo || app.status !== 'APPLIED' || s.simDate <= ipo.closeDate) continue;
    const allotted = rng() < Math.min(0.9, 3 / Math.max(1, ipo.subscriptionX));
    const lotAmount = ipo.lotSize * app.price;
    const refund = allotted ? app.amount - lotAmount : app.amount;
    if (refund > 0) {
      credit(s, refund);
      addTx(s, { kind: 'IPO_REFUND', assetType: 'ipo', assetId: ipo.id, name: ipo.company, amount: refund, note: allotted ? 'Partial refund — 1 lot allotted' : 'Not allotted — funds released' });
    }
    if (allotted) {
      addToHolding(s, 'stock', stockIdForTicker(ipo.ticker), ipo.lotSize, lotAmount);
      addTx(s, { kind: 'IPO_ALLOT', assetType: 'ipo', assetId: ipo.id, name: ipo.company, quantity: ipo.lotSize, price: app.price, amount: 0, note: `Allotted ${ipo.lotSize} shares` });
    }
    s.ipoApplications = s.ipoApplications.map((a) => (a.id === app.id ? { ...a, status: allotted ? 'ALLOTTED' : 'NOT_ALLOTTED' } : a));
  }
  for (const ipo of s.ipos) {
    if (ipo.listingDate <= s.simDate && !s.stocks.some((st) => st.id === stockIdForTicker(ipo.ticker))) {
      s.stocks = [...s.stocks, listIpoStock(ipo)];
    }
  }
}

// ---------------------------------------------------------------- reducer

export function reducer(state: AppState, action: Action): AppState {
  if (validateAction(state, action)) return state;
  const s: AppState = { ...state };

  switch (action.type) {
    case 'TICK': {
      tickMarket(s, mulberry32(action.seed), 0.0016, false);
      processPendingOrders(s);
      return s;
    }
    case 'NEXT_DAY': {
      const rng = mulberry32(action.seed);
      for (let i = 0; i < Math.max(1, Math.min(action.days, 400)); i++) advanceOneDay(s, rng);
      return s;
    }
    case 'STOCK_ORDER': {
      const stock = s.stocks.find((x) => x.id === action.stockId)!;
      const marketable =
        action.orderType === 'MARKET' ||
        (action.side === 'BUY' ? stock.price <= action.limitPrice! : stock.price >= action.limitPrice!);
      if (marketable) {
        if (action.side === 'BUY') credit(s, -round(stock.price * action.quantity));
        executeStockTrade(s, stock, action.side, action.quantity, stock.price, action.orderType === 'LIMIT' ? 'Limit order executed immediately' : undefined);
        return s;
      }
      const blockedAmount = action.side === 'BUY' ? round(action.limitPrice! * action.quantity) : 0;
      credit(s, -blockedAmount);
      s.pendingOrders = [
        ...s.pendingOrders,
        { id: uid(s, 'ord'), stockId: stock.id, side: action.side, quantity: action.quantity, limitPrice: action.limitPrice!, blockedAmount, createdAt: s.simDate },
      ];
      addTx(s, { kind: 'LIMIT_PLACED', assetType: 'stock', assetId: stock.id, name: stock.ticker, quantity: action.quantity, price: action.limitPrice, amount: -blockedAmount, note: `${action.side} limit order pending` });
      return s;
    }
    case 'CANCEL_ORDER': {
      const o = s.pendingOrders.find((x) => x.id === action.orderId)!;
      if (o.side === 'BUY') credit(s, o.blockedAmount);
      s.pendingOrders = s.pendingOrders.filter((x) => x.id !== o.id);
      const stock = s.stocks.find((x) => x.id === o.stockId);
      addTx(s, { kind: 'LIMIT_CANCELLED', assetType: 'stock', assetId: o.stockId, name: stock?.ticker ?? '', quantity: o.quantity, price: o.limitPrice, amount: o.blockedAmount, note: 'Cancelled by user' });
      return s;
    }
    case 'FUND_INVEST': {
      investInFund(s, action.fundId, action.amount, action.mode);
      if (action.mode === 'SIP') {
        const day = action.dayOfMonth ?? Math.min(28, parseDate(s.simDate).getDate());
        let nextDate = addMonths(s.simDate, 0, day);
        if (nextDate <= s.simDate) nextDate = addMonths(s.simDate, 1, day);
        s.sips = [
          ...s.sips,
          { id: uid(s, 'sip'), fundId: action.fundId, amount: action.amount, dayOfMonth: day, nextDate, status: 'ACTIVE', installments: 1, stepUpPercent: action.stepUpPercent ?? 0, createdAt: s.simDate },
        ];
      }
      return s;
    }
    case 'FUND_REDEEM': {
      const fund = s.funds.find((f) => f.id === action.fundId)!;
      const h = holdingOf(s, 'mf', fund.id)!;
      const units = Math.min(action.units, h.quantity);
      const gross = units * fund.nav;
      const load = exitLoadApplies(fund, h.firstBuyDate, s.simDate) ? (gross * fund.exitLoadPct) / 100 : 0;
      const amount = round(gross - load);
      removeFromHolding(s, 'mf', fund.id, units);
      credit(s, amount);
      addTx(s, { kind: 'REDEEM', assetType: 'mf', assetId: fund.id, name: fund.name, quantity: round(units, 4), price: fund.nav, amount, note: load > 0 ? `Exit load ₹${round(load)} deducted` : undefined });
      return s;
    }
    case 'SIP_UPDATE': {
      s.sips = s.sips.map((x) => {
        if (x.id !== action.sipId) return x;
        const next = { ...x, ...action.changes };
        if (action.changes.dayOfMonth) {
          let nd = addMonths(s.simDate, 0, action.changes.dayOfMonth);
          if (nd <= s.simDate) nd = addMonths(s.simDate, 1, action.changes.dayOfMonth);
          next.nextDate = nd;
        }
        if (action.changes.status === 'ACTIVE' && next.nextDate <= s.simDate) next.nextDate = addMonths(s.simDate, 1, next.dayOfMonth);
        return next;
      });
      return s;
    }
    case 'SIP_CANCEL':
      s.sips = s.sips.filter((x) => x.id !== action.sipId);
      return s;
    case 'BOND_ORDER': {
      const bond = s.bonds.find((b) => b.id === action.bondId)!;
      const amount = round(bond.price * action.units);
      if (action.side === 'BUY') {
        credit(s, -amount);
        addToHolding(s, 'bond', bond.id, action.units, amount);
        addTx(s, { kind: 'BUY', assetType: 'bond', assetId: bond.id, name: bond.name, quantity: action.units, price: bond.price, amount: -amount });
      } else {
        removeFromHolding(s, 'bond', bond.id, action.units);
        credit(s, amount);
        addTx(s, { kind: 'SELL', assetType: 'bond', assetId: bond.id, name: bond.name, quantity: action.units, price: bond.price, amount });
      }
      return s;
    }
    case 'FNO_OPEN': {
      const u = FNO_UNDERLYINGS.find((x) => x.symbol === action.underlying)!;
      const spot = underlyingSpot(u, s.indices, s.stocks);
      const strike = action.kind === 'FUT' ? 0 : action.strike;
      const price = contractLtp(u, action.kind, strike, action.expiry, spot, s.simDate);
      const qty = action.lots * u.lotSize;
      const margin = marginFor(action.kind, action.side, spot, qty);
      const flow = round(openCashFlow(action.kind, action.side, price, qty, margin));
      credit(s, flow);
      const existing = s.fnoPositions.find(
        (p) => p.underlying === u.symbol && p.kind === action.kind && p.strike === strike && p.expiry === action.expiry && p.side === action.side,
      );
      if (existing) {
        const lots = existing.lots + action.lots;
        const avgPrice = round((existing.avgPrice * existing.lots + price * action.lots) / lots);
        s.fnoPositions = s.fnoPositions.map((p) => (p === existing ? { ...p, lots, avgPrice, marginBlocked: round(p.marginBlocked + margin) } : p));
      } else {
        s.fnoPositions = [
          ...s.fnoPositions,
          { id: uid(s, 'fno'), underlying: u.symbol, kind: action.kind, strike, expiry: action.expiry, side: action.side, lots: action.lots, lotSize: u.lotSize, avgPrice: price, marginBlocked: margin, openedAt: s.simDate },
        ];
      }
      addTx(s, {
        kind: 'FNO_OPEN',
        assetType: 'fno',
        name: contractLabel({ underlying: u.symbol, kind: action.kind, strike, expiry: action.expiry }),
        quantity: qty,
        price,
        amount: flow,
        note: `${action.side} ${action.lots} lot(s)${margin ? ` · margin ₹${Math.round(margin).toLocaleString('en-IN')} blocked` : ''}`,
      });
      return s;
    }
    case 'FNO_CLOSE': {
      const p = s.fnoPositions.find((x) => x.id === action.positionId)!;
      const u = FNO_UNDERLYINGS.find((x) => x.symbol === p.underlying)!;
      const spot = underlyingSpot(u, s.indices, s.stocks);
      const ltp = contractLtp(u, p.kind, p.strike, p.expiry, spot, s.simDate);
      settleFnoPosition(s, p.id, ltp, action.lots ?? p.lots, 'FNO_CLOSE');
      return s;
    }
    case 'IPO_APPLY': {
      const ipo = s.ipos.find((i) => i.id === action.ipoId)!;
      const amount = action.lots * ipo.lotSize * ipo.priceHigh;
      credit(s, -amount);
      s.ipoApplications = [
        ...s.ipoApplications,
        { id: uid(s, 'ipoapp'), ipoId: ipo.id, lots: action.lots, price: ipo.priceHigh, amount, status: 'APPLIED', appliedOn: s.simDate },
      ];
      addTx(s, { kind: 'IPO_APPLY', assetType: 'ipo', assetId: ipo.id, name: ipo.company, quantity: action.lots * ipo.lotSize, price: ipo.priceHigh, amount: -amount, note: `Applied for ${action.lots} lot(s) at cut-off · listing est. ₹${ipoListingPrice(ipo)}` });
      return s;
    }
    case 'DEPOSIT':
      credit(s, action.amount);
      addTx(s, { kind: 'DEPOSIT', assetType: 'cash', name: 'Funds added via UPI', amount: action.amount });
      return s;
    case 'WITHDRAW':
      credit(s, -action.amount);
      addTx(s, { kind: 'WITHDRAW', assetType: 'cash', name: 'Withdrawn to bank', amount: -action.amount });
      return s;
    case 'GOAL_SAVE': {
      const exists = s.goals.some((g) => g.id === action.goal.id);
      const goal = exists ? action.goal : { ...action.goal, id: action.goal.id || uid(s, 'goal') };
      s.goals = exists ? s.goals.map((g) => (g.id === goal.id ? goal : g)) : [...s.goals, goal];
      return s;
    }
    case 'GOAL_DELETE':
      s.goals = s.goals.filter((g) => g.id !== action.goalId);
      return s;
    case 'TOGGLE_WATCHLIST':
      s.watchlist = s.watchlist.includes(action.key) ? s.watchlist.filter((k) => k !== action.key) : [...s.watchlist, action.key];
      return s;
    case 'SET_PROFILE':
      s.userProfile = action.profile;
      return s;
    case 'RESET':
      return createInitialState(action.today);
    default:
      return state;
  }
}
