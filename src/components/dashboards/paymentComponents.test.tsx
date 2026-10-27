import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import PaymentDetailsModal from './PaymentDetailsModal';
import InvoiceSuccessModal from './InvoiceSuccessModal';
import PaymentSuccessCard from '@/components/PaymentSuccessCard';
import type { PaymentDetails, PaymentQueryResponse, RegisterStudentResponse, UserRole } from '@/types/payment-api';

const mocks = vi.hoisted(() => ({
  role: null as UserRole | null,
  post: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.role ? { role: mocks.role } : null }) }));
vi.mock('@/lib/axiosConfig', () => ({ default: { post: mocks.post } }));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError } }));

const terms = {
  currency: 'NGN' as const, amountPerCycle: 26.67, installmentAmounts: [26.67, 26.67, 26.66],
  frequency: 'MONTHLY' as const, firstBillingDate: '2026-11-27T09:30:00', endDate: null,
  remainingAmount: 80, balanceBasis: 'CONFIRMED_COLLECTIONS' as const, confirmedAmount: 20,
};
const payment: PaymentDetails = {
  onePipePaymentId: 'mock-test-invoice', description: 'School fees', amount: 100, downPayment: 20,
  status: 'ACTIVE', paymentType: 'INSTALLMENT', numberOfPayments: 3, completedPayments: 0,
  remainingAmount: 80, terms, virtualAccountNumber: '0000000001', virtualAccountBankName: 'Demo Bank',
  virtualAccountExpiryDate: '2020-01-01 13:00:00',
};
const registration: RegisterStudentResponse = {
  studentName: 'Demo Student', paymentDetails: {
    amount: 100, downPayment: 20, paymentType: 'INSTALLMENT', terms,
    onePipePaymentId: 'mock-test-invoice', accountNumber: '0000000001', bankName: 'Demo Bank',
  },
};

beforeEach(() => { mocks.role = 'PARENT'; mocks.post.mockReset(); mocks.toastSuccess.mockReset(); mocks.toastError.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('safe invoice presentation', () => {
  it('shows exact returned installments including the final rounding amount without claiming collection', async () => {
    vi.useFakeTimers();
    mocks.role = null;
    render(<MemoryRouter><PaymentSuccessCard studentName="Demo Student" paymentDetails={registration.paymentDetails} /></MemoryRouter>);
    expect(screen.getByText('Registration Complete')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('OFFLINE DEMO');
    expect(screen.getByLabelText('Exact installment schedule').lastElementChild).toHaveTextContent('Installment 3 (final)');
    expect(screen.getByLabelText('Exact installment schedule').lastElementChild).toHaveTextContent('26.66');
    expect(screen.getByText(/2026-11-27 09:30:00 \(Africa\/Lagos\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /login to view/i })).toHaveAttribute('href', '/login');
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /success|pay|transfer|confirm/i })).not.toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('shows an invoice creation notice without inventing a payment status or a receipt', () => {
    render(<InvoiceSuccessModal isOpen onClose={vi.fn()} data={registration} />);
    expect(screen.getByRole('heading', { name: 'Demo Invoice Created' })).toBeInTheDocument();
    expect(screen.getByText(/Invoice creation does not confirm payment/)).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Do not transfer money');
    expect(screen.queryByRole('button', { name: /copy|pay|success/i })).not.toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

describe('ledger and lifecycle displays', () => {
  it('keeps unknown balances unknown and does not turn historical counters into verified progress', () => {
    render(<PaymentDetailsModal isOpen onClose={vi.fn()} payment={{ ...payment, virtualAccountExpiryDate: 'unparseable', completedPayments: 3, remainingAmount: null, terms: { ...terms, confirmedAmount: null, remainingAmount: null, balanceBasis: 'UNKNOWN' } }} />);
    expect(screen.getByText('Unknown balance')).toBeInTheDocument();
    expect(screen.getByText(/Invoice window expiry: Unavailable/)).toBeInTheDocument();
    expect(screen.getByText('Unknown', { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText(/Historical payment counters are not collection evidence/)).toBeInTheDocument();
  });

  it('separates a collected down payment and expired instructions from installment completion and plan status', () => {
    render(<PaymentDetailsModal isOpen onClose={vi.fn()} payment={payment} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText(/0 of 3 confirmed installments \(down payment separate\)/)).toBeInTheDocument();
    expect(screen.getByText(/Expired payment instructions:/)).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText(/does not cancel an installment plan or subscription/)).toBeInTheDocument();
  });

  it('uses Lagos expiry time regardless of the browser timezone', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T11:30:00Z'));
    render(<PaymentDetailsModal isOpen onClose={vi.fn()} payment={{ ...payment, virtualAccountExpiryDate: '2030-01-01 12:00:00' }} />);
    // 12:00 Lagos is 11:00 UTC, so the window has already expired.
    expect(screen.getByText(/Expired payment instructions: 2030-01-01 12:00:00 \(Africa\/Lagos\)/)).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('handles nullable legacy plan type and status without inventing financial evidence', () => {
    render(<PaymentDetailsModal isOpen onClose={vi.fn()} payment={{ ...payment, paymentType: null, status: null, terms: null, remainingAmount: null }} />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('Unknown balance')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel Subscription' })).not.toBeInTheDocument();
  });
  it('shows unlimited subscriptions without displaying a zero balance', () => {
    render(<PaymentDetailsModal isOpen onClose={vi.fn()} payment={{ ...payment, paymentType: 'SUBSCRIPTION', status: 'CANCELLED', remainingAmount: null, terms: { ...terms, remainingAmount: null, balanceBasis: 'UNBOUNDED_SUBSCRIPTION' } }} />);
    expect(screen.getByText('Unlimited subscription (no finite balance)')).toBeInTheDocument();
    expect(screen.getByText(/This subscription is cancelled/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel Subscription' })).not.toBeInTheDocument();
  });
});

describe('payment query and action permissions', () => {
  it.each(['BRANCH_ADMIN', 'SUPER_ADMIN'] as const)('allows %s read-only queries while hiding parent cancellation', async (role) => {
    mocks.role = role;
    const onRefresh = vi.fn();
    const response: PaymentQueryResponse = {
      status: 'PENDING', requestRef: null, transactionRef: null, onePipePaymentId: 'mock-test-invoice', message: null,
      confirmedAmount: 0, remainingAmount: null, balanceBasis: 'UNBOUNDED_SUBSCRIPTION',
      invoiceWindowStatus: 'NOT_APPLICABLE', providerAvailability: 'UNAVAILABLE', providerStatus: 'UNKNOWN',
      providerStateConsistent: null, localStateConsistent: true,
    };
    mocks.post.mockResolvedValue({ data: response });
    render(<PaymentDetailsModal isOpen onClose={vi.fn()} onCancelSuccess={onRefresh} payment={{ ...payment, paymentType: 'SUBSCRIPTION', status: 'PENDING' }} />);
    expect(screen.queryByRole('button', { name: 'Cancel Subscription' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Query payment (read-only)' }));
    await waitFor(() => expect(screen.getByLabelText('Read-only reconciliation diagnostics')).toHaveTextContent('Provider availability: UNAVAILABLE'));
    expect(mocks.post).toHaveBeenCalledWith('/payments/mock-test-invoice/query');
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Read-only payment query completed. No payment state was changed.');
    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('accepts idempotent cancellation success and hides the action once refreshed as cancelled', async () => {
    const onClose = vi.fn(); const onRefresh = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    // The endpoint also returns success when an already-cancelled plan is submitted from stale UI.
    mocks.post.mockResolvedValue({ data: 'Subscription cancelled successfully' });
    const { rerender } = render(<PaymentDetailsModal isOpen onClose={onClose} onCancelSuccess={onRefresh} payment={{ ...payment, paymentType: 'SUBSCRIPTION', status: 'ACTIVE' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Subscription' }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
    expect(mocks.toastError).not.toHaveBeenCalled();
    rerender(<PaymentDetailsModal isOpen onClose={onClose} onCancelSuccess={onRefresh} payment={{ ...payment, paymentType: 'SUBSCRIPTION', status: 'CANCELLED' }} />);
    expect(screen.queryByRole('button', { name: 'Cancel Subscription' })).not.toBeInTheDocument();
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });
  it('keeps subscription details unchanged after a 409 cancellation conflict', async () => {
    const onClose = vi.fn(); const onRefresh = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    const error = new AxiosError('conflict', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409, statusText: 'Conflict', headers: {}, config: { headers: new AxiosHeaders() }, data: { message: 'internal payment identifier' } });
    mocks.post.mockRejectedValue(error);
    render(<PaymentDetailsModal isOpen onClose={onClose} onCancelSuccess={onRefresh} payment={{ ...payment, paymentType: 'SUBSCRIPTION', status: 'ACTIVE' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Subscription' }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(expect.stringContaining('conflicts with existing account or payment state')));
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });
});