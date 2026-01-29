import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, QrCode, Clock, CreditCard, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { formatNaira } from '@/lib/feeConfig';
import axiosInstance from '@/lib/axiosConfig';
import { RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PaymentDetails {
    id: number;
    onePipePaymentId?: string;
    description: string;
    amount: number;
    downPayment?: number; // Added downPayment
    customerAccountNumber?: string;
    status: string;
    paymentType: string;
    category?: string;
    date?: string;
    virtualAccountNumber?: string;
    virtualAccountBankName?: string;
    virtualAccountName?: string;
    virtualAccountExpiryDate?: string;
    qrCodeUrl?: string;
    completedPayments?: number;
    numberOfPayments?: number;
    remainingAmount?: number;
}

interface PaymentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: PaymentDetails | null;
    onCancelSuccess?: () => void;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ isOpen, onClose, payment, onCancelSuccess }) => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isQuerying, setIsQuerying] = useState(false);

    const isBranchAdmin = user?.role === 'BRANCH_ADMIN';

    if (!payment) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCancelSubscription = async () => {
        if (!window.confirm('Are you sure you want to cancel this subscription? This action cannot be undone.')) return;

        setIsCancelling(true);
        try {
            await axiosInstance.post(`/payments/${payment.onePipePaymentId}/cancel`);
            alert('Subscription cancelled successfully');
            if (onCancelSuccess) onCancelSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to cancel subscription', error);
            alert('Failed to cancel subscription. Please try again.');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleQueryStatus = async () => {
        if (!payment.onePipePaymentId) {
            toast.error('Payment ID missing');
            return;
        }
        setIsQuerying(true);
        try {
            const response = await axiosInstance.post(`/payments/${payment.onePipePaymentId}/query`);
            toast.success(`Payment status updated to ${response.data.status}`);
            // Success call onCancelSuccess to refresh parent dashboard data
            if (onCancelSuccess) onCancelSuccess();
        } catch (error) {
            console.error('Failed to query payment status', error);
            toast.error('Failed to update status');
        } finally {
            setIsQuerying(false);
        }
    };

    const status = payment.status.toUpperCase();
    const type = payment.paymentType?.toUpperCase();
    const isPending = status === 'PENDING';
    const isActive = status === 'ACTIVE';
    const isInstallment = type === 'INSTALLMENT';
    const isSubscription = type === 'SUBSCRIPTION';

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'ACTIVE': return <CreditCard className="w-5 h-5 text-blue-500" />;
            case 'SUCCESSFUL': return <CheckCircle className="w-5 h-5 text-primary" />;
            case 'FAILED':
            case 'CANCELLED': return <XCircle className="w-5 h-5 text-destructive" />;
            default: return null;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return <Badge variant="pending">Pending</Badge>;
            case 'ACTIVE': return <Badge variant="active">Active</Badge>;
            case 'SUCCESSFUL': return <Badge variant="success">Successful</Badge>;
            case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
            case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        Payment Details
                    </DialogTitle>
                    <DialogDescription>
                        {payment.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Status and Amount */}
                    <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
                        <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <div className="mt-1">{getStatusBadge(status)}</div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                                {isInstallment ? 'Down Payment' : 'Amount'}
                            </p>
                            <p className="text-xl font-bold text-primary">
                                {formatNaira(isInstallment && payment.downPayment ? payment.downPayment : payment.amount)}
                            </p>
                        </div>
                    </div>

                    {/* Transfer Reminder for Installment and Subscription */}
                    {(isInstallment || isSubscription) && payment.customerAccountNumber && isPending && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Transfer Reminder</p>
                            <p className="text-sm text-amber-700">
                                Please transfer the exact amount from your account <strong>{payment.customerAccountNumber}</strong> to the virtual account below to authorize/complete this {isInstallment ? 'installment' : 'subscription'}.
                            </p>
                        </div>
                    )}

                    {/* Payment Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Payment Type</p>
                            <p className="font-medium capitalize">{payment.paymentType?.replace(/_/g, ' ').toLowerCase() || 'Item Payment'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Identifier</p>
                            <p className="font-medium truncate">{payment.onePipePaymentId || 'N/A'}</p>
                        </div>
                        {isInstallment && payment.numberOfPayments && (
                            <div className="col-span-2 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">Installment Progress</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">
                                        Payment {payment.completedPayments || 0} of {payment.numberOfPayments}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {Math.round(((payment.completedPayments || 0) / payment.numberOfPayments) * 100)}% Complete
                                    </p>
                                </div>
                                <div className="mt-2 w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${((payment.completedPayments || 0) / payment.numberOfPayments) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Virtual Account Details (Show only if Pending) */}
                    {isPending && payment.virtualAccountNumber ? (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-foreground border-t pt-4">How to Pay</h4>
                            <div className="space-y-3">
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground">Bank Name</p>
                                    <p className="font-medium">{payment.virtualAccountBankName || 'N/A'}</p>
                                </div>

                                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Account Number</p>
                                        <p className="font-semibold text-lg">{payment.virtualAccountNumber}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(payment.virtualAccountNumber!)}
                                    >
                                        {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>

                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground">Account Name</p>
                                    <p className="font-medium">{payment.virtualAccountName || 'N/A'}</p>
                                </div>

                                {payment.virtualAccountExpiryDate && (() => {
                                    const expiryDate = new Date(payment.virtualAccountExpiryDate);
                                    const isExpired = expiryDate < new Date();
                                    return (
                                        <div className={`p-3 rounded-lg border ${isExpired ? 'bg-destructive/10 border-destructive/20' : 'bg-destructive/10 border-destructive/20'}`}>
                                            <p className={`text-xs ${isExpired ? 'text-destructive font-bold' : 'text-destructive'}`}>
                                                {isExpired ? 'EXPIRED' : 'Expires On'}
                                            </p>
                                            <p className="font-medium text-destructive">
                                                {expiryDate.toLocaleDateString()} {expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    );
                                })()}

                                {payment.qrCodeUrl && (
                                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border">
                                        <img src={payment.qrCodeUrl} alt="Payment QR Code" className="w-32 h-32 mb-2" />
                                        <p className="text-xs text-muted-foreground">Scan QR to pay</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 border-t pt-4">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Payment Date</p>
                                <p className="font-medium">{payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            {payment.customerAccountNumber && (
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-xs text-muted-foreground">Source Account</p>
                                    <p className="font-medium">{payment.customerAccountNumber}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3 pt-2">
                        {isActive && isSubscription && (
                            <Button
                                variant="destructive"
                                className="w-full gap-2"
                                onClick={handleCancelSubscription}
                                disabled={isCancelling}
                            >
                                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                                Cancel Subscription
                            </Button>
                        )}
                        {isBranchAdmin && (
                            <Button
                                variant="secondary"
                                className="w-full gap-2"
                                onClick={handleQueryStatus}
                                disabled={isQuerying}
                            >
                                {isQuerying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                                Query Status
                            </Button>
                        )}
                        <Button variant="outline" className="w-full" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PaymentDetailsModal;

