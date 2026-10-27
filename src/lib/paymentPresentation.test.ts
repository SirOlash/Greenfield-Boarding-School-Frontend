import { describe, expect, it } from 'vitest';
import { canCancelSubscription, canCreatePayment, canManagePaymentPlan, canQueryPayment,
  getBalanceLabel, getConfirmedLabel, getInstallmentProgress, getInstructionStatus,
  normalizeBranchPayment, summarizePayments } from './paymentPresentation';
import type { BranchPaymentDto, PaymentDetails, PaymentTerms, UserRole } from '@/types/payment-api';

const terms = (overrides: Partial<PaymentTerms> = {}): PaymentTerms => ({
  currency: 'NGN', amountPerCycle: 26666.67, installmentAmounts: [26666.67, 26666.67, 26666.66],
  frequency: 'MONTHLY', firstBillingDate: '2026-11-27T12:00:00', endDate: null,
  remainingAmount: 53333.33, balanceBasis: 'CONFIRMED_COLLECTIONS', confirmedAmount: 46666.67, ...overrides,
});
const payment = (overrides: Partial<PaymentDetails> = {}): PaymentDetails => ({
  amount: 100000, paymentType: 'INSTALLMENT', status: 'ACTIVE', numberOfPayments: 3,
  completedPayments: 1, terms: terms(), ...overrides,
});

describe('ledger-derived presentation', () => {
  it('never treats an explicit null remaining amount as paid or as the invoice amount', () => {
    const value = payment({ remainingAmount: 90000, terms: terms({ remainingAmount: null }) });
    expect(getBalanceLabel(value)).toBe('Unknown balance');
    expect(summarizePayments([value]).remainingAmount).toBeNull();
  });
  it('distinguishes known zero from unknown', () => {
    expect(getBalanceLabel(payment({ terms: terms({ remainingAmount: 0 }) }))).toBe('₦0.00');
    expect(getBalanceLabel(payment({ terms: null, remainingAmount: 0 }))).toBe('Unknown balance');
  });
  it('does not turn successful historical flags and counters into collection evidence', () => {
    const legacy = payment({ status: 'SUCCESSFUL', completedPayments: 3,
      terms: terms({ balanceBasis: 'UNKNOWN', confirmedAmount: null, remainingAmount: null }) });
    expect(getConfirmedLabel(legacy)).toBe('Unknown');
    expect(getInstallmentProgress(legacy)).toBeNull();
    expect(summarizePayments([legacy]).confirmedAmount).toBeNull();
  });
  it('keeps the down payment separate from confirmed recurring installments', () => {
    expect(getInstallmentProgress(payment())).toMatchObject({ completed: 1, total: 3, percent: 33 });
    expect(getInstallmentProgress(payment()).label).toContain('down payment separate');
  });
  it('accepts fresh unpaid progress only as zero confirmed installments', () => {
    expect(getInstallmentProgress(payment({ completedPayments: 0,
      terms: terms({ balanceBasis: 'UNPAID', confirmedAmount: 0, remainingAmount: 100000 }) }))).toMatchObject({ completed: 0, percent: 0 });
    expect(getInstallmentProgress(payment({ completedPayments: 1,
      terms: terms({ balanceBasis: 'UNPAID', confirmedAmount: 0, remainingAmount: 100000 }) }))).toBeNull();
  });
  it('rejects malformed progress rather than clamping counters to a plausible percentage', () => {
    expect(getInstallmentProgress(payment({ completedPayments: 4 }))).toBeNull();
    expect(getInstallmentProgress(payment({ numberOfPayments: 2 }))).toBeNull();
  });
  it('separates unlimited subscriptions from finite balances, including cancelled subscriptions', () => {
    const subscription = payment({ paymentType: 'SUBSCRIPTION', status: 'CANCELLED',
      terms: terms({ balanceBasis: 'UNBOUNDED_SUBSCRIPTION', confirmedAmount: 100000, remainingAmount: null }) });
    expect(getBalanceLabel(subscription)).toContain('Unlimited subscription');
    expect(summarizePayments([subscription])).toMatchObject({
      confirmedAmount: 100000, remainingAmount: 0, unknownCount: 0, subscriptionCount: 1,
    });
  });
  it('sums only ledger amounts and marks incomplete finite totals unknown', () => {
    expect(summarizePayments([payment(), payment()])).toMatchObject({
      confirmedAmount: 93333.34, remainingAmount: 106666.66, unknownCount: 0,
    });
    expect(summarizePayments([payment(), payment({ terms: null })])).toMatchObject({
      confirmedAmount: null, remainingAmount: null, unknownCount: 1,
    });
  });
  it('normalizes branch type without inventing a provider identifier from its numeric row ID', () => {
    const dto: BranchPaymentDto = { id: 17, studentName: 'Demo Student', description: null, amount: 100000,
      remainingAmount: 53333.33, type: 'INSTALLMENT', numberOfPayments: 3, completedPayments: 1,
      status: 'ACTIVE', date: '2026-10-27 12:00', terms: terms() };
    expect(normalizeBranchPayment(dto)).toMatchObject({ id: 17, paymentType: 'INSTALLMENT' });
    expect(normalizeBranchPayment(dto).onePipePaymentId).toBeUndefined();
  });
  it('shows account expiry without cancelling an active plan', () => {
    const active = payment({ virtualAccountExpiryDate: '2026-10-27 11:00:00' });
    expect(getInstructionStatus(active, Date.parse('2026-10-27T10:00:00Z'))).toBe('Expired');
    expect(active.status).toBe('ACTIVE');
    expect(getInstructionStatus(payment())).toBe('Unavailable');
  });
});

describe('financial action visibility', () => {
  it.each<UserRole>(['BRANCH_ADMIN', 'SUPER_ADMIN'])('retains query and excludes parent actions for %s', role => {
    expect(canManagePaymentPlan(role)).toBe(false);
    expect(canCreatePayment(role)).toBe(false);
    expect(canCancelSubscription(role, payment({ paymentType: 'SUBSCRIPTION' }))).toBe(false);
    expect(canQueryPayment(role)).toBe(true);
  });
  it('permits owning-parent controls while respecting cancellation state', () => {
    expect(canManagePaymentPlan('PARENT')).toBe(true);
    expect(canCancelSubscription('PARENT', payment({ paymentType: 'SUBSCRIPTION' }))).toBe(true);
    expect(canCancelSubscription('PARENT', payment({ paymentType: 'SUBSCRIPTION', status: 'CANCELLED' }))).toBe(false);
    expect(canQueryPayment(undefined)).toBe(false);
  });
});

describe('installment counters versus aggregate ledger evidence', () => {
  it('rejects a stale nonempty-ledger counter after a down payment only', () => {
    expect(getInstallmentProgress(payment({ completedPayments: 3,
      terms: terms({ confirmedAmount: 20000, remainingAmount: 80000 }) }))).toBeNull();
  });
  it('supports out-of-order due installments instead of assuming a schedule prefix', () => {
    expect(getInstallmentProgress(payment({ completedPayments: 1,
      terms: terms({ confirmedAmount: 46666.66, remainingAmount: 53333.34 }) })))
      .toMatchObject({ completed: 1, total: 3 });
  });
  it('does not assume the down payment must be collected first', () => {
    expect(getInstallmentProgress(payment({ completedPayments: 1,
      terms: terms({ confirmedAmount: 26666.66, remainingAmount: 73333.34 }) })))
      .toMatchObject({ completed: 1, total: 3 });
  });
  it('suppresses ambiguous counts when a down payment and an installment have the same amount', () => {
    expect(getInstallmentProgress(payment({ completedPayments: 0, numberOfPayments: 4,
      terms: terms({ installmentAmounts: [20000, 20000, 20000, 20000],
        confirmedAmount: 20000, remainingAmount: 80000 }) }))).toBeNull();
  });
  it('rejects financial totals that do not reconcile rather than displaying a verified percentage', () => {
    expect(getInstallmentProgress(payment({ terms: terms({ confirmedAmount: 20000, remainingAmount: 0 }) })))
      .toBeNull();
  });
});
