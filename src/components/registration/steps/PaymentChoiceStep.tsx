import React, { useState } from 'react';
import { CreditCard, ArrowLeft, Wallet, RefreshCw, Building, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RegistrationData } from '../RegistrationWizard';
import { formatNaira, NIGERIAN_BANKS, calculateInstallment } from '@/lib/feeConfig';

interface PaymentChoiceStepProps {
  data: Partial<RegistrationData>;
  onUpdate: (data: Partial<RegistrationData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  selectedFee: number;
  installmentDetails: ReturnType<typeof calculateInstallment> | null;
}

const PaymentChoiceStep: React.FC<PaymentChoiceStepProps> = ({
  data,
  onUpdate,
  onSubmit,
  onBack,
  selectedFee,
  installmentDetails,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!data.paymentType) {
      newErrors.paymentType = 'Please select a payment option';
    }

    if (data.paymentType === 'INSTALLMENT') {
      if (!data.installmentFrequency) {
        newErrors.installmentFrequency = 'Please select payment frequency';
      }
      if (!data.installmentCount) {
        newErrors.installmentCount = 'Please select duration';
      }
    }

    if (data.paymentType !== 'SINGLE_PAYMENT') {
      if (!data.bankAccountNumber?.trim()) {
        newErrors.bankAccountNumber = 'Bank account number is required';
      } else if (!/^\d{10}$/.test(data.bankAccountNumber)) {
        newErrors.bankAccountNumber = 'Please enter a valid 10-digit account number';
      }

      if (!data.bankCode) {
        newErrors.bankCode = 'Please select your bank';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit();
    }
  };

  const getInstallmentPreview = () => {
    if (!data.installmentFrequency || !selectedFee) return null;
    return calculateInstallment(selectedFee, data.installmentFrequency, data.installmentCount);
  };

  const preview = getInstallmentPreview();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Payment Options</h2>
        <p className="text-muted-foreground mt-2">Choose how you'd like to pay the school fees</p>
      </div>

      {/* Total Amount Display */}
      <div className="p-4 bg-secondary rounded-xl text-center">
        <p className="text-sm text-muted-foreground">Total School Fee</p>
        <p className="text-3xl font-bold text-primary">{formatNaira(selectedFee)}</p>
      </div>

      <div className="space-y-4">
        {/* Payment Type Selection */}
        <RadioGroup
          value={data.paymentType}
          onValueChange={(value) => onUpdate({
            paymentType: value as RegistrationData['paymentType'],
          })}
          className="space-y-3"
        >
          {/* Single Payment */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${data.paymentType === 'SINGLE_PAYMENT'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
              }`}
          >
            <RadioGroupItem value="SINGLE_PAYMENT" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="font-semibold">Single Payment</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Pay the full amount at once via bank transfer
              </p>
              <p className="text-lg font-bold text-primary mt-2">{formatNaira(selectedFee)}</p>
            </div>
          </label>

          {/* Installment Payment */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${data.paymentType === 'INSTALLMENT'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
              }`}
          >
            <RadioGroupItem value="INSTALLMENT" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                <span className="font-semibold">Installment Payment</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                20% down payment, rest in weekly or monthly installments
              </p>
            </div>
          </label>

          {/* Subscription Payment */}
          <label
            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${data.paymentType === 'SUBSCRIPTION'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
              }`}
          >
            <RadioGroupItem value="SUBSCRIPTION" className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <span className="font-semibold">Subscription</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Recurring monthly payments automatically debited
              </p>
            </div>
          </label>
        </RadioGroup>
        {errors.paymentType && <p className="text-xs text-destructive">{errors.paymentType}</p>}

        {/* Installment Frequency Selection */}
        {data.paymentType === 'INSTALLMENT' && (
          <div className="space-y-4 p-4 bg-muted rounded-xl animate-slide-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Frequency</Label>
                <Select
                  value={data.installmentFrequency}
                  onValueChange={(value) => onUpdate({
                    installmentFrequency: value as 'WEEKLY' | 'MONTHLY',
                    installmentCount: undefined // Reset count when frequency changes
                  })}
                >
                  <SelectTrigger className={errors.installmentFrequency ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                {errors.installmentFrequency && (
                  <p className="text-xs text-destructive">{errors.installmentFrequency}</p>
                )}
              </div>

              {/* Number of Installments */}
              {data.installmentFrequency && (
                <div className="space-y-2">
                  <Label>How many {data.installmentFrequency === 'WEEKLY' ? 'weeks' : 'months'}?</Label>
                  <Select
                    value={data.installmentCount?.toString()}
                    onValueChange={(value) => onUpdate({ installmentCount: parseInt(value) })}
                  >
                    <SelectTrigger className={errors.installmentCount ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.installmentFrequency === 'WEEKLY'
                        ? Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} Week{num > 1 ? 's' : ''}</SelectItem>
                        ))
                        : Array.from({ length: 3 }, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} Month{num > 1 ? 's' : ''}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                  {errors.installmentCount && (
                    <p className="text-xs text-destructive">{errors.installmentCount}</p>
                  )}
                </div>
              )}
            </div>

            {/* Installment Preview */}
            {preview && (
              <div className="space-y-2 p-3 bg-card rounded-lg border">
                <p className="text-sm font-medium">Payment Breakdown:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Down Payment (20%):</span>
                  <span className="font-semibold text-primary">{formatNaira(preview.downPayment)}</span>
                  <span className="text-muted-foreground">Per {preview.frequency === 'WEEKLY' ? 'Week' : 'Month'}:</span>
                  <span className="font-semibold">{formatNaira(preview.amountPerPayment)}</span>
                  <span className="text-muted-foreground">Number of Payments:</span>
                  <span className="font-semibold">{preview.numberOfPayments}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bank Details for Installment/Subscription */}
        {data.paymentType && data.paymentType !== 'SINGLE_PAYMENT' && (
          <div className="space-y-4 p-4 bg-muted rounded-xl animate-slide-in">
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Your bank account details are required to set up automatic debit (mandate) for future payments.
                You'll first make a transfer to activate the mandate.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Select Your Bank
              </Label>
              <Select
                value={data.bankCode}
                onValueChange={(value) => onUpdate({ bankCode: value })}
              >
                <SelectTrigger className={errors.bankCode ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {NIGERIAN_BANKS.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bankCode && <p className="text-xs text-destructive">{errors.bankCode}</p>}
            </div>

            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                type="text"
                value={data.bankAccountNumber || ''}
                onChange={(e) => onUpdate({ bankAccountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="Enter 10-digit account number"
                maxLength={10}
                className={errors.bankAccountNumber ? 'border-destructive' : ''}
              />
              {errors.bankAccountNumber && (
                <p className="text-xs text-destructive">{errors.bankAccountNumber}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSubmit} className="flex-1 shadow-button">
          Complete Registration
        </Button>
      </div>
    </div >
  );
};

export default PaymentChoiceStep;
