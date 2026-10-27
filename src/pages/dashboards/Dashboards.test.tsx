import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render as renderView, screen, waitFor } from '@testing-library/react';
import type { Branch, BranchPaymentDto, BranchStudentDto, ParentStudentDto, PaymentDetails, PaymentTerms, RegisterStudentResponse, SwitchPlanRequest } from '@/types/payment-api';
import ParentDashboard from './ParentDashboard';
import BranchAdminDashboard from './BranchAdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(),
  error: vi.fn(), success: vi.fn(),
  user: { email: 'parent@example.test', firstName: 'Demo', role: 'PARENT' as 'PARENT' | 'BRANCH_ADMIN' | 'SUPER_ADMIN', branchId: 7 as number | undefined },
}));
vi.mock('@/lib/axiosConfig', () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/usePaymentPolling', () => ({ usePaymentPolling: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/components/DashboardLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/LoadingScreen', () => ({ default: () => <p>Loading</p> }));
vi.mock('@/components/dashboards/PaymentDetailsModal', () => ({
  default: ({ isOpen, payment }: { isOpen: boolean; payment: PaymentDetails | null }) => isOpen ? <div role="dialog">Read-only details for {payment?.onePipePaymentId ?? 'missing provider ID'}</div> : null,
}));
vi.mock('@/components/dashboards/CreatePaymentModal', () => ({ default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div>Ad-hoc creation</div> : null }));
vi.mock('@/components/dashboards/InvoiceSuccessModal', () => ({ default: () => null }));
vi.mock('@/components/dashboards/SwitchPlanModal', () => ({
  default: ({ isOpen, onSuccess, onClose }: { isOpen: boolean; onSuccess: (plan: SwitchPlanRequest) => void; onClose: () => void }) => isOpen ? <button onClick={() => { onSuccess({ newPaymentType: 'INSTALLMENT', frequency: 'WEEKLY', numberOfInstallments: 3 }); onClose(); }}>Save verified plan</button> : null,
}));

const renderDashboard = (view: ReactElement) => renderView(<MemoryRouter>{view}</MemoryRouter>);

const terms = (changes: Partial<PaymentTerms> = {}): PaymentTerms => ({
  currency: 'NGN', amountPerCycle: null, installmentAmounts: [], frequency: null,
  firstBillingDate: null, endDate: null, remainingAmount: 100000,
  balanceBasis: 'UNPAID', confirmedAmount: 0, ...changes,
});
const child: ParentStudentDto = { id: 11, firstName: 'Synthetic', surname: 'Student', classGrade: 'JSS1', branchName: 'Demo Branch', pendingAmount: null };
const student: BranchStudentDto = { id: 11, firstName: 'Synthetic', surname: 'Student', classGrade: 'JSS1', parentEmail: 'parent@example.test', parentFullName: 'Demo Parent', paymentType: 'INSTALLMENT', status: 'ACTIVE' };
const payment: PaymentDetails = { onePipePaymentId: 'mock-provider-reference', amount: 100000, description: 'Demo tuition plan', status: 'PENDING', paymentType: 'INSTALLMENT', numberOfPayments: 3, completedPayments: 0, remainingAmount: 50000, terms: terms({ installmentAmounts: [16666.67, 16666.67, 16666.66], frequency: 'WEEKLY', remainingAmount: 50000 }) };
const branchPayment: BranchPaymentDto = { id: 99, studentName: 'Synthetic Student', description: 'Demo tuition plan', amount: 100000, remainingAmount: 50000, type: 'INSTALLMENT', numberOfPayments: 3, completedPayments: 0, terms: payment.terms ?? null, status: 'PENDING', date: '2026-10-27' };
const branch: Branch = { id: 7, businessName: 'Demo Branch', branchCode: 'DEMO', address: 'Synthetic address' };

beforeEach(() => {
  mocks.get.mockReset(); mocks.post.mockReset(); mocks.error.mockReset(); mocks.success.mockReset();
  mocks.user.role = 'PARENT'; mocks.user.branchId = 7;
  mocks.get.mockImplementation(async (url: string) => {
    if (url.startsWith('/students?parentEmail=')) return { data: [child] };
    if (url === '/students?branchId=7') return { data: [student] };
    if (url === '/payments?studentId=11') return { data: [payment] };
    if (url === '/payments?branchId=7') return { data: [branchPayment] };
    if (url === '/branches') return { data: [branch] };
    if (url === '/super-admin/stats') return { data: { totalBranches: 1, totalStudents: 1, totalRevenue: 1234.56, activePayments: 1 } };
    throw new Error('Unsupported dashboard API request');
  });
});
afterEach(cleanup);

describe('parent dashboard API alignment', () => {
  it('does not guess the saved school-fee plan or submit a hardcoded amount', async () => {
    const invoice: RegisterStudentResponse = { paymentDetails: { amount: 100000, paymentType: 'INSTALLMENT', terms: payment.terms } };
    mocks.post.mockResolvedValue({ data: invoice });
    renderDashboard(<ParentDashboard />);
    const childLink = await screen.findByRole('link', { name: 'Register Another Child' });
    expect(childLink).toHaveAttribute('href', '/register');
    fireEvent.click(await screen.findByText('View Payments'));
    fireEvent.click(await screen.findByRole('button', { name: 'Choose School-Fee Plan' }));
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save verified plan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Generate Invoice for School Fees' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/payments/new', {
      studentId: 11, category: 'SCHOOL_FEES', paymentType: 'INSTALLMENT',
      frequency: 'WEEKLY', numberOfInstallments: 3, description: 'School Fees Payment',
    }));
    expect(mocks.post.mock.calls[0][1]).not.toHaveProperty('amount');
    expect(mocks.success).toHaveBeenCalledWith(expect.stringContaining('No payment has been confirmed'));
  });

  it('keeps unknown balances unknown and hides unverified historical installment counters', async () => {
    const unknown: PaymentDetails = { ...payment, status: 'ACTIVE', completedPayments: 3, remainingAmount: null, terms: terms({ remainingAmount: null, confirmedAmount: null, balanceBasis: 'UNKNOWN' }) };
    mocks.get.mockImplementation(async (url: string) => ({ data: url.startsWith('/students?') ? [child] : [unknown] }));
    renderDashboard(<ParentDashboard />);
    fireEvent.click(await screen.findByText('View Payments'));
    await screen.findByText('Demo tuition plan');
    expect(screen.getByText('Unknown balance')).toBeInTheDocument();
    expect(screen.queryByText(/3 of 3 confirmed installments/)).not.toBeInTheDocument();
    expect(screen.getByText('Some balances lack verified accounting evidence.')).toBeInTheDocument();
  });

  it('gives business-conflict guidance without claiming invoice success', async () => {
    mocks.post.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'An ongoing school fees payment prevents this operation' } } });
    renderDashboard(<ParentDashboard />);
    fireEvent.click(await screen.findByText('View Payments'));
    fireEvent.click(await screen.findByRole('button', { name: 'Choose School-Fee Plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save verified plan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Generate Invoice for School Fees' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Refresh the details')));
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('ignores a late child A response after navigating back and selecting child B', async () => {
    const childA: ParentStudentDto = { ...child, id: 11, firstName: 'Alpha' };
    const childB: ParentStudentDto = { ...child, id: 12, firstName: 'Beta' };
    const paymentA: PaymentDetails = { ...payment, onePipePaymentId: 'provider-alpha', description: 'Alpha payment' };
    const paymentB: PaymentDetails = { ...payment, onePipePaymentId: 'provider-beta', description: 'Beta payment' };
    let releaseChildA: (response: { data: PaymentDetails[] }) => void = () => { throw new Error('Deferred response was not initialized'); };
    const lateChildA = new Promise<{ data: PaymentDetails[] }>(resolve => { releaseChildA = resolve; });
    let childAReads = 0;
    mocks.get.mockImplementation(async (url: string) => {
      if (url.startsWith('/students?parentEmail=')) return { data: [childA, childB] };
      if (url === '/payments?studentId=11') {
        childAReads++;
        // First read is the overview summary; defer only the detail read.
        if (childAReads === 2) return lateChildA;
        return { data: [] };
      }
      if (url === '/payments?studentId=12') return { data: [paymentB] };
      throw new Error('Unsupported dashboard API request');
    });
    renderDashboard(<ParentDashboard />);
    fireEvent.click(await screen.findByText('Alpha Student'));
    fireEvent.click(screen.getByRole('button', { name: 'Back to Children' }));
    fireEvent.click(await screen.findByText('Beta Student'));
    expect(await screen.findByText('Beta payment')).toBeInTheDocument();
    await act(async () => {
      releaseChildA({ data: [paymentA] });
      await lateChildA;
    });
    expect(screen.queryByText('Alpha payment')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Beta payment'));
    expect(screen.getByRole('dialog')).toHaveTextContent('provider-beta');
  });
  it.each(['BRANCH_ADMIN', 'SUPER_ADMIN'] as const)('does not expose parent financial actions to %s', async role => {
    mocks.user.role = role;
    renderDashboard(<ParentDashboard />);
    fireEvent.click(await screen.findByText('View Payments'));
    await screen.findByText('Demo tuition plan');
    expect(screen.queryByRole('link', { name: 'Register Another Child' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AD-HOC Payments' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Switch Plan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose School-Fee Plan' })).not.toBeInTheDocument();
  });
});

describe('administrative dashboard API alignment', () => {
  it('reads authorized student detail to obtain the provider ID and offers no parent actions', async () => {
    mocks.user.role = 'BRANCH_ADMIN';
    renderDashboard(<BranchAdminDashboard />);
    fireEvent.click(await screen.findByRole('button', { name: 'View payments for Synthetic Student' }));
    fireEvent.click(await screen.findByText('Demo tuition plan'));
    expect(await screen.findByRole('dialog')).toHaveTextContent('mock-provider-reference');
    expect(mocks.get).toHaveBeenCalledWith('/payments?branchId=7');
    expect(mocks.get).toHaveBeenCalledWith('/payments?studentId=11');
    expect(screen.queryByRole('button', { name: /AD-HOC|Generate Invoice|Switch Plan/ })).not.toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('does not send undefined branch identifiers when authentication lacks a branch', async () => {
    mocks.user.role = 'BRANCH_ADMIN'; mocks.user.branchId = undefined;
    renderDashboard(<BranchAdminDashboard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('assigned branch');
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('uses branch-scoped payment reads and the backend ledger revenue without inferred additions', async () => {
    mocks.user.role = 'SUPER_ADMIN';
    renderDashboard(<SuperAdminDashboard />);
    await screen.findByText('Demo Branch (DEMO)');
    expect(mocks.get).toHaveBeenCalledWith('/payments?branchId=7');
    expect(mocks.get).not.toHaveBeenCalledWith('/payments');
    expect(screen.getByText(/1,234\.56/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /AD-HOC|Generate Invoice|Switch Plan|Simulate|Payment success/i })).not.toBeInTheDocument();
  });

  it('keeps missing branch accounting unknown instead of displaying a zero balance', async () => {
    mocks.user.role = 'SUPER_ADMIN';
    const original = mocks.get.getMockImplementation();
    mocks.get.mockImplementation(async (url: string) => {
      if (url === '/payments?branchId=7') return { data: [{ ...branchPayment, remainingAmount: null, terms: terms({ remainingAmount: null, confirmedAmount: null, balanceBasis: 'UNKNOWN' }) }] };
      return original?.(url);
    });
    renderDashboard(<SuperAdminDashboard />);
    expect(await screen.findByText('Outstanding finite balances: Unknown')).toBeInTheDocument();
    expect(screen.getByText('Confirmed collections: Unknown')).toBeInTheDocument();
  });
});