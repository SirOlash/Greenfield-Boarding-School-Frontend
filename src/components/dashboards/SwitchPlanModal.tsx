import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, RefreshCw, CreditCard, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { toast } from 'sonner';
import { NIGERIAN_BANKS } from '@/lib/feeConfig';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { canManagePaymentPlan } from '@/lib/paymentPresentation';
import { useAuth } from '@/contexts/AuthContext';
import OfflineDemoNotice from '@/components/OfflineDemoNotice';
import type { SwitchPlanRequest } from '@/types/payment-api';

interface SwitchPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  studentName: string;
  onSuccess: (plan: SwitchPlanRequest) => void;
}
const planTypes = ['SINGLE_PAYMENT', 'INSTALLMENT', 'SUBSCRIPTION'] as const;
const frequencies = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

const SwitchPlanModal: React.FC<SwitchPlanModalProps> = ({ isOpen, onClose, studentId, studentName, onSuccess }) => {
  const { user } = useAuth();
  const [paymentType, setPaymentType] = useState<SwitchPlanRequest['newPaymentType']>('SINGLE_PAYMENT');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [replaceBankDetails, setReplaceBankDetails] = useState(false);
  const [frequency, setFrequency] = useState<SwitchPlanRequest['frequency']>();
  const [count, setCount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allowed = canManagePaymentPlan(user?.role);
  const recurring = paymentType !== 'SINGLE_PAYMENT';
  const numberOfInstallments = Number(count);
  const validCount = Number.isInteger(numberOfInstallments) && numberOfInstallments >= 1 && numberOfInstallments <= 10000;
  const valid = allowed && (!recurring || (!!frequency && (!replaceBankDetails || (!!bankCode && /^\d{10}$/.test(accountNumber))))) && (paymentType !== 'INSTALLMENT' || validCount);

  const submit = async () => {
    if (!valid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: SwitchPlanRequest = {
        newPaymentType: paymentType,
        ...(recurring ? { frequency } : {}),
        ...(paymentType === 'INSTALLMENT' ? { numberOfInstallments } : {}),
        ...(recurring && replaceBankDetails ? { bankCode, bankAccountNumber: accountNumber } : {}),
      };
      await axiosInstance.put(`/payments/students/${studentId}/switch-plan`, payload);
      toast.success('Saved payment plan updated. No new collection was created.');
      onSuccess(payload);
      onClose();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Unable to change this payment plan. Recurring plans need saved bank details or an explicit bank details update.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Switch Payment Plan</DialogTitle><DialogDescription>Change the saved school fees plan for <strong>{studentName}</strong>. Existing pending or active school-fee plans prevent this change.</DialogDescription></DialogHeader>
        <div className="space-y-5 py-2">
          <OfflineDemoNotice />
          {!allowed && <p role="alert" className="text-destructive text-sm">Only the authenticated parent who owns this child may change the payment plan.</p>}
          <RadioGroup value={paymentType} onValueChange={(value) => { const type = planTypes.find((item) => item === value); if (type) setPaymentType(type); }} className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select New Plan</Label>
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${paymentType === 'SINGLE_PAYMENT' ? 'border-primary bg-primary/5' : 'border-border'}`}><RadioGroupItem value="SINGLE_PAYMENT" className="mt-1" /><div><div className="flex items-center gap-2 font-medium"><Wallet className="w-4 h-4 text-primary" />Single Payment</div><p className="text-xs text-muted-foreground mt-0.5">One finite school-fee obligation.</p></div></label>
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${paymentType === 'INSTALLMENT' ? 'border-primary bg-primary/5' : 'border-border'}`}><RadioGroupItem value="INSTALLMENT" className="mt-1" /><div><div className="flex items-center gap-2 font-medium"><RefreshCw className="w-4 h-4 text-primary" />Installment Payment</div><p className="text-xs text-muted-foreground mt-0.5">Down payment followed by a finite exact schedule.</p></div></label>
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${paymentType === 'SUBSCRIPTION' ? 'border-primary bg-primary/5' : 'border-border'}`}><RadioGroupItem value="SUBSCRIPTION" className="mt-1" /><div><div className="flex items-center gap-2 font-medium"><CreditCard className="w-4 h-4 text-primary" />Subscription</div><p className="text-xs text-muted-foreground mt-0.5">Charge per cycle, unlimited until cancellation; no automatic debit in this demo.</p></div></label>
          </RadioGroup>
          {recurring && <div className="space-y-4 p-4 bg-muted/50 rounded-xl">
            <div className="space-y-2"><Label htmlFor="switch-frequency">Frequency</Label><Select value={frequency} onValueChange={(value) => setFrequency(frequencies.find((item) => item === value))}><SelectTrigger id="switch-frequency"><SelectValue placeholder="Select frequency" /></SelectTrigger><SelectContent>{frequencies.map((value) => <SelectItem key={value} value={value}>{value.toLowerCase()}</SelectItem>)}</SelectContent></Select></div>
            {paymentType === 'INSTALLMENT' && <div className="space-y-2"><Label htmlFor="switch-count">Installment count (after down payment)</Label><Input id="switch-count" type="number" min={1} max={10000} step={1} value={count} onChange={(event) => setCount(event.target.value)} /></div>}
            <p className="text-xs text-muted-foreground">School fees and exact invoice amounts are controlled by the backend.</p>
            <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={replaceBankDetails} onChange={(event) => setReplaceBankDetails(event.target.checked)} className="mt-1" />Explicitly replace my saved demonstration bank details</label>
            <p className="text-xs text-muted-foreground">Otherwise your existing parent bank details are preserved. Use synthetic demonstration data only.</p>
            {replaceBankDetails && <div className="space-y-3 border-t pt-3">
              <p className="text-xs text-amber-800">This updates your own parent record and can affect future recurring invoices for your children.</p>
              <div className="space-y-2"><Label htmlFor="switch-bank">Demo bank</Label><Select value={bankCode} onValueChange={setBankCode}><SelectTrigger id="switch-bank"><SelectValue placeholder="Select demo bank" /></SelectTrigger><SelectContent>{NIGERIAN_BANKS.map((bank) => <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="switch-account">Synthetic account number</Label><Input id="switch-account" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 synthetic digits" maxLength={10} /></div>
            </div>}
          </div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button><Button onClick={submit} disabled={!valid || isSubmitting}>{isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirm Switch</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default SwitchPlanModal;