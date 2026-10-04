import {
  Bond,
  FnoPosition,
  Goal,
  Holding,
  Ipo,
  IpoApplication,
  MarketIndex,
  MutualFund,
  PendingOrder,
  Sip,
  Stock,
  Transaction,
  UserProfile,
} from '../types';
import { buildStockCatalog, stockFromIpo } from '../data/stocks';
import { buildFundCatalog } from '../data/funds';
import { buildBondCatalog } from '../data/bonds';
import { buildIndices, buildIpos } from '../data/markets';
import { addMonths, toISODate } from '../lib/format';
import { round } from '../lib/random';

export const STATE_VERSION = 2;
export const STORAGE_KEY = 'wealthwise_state_v2';
export const STARTING_CASH = 1000000;
const MAX_TRANSACTIONS = 400;

export interface AppState {
  version: number;
  seq: number;
  startDate: string;
  simDate: string;
  balance: number;
  stocks: Stock[];
  funds: MutualFund[];
  bonds: Bond[];
  indices: MarketIndex[];
  ipos: Ipo[];
  holdings: Holding[];
  fnoPositions: FnoPosition[];
  pendingOrders: PendingOrder[];
  sips: Sip[];
  ipoApplications: IpoApplication[];
  goals: Goal[];
  watchlist: string[];
  transactions: Transaction[];
  userProfile: UserProfile;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Guest Investor',
  riskTolerance: 'Not Sure',
  goal: 'Not Sure',
  horizon: 5,
  monthlyInvestmentCapacity: 5000,
  isCompleted: false,
};

export function ipoListingPrice(ipo: Ipo): number {
  return round(ipo.priceHigh * (1 + ipo.listingGainPct / 100), 2);
}

export function stockIdForTicker(ticker: string): string {
  return `st-${ticker.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

export function listIpoStock(ipo: Ipo): Stock {
  return stockFromIpo(ipo.ticker, ipo.company, ipo.sector, ipoListingPrice(ipo), Math.round(ipo.issueSizeCr * 6));
}

function buildMarket(startDate: string, simDate: string) {
  const ipos = buildIpos(startDate);
  const stocks = buildStockCatalog();
  for (const ipo of ipos) if (ipo.listingDate <= simDate) stocks.push(listIpoStock(ipo));
  return {
    stocks,
    funds: buildFundCatalog(stocks),
    bonds: buildBondCatalog(startDate),
    indices: buildIndices(),
    ipos,
  };
}

export function createInitialState(today: string = toISODate(new Date())): AppState {
  const market = buildMarket(today, today);
  const reliance = market.stocks.find((s) => s.ticker === 'RELIANCE')!;
  const hdfc = market.stocks.find((s) => s.ticker === 'HDFCBANK')!;
  const ppfas = market.funds.find((f) => f.name.startsWith('Parag Parikh Flexi Cap'))!;
  const nifty = market.funds.find((f) => f.name.startsWith('UTI Nifty 50 Index'))!;
  const relAvg = round(reliance.price * 0.94);
  const hdfcAvg = round(hdfc.price * 0.97);
  const ppfasAvg = round(ppfas.nav * 0.88, 4);
  const niftyAvg = round(nifty.nav * 0.92, 4);
  const holdings: Holding[] = [
    { id: 'h-1', assetType: 'stock', assetId: reliance.id, quantity: 10, avgPrice: relAvg, investedAmount: round(relAvg * 10), firstBuyDate: today },
    { id: 'h-2', assetType: 'stock', assetId: hdfc.id, quantity: 25, avgPrice: hdfcAvg, investedAmount: round(hdfcAvg * 25), firstBuyDate: today },
    { id: 'h-3', assetType: 'mf', assetId: ppfas.id, quantity: 250, avgPrice: ppfasAvg, investedAmount: round(ppfasAvg * 250), firstBuyDate: today },
    { id: 'h-4', assetType: 'mf', assetId: nifty.id, quantity: 120, avgPrice: niftyAvg, investedAmount: round(niftyAvg * 120), firstBuyDate: today },
  ];
  const day = Math.min(28, new Date().getDate());
  return {
    version: STATE_VERSION,
    seq: 100,
    startDate: today,
    simDate: today,
    balance: STARTING_CASH,
    ...market,
    holdings,
    fnoPositions: [],
    pendingOrders: [],
    sips: [
      {
        id: 'sip-1',
        fundId: ppfas.id,
        amount: 5000,
        dayOfMonth: day,
        nextDate: addMonths(today, 1, day),
        status: 'ACTIVE',
        installments: 1,
        stepUpPercent: 10,
        createdAt: today,
      },
    ],
    ipoApplications: [],
    goals: [
      {
        id: 'goal-1',
        name: 'Retirement corpus',
        category: 'Retirement',
        targetAmount: 30000000,
        targetYear: new Date().getFullYear() + 25,
        currentSaved: 250000,
        expectedReturn: 12,
        inflation: 6,
        createdAt: today,
      },
    ],
    watchlist: ['st-tcs', 'st-infy', 'st-eternal', 'st-hal', 'st-niftybees', ppfas.id],
    transactions: [
      { id: 'tx-1', date: today, kind: 'DEPOSIT', assetType: 'cash', name: 'Virtual funds added', amount: STARTING_CASH, note: 'Starting virtual balance' },
    ],
    userProfile: DEFAULT_PROFILE,
  };
}

interface PersistedState extends Omit<AppState, 'stocks' | 'funds' | 'bonds' | 'indices' | 'ipos'> {
  market: {
    stocks: Record<string, Partial<Stock>>;
    funds: Record<string, [number, number]>;
    bonds: Record<string, [number, number, number]>;
    indices: Record<string, [number, number, number, number]>;
  };
}

export function serializeState(state: AppState): string {
  const { stocks, funds, bonds, indices, ipos, ...rest } = state;
  void ipos;
  const persisted: PersistedState = {
    ...rest,
    transactions: rest.transactions.slice(0, MAX_TRANSACTIONS),
    market: {
      stocks: Object.fromEntries(
        stocks.map((s) => [
          s.id,
          {
            price: s.price,
            prevClose: s.prevClose,
            dayOpen: s.dayOpen,
            dayHigh: s.dayHigh,
            dayLow: s.dayLow,
            volume: s.volume,
            week52High: s.week52High,
            week52Low: s.week52Low,
            sparkline: s.sparkline,
          },
        ]),
      ),
      funds: Object.fromEntries(funds.map((f) => [f.id, [f.nav, f.prevNav]])),
      bonds: Object.fromEntries(bonds.map((b) => [b.id, [b.price, b.prevPrice, b.ytm]])),
      indices: Object.fromEntries(indices.map((i) => [i.id, [i.value, i.prevClose, i.dayHigh, i.dayLow]])),
    },
  };
  return JSON.stringify(persisted);
}

export function deserializeState(raw: string): AppState | null {
  try {
    const p = JSON.parse(raw) as PersistedState;
    if (!p || p.version !== STATE_VERSION || !p.startDate || !p.market) return null;
    const market = buildMarket(p.startDate, p.simDate);
    const withChange = (s: Stock): Stock => ({
      ...s,
      change: round(s.price - s.prevClose),
      changePercent: s.prevClose ? round(((s.price - s.prevClose) / s.prevClose) * 100) : 0,
    });
    const stocks = market.stocks.map((s) => {
      const o = p.market.stocks[s.id];
      return o ? withChange({ ...s, ...o }) : s;
    });
    const funds = market.funds.map((f) => {
      const o = p.market.funds[f.id];
      return o ? { ...f, nav: o[0], prevNav: o[1] } : f;
    });
    const bonds = market.bonds.map((b) => {
      const o = p.market.bonds[b.id];
      return o ? { ...b, price: o[0], prevPrice: o[1], ytm: o[2] } : b;
    });
    const indices = market.indices.map((i) => {
      const o = p.market.indices[i.id];
      return o ? { ...i, value: o[0], prevClose: o[1], dayHigh: o[2], dayLow: o[3] } : i;
    });
    const { market: _m, ...rest } = p;
    void _m;
    return { ...rest, stocks, funds, bonds, indices, ipos: market.ipos };
  } catch {
    return null;
  }
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return createInitialState();
  const raw = localStorage.getItem(STORAGE_KEY);
  const restored = raw ? deserializeState(raw) : null;
  if (restored) return restored;
  ['wealthwise_portfolio', 'wealthwise_live_stocks', 'wealthwise_transactions_log'].forEach((k) => localStorage.removeItem(k));
  const fresh = createInitialState();
  try {
    const legacyProfile = localStorage.getItem('wealthwise_user_profile');
    if (legacyProfile) fresh.userProfile = { ...DEFAULT_PROFILE, ...JSON.parse(legacyProfile) };
  } catch {
    /* ignore corrupt legacy profile */
  }
  return fresh;
}
