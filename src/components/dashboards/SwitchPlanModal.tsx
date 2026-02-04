import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, RefreshCw, CreditCard, Loader2, Building, AlertCircle } from 'lucide-react';
import axiosInstance from '@/lib/axiosConfig';
import { toast } from 'sonner';
import { NIGERIAN_BANKS } from '@/lib/feeConfig';
import { SwitchPlanRequest } from '@/types/payment-api';

interface SwitchPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentId: number;
    studentName: string;
    onSuccess: () => void;
}

const SwitchPlanModal: React.FC<SwitchPlanModalProps> = ({ isOpen, onClose, studentId, studentName, onSuccess }) => {
    const [paymentType, setPaymentType] = useState<string>('SINGLE_PAYMENT');
    const [bankCode, setBankCode] = useState<string>('');
    const [accountNumber, setAccountNumber] = useState<string>('');
    const [installmentFrequency, setInstallmentFrequency] = useState<string>('');
    const [installmentCount, setInstallmentCount] = useState<number | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload: SwitchPlanRequest = {
                newPaymentType: paymentType,
                bankCode: paymentType !== 'SINGLE_PAYMENT' ? bankCode : undefined,
                bankAccountNumber: paymentType !== 'SINGLE_PAYMENT' ? accountNumber : undefined,
                frequency: paymentType === 'INSTALLMENT' ? installmentFrequency : undefined,
                numberOfInstallments: paymentType === 'INSTALLMENT' ? installmentCount : undefined,
            };

            await axiosInstance.put(`/payments/students/${studentId}/switch-plan`, payload);
            toast.success('Payment Plan updated successfully.');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Failed to switch plan', error);
            toast.error(error.response?.data?.message || 'Failed to switch payment plan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = () => {
        if (paymentType === 'SINGLE_PAYMENT') return true;
        if (!bankCode || !accountNumber || accountNumber.length !== 10) return false;
        if (paymentType === 'INSTALLMENT') {
            return !!installmentFrequency && !!installmentCount;
        }
        return true; // Subscription
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Switch Payment Plan</DialogTitle>
                    <DialogDescription>
                        Change the school fees payment plan for <strong>{studentName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Payment Type Selection */}
                    <RadioGroup
                        value={paymentType}
                        onValueChange={setPaymentType}
                        className="space-y-2"
                    >
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                            Select New Plan
                        </Label>

                        {/* Single Payment */}
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentType === 'SINGLE_PAYMENT' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                            <RadioGroupItem value="SINGLE_PAYMENT" className="mt-1" />
                            <div>
                                <div className="flex items-center gap-2 font-medium">
                                    <Wallet className="w-4 h-4 text-primary" />
                                    Single Payment
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">Pay full amount at once.</p>
                            </div>
                        </label>

                        {/* Installment */}
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentType === 'INSTALLMENT' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                            <RadioGroupItem value="INSTALLMENT" className="mt-1" />
                            <div>
                                <div className="flex items-center gap-2 font-medium">
                                    <RefreshCw className="w-4 h-4 text-primary" />
                                    Installment Payment
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">Spread payments over time.</p>
                            </div>
                        </label>

                        {/* Subscription */}
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentType === 'SUBSCRIPTION' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                            <RadioGroupItem value="SUBSCRIPTION" className="mt-1" />
                            <div>
                                <div className="flex items-center gap-2 font-medium">
                                    <CreditCard className="w-4 h-4 text-primary" />
                                    Subscription
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">Auto-recurring payments.</p>
                            </div>
                        </label>
                    </RadioGroup>

                    {/* Installment Options */}
                    {paymentType === 'INSTALLMENT' && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-xl animate-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Frequency</Label>
                                    <Select value={installmentFrequency} onValueChange={(v) => { setInstallmentFrequency(v); setInstallmentCount(undefined); }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Duration</Label>
                                    <Select value={installmentCount?.toString()} onValueChange={(v) => setInstallmentCount(parseInt(v))}>
                                        <SelectTrigger disabled={!installmentFrequency}>
                                            <SelectValue placeholder="Count" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {installmentFrequency === 'WEEKLY'
                                                ? Array.from({ length: 12 }, (_, i) => i + 1).map(num => <SelectItem key={num} value={num.toString()}>{num} Weeks</SelectItem>)
                                                : Array.from({ length: 3 }, (_, i) => i + 1).map(num => <SelectItem key={num} value={num.toString()}>{num} Months</SelectItem>)
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bank Details logic: Required for Installment/Subscription */}
                    {paymentType !== 'SINGLE_PAYMENT' && (
                        <div className="space-y-4 pt-2 border-t mt-4 animate-in slide-in-from-top-2">
                            <div className="flex gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <p>Bank details required for automatic debit mandate.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Bank Name</Label>
                                <Select value={bankCode} onValueChange={setBankCode}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your bank" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {NIGERIAN_BANKS.map((bank) => (
                                            <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Account Number</Label>
                                <Input
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    placeholder="10-digit account number"
                                    maxLength={10}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!isFormValid() || isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm Switch
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SwitchPlanModal;
