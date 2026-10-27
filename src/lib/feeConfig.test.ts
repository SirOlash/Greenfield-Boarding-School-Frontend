import { describe, expect, it } from 'vitest';
import { calculateInstallment, formatNaira, SCHOOL_FEES, toKobo } from './feeConfig';

describe('NGN display and synthetic fee previews', () => {
  it.each([[0, '₦0.00'], [100000, '₦100,000.00'], [26666.67, '₦26,666.67'], [0.01, '₦0.01']])(
    'formats %s with two decimal places', (amount, formatted) => expect(formatNaira(amount)).toBe(formatted),
  );
  it.each([null, undefined, NaN, Infinity, -1, 1.001])('does not invent a balance for %s', value => {
    expect(formatNaira(value)).toBe('Unknown');
  });
  it('uses documented synthetic backend defaults only for previews', () => {
    expect(Object.values(SCHOOL_FEES)).toEqual([100000, 110000, 120000, 130000, 140000, 150000]);
  });
  it('matches the backend rounding allocation, including the different final installment', () => {
    const preview = calculateInstallment(100000, 'MONTHLY', 3);
    expect(preview.downPayment).toBe(20000);
    expect(preview.installmentAmounts).toEqual([26666.67, 26666.67, 26666.66]);
    expect(preview.installmentAmounts.reduce((sum, amount) => sum + toKobo(amount), toKobo(preview.downPayment)))
      .toBe(10000000n);
  });
  it('rounds the down payment half up in kobo and preserves every cent', () => {
    const preview = calculateInstallment(0.03, 'DAILY', 2);
    expect(preview.downPayment).toBe(0.01);
    expect(preview.installmentAmounts).toEqual([0.01, 0.01]);
  });
  it.each([0, -1, 1.5, 10001])('rejects invalid counts rather than substituting a default: %s', count => {
    expect(() => calculateInstallment(100000, 'WEEKLY', count)).toThrow();
  });
  it('rejects a plan containing a zero collection', () => {
    expect(() => calculateInstallment(0.01, 'DAILY', 1)).toThrow();
  });
  it('refuses unsupported monetary precision instead of rounding silently', () => {
    expect(toKobo('1.001')).toBeNull();
    expect(toKobo('9007199254740992.00')).toBeNull();
    expect(formatNaira(90071992547409.9)).toBe('Unknown');
    expect(formatNaira('9999999999999.99')).toBe('₦9,999,999,999,999.99');
  });
});
