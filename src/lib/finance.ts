/** Future value of a monthly SIP paid at the start of each month. */
export function sipFutureValue(monthly: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  const r = annualRatePct / 100 / 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

export function lumpsumFutureValue(principal: number, annualRatePct: number, years: number): number {
  return principal * Math.pow(1 + annualRatePct / 100, years);
}

/** SIP where the monthly amount increases by stepUpPct every 12 months. */
export function stepUpSipFutureValue(
  monthly: number,
  annualRatePct: number,
  years: number,
  stepUpPct: number,
): { invested: number; value: number } {
  const r = annualRatePct / 100 / 12;
  let value = 0;
  let invested = 0;
  let amount = monthly;
  const months = Math.round(years * 12);
  for (let m = 0; m < months; m++) {
    if (m > 0 && m % 12 === 0) amount *= 1 + stepUpPct / 100;
    value = (value + amount) * (1 + r);
    invested += amount;
  }
  return { invested, value };
}

/** Monthly SIP required to reach `target` in `years`. */
export function requiredMonthlySip(target: number, annualRatePct: number, years: number): number {
  if (years <= 0) return target;
  const factor = sipFutureValue(1, annualRatePct, years);
  return factor > 0 ? target / factor : target;
}

/** Systematic withdrawal plan simulation. Returns the yearly balance path. */
export function swpSchedule(
  corpus: number,
  monthlyWithdrawal: number,
  annualRatePct: number,
  years: number,
): { year: number; balance: number; withdrawn: number }[] {
  const r = annualRatePct / 100 / 12;
  let balance = corpus;
  let withdrawn = 0;
  const out: { year: number; balance: number; withdrawn: number }[] = [];
  for (let m = 1; m <= Math.round(years * 12); m++) {
    if (balance <= 0) {
      balance = 0;
    } else {
      const w = Math.min(monthlyWithdrawal, balance);
      balance -= w;
      withdrawn += w;
      balance *= 1 + r;
    }
    if (m % 12 === 0) out.push({ year: m / 12, balance, withdrawn });
  }
  return out;
}

/** Fixed deposit maturity with compounding `perYear` times a year. */
export function fdMaturity(principal: number, annualRatePct: number, years: number, perYear = 4): number {
  return principal * Math.pow(1 + annualRatePct / 100 / perYear, perYear * years);
}

/** Recurring deposit maturity (quarterly compounding, as used by Indian banks). */
export function rdMaturity(monthly: number, annualRatePct: number, years: number): number {
  const months = Math.round(years * 12);
  const qr = annualRatePct / 100 / 4;
  let total = 0;
  for (let i = 0; i < months; i++) {
    const remainingMonths = months - i;
    total += monthly * Math.pow(1 + qr, remainingMonths / 3);
  }
  return total;
}

/** PPF: yearly contributions, annual compounding. */
export function ppfMaturity(yearly: number, annualRatePct: number, years = 15): number {
  const r = annualRatePct / 100;
  let balance = 0;
  for (let y = 0; y < years; y++) balance = (balance + yearly) * (1 + r);
  return balance;
}

export function emi(principal: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  const r = annualRatePct / 100 / 12;
  if (n <= 0) return principal;
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
}

export function cagr(start: number, end: number, years: number): number {
  if (start <= 0 || years <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

export function inflate(amount: number, inflationPct: number, years: number): number {
  return amount * Math.pow(1 + inflationPct / 100, years);
}

/** Corpus required at retirement to fund inflation-adjusted expenses until life expectancy. */
export function retirementCorpus(
  monthlyExpenseToday: number,
  currentAge: number,
  retirementAge: number,
  lifeExpectancy: number,
  inflationPct: number,
  postRetirementReturnPct: number,
): number {
  const yearsToRetire = Math.max(0, retirementAge - currentAge);
  const yearsInRetirement = Math.max(1, lifeExpectancy - retirementAge);
  const annualExpenseAtRetirement = inflate(monthlyExpenseToday * 12, inflationPct, yearsToRetire);
  const realRate = (1 + postRetirementReturnPct / 100) / (1 + inflationPct / 100) - 1;
  if (Math.abs(realRate) < 1e-9) return annualExpenseAtRetirement * yearsInRetirement;
  // Present value of a growing annuity paid at start of each year
  return annualExpenseAtRetirement * ((1 - Math.pow(1 + realRate, -yearsInRetirement)) / realRate) * (1 + realRate);
}

/** Bond dirty-ish price (per face value) from yield; cash-flow discounting. */
export function bondPrice(
  faceValue: number,
  couponRatePct: number,
  ytmPct: number,
  yearsToMaturity: number,
  frequency: number,
): number {
  if (yearsToMaturity <= 0) return faceValue;
  if (frequency === 0) return faceValue / Math.pow(1 + ytmPct / 100, yearsToMaturity);
  const periods = Math.max(1, Math.ceil(yearsToMaturity * frequency - 1e-9));
  const y = ytmPct / 100 / frequency;
  const c = (faceValue * couponRatePct) / 100 / frequency;
  const firstPeriodFraction = yearsToMaturity * frequency - (periods - 1);
  let pv = 0;
  for (let k = 0; k < periods; k++) {
    const t = firstPeriodFraction + k;
    pv += c / Math.pow(1 + y, t);
  }
  pv += faceValue / Math.pow(1 + y, firstPeriodFraction + periods - 1);
  return pv;
}

/** Abramowitz-Stegun approximation of the standard normal CDF. */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

export function normPdf(x: number): number {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}

export interface OptionGreeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // per calendar day
  vega: number; // per 1% IV
}

/** Black-Scholes price and greeks for European options. */
export function blackScholes(
  kind: 'CE' | 'PE',
  spot: number,
  strike: number,
  years: number,
  ratePct: number,
  ivPct: number,
): OptionGreeks {
  const r = ratePct / 100;
  const sigma = Math.max(ivPct / 100, 0.0001);
  const T = Math.max(years, 1e-6);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (r + (sigma * sigma) / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const disc = Math.exp(-r * T);
  const gamma = normPdf(d1) / (spot * sigma * sqrtT);
  const vega = (spot * normPdf(d1) * sqrtT) / 100;
  if (kind === 'CE') {
    const price = spot * normCdf(d1) - strike * disc * normCdf(d2);
    const theta = (-(spot * normPdf(d1) * sigma) / (2 * sqrtT) - r * strike * disc * normCdf(d2)) / 365;
    return { price: Math.max(price, 0), delta: normCdf(d1), gamma, theta, vega };
  }
  const price = strike * disc * normCdf(-d2) - spot * normCdf(-d1);
  const theta = (-(spot * normPdf(d1) * sigma) / (2 * sqrtT) + r * strike * disc * normCdf(-d2)) / 365;
  return { price: Math.max(price, 0), delta: normCdf(d1) - 1, gamma, theta, vega };
}
