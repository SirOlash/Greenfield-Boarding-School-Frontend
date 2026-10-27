import React, { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { formatNaira, toKobo } from '@/lib/feeConfig';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { canCreatePayment } from '@/lib/paymentPresentation';
import axiosInstance from '@/lib/axiosConfig';
import OfflineDemoNotice from '@/components/OfflineDemoNotice';
import type { PaymentRequest, RegisterStudentResponse } from '@/types/payment-api';
import { Loader2, Plus } from 'lucide-react';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  studentName: string;
  onSuccess: (invoice: RegisterStudentResponse) => void;
}
const CATEGORIES = [
  { value: 'BOOKS', label: 'Books' }, { value: 'UNIFORM', label: 'Uniform' },
  { value: 'EXCURSION', label: 'Excursion' }, { value: 'STATIONERY', label: 'Stationery' },
  { value: 'SPORTS', label: 'Sports Gear' }, { value: 'OTHER', label: 'Other Item' },
];
const frequencies = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
const paymentTypes = ['SINGLE_PAYMENT', 'INSTALLMENT', 'SUBSCRIPTION'] as const;

const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({ isOpen, onClose, studentId, studentName, onSuccess }) => {
  const { user } = useAuth();
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentRequest['paymentType']>('SINGLE_PAYMENT');
  const [frequency, setFrequency] = useState<PaymentRequest['frequency']>();
  const [count, setCount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountKobo = toKobo(amount);
  const validAmount = amountKobo != null && amountKobo > 0n && toKobo(Number(amount)) === amountKobo;
  const installments = Number(count);
  const validCount = Number.isInteger(installments) && installments >= 1 && installments <= 10_000;
  const allowed = canCreatePayment(user?.role);
  const valid = allowed && !!category && validAmount && (paymentType === 'SINGLE_PAYMENT' || !!frequency) && (paymentType !== 'INSTALLMENT' || validCount);

  const submit = async () => {
    if (!valid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: PaymentRequest = {
        studentId, category: 'ADHOC_PAYMENT', amount: Number(amount), paymentType,
        description: CATEGORIES.find((item) => item.value === category)?.label || 'Ad-hoc Payment',
        ...(paymentType !== 'SINGLE_PAYMENT' ? { frequency } : {}),
        ...(paymentType === 'INSTALLMENT' ? { numberOfInstallments: installments } : {}),
      };
      const response = await axiosInstance.post<RegisterStudentResponse>('/payments/new', payload);
      toast.success('Demo invoice created. No payment has been confirmed.');
      onSuccess(response.data);
      onClose();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Unable to create the invoice.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create New Payment</DialogTitle><DialogDescription>Create an ad-hoc demo invoice for <strong>{studentName}</strong>.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-3">
          <OfflineDemoNotice />
          {!allowed && <p role="alert" className="text-destructive text-sm">Only the authenticated parent can create invoices in this interface.</p>}
          <div className="space-y-2"><Label htmlFor="category">Select Item/Category</Label><Select onValueChange={setCategory} value={category}><SelectTrigger id="category"><SelectValue placeholder="What is this payment for?" /></SelectTrigger><SelectContent>{CATEGORIES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="ad-hoc-amount">Amount (NGN)</Label><Input id="ad-hoc-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /><p className="text-xs text-muted-foreground">Enter a positive amount with at most two decimal places, within the exact numeric range supported by this interface. School fees are set by the backend.</p></div>
          <div className="space-y-2"><Label htmlFor="ad-hoc-type">Payment type</Label><Select value={paymentType} onValueChange={(value) => { const selected = paymentTypes.find((type) => type === value); if (selected) setPaymentType(selected); }}><SelectTrigger id="ad-hoc-type"><SelectValue /></SelectTrigger><SelectContent>{paymentTypes.map((type) => <SelectItem key={type} value={type}>{type.replace(/_/g, ' ').toLowerCase()}</SelectItem>)}</SelectContent></Select></div>
          {paymentType !== 'SINGLE_PAYMENT' && <div className="space-y-2"><Label htmlFor="ad-hoc-frequency">Frequency</Label><Select value={frequency} onValueChange={(value) => setFrequency(frequencies.find((item) => item === value))}><SelectTrigger id="ad-hoc-frequency"><SelectValue placeholder="Select frequency" /></SelectTrigger><SelectContent>{frequencies.map((value) => <SelectItem key={value} value={value}>{value.toLowerCase()}</SelectItem>)}</SelectContent></Select></div>}
          {paymentType === 'INSTALLMENT' && <div className="space-y-2"><Label htmlFor="ad-hoc-count">Installment count (after down payment)</Label><Input id="ad-hoc-count" type="number" min={1} max={10000} step={1} value={count} onChange={(event) => setCount(event.target.value)} /></div>}
          {paymentType === 'SUBSCRIPTION' && <p className="text-sm text-muted-foreground">The amount is charged per selected cycle, with no fixed end date. This demo performs no automatic debits.</p>}
          <div className="p-4 bg-muted rounded-xl"><p className="text-xs text-muted-foreground">Requested ad-hoc {paymentType === 'SUBSCRIPTION' ? 'charge per cycle' : 'amount'}</p><p className="text-xl font-bold text-primary">{validAmount ? formatNaira(amount) : 'Enter an amount'}</p><p className="text-xs text-muted-foreground">The returned invoice contains the final amounts and exact installment schedule.</p></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button><Button onClick={submit} disabled={!valid || isSubmitting} className="gap-2">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Generate Invoice</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentModal;