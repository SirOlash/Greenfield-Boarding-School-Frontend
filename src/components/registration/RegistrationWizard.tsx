import React, { useState } from 'react';
import { Check } from 'lucide-react';
import StudentDetailsStep from './steps/StudentDetailsStep';
import ParentDetailsStep from './steps/ParentDetailsStep';
import PaymentChoiceStep from './steps/PaymentChoiceStep';
import LoadingScreen from '@/components/LoadingScreen';
import PaymentSuccessCard from '@/components/PaymentSuccessCard';
import axiosInstance from '@/lib/axiosConfig';
import { SCHOOL_FEES, calculateInstallment, formatNaira } from '@/lib/feeConfig';

export interface RegistrationData {
  // Student Details
  branchId: number;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  classGrade: string;
  // Parent Details
  parentTitle: string;
  parentFirstName: string;
  parentSurname: string;
  parentEmail: string;
  parentPassword?: string;
  parentPhoneNumber: string;
  // Payment Details
  paymentType: 'SINGLE_PAYMENT' | 'INSTALLMENT' | 'SUBSCRIPTION';
  installmentFrequency?: 'WEEKLY' | 'MONTHLY';
  installmentCount?: number;
  bankAccountNumber?: string;
  bankCode?: string;
}

interface PaymentResponse {
  message: string;
  studentRegId: string;
  studentName: string;
  parentName: string;
  paymentDetails: {
    amount: number;
    downPayment?: number;
    paymentType: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    customerAccountNumber: string;
    expiryDate: string;
    qrCodeImage: string;
  };
}

const steps = [
  { number: 1, title: 'Student Details' },
  { number: 2, title: 'Parent Details' },
  { number: 3, title: 'Payment Choice' },
];

const RegistrationWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentResponse | null>(null);
  const [formData, setFormData] = useState<RegistrationData>({
    branchId: 0,
    firstName: '',
    surname: '',
    dateOfBirth: '',
    classGrade: '',
    parentTitle: '',
    parentFirstName: '',
    parentSurname: '',
    parentEmail: '',
    parentPassword: '',
    parentPhoneNumber: '',
    paymentType: 'SINGLE_PAYMENT',
    installmentFrequency: undefined,
    installmentCount: undefined,
    bankAccountNumber: '',
    bankCode: '',
  });

  const updateFormData = (data: Partial<RegistrationData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Build the request payload
      const payload: any = {
        branchId: formData.branchId,
        firstName: formData.firstName,
        surname: formData.surname,
        dateOfBirth: formData.dateOfBirth,
        classGrade: formData.classGrade,
        parentTitle: formData.parentTitle,
        parentFirstName: formData.parentFirstName,
        parentSurname: formData.parentSurname,
        parentEmail: formData.parentEmail,
        parentPassword: formData.parentPassword,
        parentPhoneNumber: formData.parentPhoneNumber,
        paymentType: formData.paymentType,
        // Map fields to backend expectations
        frequency: formData.paymentType === 'SINGLE_PAYMENT'
          ? null
          : (formData.installmentFrequency || (formData.paymentType === 'SUBSCRIPTION' ? 'MONTHLY' : null)),
        numberOfPayments: formData.paymentType === 'INSTALLMENT'
          ? (formData.installmentCount || null)
          : null,
        bankAccountNumber: formData.paymentType === 'SINGLE_PAYMENT' ? null : (formData.bankAccountNumber || null),
        bankCode: formData.paymentType === 'SINGLE_PAYMENT' ? null : (formData.bankCode || null),
        amount: SCHOOL_FEES[formData.classGrade] || 0, // Explicitly send the amount to ensure correct fee
      };

      const response = await axiosInstance.post<PaymentResponse>('/students/register', payload);
      setPaymentSuccess(response.data);
    } catch (error: any) {
      console.error('Registration failed:', error);
      alert(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen message="Processing your registration..." />;
  }

  // Show success card
  if (paymentSuccess) {
    return (
      <PaymentSuccessCard
        studentName={paymentSuccess.studentName}
        paymentDetails={paymentSuccess.paymentDetails}
      />
    );
  }

  // Get fee for selected class
  const selectedFee = formData.classGrade ? SCHOOL_FEES[formData.classGrade] : 0;
  const installmentDetails = formData.installmentFrequency && selectedFee
    ? calculateInstallment(selectedFee, formData.installmentFrequency, formData.installmentCount)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-greenfield-50 via-background to-greenfield-100 pt-20 pb-10">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep > step.number
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === step.number
                      ? 'bg-primary text-primary-foreground shadow-button'
                      : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className="text-xs mt-2 text-muted-foreground hidden sm:block">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all ${currentStep > step.number ? 'bg-primary' : 'bg-muted'
                    }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Steps */}
        <div className="bg-card rounded-2xl shadow-elevated p-6 md:p-8 animate-slide-in">
          {currentStep === 1 && (
            <StudentDetailsStep
              data={formData}
              onUpdate={updateFormData}
              onNext={nextStep}
              selectedFee={selectedFee}
            />
          )}
          {currentStep === 2 && (
            <ParentDetailsStep
              data={formData}
              onUpdate={updateFormData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 3 && (
            <PaymentChoiceStep
              data={formData}
              onUpdate={updateFormData}
              onSubmit={handleSubmit}
              onBack={prevStep}
              selectedFee={selectedFee}
              installmentDetails={installmentDetails}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationWizard;
