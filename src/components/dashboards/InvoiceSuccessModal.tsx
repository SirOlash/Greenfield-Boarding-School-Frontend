import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatInvoiceExpiry } from '@/lib/paymentDates';
import OfflineDemoNotice from '@/components/OfflineDemoNotice';
import PaymentTermsSummary from './PaymentTermsSummary';
import type { RegisterStudentResponse } from '@/types/payment-api';

interface InvoiceSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RegisterStudentResponse | null;
}

const InvoiceSuccessModal: React.FC<InvoiceSuccessModalProps> = ({ isOpen, onClose, data }) => {
  if (!data?.paymentDetails) return null;
  const { paymentDetails, studentName } = data;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Demo Invoice Created</DialogTitle>
          <DialogDescription className="text-center">An invoice for {studentName || 'the student'} has been created. Invoice creation does not confirm payment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <OfflineDemoNotice />
          <PaymentTermsSummary payment={paymentDetails} />
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <h3 className="font-semibold">Synthetic invoice account metadata</h3>
            <p className="text-sm">Bank: {paymentDetails.bankName || 'Unavailable'}</p>
            <p className="text-sm">Account: {paymentDetails.accountNumber || 'Unavailable'}</p>
            <p className="text-sm">Name: {paymentDetails.accountName || 'Unavailable'}</p>
            <p className="text-xs text-muted-foreground">These details cannot be used for real transfers or automatic payment confirmation.</p>
          </div>
          <p className="text-sm text-muted-foreground">Invoice window expiry: {formatInvoiceExpiry(paymentDetails.expiryDate)}. This is separate from recurring plan termination.</p>
          <Button className="w-full" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceSuccessModal;