import { describe, expect, it } from 'vitest';
import {
  buildRegistrationRequest, getRegistrationErrorMessage, validateParentDetails,
  validateRegistrationPayment, validateStudentDetails,
} from './registration';
import type { RegistrationData } from './registration';

const details: RegistrationData = {
  branchId: 7, firstName: 'Demo', surname: 'Student', dateOfBirth: '2012-06-10', classGrade: 'JSS1',
  parentTitle: 'DR', parentFirstName: 'Demo', parentSurname: 'Parent',
  parentEmail: 'demo-parent@example.invalid', parentPassword: 'private-test-only',
  parentPhoneNumber: '00000000000', paymentType: 'SINGLE_PAYMENT',
};
const parent = { role: 'PARENT' as const, email: 'authenticated@example.invalid' };
const httpError = (status: number, message = 'private server detail') => ({
  isAxiosError: true, response: { status, data: { message } },
});

describe('registration request contract', () => {
  it('preserves new-parent identity while omitting client-selected school fees', () => {
    const request = buildRegistrationRequest(details, null);
    expect(request).toMatchObject({
      parentEmail: details.parentEmail, parentPassword: details.parentPassword, parentTitle: 'DR',
      branchId: 7, paymentType: 'SINGLE_PAYMENT',
    });
    expect(request).not.toHaveProperty('amount');
    expect(request).not.toHaveProperty('frequency');
    expect(request).not.toHaveProperty('numberOfPayments');
    expect(request).not.toHaveProperty('numberOfInstallments');
    expect(request).not.toHaveProperty('bankAccountNumber');
  });

  it.each(['DAILY', 'WEEKLY', 'MONTHLY'] as const)('sends explicit %s frequency and canonical installment count', (frequency) => {
    const request = buildRegistrationRequest({
      ...details, paymentType: 'INSTALLMENT', frequency, numberOfInstallments: 3,
      bankAccountNumber: '0000000000', bankCode: '000',
    }, null);
    expect(request).toMatchObject({ frequency, numberOfInstallments: 3, bankAccountNumber: '0000000000', bankCode: '000' });
    expect(request).not.toHaveProperty('numberOfPayments');
    expect(request).not.toHaveProperty('installmentCount');
    expect(request).not.toHaveProperty('amount');
  });

  it('binds an existing parent to the authenticated email and omits stale password and bank replacements', () => {
    const request = buildRegistrationRequest({
      ...details, parentEmail: 'other@example.invalid', paymentType: 'INSTALLMENT',
      frequency: 'MONTHLY', numberOfInstallments: 4, bankAccountNumber: '9999999999', bankCode: '999',
    }, parent);
    expect(request.parentEmail).toBe(parent.email);
    expect(request.parentPhoneNumber).toBe(details.parentPhoneNumber);
    expect(request.parentFirstName).toBe(details.parentFirstName);
    expect(request.parentSurname).toBe(details.parentSurname);
    for (const key of ['parentPassword', 'parentTitle', 'bankAccountNumber', 'bankCode', 'amount']) {
      expect(request).not.toHaveProperty(key);
    }
  });

  it('does not send a finite installment count for an unlimited subscription', () => {
    const request = buildRegistrationRequest({
      ...details, paymentType: 'SUBSCRIPTION', frequency: 'WEEKLY', numberOfInstallments: 5,
    }, parent);
    expect(request.frequency).toBe('WEEKLY');
    expect(request).not.toHaveProperty('numberOfInstallments');
  });

  it('refuses using an administrative identity or missing authenticated email as a parent identity', () => {
    expect(() => buildRegistrationRequest(details, { role: 'BRANCH_ADMIN' })).toThrow('parent account');
    expect(() => buildRegistrationRequest(details, { role: 'SUPER_ADMIN' })).toThrow('parent account');
    expect(() => buildRegistrationRequest(details, { role: 'PARENT' })).toThrow('Sign in again');
  });
});

describe('registration validation', () => {
  it('requires a real fetched branch rather than assuming branch 1', () => {
    expect(validateStudentDetails(details, [7], '2026-10-27')).toEqual({});
    expect(validateStudentDetails({ ...details, branchId: 1 }, [7], '2026-10-27')).toHaveProperty('branchId');
    expect(validateStudentDetails(details, [], '2026-10-27')).toHaveProperty('branchId');
  });

  it.each(['2026-10-27', '2030-01-01', '2012-02-31', 'not-a-date'])('rejects invalid or non-past birthdate %s', (dateOfBirth) => {
    expect(validateStudentDetails({ ...details, dateOfBirth }, [7], '2026-10-27')).toHaveProperty('dateOfBirth');
  });

  it('requires a private password only when creating a parent account', () => {
    const noPassword = { ...details, parentPassword: '', parentTitle: '' as const };
    expect(validateParentDetails(noPassword, true)).toEqual({});
    expect(validateParentDetails(noPassword, false)).toHaveProperty('parentPassword');
  });

  it('requires existing parents to supply their saved phone and the DTO-required names', () => {
    const errors = validateParentDetails({ ...details, parentPhoneNumber: '', parentSurname: '' }, true);
    expect(errors).toHaveProperty('parentPhoneNumber');
    expect(errors).toHaveProperty('parentSurname');
  });

  it.each(['INSTALLMENT', 'SUBSCRIPTION'] as const)('requires explicit recurring frequency for %s', (paymentType) => {
    expect(validateRegistrationPayment({ ...details, paymentType }, true)).toHaveProperty('frequency');
  });

  it.each([0, -1, 1.5, 10001])('rejects invalid installment count %s', (numberOfInstallments) => {
    expect(validateRegistrationPayment({
      ...details, paymentType: 'INSTALLMENT', frequency: 'DAILY', numberOfInstallments,
    }, true)).toHaveProperty('numberOfInstallments');
  });

  it('requires demonstration bank details for new recurring parents but never requests replacements for existing parents', () => {
    const recurring = { ...details, paymentType: 'SUBSCRIPTION' as const, frequency: 'MONTHLY' as const };
    expect(validateRegistrationPayment(recurring, true)).toEqual({});
    expect(validateRegistrationPayment(recurring, false)).toHaveProperty('bankAccountNumber');
    expect(validateRegistrationPayment(recurring, false)).toHaveProperty('bankCode');
  });
});

describe('registration HTTP guidance', () => {
  it('handles 409 with generic sign-in guidance without echoing an account identifier', () => {
    const message = getRegistrationErrorMessage(httpError(409, 'existing-secret-person@example.invalid'));
    expect(message).toMatch(/sign in with your parent account/i);
    expect(message).toMatch(/check your details or contact the school/i);
    expect(message).not.toContain('existing-secret-person');
  });

  it('explains the saved-phone requirement for forbidden existing-parent registration', () => {
    expect(getRegistrationErrorMessage(httpError(403))).toMatch(/phone number already saved/i);
  });

  it('retains safe unexpected failure handling', () => {
    const message = getRegistrationErrorMessage(httpError(500, 'SQL password payment-id'));
    expect(message).toMatch(/try again later/i);
    expect(message).not.toMatch(/SQL|password|payment-id/);
  });
});
