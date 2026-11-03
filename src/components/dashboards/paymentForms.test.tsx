import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SwitchPlanModal from './SwitchPlanModal';
import CreatePaymentModal from './CreatePaymentModal';
import type { UserRole } from '@/types/payment-api';

const mocks = vi.hoisted(() => ({ role: 'PARENT' as UserRole, post: vi.fn(), put: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: mocks.role } }) }));
vi.mock('@/lib/axiosConfig', () => ({ default: { post: mocks.post, put: mocks.put } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
// Native select controls keep these tests focused on request validation and payloads.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value?: string; onValueChange: (value: string) => void; children: ReactNode }) => <select value={value ?? ''} onChange={(event) => onValueChange(event.target.value)} aria-label="Select option"><option value="">Choose</option>{children}</select>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

beforeEach(() => { mocks.role = 'PARENT'; mocks.post.mockReset(); mocks.put.mockReset(); mocks.success.mockReset(); mocks.error.mockReset(); });
afterEach(cleanup);

describe('plan change requests', () => {
  it('requires subscription frequency and preserves saved bank details by omitting replacements', async () => {
    const onSuccess = vi.fn();
    mocks.put.mockResolvedValue({ data: 'Payment Plan updated successfully.' });
    render(<SwitchPlanModal isOpen onClose={vi.fn()} studentId={7} studentName="Demo Student" onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('radio', { name: /^Subscription/ }));
    expect(screen.getByRole('button', { name: 'Confirm Switch' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'MONTHLY' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Switch' }));
    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith('/payments/students/7/switch-plan', { newPaymentType: 'SUBSCRIPTION', frequency: 'MONTHLY' }));
    expect(onSuccess).toHaveBeenCalledWith({ newPaymentType: 'SUBSCRIPTION', frequency: 'MONTHLY' });
  });

  it('sends canonical numberOfInstallments and an explicit recurring frequency', async () => {
    mocks.put.mockResolvedValue({ data: 'updated' });
    render(<SwitchPlanModal isOpen onClose={vi.fn()} studentId={7} studentName="Demo Student" onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: /^Installment Payment/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DAILY' } });
    fireEvent.change(screen.getByLabelText('Installment count (after down payment)'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Switch' }));
    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith('/payments/students/7/switch-plan', { newPaymentType: 'INSTALLMENT', frequency: 'DAILY', numberOfInstallments: 3 }));
  });

  it.each(['BRANCH_ADMIN', 'SUPER_ADMIN'] as const)('blocks %s from changing a plan even if the modal is mounted', (role) => {
    mocks.role = role;
    render(<SwitchPlanModal isOpen onClose={vi.fn()} studentId={7} studentName="Demo Student" onSuccess={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Confirm Switch' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Switch' }));
    expect(mocks.put).not.toHaveBeenCalled();
  });
});

describe('ad-hoc invoices', () => {
  it('requires a positive two-decimal amount and sends the chosen amount instead of a hardcoded fee', async () => {
    const response = { paymentDetails: { paymentType: 'SINGLE_PAYMENT', amount: 12.34 } };
    const onSuccess = vi.fn();
    mocks.post.mockResolvedValue({ data: response });
    render(<CreatePaymentModal isOpen onClose={vi.fn()} studentId={7} studentName="Demo Student" onSuccess={onSuccess} />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'BOOKS' } });
    for (const amount of ['0', '-1', '12.345', '90071992547409.92', '90071992547409.91']) {
      fireEvent.change(screen.getByLabelText('Amount (NGN)'), { target: { value: amount } });
      expect(screen.getByRole('button', { name: 'Generate Invoice' })).toBeDisabled();
    }
    fireEvent.change(screen.getByLabelText('Amount (NGN)'), { target: { value: '12.34' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Invoice' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/payments/new', { studentId: 7, category: 'ADHOC_PAYMENT', amount: 12.34, paymentType: 'SINGLE_PAYMENT', description: 'Books' }));
    expect(onSuccess).toHaveBeenCalledWith(response);
  });

  it('requires subscription frequency and sends a per-cycle ad-hoc invoice request', async () => {
    mocks.post.mockResolvedValue({ data: { paymentDetails: { paymentType: 'SUBSCRIPTION', amount: 25 } } });
    render(<CreatePaymentModal isOpen onClose={vi.fn()} studentId={7} studentName="Demo Student" onSuccess={vi.fn()} />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'BOOKS' } });
    fireEvent.change(screen.getByLabelText('Amount (NGN)'), { target: { value: '25.00' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'SUBSCRIPTION' } });
    expect(screen.getByRole('button', { name: 'Generate Invoice' })).toBeDisabled();
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'WEEKLY' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Invoice' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/payments/new', { studentId: 7, category: 'ADHOC_PAYMENT', amount: 25, paymentType: 'SUBSCRIPTION', frequency: 'WEEKLY', description: 'Books' }));
  });
});