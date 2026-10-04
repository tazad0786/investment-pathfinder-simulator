export type RiskLevel = 'Low' | 'Medium' | 'High';
export type CapCategory = 'Large' | 'Mid' | 'Small';
export type InstrumentType = 'EQ' | 'ETF';

export interface PricePoint {
  date: string;
  price: number;
}

export interface Stock {
  id: string;
  name: string;
  ticker: string;
  exchange: 'NSE';
  instrument: InstrumentType;
  sector: string;
  capCategory: CapCategory;
  price: number;
  prevClose: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  change: number;
  changePercent: number;
  week52High: number;
  week52Low: number;
  volume: number;
  marketCapCr: number;
  peRatio: number;
  pbRatio: number;
  roe: number;
  eps: number;
  debtToEquity: number;
  dividendYield: number;
  profitGrowth3y: number;
  risk: RiskLevel;
  volatility: number; // annualised
  description: string;
  sparkline: number[];
}

export type FundCategory =
  | 'Equity'
  | 'Debt'
  | 'Hybrid'
  | 'Index'
  | 'Commodity'
  | 'International'
  | 'Solution Oriented';

export type FundRisk = 'Low' | 'Low to Moderate' | 'Moderate' | 'Moderately High' | 'High' | 'Very High';

export interface MutualFund {
  id: string;
  name: string;
  amc: string;
  category: FundCategory;
  subCategory: string;
  nav: number;
  prevNav: number;
  cagr1y: number;
  cagr3y: number;
  cagr5y: number;
  expenseRatio: number;
  aumCr: number;
  riskRating: FundRisk;
  rating: number; // 1-5 stars
  minSip: number;
  minLumpsum: number;
  exitLoadPct: number;
  exitLoadDays: number;
  lockInYears: number;
  benchmark: string;
  volatility: number;
  description: string;
  managers: string[];
  holdings: { name: string; percentage: number }[];
}

export type BondType = 'G-Sec' | 'T-Bill' | 'SDL' | 'Corporate' | 'PSU' | 'Tax-Free' | 'SGB' | 'Floating Rate';

export interface Bond {
  id: string;
  name: string;
  issuer: string;
  type: BondType;
  couponRate: number; // % p.a. on face value
  ytm: number; // % p.a.
  faceValue: number;
  price: number;
  prevPrice: number;
  maturityDate: string; // yyyy-mm-dd
  couponFrequency: 0 | 1 | 2 | 4 | 12;
  rating: string;
  taxFree: boolean;
  description: string;
}

export interface MarketIndex {
  id: string;
  name: string;
  value: number;
  prevClose: number;
  dayHigh: number;
  dayLow: number;
  volatility: number;
}

export interface Ipo {
  id: string;
  company: string;
  ticker: string;
  sector: string;
  priceLow: number;
  priceHigh: number;
  lotSize: number;
  openDate: string;
  closeDate: string;
  listingDate: string;
  issueSizeCr: number;
  subscriptionX: number;
  listingGainPct: number;
  description: string;
}

export type IpoStatus = 'Upcoming' | 'Open' | 'Closed' | 'Listed';

export interface IpoApplication {
  id: string;
  ipoId: string;
  lots: number;
  price: number;
  amount: number;
  status: 'APPLIED' | 'ALLOTTED' | 'NOT_ALLOTTED';
  appliedOn: string;
}

export type AssetType = 'stock' | 'mf' | 'bond';

export interface Holding {
  id: string;
  assetType: AssetType;
  assetId: string;
  quantity: number;
  avgPrice: number;
  investedAmount: number;
  firstBuyDate: string;
}

export type OptionKind = 'CE' | 'PE';
export type FnoKind = OptionKind | 'FUT';
export type TradeSide = 'BUY' | 'SELL';

export interface FnoUnderlying {
  symbol: string;
  name: string;
  type: 'INDEX' | 'STOCK';
  refId: string; // index id or stock id
  lotSize: number;
  strikeStep: number;
  baseIv: number;
  expiryWeekday: number; // 0=Sun..6=Sat
  weekly: boolean;
}

export interface FnoPosition {
  id: string;
  underlying: string;
  kind: FnoKind;
  strike: number;
  expiry: string;
  side: TradeSide;
  lots: number;
  lotSize: number;
  avgPrice: number;
  marginBlocked: number;
  openedAt: string;
}

export interface PendingOrder {
  id: string;
  stockId: string;
  side: TradeSide;
  quantity: number;
  limitPrice: number;
  blockedAmount: number;
  createdAt: string;
}

export interface Sip {
  id: string;
  fundId: string;
  amount: number;
  dayOfMonth: number;
  nextDate: string;
  status: 'ACTIVE' | 'PAUSED';
  installments: number;
  stepUpPercent: number;
  createdAt: string;
}

export type TransactionKind =
  | 'BUY'
  | 'SELL'
  | 'LIMIT_PLACED'
  | 'LIMIT_CANCELLED'
  | 'SIP'
  | 'LUMPSUM'
  | 'REDEEM'
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'FNO_OPEN'
  | 'FNO_CLOSE'
  | 'FNO_SETTLE'
  | 'COUPON'
  | 'MATURITY'
  | 'IPO_APPLY'
  | 'IPO_ALLOT'
  | 'IPO_REFUND'
  | 'SIP_FAILED';

export interface Transaction {
  id: string;
  date: string;
  kind: TransactionKind;
  assetType: AssetType | 'fno' | 'cash' | 'ipo';
  assetId?: string;
  name: string;
  quantity?: number;
  price?: number;
  amount: number; // signed effect on cash balance
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  category: 'Retirement' | 'House' | 'Education' | 'Car' | 'Travel' | 'Wedding' | 'Emergency' | 'Other';
  targetAmount: number; // in today's value
  targetYear: number;
  currentSaved: number;
  expectedReturn: number;
  inflation: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedPrompts?: string[];
}

export interface UserProfile {
  name: string;
  riskTolerance: 'Conservative' | 'Moderate' | 'Aggressive' | 'Not Sure';
  goal: 'Retirement' | 'Wealth Creation' | 'Tax Saving' | 'Emergency Fund' | 'Not Sure';
  horizon: number;
  monthlyInvestmentCapacity: number;
  isCompleted: boolean;
}

export type TabId =
  | 'home'
  | 'stocks'
  | 'funds'
  | 'fno'
  | 'bonds'
  | 'ipo'
  | 'portfolio'
  | 'planner'
  | 'calculators';
