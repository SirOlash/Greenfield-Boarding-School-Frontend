import React, { useState } from 'react';
import { CreditCard, ArrowLeft, Wallet, RefreshCw, Building, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { RegistrationData } from '@/lib/registration';
import { validateRegistrationPayment } from '@/lib/registration';
import { formatNaira, NIGERIAN_BANKS, calculateInstallment } from '@/lib/feeConfig';
import type { Frequency, PaymentType } from '@/types/payment-api';

interface PaymentChoiceStepProps {
  data: Partial<RegistrationData>;
  onUpdate: (data: Partial<RegistrationData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  selectedFee: number;
  installmentDetails: ReturnType<typeof calculateInstallment> | null;
  existingParent: boolean;
}

const choices: { value: PaymentType; title: string; description: string; icon: typeof Wallet }[] = [
  { value: 'SINGLE_PAYMENT', title: 'Single Payment', description: 'One invoice for the full school fee. No real transfer is supported in this demo.', icon: Wallet },
  { value: 'INSTALLMENT', title: 'Installment Payment', description: 'A 20% down payment and a finite schedule of daily, weekly or monthly installments.', icon: RefreshCw },
  { value: 'SUBSCRIPTION', title: 'Subscription', description: 'An unlimited subscription charging the full invoice amount per selected cycle, until cancelled. No automatic debit occurs in mock mode.', icon: CreditCard },
];

const PaymentChoiceStep: React.FC<PaymentChoiceStepProps> = ({
  data, onUpdate, onSubmit, onBack, selectedFee, installmentDetails, existingParent,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const handleSubmit = () => {
    const validation = validateRegistrationPayment(data, existingParent);
    setErrors(validation);
    if (!Object.keys(validation).length) onSubmit();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Payment Options</h2>
        <p className="text-muted-foreground mt-2">Choose demonstration school-fee terms</p>
      </div>
      <div className="p-4 bg-secondary rounded-xl text-center">
        <p className="text-sm text-muted-foreground">Synthetic school-fee preview</p>
        <p className="text-3xl font-bold text-primary">{formatNaira(selectedFee)}</p>
        <p className="text-xs text-muted-foreground mt-1">The backend determines the final invoice amount and payment terms.</p>
      </div>
      <div className="space-y-4">
        <RadioGroup value={data.paymentType} className="space-y-3"
          onValueChange={(value: PaymentType) => {
            setErrors({});
            onUpdate({ paymentType: value, frequency: undefined, numberOfInstallments: undefined });
          }}>
          {choices.map(({ value, title, description, icon: Icon }) => (
            <label key={value} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${data.paymentType === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
              <RadioGroupItem value={value} className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2"><Icon className="w-5 h-5 text-primary" /><span className="font-semibold">{title}</span></div>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
        {errors.paymentType && <p className="text-xs text-destructive">{errors.paymentType}</p>}
        {data.paymentType !== 'SINGLE_PAYMENT' && (
          <div className="space-y-4 p-4 bg-muted rounded-xl animate-slide-in">
            <div className="space-y-2">
              <Label htmlFor="frequency">Recurring frequency</Label>
              <Select value={data.frequency ?? ''} onValueChange={(value: Frequency) => onUpdate({ frequency: value })}>
                <SelectTrigger id="frequency" className={errors.frequency ? 'border-destructive' : ''}><SelectValue placeholder="Select frequency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem><SelectItem value="WEEKLY">Weekly</SelectItem><SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
              {errors.frequency && <p className="text-xs text-destructive">{errors.frequency}</p>}
            </div>
            {data.paymentType === 'INSTALLMENT' && (
              <div className="space-y-2">
                <Label htmlFor="numberOfInstallments">Number of installments after the down payment</Label>
                <Input id="numberOfInstallments" type="number" min={1} max={10000} step={1}
                  value={data.numberOfInstallments ?? ''}
                  onChange={(event) => onUpdate({ numberOfInstallments: event.target.value ? Number(event.target.value) : undefined })}
                  className={errors.numberOfInstallments ? 'border-destructive' : ''} />
                {errors.numberOfInstallments && <p className="text-xs text-destructive">{errors.numberOfInstallments}</p>}
              </div>
            )}
            {data.paymentType === 'SUBSCRIPTION' && (
              <p className="text-sm">
                Preview: {formatNaira(selectedFee)} per selected cycle, starting one interval after creation, with no automatic end date.
                An unlimited subscription has no finite remaining balance.
              </p>
            )}
            {data.paymentType === 'INSTALLMENT' && installmentDetails && (
              <div className="space-y-2 p-3 bg-card rounded-lg border">
                <p className="text-sm font-medium">Estimated schedule — final terms come from the backend</p>
                <p className="text-sm">Down payment (20%): <strong>{formatNaira(installmentDetails.downPayment)}</strong></p>
                <ol className="max-h-52 overflow-y-auto text-sm space-y-1">
                  {installmentDetails.installmentAmounts.map((amount, index) => (
                    <li key={index}>Installment {index + 1}{index === installmentDetails.installmentAmounts.length - 1 ? ' (final)' : ''}: {formatNaira(amount)}</li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">Kobo rounding is distributed exactly as in the documented backend schedule; the final installment may differ.</p>
              </div>
            )}
            {existingParent ? (
              <p className="text-sm p-3 bg-card rounded-lg border">
                The backend reuses your saved banking configuration for recurring plans. This form never replaces it.
                If no configuration is saved, select a single payment; the frontend has no bank-profile update endpoint.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">Synthetic demonstration banking details only. No debit, mandate activation or transfer occurs. Do not enter real bank information.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankCode" className="flex items-center gap-2"><Building className="w-4 h-4" />Demonstration bank</Label>
                  <Select value={data.bankCode ?? ''} onValueChange={(value) => onUpdate({ bankCode: value })}>
                    <SelectTrigger id="bankCode" className={errors.bankCode ? 'border-destructive' : ''}><SelectValue placeholder="Select demonstration bank" /></SelectTrigger>
                    <SelectContent>{NIGERIAN_BANKS.map((bank) => <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.bankCode && <p className="text-xs text-destructive">{errors.bankCode}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Synthetic account number</Label>
                  <Input id="bankAccountNumber" inputMode="numeric" maxLength={10}
                    value={data.bankAccountNumber ?? ''} placeholder="0000000000"
                    onChange={(event) => onUpdate({ bankAccountNumber: event.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className={errors.bankAccountNumber ? 'border-destructive' : ''} />
                  {errors.bankAccountNumber && <p className="text-xs text-destructive">{errors.bankAccountNumber}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        <Button onClick={handleSubmit} className="flex-1 shadow-button">Complete Registration</Button>
      </div>
    </div>
  );
};

export default PaymentChoiceStep;
