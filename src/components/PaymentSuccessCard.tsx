import React from 'react';
import { Home, LogIn, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { formatInvoiceExpiry } from '@/lib/paymentDates';
import OfflineDemoNotice from '@/components/OfflineDemoNotice';
import PaymentTermsSummary from '@/components/dashboards/PaymentTermsSummary';
import type { InvoicePaymentDetails } from '@/types/payment-api';

interface PaymentSuccessCardProps {
  studentName: string;
  paymentDetails: InvoicePaymentDetails;
}

/** A registration receipt describes the created invoice, never a confirmed financial payment. */
const PaymentSuccessCard: React.FC<PaymentSuccessCardProps> = ({ studentName, paymentDetails }) => {
  const { user } = useAuth();
  const dashboard = user?.role === 'PARENT' ? '/parent' : user?.role === 'BRANCH_ADMIN' ? '/branch-admin' : '/super-admin';
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-greenfield-50 via-background to-greenfield-100">
      <Card className="w-full max-w-md shadow-elevated animate-slide-in overflow-hidden">
        <CardHeader className="bg-gradient-hero text-center py-8">
          <div className="w-16 h-16 mx-auto bg-primary-foreground/20 rounded-full flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-primary-foreground" /></div>
          <h2 className="text-2xl font-bold text-primary-foreground">Registration Complete</h2>
          <p className="text-primary-foreground/90 mt-2">A demo invoice has been created for {studentName}.</p>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <OfflineDemoNotice />
          <p className="text-sm text-muted-foreground">Registration and invoice creation do not confirm that funds were collected. No real payment is required for this demonstration.</p>
          <PaymentTermsSummary payment={paymentDetails} />
          <div className="space-y-2 p-3 bg-muted rounded-lg">
            <h3 className="font-semibold">Synthetic invoice account metadata</h3>
            <p className="text-sm">Bank: {paymentDetails.bankName || 'Unavailable'}</p>
            <p className="text-sm">Account: {paymentDetails.accountNumber || 'Unavailable'}</p>
            <p className="text-sm">Name: {paymentDetails.accountName || 'Unavailable'}</p>
            <p className="text-xs text-muted-foreground">Do not transfer money. These are synthetic details and cannot automatically confirm payment.</p>
          </div>
          <p className="text-sm text-muted-foreground">Invoice window expiry: {formatInvoiceExpiry(paymentDetails.expiryDate)}. Expiry does not terminate a recurring plan.</p>
          <Link to={user ? dashboard : '/login'} className="block"><Button className="w-full shadow-button"><LogIn className="w-4 h-4 mr-2" />{user ? 'View Dashboard' : 'Login to View Your Dashboard'}</Button></Link>
          <Link to="/" className="block"><Button variant="ghost" className="w-full"><Home className="w-4 h-4 mr-2" />Back to Home</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessCard;