import type { ClassGrade, Frequency, PaymentType, RegisterStudentRequest, Title } from '@/types/payment-api';
import { CLASS_GRADES } from '@/lib/feeConfig';
import { getApiErrorMessage, getHttpStatus } from '@/lib/apiErrors';

export interface RegistrationData {
  branchId: number;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  classGrade: ClassGrade | '';
  parentTitle: Title | '';
  parentFirstName: string;
  parentSurname: string;
  parentEmail: string;
  parentPassword?: string;
  parentPhoneNumber: string;
  paymentType: PaymentType;
  frequency?: Frequency;
  numberOfInstallments?: number;
  bankAccountNumber?: string;
  bankCode?: string;
}

export interface RegistrationIdentity {
  role: 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'PARENT';
  email?: string;
}

export type RegistrationErrors = Record<string, string>;

function localDateToday(): string {
  const current = new Date();
  return [current.getFullYear(), String(current.getMonth() + 1).padStart(2, '0'), String(current.getDate()).padStart(2, '0')].join('-');
}

export function validateStudentDetails(
  data: Partial<RegistrationData>,
  availableBranchIds: readonly number[],
  today = localDateToday(),
): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!Number.isInteger(data.branchId) || !availableBranchIds.includes(data.branchId)) {
    errors.branchId = 'Select an available school branch';
  }
  for (const field of ['firstName', 'surname'] as const) {
    if (!data[field]?.trim()) errors[field] = field === 'firstName' ? 'First name is required' : 'Surname is required';
    else if (data[field].trim().length > 255) errors[field] = 'Use at most 255 characters';
  }
  if (!data.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth) ||
      !Number.isFinite(new Date(data.dateOfBirth).getTime()) ||
      new Date(data.dateOfBirth).toISOString().slice(0, 10) !== data.dateOfBirth || data.dateOfBirth >= today) {
    errors.dateOfBirth = 'Enter a date of birth in the past';
  }
  if (!CLASS_GRADES.some((grade) => grade === data.classGrade)) errors.classGrade = 'Please select a class';
  return errors;
}

export function validateParentDetails(data: Partial<RegistrationData>, existingParent: boolean): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!existingParent && !data.parentTitle) errors.parentTitle = 'Title is required';
  for (const field of ['parentFirstName', 'parentSurname'] as const) {
    if (!data[field]?.trim()) errors[field] = field === 'parentFirstName' ? 'First name is required' : 'Surname is required';
    else if (data[field].trim().length > 255) errors[field] = 'Use at most 255 characters';
  }
  if (!data.parentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.parentEmail.trim()) ||
      data.parentEmail.trim().length > 255) {
    errors.parentEmail = 'Enter a valid email address';
  }
  if (!data.parentPhoneNumber?.trim() || data.parentPhoneNumber.trim().length > 255) {
    errors.parentPhoneNumber = existingParent ? 'Enter the phone number already saved on your account' : 'Phone number is required';
  }
  if (!existingParent && (!data.parentPassword || data.parentPassword.length < 8)) {
    errors.parentPassword = 'Password must be at least 8 characters';
  }
  return errors;
}

export function validateRegistrationPayment(data: Partial<RegistrationData>, existingParent: boolean): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!['SINGLE_PAYMENT', 'INSTALLMENT', 'SUBSCRIPTION'].includes(data.paymentType)) {
    errors.paymentType = 'Please select a payment option';
  }
  if (data.paymentType !== 'SINGLE_PAYMENT' && !['DAILY', 'WEEKLY', 'MONTHLY'].includes(data.frequency)) {
    errors.frequency = 'Choose a recurring frequency';
  }
  if (data.paymentType === 'INSTALLMENT' && (!Number.isInteger(data.numberOfInstallments) ||
      data.numberOfInstallments < 1 || data.numberOfInstallments > 10_000)) {
    errors.numberOfInstallments = 'Use a whole installment count from 1 to 10,000';
  }
  if (!existingParent && data.paymentType !== 'SINGLE_PAYMENT') {
    if (!/^\d{10}$/.test(data.bankAccountNumber?.trim() ?? '')) {
      errors.bankAccountNumber = 'Enter a synthetic 10-digit demonstration account number';
    }
    if (!data.bankCode?.trim() || data.bankCode.trim().length > 255) errors.bankCode = 'Select a demonstration bank code';
  }
  return errors;
}

/** Existing identities are bound to their JWT, never to a submitted password or bank replacement. */
export function buildRegistrationRequest(data: RegistrationData, identity: RegistrationIdentity | null): RegisterStudentRequest {
  if (identity && identity.role !== 'PARENT') throw new Error('Sign in with a parent account to add a child');
  if (identity && !identity.email) throw new Error('Sign in again to identify your parent account');
  if (!data.classGrade) throw new Error('Please select a class');
  const existingParent = identity?.role === 'PARENT';
  const payload: RegisterStudentRequest = {
    branchId: data.branchId,
    firstName: data.firstName.trim(),
    surname: data.surname.trim(),
    dateOfBirth: data.dateOfBirth,
    classGrade: data.classGrade,
    parentFirstName: data.parentFirstName.trim(),
    parentSurname: data.parentSurname.trim(),
    parentEmail: existingParent ? identity.email.trim() : data.parentEmail.trim(),
    parentPhoneNumber: data.parentPhoneNumber.trim(),
    paymentType: data.paymentType,
  };
  if (!existingParent) {
    if (data.parentTitle) payload.parentTitle = data.parentTitle;
    payload.parentPassword = data.parentPassword;
    if (data.paymentType !== 'SINGLE_PAYMENT') {
      payload.bankAccountNumber = data.bankAccountNumber?.trim();
      payload.bankCode = data.bankCode?.trim();
    }
  }
  if (data.paymentType !== 'SINGLE_PAYMENT') payload.frequency = data.frequency;
  if (data.paymentType === 'INSTALLMENT') payload.numberOfInstallments = data.numberOfInstallments;
  return payload;
}

export function getRegistrationErrorMessage(error: unknown): string {
  if (getHttpStatus(error) === 409) {
    return 'Registration conflicts with existing account details. If you are already registered, sign in with your parent account before adding a child. Otherwise, check your details or contact the school.';
  }
  if (getHttpStatus(error) === 403) {
    return 'Registration was not permitted. Use your signed-in parent email and the phone number already saved on your account.';
  }
  return getApiErrorMessage(error, 'Registration could not be completed. Check your details and try again.');
}
