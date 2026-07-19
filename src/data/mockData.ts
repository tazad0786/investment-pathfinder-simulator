import { Stock, MutualFund, UserPortfolio } from '../types';

// Helper to generate mock history points
const generateStockHistory = (startPrice: number, days: number = 10): { date: string; price: number }[] => {
  const points = [];
  let currentPrice = startPrice;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const volatility = 0.02; // 2% daily fluctuation
    const change = currentPrice * (Math.random() - 0.48) * volatility; // slight upward bias
    currentPrice = Math.max(1, +(currentPrice + change).toFixed(2));
    points.push({ date: formattedDate, price: currentPrice });
  }
  return points;
};

const generateFundHistory = (startNav: number, days: number = 10): { date: string; nav: number }[] => {
  const points = [];
  let currentNav = startNav;
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const volatility = 0.012; // 1.2% daily fluctuation (generally lower than individual stocks)
    const change = currentNav * (Math.random() - 0.47) * volatility; // moderate upward bias
    currentNav = Math.max(1, +(currentNav + change).toFixed(2));
    points.push({ date: formattedDate, nav: currentNav });
  }
  return points;
};

export const mockStocks: Stock[] = [
  {
    id: 'st-1',
    name: 'Reliance Industries Limited',
    ticker: 'RELIANCE',
    price: 2450.75,
    change: 32.40,
    changePercent: 1.34,
    marketCap: '1,650.40 B',
    peRatio: 26.4,
    debtToEquity: 0.38,
    dividendYield: 0.45,
    profitGrowth3y: 14.8,
    sector: 'Energy & Retail',
    risk: 'Low',
    description: 'Reliance Industries is India\'s largest private sector enterprise. It is a conglomerate spanning energy, petrochemicals, retail, telecommunications, and digital services with highly robust cash flows.',
    sparkline: [2410, 2430, 2420, 2445, 2435, 2460, 2440, 2455, 2442, 2450],
    history: generateStockHistory(2450.75, 12),
  },
  {
    id: 'st-2',
    name: 'Tata Consultancy Services',
    ticker: 'TCS',
    price: 3820.40,
    change: -45.10,
    changePercent: -1.17,
    marketCap: '1,398.20 B',
    peRatio: 29.8,
    debtToEquity: 0.02,
    dividendYield: 1.25,
    profitGrowth3y: 11.2,
    sector: 'Information Technology',
    risk: 'Low',
    description: 'TCS is a global leader in IT services, consulting, and business solutions. Known for its massive cash generation, negligible debt, stellar dividend payouts, and long-term institutional stability.',
    sparkline: [3890, 3880, 3865, 3870, 3840, 3855, 3810, 3835, 3828, 3820],
    history: generateStockHistory(3820.40, 12),
  },
  {
    id: 'st-3',
    name: 'HDFC Bank Limited',
    ticker: 'HDFCBANK',
    price: 1610.50,
    change: 8.90,
    changePercent: 0.56,
    marketCap: '1,220.60 B',
    peRatio: 18.2,
    debtToEquity: 0.82, // typical bank debt structure
    dividendYield: 1.10,
    profitGrowth3y: 19.5,
    sector: 'Financial Services',
    risk: 'Medium',
    description: 'India\'s largest private bank with superior asset quality, strong retail presence, and consistent balance-sheet compounding over decades.',
    sparkline: [1595, 1602, 1598, 1612, 1605, 1618, 1601, 1614, 1608, 1610],
    history: generateStockHistory(1610.50, 12),
  },
  {
    id: 'st-4',
    name: 'Tata Motors Limited',
    ticker: 'TATAMOTORS',
    price: 940.25,
    change: 22.80,
    changePercent: 2.48,
    marketCap: '312.40 B',
    peRatio: 15.6,
    debtToEquity: 1.15,
    dividendYield: 0.65,
    profitGrowth3y: 42.1,
    sector: 'Automobile',
    risk: 'High',
    description: 'A leading global automobile manufacturer of cars, utility vehicles, buses, trucks, and defense vehicles. It leads India\'s electric vehicle (EV) passenger transit revolution and owns JLR.',
    sparkline: [910, 918, 925, 920, 935, 930, 938, 932, 945, 940],
    history: generateStockHistory(940.25, 12),
  },
  {
    id: 'st-5',
    name: 'Zomato Limited',
    ticker: 'ZOMATO',
    price: 182.10,
    change: 9.40,
    changePercent: 5.44,
    marketCap: '160.80 B',
    peRatio: 125.4, // hyper growth multiple
    debtToEquity: 0.01,
    dividendYield: 0.00,
    profitGrowth3y: 85.0, // turning profitable growth
    sector: 'Consumer Services / Tech',
    risk: 'High',
    description: 'Zomato operates a food-delivery platform, quick commerce delivery service (Blinkit), and dine-out reservation aggregator. It has witnessed massive turnaround profitability.',
    sparkline: [168, 171, 170, 174, 172, 179, 175, 184, 180, 182],
    history: generateStockHistory(182.10, 12),
  },
  {
    id: 'st-6',
    name: 'Suzlon Energy Limited',
    ticker: 'SUZLON',
    price: 54.80,
    change: -1.25,
    changePercent: -2.23,
    marketCap: '74.50 B',
    peRatio: 45.2,
    debtToEquity: 0.05,
    dividendYield: 0.00,
    profitGrowth3y: 110.0, // turnaround
    sector: 'Renewable Infrastructure',
    risk: 'High',
    description: 'Suzlon is India\'s pioneer wind energy solutions provider, offering turbine manufacture, wind farm development, and operations. Turnaround story following heavy debt restructuring.',
    sparkline: [56, 55.5, 56.2, 55.8, 55, 54.2, 54.9, 54.1, 55.2, 54.8],
    history: generateStockHistory(54.80, 12),
  }
];

export const mockMutualFunds: MutualFund[] = [
  {
    id: 'mf-1',
    name: 'Quant Small Cap Fund (Direct-Growth)',
    category: 'Equity',
    subCategory: 'Small Cap',
    cagr3y: 38.60,
    cagr5y: 28.40,
    expenseRatio: 0.77,
    aum: '17,240 Cr',
    riskRating: 'High',
    minSip: 500,
    description: 'Quant Small Cap Fund is structured to identify dynamic growth companies in the highly volatile small-cap spectrum. Employs their signature VLRT predictive analytical investment model.',
    managers: ['Sandeep Tandon', 'Ankit Pande'],
    holdings: [
      { name: 'Reliance Industries', percentage: 7.2 },
      { name: 'Jindal Stainless Ltd', percentage: 5.8 },
      { name: 'Adani Power Ltd', percentage: 4.9 },
      { name: 'Bikaji Foods International', percentage: 4.1 },
    ],
    history: generateFundHistory(220.40, 12),
  },
  {
    id: 'mf-2',
    name: 'Parag Parikh Flexi Cap Fund (Direct-Growth)',
    category: 'Equity',
    subCategory: 'Flexi Cap',
    cagr3y: 22.45,
    cagr5y: 20.10,
    expenseRatio: 0.58,
    aum: '54,120 Cr',
    riskRating: 'Moderately High',
    minSip: 1000,
    description: 'An open-ended equity scheme investing across large cap, mid cap, and small cap stocks. Renowned for value investing principles, holding strong cash-rich businesses, and including international tech exposure (e.g. Alphabet, Microsoft).',
    managers: ['Rajeev Thakkar', 'Raunak Onkar'],
    holdings: [
      { name: 'HDFC Bank Ltd', percentage: 8.4 },
      { name: 'ITC Ltd', percentage: 7.9 },
      { name: 'Alphabet Inc.', percentage: 6.2 },
      { name: 'Microsoft Corporation', percentage: 5.1 },
    ],
    history: generateFundHistory(72.15, 12),
  },
  {
    id: 'mf-3',
    name: 'SBI Nifty 50 Index Fund',
    category: 'Index',
    subCategory: 'Index / Large Cap',
    cagr3y: 15.20,
    cagr5y: 14.80,
    expenseRatio: 0.20,
    aum: '32,150 Cr',
    riskRating: 'Moderate',
    minSip: 500,
    description: 'A low-cost index tracking mutual fund that mirrors the performance of the Nifty 50 Index. Perfect for long-term passive index investors desiring equity compound returns matching India\'s top 50 enterprises.',
    managers: ['Raviprakash Sharma'],
    holdings: [
      { name: 'HDFC Bank Ltd', percentage: 11.2 },
      { name: 'Reliance Industries', percentage: 9.8 },
      { name: 'ICICI Bank Ltd', percentage: 7.6 },
      { name: 'Infosys Ltd', percentage: 5.9 },
    ],
    history: generateFundHistory(145.30, 12),
  },
  {
    id: 'mf-4',
    name: 'Tata ELSS Tax Saver Fund',
    category: 'Equity',
    subCategory: 'Tax Saver (ELSS)',
    cagr3y: 24.10,
    cagr5y: 18.50,
    expenseRatio: 0.81,
    aum: '4,890 Cr',
    riskRating: 'High',
    minSip: 500,
    description: 'An equity-linked savings scheme (ELSS) that offers dual benefits of tax deduction under Section 80C of the Income Tax Act along with long-term wealth compounding. Comprises a 3-year mandatory lock-in period.',
    managers: ['Tejas Gutka'],
    holdings: [
      { name: 'ICICI Bank Ltd', percentage: 8.1 },
      { name: 'Larsen & Toubro Ltd', percentage: 6.5 },
      { name: 'TCS Ltd', percentage: 5.4 },
      { name: 'Axis Bank Ltd', percentage: 4.8 },
    ],
    history: generateFundHistory(115.80, 12),
  },
  {
    id: 'mf-5',
    name: 'Aditya Birla Sun Life Liquid Fund',
    category: 'Debt',
    subCategory: 'Liquid / Low Risk',
    cagr3y: 6.80,
    cagr5y: 5.90,
    expenseRatio: 0.25,
    aum: '21,450 Cr',
    riskRating: 'Low',
    minSip: 1000,
    description: 'Highly conservative debt fund investing in short-term commercial papers, treasury bills, and certificate of deposits with maturities less than 91 days. Yields highly stable, interest-accruing alternative to bank savings deposits.',
    managers: ['Kaustubh Gupta'],
    holdings: [
      { name: '91-Day Treasury Bills', percentage: 22.4 },
      { name: 'HDFC Commercial Paper', percentage: 15.8 },
      { name: 'NABARD Certificate of Deposit', percentage: 12.1 },
    ],
    history: generateFundHistory(380.10, 12),
  },
  {
    id: 'mf-6',
    name: 'ICICI Prudential Equity & Debt Hybrid Fund',
    category: 'Hybrid',
    subCategory: 'Aggressive Hybrid',
    cagr3y: 18.90,
    cagr5y: 16.40,
    expenseRatio: 0.65,
    aum: '29,820 Cr',
    riskRating: 'Moderately High',
    minSip: 1000,
    description: 'A hybrid fund maintaining 65%-80% allocation in equities for aggressive growth, and remaining 20%-35% in highly stable debt papers to cushion downside market shocks during recessions.',
    managers: ['Sankaran Naren', 'Manish Banthia'],
    holdings: [
      { name: 'ICICI Bank Ltd', percentage: 7.8 },
      { name: 'Government of India bonds', percentage: 12.5 },
      { name: 'Maruti Suzuki Ltd', percentage: 4.3 },
      { name: 'State Bank of India', percentage: 4.1 },
    ],
    history: generateFundHistory(298.50, 12),
  }
];

export const initialPortfolio: UserPortfolio = {
  balance: 100000.00, // Starts with 100,000 INR of virtual simulation currency
  items: [
    {
      id: 'p-1',
      assetType: 'stock',
      assetId: 'st-1',
      assetName: 'Reliance Industries Limited',
      tickerOrCategory: 'RELIANCE',
      quantity: 10,
      avgBuyPrice: 2400.00,
      currentPrice: 2450.75,
      investedAmount: 24000.00,
      currentValue: 24507.50,
      returns: 507.50,
      returnsPercentage: 2.11,
    },
    {
      id: 'p-2',
      assetType: 'mf',
      assetId: 'mf-2',
      assetName: 'Parag Parikh Flexi Cap Fund (Direct-Growth)',
      tickerOrCategory: 'Flexi Cap',
      quantity: 200,
      avgBuyPrice: 70.00,
      currentPrice: 72.15,
      investedAmount: 14000.00,
      currentValue: 14430.00,
      returns: 430.00,
      returnsPercentage: 3.07,
    }
  ]
};
