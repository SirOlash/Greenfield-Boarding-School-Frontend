import type { Frequency } from '@/types/payment-api';

// Synthetic BACKEND DEFAULT previews only. Deployments can override these fees.
// Never submit this preview as an invoice amount; returned backend terms prevail.
export const SCHOOL_FEES: Record<string, number> = {
  JSS1: 100000, JSS2: 110000, JSS3: 120000,
  SS1: 130000, SS2: 140000, SS3: 150000,
};
export const INSTALLMENT_CONFIG = {
  downPaymentPercent: 20,
  weeklyMaxPayments: 10000,
  monthlyMaxPayments: 10000,
  maxInstallments: 10000,
};

// Decimal parsing avoids floating-point arithmetic in previews and user validation.
// Limit to 15 decimal digits in kobo: JSON numbers preserve cents in this range.
export const MAX_DISPLAY_KOBO = 999_999_999_999_999n;
export function toKobo(value: number | string | null | undefined): bigint | null {
  if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return null;
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return null;
  const kobo = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  return kobo <= MAX_DISPLAY_KOBO ? kobo : null;
}

export function formatNaira(amount: number | string | null | undefined): string {
  const kobo = toKobo(amount);
  if (kobo == null) return 'Unknown';
  const whole = (kobo / 100n).toLocaleString('en-NG');
  return '₦' + whole + '.' + (kobo % 100n).toString().padStart(2, '0');
}

export const calculateInstallment = (
  totalFee: number,
  frequency: Frequency,
  customCount = frequency === 'WEEKLY' ? 12 : 3,
) => {
  const total = toKobo(totalFee);
  if (total == null || total <= 0n) throw new Error('Enter a positive NGN amount with at most two decimals.');
  if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequency)) throw new Error('Select a recurring frequency.');
  if (!Number.isInteger(customCount) || customCount < 1 || customCount > 10000) {
    throw new Error('Choose between 1 and 10000 installments after the down payment.');
  }
  const down = (total * 20n + 50n) / 100n;
  const remaining = total - down;
  const count = BigInt(customCount);
  const base = remaining / count;
  const remainder = remaining % count;
  if (down < 1n || base < 1n) throw new Error('Each planned collection must be at least NGN 0.01.');
  const installmentAmounts = Array.from({ length: customCount }, (_, ordinal) =>
    Number(base + (BigInt(ordinal) < remainder ? 1n : 0n)) / 100);
  return {
    downPayment: Number(down) / 100,
    remainingAmount: Number(remaining) / 100,
    numberOfPayments: customCount,
    numberOfInstallments: customCount,
    amountPerPayment: installmentAmounts[0],
    installmentAmounts,
    frequency,
  };
};

// Offline demo input only. No real bank directory or transfer instructions.
export const NIGERIAN_BANKS = [{ name: 'Demo Bank (synthetic)', code: '000' }];
export const CLASS_GRADES = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'] as const;
export type ClassGrade = typeof CLASS_GRADES[number];
