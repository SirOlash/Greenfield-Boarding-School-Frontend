// Mirrors the Java DTOs at backend commit bb90ac6. Money is JSON NGN, never kobo.
export type UserRole = 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'PARENT';
export type ClassGrade = 'JSS1' | 'JSS2' | 'JSS3' | 'SS1' | 'SS2' | 'SS3';
export type Title = 'MR' | 'MRS' | 'MS' | 'DR' | 'CHIEF' | 'ENGR' | 'PROF' | 'BARR';
export type PaymentType = 'SINGLE_PAYMENT' | 'INSTALLMENT' | 'SUBSCRIPTION';
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type PaymentStatus = 'PENDING' | 'ACTIVE' | 'SUCCESSFUL' | 'FAILED' | 'CANCELLED';
export type BalanceBasis = 'UNPAID' | 'CONFIRMED_COLLECTIONS' | 'UNKNOWN' | 'UNBOUNDED_SUBSCRIPTION';

export interface PaymentTerms {
  currency: 'NGN';
  amountPerCycle: number | null;
  installmentAmounts: number[];
  frequency: Frequency | null;
  firstBillingDate: string | null;
  endDate: string | null;
  remainingAmount: number | null;
  balanceBasis: BalanceBasis;
  confirmedAmount: number | null;
}

export interface PaymentRequest {
  studentId: number;
  category: 'SCHOOL_FEES' | 'ADHOC_PAYMENT';
  amount?: number;
  paymentType: PaymentType;
  description?: string;
  frequency?: Frequency;
  numberOfInstallments?: number;
}

export interface SwitchPlanRequest {
  newPaymentType: PaymentType;
  bankCode?: string;
  bankAccountNumber?: string;
  frequency?: Frequency;
  numberOfInstallments?: number;
}

export interface RegisterStudentRequest {
  branchId: number;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  classGrade: ClassGrade;
  parentTitle?: Title;
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
  // School fees are deliberately omitted: the server selects its configured fee.
}

// Registration/new-invoice responses have no status or completed-payment counters.
export interface InvoicePaymentDetails {
  onePipePaymentId?: string | null;
  amount: number;
  downPayment?: number | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  customerAccountNumber?: string | null;
  paymentType: PaymentType | null;
  expiryDate?: string | null;
  qrCodeImage?: string | null;
  terms?: PaymentTerms | null;
}

export interface RegisterStudentResponse {
  studentRegId?: string | null;
  studentName?: string | null;
  parentName?: string | null;
  message?: string | null;
  paymentDetails: InvoicePaymentDetails;
}

export interface PaymentDetails {
  onePipePaymentId?: string | null;
  description?: string | null;
  amount: number;
  downPayment?: number | null;
  customerAccountNumber?: string | null;
  status: PaymentStatus | null;
  paymentType: PaymentType | null;
  date?: string | null;
  remainingAmount?: number | null;
  numberOfPayments?: number | null;
  completedPayments?: number | null;
  terms?: PaymentTerms | null;
  virtualAccountNumber?: string | null;
  virtualAccountBankName?: string | null;
  virtualAccountName?: string | null;
  virtualAccountExpiryDate?: string | null;
  qrCodeUrl?: string | null;
  // Optional display fields when normalizing the branch-list DTO. Not provider IDs.
  id?: number;
  studentName?: string;
}
export type ParentPaymentDto = PaymentDetails;

export interface BranchPaymentDto {
  id: number;
  studentName: string;
  description: string | null;
  amount: number;
  remainingAmount: number | null;
  type: PaymentType | null;
  numberOfPayments: number | null;
  completedPayments: number | null;
  terms: PaymentTerms | null;
  status: PaymentStatus | null;
  date: string | null;
}

export interface PaymentQueryResponse {
  status: PaymentStatus | 'UNKNOWN';
  requestRef: string | null;
  transactionRef: string | null;
  onePipePaymentId: string | null;
  message: string | null;
  confirmedAmount: number | null;
  remainingAmount: number | null;
  balanceBasis: BalanceBasis;
  invoiceWindowStatus: 'OPEN' | 'EXPIRED' | 'UNKNOWN' | 'NOT_APPLICABLE';
  providerAvailability: 'AVAILABLE' | 'UNAVAILABLE';
  providerStatus: PaymentStatus | 'UNKNOWN' | null;
  providerStateConsistent: boolean | null;
  localStateConsistent: boolean | null;
}

export interface ParentStudentDto {
  id: number;
  firstName: string;
  surname: string;
  classGrade: ClassGrade;
  branchName: string;
  pendingAmount: number | null;
}
export interface BranchStudentDto {
  id: number;
  firstName: string;
  surname: string;
  classGrade: ClassGrade;
  parentEmail: string;
  parentFullName: string;
  paymentType: PaymentType | null;
  status: PaymentStatus | 'NO PAYMENT';
}
export interface Branch {
  id: number;
  businessName: string;
  branchCode: string;
  address: string;
  billerCode?: string | null;
  adminEmail?: string | null;
  phoneNumber?: string | null;
  contactPersonName?: string | null;
}
export interface DashboardStats {
  totalBranches: number;
  totalStudents: number;
  totalRevenue: number | null;
  activePayments: number;
}
export interface LoginResponse {
  token: string;
  role: UserRole;
  branchId: number | null;
  firstName: string;
  email: string;
}
export interface ApiErrorResponse {
  code: string;
  message: string;
  status: number;
  timestamp: string;
  path: string;
}
