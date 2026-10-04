import { FnoUnderlying, Ipo, MarketIndex } from '../types';
import { addDays } from '../lib/format';

export function buildIndices(): MarketIndex[] {
  const seeds: [string, string, number, number, number][] = [
    ['nifty50', 'NIFTY 50', 25480, 0.42, 14],
    ['sensex', 'SENSEX', 83250, 0.38, 13],
    ['banknifty', 'NIFTY BANK', 57120, 0.61, 17],
    ['finnifty', 'NIFTY FIN SERVICE', 27040, 0.55, 17],
    ['midcpnifty', 'NIFTY MIDCAP SELECT', 13180, -0.22, 20],
    ['niftyit', 'NIFTY IT', 35620, -0.84, 20],
    ['niftymidcap100', 'NIFTY MIDCAP 100', 58840, 0.18, 19],
    ['niftysmallcap100', 'NIFTY SMALLCAP 100', 18120, -0.31, 23],
    ['indiavix', 'INDIA VIX', 11.8, -2.1, 60],
  ];
  return seeds.map(([id, name, value, chg, vol]) => {
    const prevClose = +(value / (1 + chg / 100)).toFixed(2);
    return {
      id,
      name,
      value,
      prevClose,
      dayHigh: +(Math.max(value, prevClose) * 1.003).toFixed(2),
      dayLow: +(Math.min(value, prevClose) * 0.997).toFixed(2),
      volatility: vol,
    };
  });
}

export const FNO_UNDERLYINGS: FnoUnderlying[] = [
  { symbol: 'NIFTY', name: 'Nifty 50', type: 'INDEX', refId: 'nifty50', lotSize: 75, strikeStep: 50, baseIv: 12, expiryWeekday: 2, weekly: true },
  { symbol: 'BANKNIFTY', name: 'Nifty Bank', type: 'INDEX', refId: 'banknifty', lotSize: 35, strikeStep: 100, baseIv: 14, expiryWeekday: 2, weekly: false },
  { symbol: 'FINNIFTY', name: 'Nifty Financial Services', type: 'INDEX', refId: 'finnifty', lotSize: 65, strikeStep: 50, baseIv: 14, expiryWeekday: 2, weekly: false },
  { symbol: 'MIDCPNIFTY', name: 'Nifty Midcap Select', type: 'INDEX', refId: 'midcpnifty', lotSize: 140, strikeStep: 25, baseIv: 17, expiryWeekday: 2, weekly: false },
  { symbol: 'SENSEX', name: 'BSE Sensex', type: 'INDEX', refId: 'sensex', lotSize: 20, strikeStep: 100, baseIv: 12, expiryWeekday: 4, weekly: true },
  { symbol: 'RELIANCE', name: 'Reliance Industries', type: 'STOCK', refId: 'st-reliance', lotSize: 500, strikeStep: 20, baseIv: 22, expiryWeekday: 2, weekly: false },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'STOCK', refId: 'st-hdfcbank', lotSize: 550, strikeStep: 10, baseIv: 19, expiryWeekday: 2, weekly: false },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', type: 'STOCK', refId: 'st-icicibank', lotSize: 700, strikeStep: 20, baseIv: 20, expiryWeekday: 2, weekly: false },
  { symbol: 'TCS', name: 'Tata Consultancy Services', type: 'STOCK', refId: 'st-tcs', lotSize: 175, strikeStep: 50, baseIv: 21, expiryWeekday: 2, weekly: false },
  { symbol: 'INFY', name: 'Infosys', type: 'STOCK', refId: 'st-infy', lotSize: 400, strikeStep: 20, baseIv: 23, expiryWeekday: 2, weekly: false },
  { symbol: 'SBIN', name: 'State Bank of India', type: 'STOCK', refId: 'st-sbin', lotSize: 750, strikeStep: 10, baseIv: 24, expiryWeekday: 2, weekly: false },
  { symbol: 'AXISBANK', name: 'Axis Bank', type: 'STOCK', refId: 'st-axisbank', lotSize: 625, strikeStep: 10, baseIv: 23, expiryWeekday: 2, weekly: false },
  { symbol: 'ITC', name: 'ITC', type: 'STOCK', refId: 'st-itc', lotSize: 1600, strikeStep: 5, baseIv: 18, expiryWeekday: 2, weekly: false },
  { symbol: 'LT', name: 'Larsen & Toubro', type: 'STOCK', refId: 'st-lt', lotSize: 175, strikeStep: 50, baseIv: 22, expiryWeekday: 2, weekly: false },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', type: 'STOCK', refId: 'st-bhartiartl', lotSize: 475, strikeStep: 20, baseIv: 21, expiryWeekday: 2, weekly: false },
  { symbol: 'TMPV', name: 'Tata Motors PV', type: 'STOCK', refId: 'st-tmpv', lotSize: 800, strikeStep: 5, baseIv: 30, expiryWeekday: 2, weekly: false },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', type: 'STOCK', refId: 'st-adanient', lotSize: 300, strikeStep: 20, baseIv: 34, expiryWeekday: 2, weekly: false },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', type: 'STOCK', refId: 'st-bajfinance', lotSize: 750, strikeStep: 10, baseIv: 26, expiryWeekday: 2, weekly: false },
];

// [company, ticker, sector, priceLow, priceHigh, lotSize, openOffset, issueSizeCr, subscriptionX, listingGainPct, description]
type IpoSeed = [string, string, string, number, number, number, number, number, number, number, string];

const IPO_SEEDS: IpoSeed[] = [
  ['Lenskart Solutions Ltd', 'LENSKART', 'Retail', 382, 402, 37, -14, 7278, 28.3, 4.2, 'Omnichannel eyewear retailer with 2,700+ stores across India and Asia.'],
  ['Groww (Billionbrains Garage Ventures)', 'GROWW', 'Capital Markets', 95, 100, 150, -12, 6632, 17.6, 14.0, 'India\'s largest retail broker by active clients, offering stocks, mutual funds and F&O.'],
  ['PhysicsWallah Ltd', 'PWL', 'Consumer Tech', 103, 109, 137, -1, 3480, 0, 9.0, 'Ed-tech platform offering affordable test-prep courses online and through offline centres.'],
  ['Pine Labs Ltd', 'PINELABS', 'Financial Services', 210, 221, 67, 0, 3900, 0, 6.5, 'Merchant commerce and payments platform powering POS terminals and digital checkout.'],
  ['Meesho Ltd', 'MEESHO', 'Consumer Tech', 105, 111, 135, -2, 5421, 0, 18.0, 'Value e-commerce marketplace connecting small sellers with price-conscious shoppers.'],
  ['Tata Capital Ltd', 'TATACAP', 'Financial Services', 310, 326, 46, 3, 15512, 0, 2.5, 'Diversified NBFC of the Tata Group offering retail, SME and corporate loans.'],
  ['Flipkart Internet Ltd', 'FLIPKART', 'Consumer Tech', 520, 548, 27, 9, 25000, 0, 12.0, 'Leading Indian e-commerce marketplace backed by Walmart.'],
  ['PhonePe Ltd', 'PHONEPE', 'Financial Services', 640, 675, 22, 16, 12000, 0, 10.0, 'India\'s largest UPI payments app with insurance, lending and wealth offerings.'],
];

export function buildIpos(startDate: string): Ipo[] {
  return IPO_SEEDS.map(([company, ticker, sector, low, high, lot, openOffset, size, subX, gain, description]) => ({
    id: `ipo-${ticker.toLowerCase()}`,
    company,
    ticker,
    sector,
    priceLow: low,
    priceHigh: high,
    lotSize: lot,
    openDate: addDays(startDate, openOffset),
    closeDate: addDays(startDate, openOffset + 3),
    listingDate: addDays(startDate, openOffset + 6),
    issueSizeCr: size,
    subscriptionX: subX || +(5 + (ticker.length * 7.3) % 60).toFixed(1),
    listingGainPct: gain,
    description,
  }));
}
