import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import StudentDetailsStep from './steps/StudentDetailsStep';
import ParentDetailsStep from './steps/ParentDetailsStep';
import PaymentChoiceStep from './steps/PaymentChoiceStep';
import LoadingScreen from '@/components/LoadingScreen';
import PaymentSuccessCard from '@/components/PaymentSuccessCard';
import axiosInstance from '@/lib/axiosConfig';
import { SCHOOL_FEES, calculateInstallment } from '@/lib/feeConfig';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildRegistrationRequest, getRegistrationErrorMessage, validateParentDetails,
  validateRegistrationPayment, validateStudentDetails,
} from '@/lib/registration';
import type { RegistrationData } from '@/lib/registration';
import type { RegisterStudentResponse } from '@/types/payment-api';

export type { RegistrationData } from '@/lib/registration';

const steps = [
  { number: 1, title: 'Student Details' },
  { number: 2, title: 'Parent Details' },
  { number: 3, title: 'Payment Choice' },
];

const RegistrationWizard: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const existingParent = user?.role === 'PARENT';
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableBranchIds, setAvailableBranchIds] = useState<number[]>([]);
  const [paymentSuccess, setPaymentSuccess] = useState<RegisterStudentResponse | null>(null);
  const [formData, setFormData] = useState<RegistrationData>({
    branchId: 0, firstName: '', surname: '', dateOfBirth: '', classGrade: '',
    parentTitle: '', parentFirstName: '', parentSurname: '', parentEmail: '',
    parentPassword: '', parentPhoneNumber: '', paymentType: 'SINGLE_PAYMENT',
  });

  useEffect(() => {
    if (user?.role === 'PARENT') {
      setFormData((previous) => ({
        ...previous,
        parentEmail: user.email ?? '',
        parentFirstName: previous.parentFirstName || user.firstName || '',
        parentPassword: '',
        bankAccountNumber: undefined,
        bankCode: undefined,
      }));
    }
  }, [user]);

  const updateFormData = (data: Partial<RegistrationData>) => {
    setError('');
    setFormData((previous) => ({ ...previous, ...data }));
  };

  const handleSubmit = async () => {
    setError('');
    const validation = {
      ...validateStudentDetails(formData, availableBranchIds),
      ...validateParentDetails(formData, existingParent),
      ...validateRegistrationPayment(formData, existingParent),
    };
    if (Object.keys(validation).length) {
      setError(Object.values(validation).join('. '));
      return;
    }
    setIsLoading(true);
    try {
      const payload = buildRegistrationRequest(formData, user);
      const response = await axiosInstance.post<RegisterStudentResponse>('/students/register', payload);
      setPaymentSuccess(response.data);
    } catch (failure: unknown) {
      setError(getRegistrationErrorMessage(failure));
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading || isLoading) return <LoadingScreen message={isLoading ? 'Processing your registration...' : 'Checking your session...'} />;

  if (user && user.role !== 'PARENT') {
    return (
      <div className="min-h-screen pt-28 px-4 max-w-2xl mx-auto">
        <div className="bg-card rounded-2xl shadow-elevated p-8">
          <h1 className="text-2xl font-bold mb-3">Parent registration</h1>
          <p>To add your child, sign in with your parent account. Administrative accounts do not own a parent profile.</p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return <PaymentSuccessCard studentName={paymentSuccess.studentName} paymentDetails={paymentSuccess.paymentDetails} />;
  }

  const selectedFee = formData.classGrade ? SCHOOL_FEES[formData.classGrade] : 0;
  const installmentDetails = formData.paymentType === 'INSTALLMENT' && formData.frequency && Number.isInteger(formData.numberOfInstallments) && formData.numberOfInstallments > 0 && formData.numberOfInstallments <= 10_000 && selectedFee > 0
    ? calculateInstallment(selectedFee, formData.frequency, formData.numberOfInstallments)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-greenfield-50 via-background to-greenfield-100 pt-20 pb-10">
      <div className="container mx-auto px-4 max-w-2xl">
        {!existingParent && (
          <div className="mb-6 p-4 bg-secondary border border-primary/20 rounded-xl text-sm">
            Already registered?{' '}
            <Link to="/login?returnTo=%2Fregister" className="text-primary font-semibold hover:underline">
              Sign in to add another child
            </Link>
            . Existing parents must authenticate; registration cannot replace an existing account or its bank details.
          </div>
        )}
        {existingParent && (
          <p className="mb-6 p-4 bg-secondary rounded-xl text-sm">
            Adding a child to your signed-in parent account: <strong>{user.email}</strong>
          </p>
        )}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep >= step.number ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
                </div>
                <span className="text-xs mt-2 text-muted-foreground hidden sm:block">{step.title}</span>
              </div>
              {index < steps.length - 1 && <div className={`w-16 sm:w-24 h-1 mx-2 rounded-full transition-all ${currentStep > step.number ? 'bg-primary' : 'bg-muted'}`} />}
            </React.Fragment>
          ))}
        </div>
        <div className="bg-card rounded-2xl shadow-elevated p-6 md:p-8 animate-slide-in">
          {error && <p role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</p>}
          {currentStep === 1 && (
            <StudentDetailsStep data={formData} onUpdate={updateFormData} onNext={() => setCurrentStep(2)}
              selectedFee={selectedFee} onBranchesLoaded={setAvailableBranchIds} />
          )}
          {currentStep === 2 && (
            <ParentDetailsStep data={formData} onUpdate={updateFormData} onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)} existingParent={existingParent} />
          )}
          {currentStep === 3 && (
            <PaymentChoiceStep data={formData} onUpdate={updateFormData} onSubmit={handleSubmit}
              onBack={() => setCurrentStep(2)} selectedFee={selectedFee} installmentDetails={installmentDetails}
              existingParent={existingParent} />
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationWizard;
