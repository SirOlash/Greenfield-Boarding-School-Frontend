import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, Info } from 'lucide-react';
import { formatNaira } from '@/lib/feeConfig';
import { RegisterStudentResponse } from '@/types/payment-api';

interface InvoiceSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: RegisterStudentResponse | null;
}

const InvoiceSuccessModal: React.FC<InvoiceSuccessModalProps> = ({ isOpen, onClose, data }) => {
    const [copied, setCopied] = useState(false);

    if (!data || !data.paymentDetails) return null;

    const { paymentDetails, studentName } = data;
    const {
        amount,
        downPayment,
        paymentType,
        bankName,
        accountNumber,
        accountName,
        expiryDate,
        customerAccountNumber
    } = paymentDetails;

    const normalizedType = (paymentType || '').toUpperCase();
    const isInstallment = normalizedType.includes('INSTALLMENT');
    const isSubscription = normalizedType.includes('SUBSCRIPTION');
    const isSingle = !isInstallment && !isSubscription;

    // Logic from PaymentSuccessCard: Prioritize downPayment ONLY for installments
    const displayAmount = isInstallment && downPayment !== undefined && downPayment < amount
        ? downPayment
        : amount;

    const copyAccountNumber = () => {
        if (accountNumber) {
            navigator.clipboard.writeText(accountNumber);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full mb-2">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">Invoice Generated Successfully</DialogTitle>
                    <DialogDescription className="text-center">
                        Payment invoice for {studentName} has been created.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Amount Display */}
                    <div className="text-center py-4 bg-secondary/50 rounded-xl border border-border">
                        <p className="text-sm text-muted-foreground mb-1">
                            {isSingle || isSubscription ? 'Total Amount to Pay' : 'Initial Payment to Make'}
                        </p>
                        <p className="text-3xl font-bold text-primary">
                            {formatNaira(displayAmount)}
                        </p>
                        {isInstallment && downPayment !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                                (Down payment only)
                            </p>
                        )}
                    </div>

                    {/* Account Details */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-foreground border-b pb-2">Virtual Account Details</h4>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                <div>
                                    <p className="text-xs text-muted-foreground">Bank Name</p>
                                    <p className="font-medium">{bankName || 'VFD Microfinance Bank'}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                <div>
                                    <p className="text-xs text-muted-foreground">Account Number</p>
                                    <p className="font-semibold text-lg tracking-wider">{accountNumber}</p>
                                </div>
                                {accountNumber && (
                                    <Button variant="ghost" size="sm" onClick={copyAccountNumber}>
                                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                )}
                            </div>

                            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                <div>
                                    <p className="text-xs text-muted-foreground">Account Name</p>
                                    <p className="font-medium">{accountName || 'Greenfield Boarding School'}</p>
                                </div>
                            </div>

                            {/* Transfer Reminder */}
                            {(isInstallment || isSubscription) && customerAccountNumber && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex gap-2">
                                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="text-xs text-amber-800">
                                            <span className="font-bold">Important:</span> Please transfer the exact amount from your registered account <strong>{customerAccountNumber}</strong> to authorize this mandate.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {expiryDate && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                                    <p className="text-xs text-destructive">Expires On</p>
                                    <p className="font-medium text-destructive">
                                        {new Date(expiryDate).toLocaleDateString()} {new Date(expiryDate).toLocaleTimeString()}
                                    </p>
                                </div>
                            )}

                            {/* Show QR Code if available */}
                            {/* Assuming qrCodeUrl is part of paymentDetails, adding safe check */}
                            {(paymentDetails as any).qrCodeUrl && (
                                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border">
                                    <img src={(paymentDetails as any).qrCodeUrl} alt="Payment QR Code" className="w-32 h-32 mb-2" />
                                    <p className="text-xs text-muted-foreground">Scan QR to pay</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button className="w-full" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default InvoiceSuccessModal;
