import { parseInvoiceExpiry } from '@/lib/paymentDates';
import { formatNaira, toKobo, MAX_DISPLAY_KOBO } from '@/lib/feeConfig';
import type { BranchPaymentDto, PaymentDetails, UserRole } from '@/types/payment-api';

const knownBases = new Set(['UNPAID', 'CONFIRMED_COLLECTIONS', 'UNBOUNDED_SUBSCRIPTION']);

export function getBalanceLabel(payment: Pick<PaymentDetails, 'terms' | 'remainingAmount' | 'paymentType'>): string {
  const basis = payment.terms?.balanceBasis;
  if (basis === 'UNBOUNDED_SUBSCRIPTION' && payment.paymentType === 'SUBSCRIPTION') {
    return 'Unlimited subscription (no finite balance)';
  }
  if (!basis || !knownBases.has(basis) || basis === 'UNBOUNDED_SUBSCRIPTION') return 'Unknown balance';
  const value = payment.terms ? payment.terms.remainingAmount : payment.remainingAmount;
  return toKobo(value) == null ? 'Unknown balance' : formatNaira(value);
}

export function getConfirmedLabel(payment: Pick<PaymentDetails, 'terms'>): string {
  if (!knownBases.has(payment.terms?.balanceBasis)) return 'Unknown';
  return formatNaira(payment.terms?.confirmedAmount);
}

export function getInstallmentProgress(payment: Pick<PaymentDetails,
  'amount' | 'downPayment' | 'terms' | 'paymentType' | 'numberOfPayments' | 'completedPayments'>) {
  const basis = payment.terms?.balanceBasis;
  if (payment.paymentType !== 'INSTALLMENT' ||
      (basis !== 'UNPAID' && basis !== 'CONFIRMED_COLLECTIONS')) return null;
  const amounts = payment.terms.installmentAmounts;
  const total = amounts.length;
  const completed = payment.completedPayments;
  if (total < 1 || total > 10000 || payment.numberOfPayments !== total ||
      !Number.isInteger(completed) || completed < 0 || completed > total) return null;
  const invoice = toKobo(payment.amount);
  const confirmed = toKobo(payment.terms.confirmedAmount);
  const remaining = toKobo(payment.terms.remainingAmount);
  if (invoice == null || confirmed == null || remaining == null ||
      invoice !== confirmed + remaining || (basis === 'UNPAID' && confirmed !== 0n)) return null;
  const schedule: bigint[] = [];
  let scheduleSum = 0n;
  for (const amount of amounts) {
    const cents = toKobo(amount);
    if (cents == null || cents < 1n) return null;
    schedule.push(cents);
    scheduleSum += cents;
  }
  const down = invoice - scheduleSum;
  if (down < 1n || (payment.downPayment != null && toKobo(payment.downPayment) !== down)) return null;
  const low = schedule.reduce((minimum, amount) => amount < minimum ? amount : minimum);
  if (schedule.some(amount => amount !== low && amount !== low + 1n)) return null;
  const highCount = schedule.filter(amount => amount === low + 1n).length;
  const lowCount = total - highCount;
  let verifiedCount: number | null = null;
  // The API exposes aggregate confirmed money, not collection slots. Due installments
  // may be collected out of order and before the down payment. Only show a count
  // when exactly one count can explain the ledger total under either possibility.
  for (let count = 0; count <= total; count++) {
    const minimum = BigInt(count) * low + BigInt(Math.max(0, count - lowCount));
    const maximum = BigInt(count) * low + BigInt(Math.min(count, highCount));
    const possible = (value: bigint) => value >= minimum && value <= maximum;
    if (possible(confirmed) || possible(confirmed - down)) {
      if (verifiedCount !== null) return null;
      verifiedCount = count;
    }
  }
  if (verifiedCount === null || verifiedCount !== completed) return null;
  return {
    completed: verifiedCount, total, percent: Math.round(verifiedCount / total * 100),
    label: verifiedCount + ' of ' + total + ' confirmed installments (down payment separate)',
  };
}

export function summarizePayments(payments: Pick<PaymentDetails, 'terms' | 'paymentType' | 'remainingAmount'>[]) {
  let confirmed = 0n;
  let remaining = 0n;
  let unknownCount = 0;
  let subscriptionCount = 0;
  let confirmedUnknown = false;
  for (const payment of payments) {
    const basis = payment.terms?.balanceBasis;
    const amount = knownBases.has(basis) ? toKobo(payment.terms?.confirmedAmount) : null;
    if (amount == null) confirmedUnknown = true;
    else confirmed += amount;
    if (payment.paymentType === 'SUBSCRIPTION' && basis === 'UNBOUNDED_SUBSCRIPTION') {
      subscriptionCount++;
      continue;
    }
    const balance = basis && knownBases.has(basis) ? toKobo(payment.terms?.remainingAmount) : null;
    if (balance == null) unknownCount++;
    else remaining += balance;
  }
  const limit = MAX_DISPLAY_KOBO;
  return {
    confirmedAmount: confirmedUnknown || confirmed > limit ? null : Number(confirmed) / 100,
    remainingAmount: unknownCount > 0 || remaining > limit ? null : Number(remaining) / 100,
    unknownCount, subscriptionCount,
  };
}

export const canManagePaymentPlan = (role: UserRole | undefined) => role === 'PARENT';
export const canCreatePayment = canManagePaymentPlan;
export const canQueryPayment = (role: UserRole | undefined) =>
  role === 'PARENT' || role === 'BRANCH_ADMIN' || role === 'SUPER_ADMIN';
export const canCancelSubscription = (role: UserRole | undefined,
  payment: Pick<PaymentDetails, 'paymentType' | 'status'>) =>
  role === 'PARENT' && payment.paymentType === 'SUBSCRIPTION' &&
  (payment.status === 'PENDING' || payment.status === 'ACTIVE');

export function normalizeBranchPayment(payment: BranchPaymentDto): PaymentDetails {
  const { type, ...fields } = payment;
  return { ...fields, paymentType: type };
}

export function getInstructionStatus(payment: Pick<PaymentDetails, 'virtualAccountExpiryDate'>, now = Date.now()) {
  const deadline = parseInvoiceExpiry(payment.virtualAccountExpiryDate);
  return deadline == null ? 'Unavailable' : deadline <= now ? 'Expired' : 'Open';
}
