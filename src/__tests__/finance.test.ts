import { describe, expect, it } from 'vitest';
import { blackScholes, bondPrice, cagr, emi, fdMaturity, lumpsumFutureValue, ppfMaturity, rdMaturity, requiredMonthlySip, sipFutureValue, stepUpSipFutureValue, swpSchedule } from '../lib/finance';
import { addMonths, daysBetween, formatINR } from '../lib/format';

describe('investment maths', () => {
  it('SIP future value matches the standard annuity-due formula', () => {
    // ₹10,000/month, 12% p.a., 10 years ≈ ₹23.23 lakh
    expect(sipFutureValue(10000, 12, 10)).toBeCloseTo(2323391, -2);
  });

  it('step-up SIP with 0% step-up equals plain SIP', () => {
    const s = stepUpSipFutureValue(5000, 12, 10, 0);
    expect(s.value).toBeCloseTo(sipFutureValue(5000, 12, 10), 0);
    expect(s.invested).toBe(5000 * 120);
    expect(stepUpSipFutureValue(5000, 12, 10, 10).value).toBeGreaterThan(s.value);
  });

  it('required SIP inverts SIP future value', () => {
    const target = sipFutureValue(7500, 11, 15);
    expect(requiredMonthlySip(target, 11, 15)).toBeCloseTo(7500, 0);
  });

  it('lumpsum, CAGR, FD, RD, PPF and EMI', () => {
    expect(lumpsumFutureValue(100000, 10, 2)).toBeCloseTo(121000, 0);
    expect(cagr(100000, 200000, 5)).toBeCloseTo(14.87, 1);
    expect(fdMaturity(100000, 7, 1)).toBeCloseTo(107186, -1);
    expect(rdMaturity(5000, 7, 1)).toBeGreaterThan(60000);
    expect(ppfMaturity(150000, 7.1, 15)).toBeCloseTo(4068209, -3);
    expect(emi(1000000, 9, 20)).toBeCloseTo(8997, 0);
  });

  it('SWP depletes when withdrawals exceed returns', () => {
    const sched = swpSchedule(1000000, 20000, 8, 10);
    expect(sched).toHaveLength(10);
    expect(sched[sched.length - 1].balance).toBe(0);
  });

  it('bond at par when coupon equals yield', () => {
    expect(bondPrice(100, 7, 7, 10, 2)).toBeCloseTo(100, 4);
    expect(bondPrice(100, 7, 8, 10, 2)).toBeLessThan(100);
    expect(bondPrice(100, 0, 6, 1, 0)).toBeCloseTo(100 / 1.06, 2);
  });

  it('Black-Scholes satisfies put-call parity', () => {
    const S = 25000, K = 25200, T = 30 / 365, r = 6.5, iv = 14;
    const c = blackScholes('CE', S, K, T, r, iv);
    const p = blackScholes('PE', S, K, T, r, iv);
    expect(c.price - p.price).toBeCloseTo(S - K * Math.exp((-r / 100) * T), 4);
    expect(c.delta).toBeGreaterThan(0);
    expect(p.delta).toBeLessThan(0);
    expect(c.gamma).toBeCloseTo(p.gamma, 10);
  });
});

describe('formatting & dates', () => {
  it('formats rupees in the Indian numbering system', () => {
    expect(formatINR(1234567.5)).toBe('₹12,34,567.50');
  });
  it('clamps month-end dates', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-10', 1, 5)).toBe('2026-02-05');
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
  });
});
