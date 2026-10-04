import { Bond, BondType } from '../types';
import { addDays } from '../lib/format';
import { bondPrice } from '../lib/finance';
import { round } from '../lib/random';

// [name, issuer, type, coupon %, ytm %, face value, maturity (yyyy-mm-dd or +days), frequency, rating, taxFree]
type BondSeed = [string, string, BondType, number, number, number, string, 0 | 1 | 2 | 4 | 12, string, boolean];

const BOND_SEEDS: BondSeed[] = [
  ['91 Day Treasury Bill', 'Government of India', 'T-Bill', 0, 5.48, 100, '+91', 0, 'Sovereign', false],
  ['182 Day Treasury Bill', 'Government of India', 'T-Bill', 0, 5.56, 100, '+182', 0, 'Sovereign', false],
  ['364 Day Treasury Bill', 'Government of India', 'T-Bill', 0, 5.62, 100, '+364', 0, 'Sovereign', false],
  ['7.38% GOI 2027', 'Government of India', 'G-Sec', 7.38, 5.85, 100, '2027-06-20', 2, 'Sovereign', false],
  ['7.06% GOI 2028', 'Government of India', 'G-Sec', 7.06, 5.95, 100, '2028-04-10', 2, 'Sovereign', false],
  ['7.10% GOI 2029', 'Government of India', 'G-Sec', 7.1, 6.05, 100, '2029-04-18', 2, 'Sovereign', false],
  ['7.18% GOI 2033', 'Government of India', 'G-Sec', 7.18, 6.38, 100, '2033-08-14', 2, 'Sovereign', false],
  ['6.79% GOI 2034', 'Government of India', 'G-Sec', 6.79, 6.45, 100, '2034-10-07', 2, 'Sovereign', false],
  ['7.30% GOI 2053', 'Government of India', 'G-Sec', 7.3, 7.05, 100, '2053-06-19', 2, 'Sovereign', false],
  ['7.25% Maharashtra SDL 2032', 'Government of Maharashtra', 'SDL', 7.25, 6.78, 100, '2032-12-28', 2, 'Sovereign', false],
  ['7.40% Tamil Nadu SDL 2034', 'Government of Tamil Nadu', 'SDL', 7.4, 6.9, 100, '2034-03-13', 2, 'Sovereign', false],
  ['7.15% Gujarat SDL 2030', 'Government of Gujarat', 'SDL', 7.15, 6.62, 100, '2030-09-25', 2, 'Sovereign', false],
  ['RBI Floating Rate Savings Bond 2033', 'Reserve Bank of India', 'Floating Rate', 8.05, 8.05, 1000, '2033-01-01', 2, 'Sovereign', false],
  ['Sovereign Gold Bond 2024-25 Series I', 'Reserve Bank of India', 'SGB', 2.5, 0, 6263, '2032-02-21', 2, 'Sovereign', false],
  ['Sovereign Gold Bond 2023-24 Series IV', 'Reserve Bank of India', 'SGB', 2.5, 0, 6263, '2031-02-21', 2, 'Sovereign', false],
  ['Sovereign Gold Bond 2021-22 Series X', 'Reserve Bank of India', 'SGB', 2.5, 0, 5109, '2030-03-08', 2, 'Sovereign', false],
  ['7.35% NHAI Tax-Free Bond 2031', 'National Highways Authority of India', 'Tax-Free', 7.35, 5.6, 1000, '2031-01-11', 1, 'AAA', true],
  ['7.28% IRFC Tax-Free Bond 2030', 'Indian Railway Finance Corp', 'Tax-Free', 7.28, 5.5, 1000, '2030-12-21', 1, 'AAA', true],
  ['8.20% PFC Tax-Free Bond 2027', 'Power Finance Corporation', 'Tax-Free', 8.2, 5.3, 1000, '2027-02-01', 1, 'AAA', true],
  ['7.79% REC Ltd 2030', 'REC Ltd', 'PSU', 7.79, 7.05, 1000, '2030-05-21', 1, 'AAA', false],
  ['7.55% NABARD 2031', 'NABARD', 'PSU', 7.55, 7.0, 1000, '2031-03-28', 1, 'AAA', false],
  ['7.64% Power Finance Corp 2033', 'Power Finance Corporation', 'PSU', 7.64, 7.08, 1000, '2033-02-22', 1, 'AAA', false],
  ['7.44% NTPC Ltd 2032', 'NTPC Ltd', 'PSU', 7.44, 6.98, 1000, '2032-08-25', 1, 'AAA', false],
  ['7.75% HDFC Bank 2033', 'HDFC Bank Ltd', 'Corporate', 7.75, 7.15, 1000, '2033-06-13', 1, 'AAA', false],
  ['7.80% Bajaj Finance 2028', 'Bajaj Finance Ltd', 'Corporate', 7.8, 7.4, 1000, '2028-05-10', 1, 'AAA', false],
  ['8.10% Tata Capital 2029', 'Tata Capital Ltd', 'Corporate', 8.1, 7.6, 1000, '2029-03-15', 1, 'AAA', false],
  ['8.40% Muthoot Finance 2028', 'Muthoot Finance Ltd', 'Corporate', 8.4, 8.6, 1000, '2028-11-30', 12, 'AA+', false],
  ['9.10% Shriram Finance 2029', 'Shriram Finance Ltd', 'Corporate', 9.1, 9.2, 1000, '2029-07-18', 12, 'AA+', false],
  ['9.75% Indiabulls Housing 2027', 'Sammaan Capital Ltd', 'Corporate', 9.75, 10.4, 1000, '2027-09-28', 12, 'AA', false],
  ['10.50% Navi Finserv 2027', 'Navi Finserv Ltd', 'Corporate', 10.5, 10.9, 1000, '2027-08-15', 12, 'A', false],
];

export const GOLD_PRICE_PER_GRAM = 12450;

export function yearsBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / (365.25 * 86400000);
}

export function priceBond(bond: Pick<Bond, 'type' | 'faceValue' | 'couponRate' | 'ytm' | 'maturityDate' | 'couponFrequency'>, onDate: string): number {
  const years = yearsBetween(onDate, bond.maturityDate);
  return round(bondPrice(bond.faceValue, bond.couponRate, bond.ytm, years, bond.couponFrequency), 2);
}

const TYPE_DESCRIPTIONS: Record<BondType, string> = {
  'T-Bill': 'Zero-coupon short-term government security issued at a discount and redeemed at face value on maturity. Zero credit risk.',
  'G-Sec': 'Dated Government of India security paying semi-annual coupons. Backed by the sovereign — zero default risk, but prices move with interest rates.',
  SDL: 'State Development Loan issued by a state government. Sovereign-like safety with a small yield premium over central G-Secs.',
  'Floating Rate': 'RBI Floating Rate Savings Bond whose coupon resets every six months at 0.35% above the NSC rate. Non-tradable, held to maturity.',
  SGB: 'Sovereign Gold Bond denominated in grams of gold. Earns 2.5% annual interest on the issue price plus gold price appreciation; maturity proceeds are tax-free for individuals.',
  'Tax-Free': 'Tax-free bond issued by a public sector entity. Interest is fully exempt from income tax, making the effective yield attractive for high tax brackets.',
  PSU: 'Bond issued by a public sector undertaking with quasi-sovereign backing and high credit ratings.',
  Corporate: 'Non-convertible debenture issued by a private company. Higher yields compensate for credit risk — check the rating before investing.',
};

export function buildBondCatalog(startDate: string): Bond[] {
  return BOND_SEEDS.map(([name, issuer, type, coupon, ytm, face, maturity, freq, rating, taxFree]) => {
    const maturityDate = maturity.startsWith('+') ? addDays(startDate, Number(maturity.slice(1))) : maturity;
    const base = { type, faceValue: face, couponRate: coupon, ytm, maturityDate, couponFrequency: freq };
    const price = type === 'SGB' ? GOLD_PRICE_PER_GRAM : type === 'Floating Rate' ? face : priceBond(base, startDate);
    return {
      id: `bd-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
      name,
      issuer,
      ...base,
      price,
      prevPrice: price,
      rating,
      taxFree,
      description: TYPE_DESCRIPTIONS[type],
    };
  });
}

export const BOND_TYPES: BondType[] = ['G-Sec', 'T-Bill', 'SDL', 'Corporate', 'PSU', 'Tax-Free', 'SGB', 'Floating Rate'];
