import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import axiosInstance from '@/lib/axiosConfig';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { parseInvoiceExpiry, formatInvoiceExpiry } from '@/lib/paymentDates';
import { canCancelSubscription, canQueryPayment, getBalanceLabel, getConfirmedLabel, getInstallmentProgress } from '@/lib/paymentPresentation';
import OfflineDemoNotice from '@/components/OfflineDemoNotice';
import PaymentTermsSummary from './PaymentTermsSummary';
import type { PaymentDetails, PaymentQueryResponse } from '@/types/payment-api';
import { toast } from 'sonner';

export type { PaymentDetails } from '@/types/payment-api';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentDetails | null;
  onCancelSuccess?: () => void;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ isOpen, onClose, payment, onCancelSuccess }) => {
  const { user } = useAuth();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<{ id: string; result: PaymentQueryResponse } | null>(null);
  if (!payment) return null;

  const status = payment.status?.toUpperCase() ?? 'UNKNOWN';
  const progress = getInstallmentProgress(payment);
  const diagnostics = queryResult?.id === payment.onePipePaymentId ? queryResult.result : null;
  const expiry = parseInvoiceExpiry(payment.virtualAccountExpiryDate);
  const expired = expiry !== null && expiry <= Date.now();

  const cancel = async () => {
    if (!canCancelSubscription(user?.role, payment) || !payment.onePipePaymentId) return;
    if (!window.confirm('Cancel future subscription cycles? Confirmed collections will remain recorded.')) return;
    setIsCancelling(true);
    try {
      await axiosInstance.post(`/payments/${encodeURIComponent(payment.onePipePaymentId)}/cancel`, null);
      toast.success('Subscription cancelled. Confirmed collections are unchanged.');
      onCancelSuccess?.();
      onClose();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Unable to cancel this subscription.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const query = async () => {
    if (!canQueryPayment(user?.role) || !payment.onePipePaymentId) return;
    setIsQuerying(true);
    try {
      const response = await axiosInstance.post<PaymentQueryResponse>(`/payments/${encodeURIComponent(payment.onePipePaymentId)}/query`);
      setQueryResult({ id: payment.onePipePaymentId, result: response.data });
      toast.success('Read-only payment query completed. No payment state was changed.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Unable to query this payment.'));
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
          <DialogDescription>{payment.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-3">
          <OfflineDemoNotice />
          <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
            <span className="text-sm text-muted-foreground">Recorded plan status</span>
            <Badge variant={status === 'SUCCESSFUL' ? 'success' : status === 'ACTIVE' ? 'active' : status === 'PENDING' ? 'pending' : 'outline'}>{status}</Badge>
          </div>
          <p className="text-sm">{status === 'CANCELLED' && payment.paymentType === 'SUBSCRIPTION' ? 'This subscription is cancelled; no further cycles are expected. Confirmed collections remain recorded.' : 'Pending and active plans do not by themselves confirm that money was collected.'}</p>
          <PaymentTermsSummary payment={payment} />
          <dl className="grid grid-cols-1 gap-3 p-3 bg-muted rounded-lg">
            <div><dt className="text-xs text-muted-foreground">Confirmed collections</dt><dd className="font-medium">{getConfirmedLabel(payment)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Outstanding balance</dt><dd className="font-medium">{getBalanceLabel(payment)}</dd></div>
          </dl>
          {progress ? (
            <div className="space-y-2 p-3 bg-primary/5 rounded-lg">
              <p className="font-medium text-sm">Confirmed installment progress</p>
              <p className="text-sm">{progress.label}</p>
              <div role="progressbar" aria-label="Confirmed installments" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed} className="h-1.5 bg-primary/10 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${progress.percent}%` }} /></div>
            </div>
          ) : payment.paymentType === 'INSTALLMENT' ? <p className="text-sm text-muted-foreground">Verified installment progress is unavailable. Historical payment counters are not collection evidence.</p> : null}
          {payment.virtualAccountNumber && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="font-semibold">Synthetic invoice account metadata</h3>
              <p className="text-sm">{payment.virtualAccountBankName || 'Synthetic bank'} · {payment.virtualAccountName || 'Synthetic account'}</p>
              <p className="font-medium">{payment.virtualAccountNumber}</p>
              <p className="text-xs text-muted-foreground">For demonstration only. Do not send money to this account.</p>
            </div>
          )}
          {expiry !== null && (
            <div className={`p-3 rounded-lg border ${expired ? 'bg-destructive/10 border-destructive/20' : 'bg-muted border-border'}`}>
              <p className="font-medium text-sm">{expired ? 'Expired payment instructions' : 'Invoice window expiry'}: {formatInvoiceExpiry(payment.virtualAccountExpiryDate)}</p>
              <p className="text-xs mt-1">An expired invoice window is separate from the plan status; it does not cancel an installment plan or subscription.</p>
            </div>
          )}
          {expiry === null && <p className="text-sm text-muted-foreground">Invoice window expiry: Unavailable. This does not establish the plan's status.</p>}
          {diagnostics && (
            <div className="p-3 border rounded-lg space-y-1 text-sm" aria-label="Read-only reconciliation diagnostics">
              <h3 className="font-semibold">Read-only reconciliation</h3>
              <p>Recorded status: {diagnostics.status || 'Unavailable'}</p>
              <p>Provider availability: {diagnostics.providerAvailability || 'Unavailable'}</p>
              <p>Provider-reported status: {diagnostics.providerStatus || 'Unavailable'}</p>
              <p>Invoice window: {diagnostics.invoiceWindowStatus || 'Unavailable'}</p>
              <p>Provider state consistent: {diagnostics.providerStateConsistent == null ? 'Unknown' : diagnostics.providerStateConsistent ? 'Yes' : 'No'}</p>
              <p>Local state consistent: {diagnostics.localStateConsistent == null ? 'Unknown' : diagnostics.localStateConsistent ? 'Yes' : 'No'}</p>
              <p className="text-xs text-muted-foreground">This query does not confirm a collection or change balances, status or provider state.</p>
            </div>
          )}
          <div className="space-y-3">
            {canCancelSubscription(user?.role, payment) && payment.onePipePaymentId && <Button variant="destructive" className="w-full gap-2" onClick={cancel} disabled={isCancelling}>{isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}Cancel Subscription</Button>}
            {canQueryPayment(user?.role) && payment.onePipePaymentId && <Button variant="secondary" className="w-full gap-2" onClick={query} disabled={isQuerying}>{isQuerying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}Query payment (read-only)</Button>}
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDetailsModal;