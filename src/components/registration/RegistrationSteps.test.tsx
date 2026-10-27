import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ParentDetailsStep from './steps/ParentDetailsStep';
import PaymentChoiceStep from './steps/PaymentChoiceStep';
import StudentDetailsStep from './steps/StudentDetailsStep';
import { calculateInstallment } from '@/lib/feeConfig';
import type { RegistrationData } from '@/lib/registration';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/axiosConfig', () => ({ default: api }));

const data: RegistrationData = {
  branchId: 7, firstName: 'Demo', surname: 'Student', dateOfBirth: '2012-06-10', classGrade: 'JSS1',
  parentTitle: 'DR', parentFirstName: 'Demo', parentSurname: 'Parent', parentEmail: 'demo@example.invalid',
  parentPhoneNumber: '00000000000', parentPassword: 'private-test-only', paymentType: 'SINGLE_PAYMENT',
};

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('parent registration fields', () => {
  it('locks authenticated email and does not ask an existing parent to replace their password', () => {
    const next = vi.fn();
    render(<ParentDetailsStep data={{ ...data, parentPassword: undefined }} existingParent
      onUpdate={vi.fn()} onNext={next} onBack={vi.fn()} />);
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('readonly');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));
    expect(next).toHaveBeenCalledOnce();
  });

  it('requires a saved phone before progressing as an existing parent', () => {
    const next = vi.fn();
    render(<ParentDetailsStep data={{ ...data, parentPhoneNumber: '' }} existingParent
      onUpdate={vi.fn()} onNext={next} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));
    expect(next).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the phone number already saved on your account')).toBeInTheDocument();
  });

  it('preserves password validation for new parent accounts', () => {
    const next = vi.fn();
    render(<ParentDetailsStep data={{ ...data, parentPassword: '' }} existingParent={false}
      onUpdate={vi.fn()} onNext={next} onBack={vi.fn()} />);
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));
    expect(next).not.toHaveBeenCalled();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });
});

describe('recurring registration presentation', () => {
  it('reuses existing parent banking data without exposing replacement bank fields', () => {
    const submit = vi.fn();
    render(<PaymentChoiceStep data={{ ...data, paymentType: 'SUBSCRIPTION', frequency: 'MONTHLY' }}
      onUpdate={vi.fn()} onSubmit={submit} onBack={vi.fn()} selectedFee={100000}
      installmentDetails={null} existingParent />);
    expect(screen.queryByLabelText('Synthetic account number')).not.toBeInTheDocument();
    expect(screen.getByText(/backend reuses your saved banking configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/unlimited subscription has no finite remaining balance/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
    expect(submit).toHaveBeenCalledOnce();
  });

  it('requires a subscription frequency instead of silently selecting monthly', () => {
    const submit = vi.fn();
    render(<PaymentChoiceStep data={{ ...data, paymentType: 'SUBSCRIPTION' }}
      onUpdate={vi.fn()} onSubmit={submit} onBack={vi.fn()} selectedFee={100000}
      installmentDetails={null} existingParent />);
    fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText('Choose a recurring frequency')).toBeInTheDocument();
  });

  it('shows every exact installment, including the different final amount, as a preview', () => {
    render(<PaymentChoiceStep data={{ ...data, paymentType: 'INSTALLMENT', frequency: 'DAILY', numberOfInstallments: 3 }}
      onUpdate={vi.fn()} onSubmit={vi.fn()} onBack={vi.fn()} selectedFee={100000}
      installmentDetails={calculateInstallment(100000, 'DAILY', 3)} existingParent />);
    expect(screen.getByText(/Installment 1:.*26,666.67/)).toBeInTheDocument();
    expect(screen.getByText(/Installment 2:.*26,666.67/)).toBeInTheDocument();
    expect(screen.getByText(/Installment 3 \(final\):.*26,666.66/)).toBeInTheDocument();
    expect(screen.getByText(/final terms come from the backend/i)).toBeInTheDocument();
  });

  it('asks for synthetic banking input with no real transfer instructions for a new recurring parent', () => {
    render(<PaymentChoiceStep data={{ ...data, paymentType: 'INSTALLMENT', frequency: 'WEEKLY', numberOfInstallments: 3 }}
      onUpdate={vi.fn()} onSubmit={vi.fn()} onBack={vi.fn()} selectedFee={100000}
      installmentDetails={null} existingParent={false} />);
    expect(screen.getByLabelText('Synthetic account number')).toBeInTheDocument();
    expect(screen.getByText(/Do not enter real bank information/i)).toBeInTheDocument();
    expect(screen.getByText(/No debit, mandate activation or transfer occurs/i)).toBeInTheDocument();
  });
});

describe('branch selection', () => {
  it('blocks registration when branches fail to load and supports retry without a made-up branch', async () => {
    api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
      data: [{ id: 7, businessName: 'Synthetic Campus', address: 'Demo address' }],
    });
    const loaded = vi.fn();
    render(<StudentDetailsStep data={data} onUpdate={vi.fn()} onNext={vi.fn()}
      selectedFee={100000} onBranchesLoaded={loaded} />);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Continue to Parent Details' })).toBeDisabled();
    expect(screen.queryByText(/Greenfield Main Campus/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry branches' }));
    await waitFor(() => expect(loaded).toHaveBeenLastCalledWith([7]));
    expect(screen.getByRole('button', { name: 'Continue to Parent Details' })).toBeEnabled();
    expect(api.get).toHaveBeenCalledWith('/branches');
  });
});
