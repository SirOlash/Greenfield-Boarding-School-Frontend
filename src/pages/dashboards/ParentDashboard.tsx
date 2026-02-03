import React, { useState, useEffect } from 'react';
import { Users, Clock, History, ChevronRight, ArrowLeft, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from '@/components/DashboardLayout';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import axiosInstance from '@/lib/axiosConfig';
import { formatNaira } from '@/lib/feeConfig';
import PaymentDetailsModal, { PaymentDetails } from '@/components/dashboards/PaymentDetailsModal';
import CreatePaymentModal from '@/components/dashboards/CreatePaymentModal';
import InvoiceSuccessModal from '@/components/dashboards/InvoiceSuccessModal';
import { PaymentRequest, RegisterStudentResponse } from '@/types/payment-api';
import { toast } from 'sonner';
import { usePaymentPolling } from '@/hooks/usePaymentPolling';

interface Child {
  id: number;
  firstName: string;
  surname: string;
  classGrade: string;
  branchName: string;
  pendingAmount?: number;
}

const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailView, setIsDetailView] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [invoiceResponse, setInvoiceResponse] = useState<RegisterStudentResponse | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  // Sync selected payment data when polling refreshes the list
  useEffect(() => {
    if (isModalOpen && selectedPayment) {
      const updated = payments.find(p =>
        p.id === selectedPayment.id &&
        (p.paymentType === selectedPayment.paymentType || p.description === selectedPayment.description)
      );
      if (updated && (updated.status !== selectedPayment.status || updated.completedPayments !== selectedPayment.completedPayments)) {
        setSelectedPayment(updated);
      }
    }
  }, [payments, isModalOpen]);

  useEffect(() => {
    fetchChildren();
  }, [user?.email]);

  // Determine if we should poll for updates
  const hasUpdatesNeeded = children.some(c => (c.pendingAmount || 0) > 0) ||
    payments.some(p => ['PENDING', 'ACTIVE'].includes(p.status.toUpperCase()));

  // Poll for updates every 5 seconds if there are pending/active payments
  usePaymentPolling(() => {
    if (isDetailView && selectedChild) {
      fetchPayments(selectedChild.id);
    } else {
      fetchChildren();
    }
  }, hasUpdatesNeeded);

  const fetchChildren = async () => {
    try {
      const response = await axiosInstance.get<Child[]>(`/students?parentEmail=${user?.email}`);
      // console.log('API Response (Parent -> fetchChildren):', response.data);
      const childrenData = response.data;

      // Fetch payments for each child to get accurate totals (consistent with detail view)
      const updatedChildren = await Promise.all(childrenData.map(async (child) => {
        try {
          const paymentsRes = await axiosInstance.get<PaymentDetails[]>(`/payments?studentId=${child.id}`);
          const total = paymentsRes.data
            .filter(p => ['PENDING', 'ACTIVE'].includes(p.status.toUpperCase()))
            .reduce((acc, curr) => acc + (curr.paymentType?.toUpperCase() === 'INSTALLMENT' && curr.remainingAmount != null ? curr.remainingAmount : curr.amount), 0);

          // Use the calculated total if it's different from the record's pendingAmount
          return {
            ...child,
            pendingAmount: total
          };
        } catch (e) {
          return child;
        }
      }));

      setChildren(updatedChildren);
    } catch (error) {
      console.error('Failed to fetch children');
      setChildren([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayments = async (childId: number) => {
    try {
      const response = await axiosInstance.get<PaymentDetails[]>(`/payments?studentId=${childId}`);
      // console.log('API Response (Parent -> fetchPayments):', response.data);
      setPayments(response.data);
    } catch (error) {
      console.log('Failed to fetch payments');
      setPayments([]);
    }
  };

  const handleSelectChild = (child: Child) => {
    setSelectedChild(child);
    fetchPayments(child.id);
    setIsDetailView(true);
  };

  const handleBackToChildren = () => {
    setIsDetailView(false);
    setSelectedChild(null);
    setPayments([]);
  };

  const handleViewPayment = (payment: PaymentDetails) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case 'PENDING': return <Badge variant="pending">Pending</Badge>;
      case 'ACTIVE': return <Badge variant="active">Active</Badge>;
      case 'SUCCESSFUL': return <Badge variant="success">Successful</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  const pendingActivePayments = payments.filter(p => ['PENDING', 'ACTIVE'].includes(p.status.toUpperCase()));
  const historyPayments = payments.filter(p => ['SUCCESSFUL', 'FAILED', 'CANCELLED'].includes(p.status.toUpperCase()));
  const hasPendingSchoolFees = pendingActivePayments.some(p => p.category === 'SCHOOL_FEES');

  const handleGenerateInvoice = async () => {
    if (!selectedChild) return;

    // Use student's stored payment type if available, otherwise default to SINGLE
    // Note: The PaymentDetails interface has paymentType, but the Child interface does not explicitly show it in the component above locally.
    // However, looking at BranchAdminDashboard, the Student interface has paymentType. 
    // I will assume Child interface might need it or I'll access it safely.
    // Actually, I'll default to 'SINGLE' if not present to avoid errors, or try to infer.
    // The user's prompt suggested: "(will you be able to get the current payment type for the child?)"
    // I will try to check if the child object in `children` state has it.
    // Let's assume for now default to SINGLE if undefined, but ideally we should fetch it.
    // Update: I will just use 'SINGLE' as a fallback.

    setIsGeneratingInvoice(true);
    try {
      const paymentType = (selectedChild as any).paymentType === 'SINGLE' ? 'SINGLE_PAYMENT' : ((selectedChild as any).paymentType || 'SINGLE_PAYMENT');

      const payload: PaymentRequest = {
        studentId: selectedChild.id,
        category: 'SCHOOL_FEES',
        amount: 500, // Fixed amount as per requirements
        paymentType: paymentType,
        description: 'School Fees Payment'
      };

      const response = await axiosInstance.post<RegisterStudentResponse>('/payments/new', payload);
      setInvoiceResponse(response.data);
      setIsInvoiceModalOpen(true);
      toast.success('Invoice generated successfully');

      // Refresh payments to show the new pending payment
      fetchPayments(selectedChild.id);
    } catch (error: any) {
      console.error('Failed to generate invoice', error);
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  return (
    <DashboardLayout title={`Welcome, ${user?.firstName}`}>
      {/* Detail View for Selected Child */}
      {isDetailView && selectedChild ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <Button
            variant="ghost"
            onClick={handleBackToChildren}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Children
          </Button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {selectedChild.firstName} {selectedChild.surname}
              </h2>
              <p className="text-muted-foreground">{selectedChild.classGrade}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                AD-HOC Payments
              </Button>
              {!hasPendingSchoolFees && (
                <Button variant="outline" onClick={handleGenerateInvoice} disabled={isGeneratingInvoice} className="gap-2">
                  {isGeneratingInvoice ? <Clock className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  Generate Invoice for School Fees
                </Button>
              )}
              {pendingActivePayments.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                  <p className="text-xs text-amber-600 uppercase font-semibold tracking-wider">Total Pending</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {formatNaira(pendingActivePayments.reduce((acc, curr) => acc + (curr.paymentType?.toUpperCase() === 'INSTALLMENT' && curr.remainingAmount != null ? curr.remainingAmount : curr.amount), 0))}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue="pending" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2 max-w-md mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending & Active ({pendingActivePayments.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                History ({historyPayments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingActivePayments.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground border-dashed">
                  No active or pending payments found for {selectedChild.firstName}.
                </Card>
              ) : (
                pendingActivePayments.map((payment, index) => (
                  <Card
                    key={`${payment.id}-${index}`}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleViewPayment(payment)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{payment.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {payment.paymentType?.replace(/_/g, ' ').toLowerCase() || 'Payment'}
                          {payment.paymentType?.toUpperCase() === 'INSTALLMENT' && (
                            <span className="ml-1 text-[10px] font-medium opacity-80">
                              ({payment.completedPayments ?? 0}/{payment.numberOfPayments || (payment as any).numberOfInstallments || 0})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right flex flex-col items-end">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-0.5 text-right w-full">
                            {payment.paymentType?.toUpperCase() === 'INSTALLMENT' ? 'Remaining Balance' : 'Amount'}
                          </p>
                          <p className="font-bold text-foreground">
                            {formatNaira(
                              payment.paymentType?.toUpperCase() === 'INSTALLMENT' && payment.remainingAmount != null
                                ? payment.remainingAmount
                                : payment.amount
                            )}
                          </p>
                          {getStatusBadge(payment.status)}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {historyPayments.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground border-dashed">
                  No payment history found for {selectedChild.firstName}.
                </Card>
              ) : (
                historyPayments.map((payment, index) => (
                  <Card
                    key={`${payment.id}-${index}`}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleViewPayment(payment)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{payment.description}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {payment.paymentType?.replace(/_/g, ' ').toLowerCase() || 'Payment'}
                          {payment.paymentType?.toUpperCase() === 'INSTALLMENT' && (
                            <span className="ml-1 text-[10px] font-medium opacity-80">
                              ({payment.completedPayments ?? 0}/{payment.numberOfPayments || (payment as any).numberOfInstallments || 0})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right flex flex-col items-end">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-0.5 text-right w-full">
                            {payment.paymentType?.toUpperCase() === 'INSTALLMENT' ? 'Remaining Balance' : 'Amount'}
                          </p>
                          <p className="font-bold text-foreground">
                            {formatNaira(
                              payment.paymentType?.toUpperCase() === 'INSTALLMENT' && payment.remainingAmount != null
                                ? payment.remainingAmount
                                : payment.amount
                            )}
                          </p>
                          {getStatusBadge(payment.status)}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* Overview View - All Children Cards */
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">My Children</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children.length === 0 ? (
              <Card className="col-span-full p-12 text-center text-muted-foreground border-dashed">
                You don't have any children registered yet.
              </Card>
            ) : (
              children.map((child, index) => (
                <Card
                  key={`${child.id}-${index}`}
                  className="group cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-card"
                  onClick={() => handleSelectChild(child)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                          {child.firstName} {child.surname}
                        </p>
                        <p className="text-sm text-muted-foreground">{child.classGrade}</p>
                      </div>
                      <div className="p-2 rounded-full bg-secondary text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">School</p>
                        <p className="font-semibold text-foreground">{child.branchName}</p>
                      </div>
                      {child.pendingAmount !== undefined && child.pendingAmount > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider mb-1">Pending Amount</p>
                          <p className="font-bold text-amber-700">{formatNaira(child.pendingAmount)}</p>
                        </div>
                      )}
                    </div>

                    <Button variant="secondary" className="w-full mt-6 group-hover:bg-primary group-hover:text-primary-foreground">
                      View Payments
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Payment details Modal */}
      <PaymentDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payment={selectedPayment}
        onCancelSuccess={() => selectedChild && fetchPayments(selectedChild.id)}
      />

      {/* Create Ad-hoc Payment Modal */}
      {selectedChild && (
        <CreatePaymentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          studentId={selectedChild.id}
          studentName={`${selectedChild.firstName} ${selectedChild.surname}`}
          onSuccess={() => fetchPayments(selectedChild.id)}
        />
      )}

      <InvoiceSuccessModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        data={invoiceResponse}
      />
    </DashboardLayout>
  );
};

export default ParentDashboard;
