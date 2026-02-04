export interface PaymentRequest {
    studentId: number;
    category: string;
    amount: number;
    paymentType: string;
    description: string;
}

export interface SwitchPlanRequest {
    newPaymentType: string;
    bankCode?: string;
    bankAccountNumber?: string;
    frequency?: string;
    numberOfInstallments?: number;
}

export interface PaymentDetails {
    onePipePaymentId?: string;
    amount: number;
    downPayment?: number;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    customerAccountNumber?: string;
    paymentType: string;
    expiryDate?: string;
    qrCodeImage?: string;
}

export interface RegisterStudentResponse {
    studentRegId?: string;
    studentName?: string;
    parentName?: string;
    message?: string;
    paymentDetails: PaymentDetails;
}
