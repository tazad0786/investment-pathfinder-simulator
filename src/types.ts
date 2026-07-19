export interface StockHistoryPoint {
  date: string;
  price: number;
}

export interface Stock {
  id: string;
  name: string;
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string; // in Billion / Crore
  peRatio: number;
  debtToEquity: number;
  dividendYield: number;
  profitGrowth3y: number; // percentage
  sector: string;
  risk: 'Low' | 'Medium' | 'High';
  description: string;
  sparkline: number[];
  history: StockHistoryPoint[];
}

export interface FundHistoryPoint {
  date: string;
  nav: number;
}

export interface MutualFund {
  id: string;
  name: string;
  category: 'Equity' | 'Debt' | 'Hybrid' | 'Index';
  subCategory: string; // ELSS, Liquid, Midcap, Bluechip etc
  cagr3y: number; // 3 year compound annual growth rate
  cagr5y: number; // 5 year CAGR
  expenseRatio: number; // percentage
  aum: string; // Asset under management
  riskRating: 'Low' | 'Moderately Low' | 'Moderate' | 'Moderately High' | 'High';
  minSip: number;
  description: string;
  managers: string[];
  holdings: { name: string; percentage: number }[];
  history: FundHistoryPoint[];
}

export interface PortfolioItem {
  id: string;
  assetType: 'stock' | 'mf';
  assetId: string;
  assetName: string;
  tickerOrCategory: string; // Ticker for stocks, Category/Subcategory for MF
  quantity: number; // units or shares
  avgBuyPrice: number; // Average purchase price
  currentPrice: number; // current price of stock or NAV of MF
  investedAmount: number;
  currentValue: number;
  returns: number; // value - invested
  returnsPercentage: number;
  isSip?: boolean;
  sipAmount?: number;
}

export interface UserPortfolio {
  balance: number; // Cash balance available
  items: PortfolioItem[];
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
  horizon: number; // years
  monthlyInvestmentCapacity: number;
  isCompleted: boolean;
}
