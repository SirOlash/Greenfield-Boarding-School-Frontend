import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, History, ChevronRight, ArrowLeft, PlusCircle, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import axiosInstance from '@/lib/axiosConfig';
import { formatNaira } from '@/lib/feeConfig';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { canCreatePayment, canManagePaymentPlan, getBalanceLabel, getConfirmedLabel, getInstallmentProgress, getInstructionStatus, summarizePayments } from '@/lib/paymentPresentation';
import PaymentDetailsModal, { PaymentDetails } from '@/components/dashboards/PaymentDetailsModal';
import CreatePaymentModal from '@/components/dashboards/CreatePaymentModal';
import InvoiceSuccessModal from '@/components/dashboards/InvoiceSuccessModal';
import SwitchPlanModal from '@/components/dashboards/SwitchPlanModal';
import { ParentStudentDto, PaymentRequest, RegisterStudentResponse, SwitchPlanRequest } from '@/types/payment-api';
import { toast } from 'sonner';
import { usePaymentPolling } from '@/hooks/usePaymentPolling';

type Child = ParentStudentDto & { ledgerSummary: ReturnType<typeof summarizePayments> };

const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const selectedChildIdRef = useRef<number | null>(null);
  const paymentsRequestRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [invoiceResponse, setInvoiceResponse] = useState<RegisterStudentResponse | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSwitchPlanModalOpen, setIsSwitchPlanModalOpen] = useState(false);
  // The student response does not expose the saved plan. Only remember a plan after
  // the owning parent has successfully saved it; never guess a single-payment plan.
  const [savedPlans, setSavedPlans] = useState<Record<number, SwitchPlanRequest>>({});

  const fetchChildren = useCallback(async () => {
    if (!user?.email) {
      setLoadError('Sign in as a parent to view your children.');
      setIsLoading(false);
      return;
    }
    try {
      const response = await axiosInstance.get<ParentStudentDto[]>(`/students?parentEmail=${encodeURIComponent(user.email)}`);
      const withLedger = await Promise.all(response.data.map(async (child): Promise<Child> => {
        try {
          const records = await axiosInstance.get<PaymentDetails[]>(`/payments?studentId=${child.id}`);
          return { ...child, ledgerSummary: summarizePayments(records.data) };
        } catch {
          // A failed read provides no evidence that the child owes or has paid zero.
          return { ...child, ledgerSummary: { confirmedAmount: null, remainingAmount: null, unknownCount: 1, subscriptionCount: 0 } };
        }
      }));
      setChildren(withLedger);
      setLoadError(null);
    } catch (error: unknown) {
      setLoadError(getApiErrorMessage(error, 'Unable to load your children.'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.email]);

  const fetchPayments = useCallback(async (childId: number) => {
    if (selectedChildIdRef.current !== childId) return;
    const requestId = ++paymentsRequestRef.current;
    const isCurrentRequest = () => selectedChildIdRef.current === childId && paymentsRequestRef.current === requestId;
    try {
      const response = await axiosInstance.get<PaymentDetails[]>(`/payments?studentId=${childId}`);
      if (!isCurrentRequest()) return;
      setPayments(response.data);
      setLoadError(null);
    } catch (error: unknown) {
      if (!isCurrentRequest()) return;
      setPayments([]);
      setLoadError(getApiErrorMessage(error, 'Unable to load payment records.'));
    }
  }, []);

  useEffect(() => { void fetchChildren(); }, [fetchChildren]);

  usePaymentPolling(() => {
    if (selectedChild) void fetchPayments(selectedChild.id);
    else void fetchChildren();
  }, !selectedChild || payments.some(payment => payment.status === 'PENDING' || payment.status === 'ACTIVE'));

  const handleSelectChild = (child: Child) => {
    selectedChildIdRef.current = child.id;
    setSelectedPayment(null);
    setIsModalOpen(false);
    setSelectedChild(child);
    setPayments([]);
    void fetchPayments(child.id);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedChild || !canCreatePayment(user?.role)) return;
    const plan = savedPlans[selectedChild.id];
    if (!plan) {
      setIsSwitchPlanModalOpen(true);
      return;
    }
    setIsGeneratingInvoice(true);
    try {
      const payload: PaymentRequest = {
        studentId: selectedChild.id,
        category: 'SCHOOL_FEES',
        paymentType: plan.newPaymentType,
        frequency: plan.frequency,
        numberOfInstallments: plan.numberOfInstallments,
        description: 'School Fees Payment',
      };
      const response = await axiosInstance.post<RegisterStudentResponse>('/payments/new', payload);
      setInvoiceResponse(response.data);
      setIsInvoiceModalOpen(true);
      toast.success('Offline demo invoice created. No payment has been confirmed.');
      await fetchPayments(selectedChild.id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Unable to create the school-fee invoice.'));
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'PENDING': return <Badge variant="pending">Pending</Badge>;
      case 'ACTIVE': return <Badge variant="active">Active</Badge>;
      case 'SUCCESSFUL': return <Badge variant="success">Recorded successful</Badge>;
      case 'FAILED': return <Badge variant="destructive">Failed</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status ?? 'Unknown status'}</Badge>;
    }
  };

  const renderPayment = (payment: PaymentDetails, index: number) => {
    const progress = getInstallmentProgress(payment);
    const expired = getInstructionStatus(payment) === 'Expired';
    return (
      <Card key={payment.onePipePaymentId ?? `payment-${index}`} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedPayment(payment); setIsModalOpen(true); }}>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{payment.description || 'Payment plan'}</p>
            <p className="text-xs text-muted-foreground capitalize">{payment.paymentType?.replace(/_/g, ' ').toLowerCase() ?? 'Unknown plan'}</p>
            {progress && <p className="text-xs text-muted-foreground">{progress.label}</p>}
            <p className="text-xs text-muted-foreground">Confirmed collections: {getConfirmedLabel(payment)}</p>
            {expired && <p className="text-xs text-amber-700">Payment instructions expired; this alone does not end a recurring plan.</p>}
            {payment.status === 'CANCELLED' && payment.paymentType === 'SUBSCRIPTION' && <p className="text-xs text-muted-foreground">Subscription cancelled. Confirmed collections remain in its history.</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Outstanding balance</p>
              <p className="font-bold text-foreground">{getBalanceLabel(payment)}</p>
              {getStatusBadge(payment.status)}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) return <LoadingScreen />;
  const pendingActivePayments = payments.filter(payment => payment.status === 'PENDING' || payment.status === 'ACTIVE');
  const historyPayments = payments.filter(payment => payment.status !== 'PENDING' && payment.status !== 'ACTIVE');
  const summary = summarizePayments(payments);
  const modalPayment = selectedPayment?.onePipePaymentId
    ? payments.find(payment => payment.onePipePaymentId === selectedPayment.onePipePaymentId) ?? selectedPayment
    : selectedPayment;

  return (
    <DashboardLayout title={`Welcome, ${user?.firstName ?? 'Parent'}`}>
      {loadError && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{loadError}</p>}
      {selectedChild ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <Button variant="ghost" onClick={() => { selectedChildIdRef.current = null; paymentsRequestRef.current++; setSelectedPayment(null); setIsModalOpen(false); setSelectedChild(null); setPayments([]); setLoadError(null); void fetchChildren(); }} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Children
          </Button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">{selectedChild.firstName} {selectedChild.surname}</h2>
              <p className="text-muted-foreground">{selectedChild.classGrade}</p>
            </div>
            <div className="flex items-center flex-wrap gap-3">
              {canCreatePayment(user?.role) && <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2"><PlusCircle className="w-4 h-4" />AD-HOC Payments</Button>}
              {canManagePaymentPlan(user?.role) && <Button variant="outline" onClick={() => setIsSwitchPlanModalOpen(true)} className="gap-2"><Settings className="w-4 h-4" />Switch Plan</Button>}
              {canCreatePayment(user?.role) && <Button variant="outline" onClick={() => void handleGenerateInvoice()} disabled={isGeneratingInvoice} className="gap-2"><PlusCircle className="w-4 h-4" />{savedPlans[selectedChild.id] ? 'Generate Invoice for School Fees' : 'Choose School-Fee Plan'}</Button>}
            </div>
          </div>
          {canManagePaymentPlan(user?.role) && !savedPlans[selectedChild.id] && <p className="text-sm text-muted-foreground">To create a school-fee invoice, save the intended plan first. The student response does not include the saved plan. The backend checks for existing plans and determines the final fee.</p>}
          {!loadError && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Confirmed collections</p><p className="text-2xl font-bold">{formatNaira(summary.confirmedAmount)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Outstanding finite balances</p><p className="text-2xl font-bold">{formatNaira(summary.remainingAmount)}</p>{summary.unknownCount > 0 && <p className="text-xs text-muted-foreground">Some balances lack verified accounting evidence.</p>}{summary.subscriptionCount > 0 && <p className="text-xs text-muted-foreground">{summary.subscriptionCount} unlimited subscription(s), without a finite remaining balance.</p>}</CardContent></Card>
          </div>}
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="w-full grid grid-cols-2 max-w-md mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2"><Clock className="w-4 h-4" />Pending & Active ({pendingActivePayments.length})</TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2"><History className="w-4 h-4" />History ({historyPayments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-4">{pendingActivePayments.length === 0 ? <Card className="p-12 text-center text-muted-foreground border-dashed">No active or pending payments found.</Card> : pendingActivePayments.map(renderPayment)}</TabsContent>
            <TabsContent value="history" className="space-y-4">{historyPayments.length === 0 ? <Card className="p-12 text-center text-muted-foreground border-dashed">No payment history found.</Card> : historyPayments.map(renderPayment)}</TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 mb-2"><div className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /><h2 className="text-xl font-bold text-foreground">My Children</h2></div>{canCreatePayment(user?.role) && <Button asChild variant="outline" className="gap-2"><Link to="/register"><PlusCircle className="w-4 h-4" />Register Another Child</Link></Button>}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {children.length === 0 ? <Card className="col-span-full p-12 text-center text-muted-foreground border-dashed">No registered children to display.</Card> : children.map(child => (
              <Card key={child.id} className="group cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-card" onClick={() => handleSelectChild(child)}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start"><div className="space-y-1"><p className="text-lg font-bold text-foreground group-hover:text-primary">{child.firstName} {child.surname}</p><p className="text-sm text-muted-foreground">{child.classGrade}</p><p className="text-xs text-muted-foreground">{child.branchName}</p></div><ChevronRight className="w-5 h-5 text-muted-foreground" /></div>
                  <div className="mt-4 p-3 rounded-lg bg-secondary space-y-1"><p className="text-xs text-muted-foreground">Confirmed collections: {formatNaira(child.ledgerSummary.confirmedAmount)}</p><p className="text-sm font-semibold">Outstanding finite balances: {formatNaira(child.ledgerSummary.remainingAmount)}</p>{child.ledgerSummary.subscriptionCount > 0 && <p className="text-xs text-muted-foreground">Unlimited subscription balances have no finite total.</p>}</div>
                  <Button variant="secondary" className="w-full mt-6 group-hover:bg-primary group-hover:text-primary-foreground">View Payments</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      <PaymentDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} payment={modalPayment} onCancelSuccess={() => { if (selectedChild) void fetchPayments(selectedChild.id); }} />
      {selectedChild && canManagePaymentPlan(user?.role) && <SwitchPlanModal isOpen={isSwitchPlanModalOpen} onClose={() => setIsSwitchPlanModalOpen(false)} studentId={selectedChild.id} studentName={`${selectedChild.firstName} ${selectedChild.surname}`} onSuccess={(plan) => { if (plan) setSavedPlans(previous => ({ ...previous, [selectedChild.id]: plan })); void fetchChildren(); void fetchPayments(selectedChild.id); }} />}
      {selectedChild && canCreatePayment(user?.role) && <CreatePaymentModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} studentId={selectedChild.id} studentName={`${selectedChild.firstName} ${selectedChild.surname}`} onSuccess={(invoice) => { setInvoiceResponse(invoice); setIsInvoiceModalOpen(true); void fetchPayments(selectedChild.id); }} />}
      <InvoiceSuccessModal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} data={invoiceResponse} />
    </DashboardLayout>
  );
};

export default ParentDashboard;