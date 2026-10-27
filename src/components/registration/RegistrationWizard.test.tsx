import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RegistrationWizard from './RegistrationWizard';
import Login from '@/pages/Login';
import type { RegistrationData } from '@/lib/registration';
import type { LoginResponse } from '@/types/payment-api';

const mocks = vi.hoisted(() => ({
  user: null as (LoginResponse & { token: string }) | null,
  login: vi.fn(),
  post: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, isLoading: false, login: mocks.login, logout: vi.fn() }),
}));
vi.mock('@/lib/axiosConfig', () => ({ default: { post: mocks.post } }));
vi.mock('@/components/PaymentSuccessCard', () => ({
  default: () => <p>Demo registration invoice created</p>,
}));
// Branch selection has its own real-component test; supply a selected, fetched branch
// so these tests exercise the wizard's identity binding and actual HTTP submission.
vi.mock('./steps/StudentDetailsStep', () => ({
  default: ({ onUpdate, onNext, onBranchesLoaded }: {
    onUpdate: (value: Partial<RegistrationData>) => void;
    onNext: () => void;
    onBranchesLoaded: (ids: number[]) => void;
  }) => <button onClick={() => {
    onBranchesLoaded([7]);
    onUpdate({
      branchId: 7, firstName: 'Demo', surname: 'Student', dateOfBirth: '2012-06-10', classGrade: 'JSS1',
      parentPassword: 'stale-form-password', bankAccountNumber: '9999999999', bankCode: '999',
    });
    onNext();
  }}>Select fetched student branch</button>,
}));

const parent: LoginResponse = {
  token: 'unit-test-token', role: 'PARENT', branchId: null,
  firstName: 'Demo', email: 'authenticated@example.invalid',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
});
afterEach(cleanup);

async function reachExistingParentPayment() {
  mocks.user = parent;
  render(<MemoryRouter><RegistrationWizard /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Select fetched student branch' }));
  expect(screen.getByLabelText('Email Address')).toHaveValue(parent.email);
  expect(screen.getByLabelText('Email Address')).toHaveAttribute('readonly');
  fireEvent.change(screen.getByLabelText('Surname'), { target: { value: 'Parent' } });
  fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '00000000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Payment' }));
  expect(screen.getByRole('button', { name: 'Complete Registration' })).toBeInTheDocument();
}

describe('registration HTTP integration', () => {
  it('submits an existing parent under their JWT identity without password, bank replacements or a client fee', async () => {
    mocks.post.mockResolvedValue({ data: { studentName: 'Demo Student', paymentDetails: { amount: 100000, paymentType: 'SINGLE_PAYMENT' } } });
    await reachExistingParentPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
    await screen.findByText('Demo registration invoice created');
    expect(mocks.post).toHaveBeenCalledOnce();
    const [endpoint, payload] = mocks.post.mock.calls[0];
    expect(endpoint).toBe('/students/register');
    expect(payload).toMatchObject({
      parentEmail: parent.email, parentPhoneNumber: '00000000000',
      parentFirstName: 'Demo', parentSurname: 'Parent', branchId: 7,
    });
    for (const field of ['parentPassword', 'bankAccountNumber', 'bankCode', 'amount', 'numberOfPayments']) {
      expect(payload).not.toHaveProperty(field);
    }
  });

  it('shows generic sign-in guidance for a 409 registration conflict', async () => {
    mocks.post.mockRejectedValue({
      isAxiosError: true, response: { status: 409, data: { message: 'private-account@example.invalid' } },
    });
    await reachExistingParentPayment();
    fireEvent.click(screen.getByRole('button', { name: 'Complete Registration' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/sign in with your parent account/i);
    expect(alert).not.toHaveTextContent('private-account');
    expect(screen.queryByText('Demo registration invoice created')).not.toBeInTheDocument();
  });

  it('offers authentication before another-child registration to anonymous visitors', () => {
    render(<MemoryRouter><RegistrationWizard /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Sign in to add another child' })).toHaveAttribute('href', '/login?returnTo=%2Fregister');
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it.each(['BRANCH_ADMIN', 'SUPER_ADMIN'] as const)('does not treat an authenticated %s as a parent profile', (role) => {
    mocks.user = { ...parent, role };
    render(<MemoryRouter><RegistrationWizard /></MemoryRouter>);
    expect(screen.getByText(/Administrative accounts do not own a parent profile/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Complete Registration' })).not.toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

describe('parent login return to registration', () => {
  async function loginAt(path: string) {
    mocks.post.mockResolvedValue({ data: parent });
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<p>Registration destination</p>} />
          <Route path="/parent" element={<p>Parent destination</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: parent.email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'unit-test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(mocks.login).toHaveBeenCalledOnce());
  }

  it('returns a parent to registration after the explicit sign-in flow', async () => {
    await loginAt('/login?returnTo=%2Fregister');
    expect(await screen.findByText('Registration destination')).toBeInTheDocument();
  });

  it('ignores arbitrary return URLs and sends the parent to their dashboard', async () => {
    await loginAt('/login?returnTo=https%3A%2F%2Fexample.invalid');
    expect(await screen.findByText('Parent destination')).toBeInTheDocument();
  });
});
