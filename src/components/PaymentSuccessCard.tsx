import React, { useState } from 'react';
import { Copy, Check, Download, Home, LogIn, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatNaira } from '@/lib/feeConfig';
import { Link } from 'react-router-dom';

interface PaymentDetails {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  customerAccountNumber: string;
  expiryDate: string;
  qrCodeImage: string;
  paymentType: string;
  downPayment?: number;
}

interface PaymentSuccessCardProps {
  studentName: string;
  paymentDetails: PaymentDetails;
}

const PaymentSuccessCard: React.FC<PaymentSuccessCardProps> = ({
  studentName,
  paymentDetails,
}) => {
  const { paymentType, downPayment } = paymentDetails;
  const [copied, setCopied] = useState(false);

  // Normalize payment type for easier comparison
  const normalizedType = (paymentType || '').toUpperCase();
  const isInstallment = normalizedType.includes('INSTALLMENT');
  const isSubscription = normalizedType.includes('SUBSCRIPTION');
  const isSingle = normalizedType.includes('SINGLE') || normalizedType.includes('ONE_TIME') || (!isInstallment && !isSubscription);

  // Prioritize downPayment if it exists (not null or undefined), even if it's 0
  const hasDownPayment = downPayment !== undefined && downPayment !== null;

  // LOGIC FIX: Always prioritize downPayment for non-single payments if it's smaller than the total amount
  const displayAmount = (isInstallment || isSubscription) && hasDownPayment && downPayment < paymentDetails.amount
    ? downPayment
    : paymentDetails.amount;

  const copyAccountNumber = () => {
    navigator.clipboard.writeText(paymentDetails.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const planName = isSingle ? 'Full Payment' : isInstallment ? 'Installment Plan' : 'Subscription Plan';
    const receiptContent = `
GREENFIELD BOARDING SCHOOL
Payment Receipt - ${planName}
========================

Student: ${studentName}
Amount to Pay Now: ${formatNaira(displayAmount)}

Virtual Account Details:
Bank: ${paymentDetails.bankName || 'Bank'}
Account Number: ${paymentDetails.accountNumber}
Account Name: ${paymentDetails.accountName}
Valid Until: ${paymentDetails.expiryDate ? new Date(paymentDetails.expiryDate).toLocaleDateString() : 'N/A'}

========================
Please transfer the exact amount from your account (${paymentDetails.customerAccountNumber}) to complete registration.
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenfield-payment-${studentName.replace(' ', '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-greenfield-50 via-background to-greenfield-100">
      <Card className="w-full max-w-md shadow-elevated animate-slide-in overflow-hidden">
        {/* Success Header */}
        <CardHeader className="bg-gradient-hero text-center py-8">
          <div className="w-16 h-16 mx-auto bg-primary-foreground/20 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-primary-foreground">Registration Successful!</h2>
          <p className="text-primary-foreground/90 mt-2">Welcome to Greenfield, {studentName}</p>
          <div className="inline-block px-3 py-1 mt-3 rounded-full bg-white/20 text-xs text-white font-medium">
            {isSingle ? 'Full Payment' : isInstallment ? 'Installment Plan' : 'Subscription Plan'}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Amount */}
          <div className="text-center py-4 bg-secondary rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">
              {isSingle ? 'Total Amount to Pay' : 'Initial Payment to Make'}
            </p>
            <p className="text-3xl font-bold text-primary">
              {formatNaira(displayAmount)}
            </p>
            {isInstallment && hasDownPayment && (
              <p className="text-xs text-muted-foreground mt-1 italic">
                (Down payment only)
              </p>
            )}
          </div>

          {/* Virtual Account Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Virtual Account Details</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Bank Name</p>
                  <p className="font-medium">{paymentDetails.bankName || 'VFD Microfinance Bank'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Account Number</p>
                  <p className="font-semibold text-lg tracking-wider">{paymentDetails.accountNumber}</p>
                </div>
                {paymentDetails.accountNumber && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAccountNumber}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Account Name</p>
                  <p className="font-medium">{paymentDetails.accountName || 'Greenfield Boarding School'}</p>
                </div>
              </div>

              {paymentDetails.customerAccountNumber && !isSingle && (
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg border border-dashed border-primary/30">
                  <div>
                    <p className="text-xs text-muted-foreground">Source Account (Transfer from this account)</p>
                    <p className="font-medium">{paymentDetails.customerAccountNumber}</p>
                  </div>
                </div>
              )}

              {paymentDetails.expiryDate && (
                <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div>
                    <p className="text-xs text-destructive">Valid Until</p>
                    <p className="font-medium text-destructive">
                      {new Date(paymentDetails.expiryDate).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          {paymentDetails.qrCodeImage && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Scan to Pay</p>
              <div className="inline-block p-4 bg-card rounded-xl shadow-card border">
                <img
                  src={paymentDetails.qrCodeImage}
                  alt="Payment QR Code"
                  className="w-40 h-40 mx-auto"
                />
              </div>
            </div>
          )}

          {/* Contextual Reminders */}
          <div className="space-y-3">
            {(isSubscription || isInstallment) && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <MessageSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Action Required</p>
                  <p className="text-amber-700 mt-1">
                    {isSubscription
                      ? `Please transfer the initial amount from account ${paymentDetails.customerAccountNumber || 'your linked account'} to authorize your mandate.`
                      : `Please transfer the down payment from account ${paymentDetails.customerAccountNumber || 'your linked account'} to complete registration.`
                    }
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-greenfield-50 rounded-lg border border-greenfield-200">
              <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Notification sent</p>
                <p className="text-muted-foreground mt-1">
                  A copy of these instructions has been sent to your email and phone.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button variant="outline" onClick={handleDownload} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Link to="/login" className="w-full">
              <Button className="w-full shadow-button">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </Link>
          </div>

          <Link to="/" className="block">
            <Button variant="ghost" className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessCard;
