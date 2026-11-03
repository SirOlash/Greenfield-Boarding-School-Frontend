import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Users, Clock, Search, Eye, ArrowLeft, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import axiosInstance from '@/lib/axiosConfig';
import { formatNaira } from '@/lib/feeConfig';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { getBalanceLabel, getConfirmedLabel, getInstallmentProgress, getInstructionStatus, normalizeBranchPayment, summarizePayments } from '@/lib/paymentPresentation';
import PaymentDetailsModal, { PaymentDetails } from '@/components/dashboards/PaymentDetailsModal';
import { BranchPaymentDto, BranchStudentDto } from '@/types/payment-api';
import { usePaymentPolling } from '@/hooks/usePaymentPolling';

const BranchAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<BranchStudentDto[]>([]);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<BranchStudentDto | null>(null);
  const [studentPayments, setStudentPayments] = useState<PaymentDetails[]>([]);
  const selectedStudentIdRef = useRef<number | null>(null);
  const studentPaymentsRequestRef = useRef(0);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (user?.branchId == null) {
      setLoadError('Your account does not identify an assigned branch. Sign in again or contact an administrator.');
      setIsLoading(false);
      return;
    }
    try {
      const [studentsRes, paymentsRes] = await Promise.all([
        axiosInstance.get<BranchStudentDto[]>(`/students?branchId=${user.branchId}`),
        axiosInstance.get<BranchPaymentDto[]>(`/payments?branchId=${user.branchId}`),
      ]);
      setStudents(studentsRes.data);
      // Branch rows have `type` and a database ID, not a provider payment ID.
      setPayments(paymentsRes.data.map(normalizeBranchPayment));
      setLoadError(null);
    } catch (error: unknown) {
      setLoadError(getApiErrorMessage(error, 'Unable to load this branch.'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.branchId]);

  const fetchStudentPayments = useCallback(async (studentId: number) => {
    if (selectedStudentIdRef.current !== studentId) return;
    const requestId = ++studentPaymentsRequestRef.current;
    const isCurrentRequest = () => selectedStudentIdRef.current === studentId && studentPaymentsRequestRef.current === requestId;
    try {
      // This authorized detail response includes the provider ID needed by query.
      // Never substitute BranchPaymentDto.id into /payments/{providerId}/query.
      const response = await axiosInstance.get<PaymentDetails[]>(`/payments?studentId=${studentId}`);
      if (!isCurrentRequest()) return;
      setStudentPayments(response.data);
      setLoadError(null);
    } catch (error: unknown) {
      if (!isCurrentRequest()) return;
      setStudentPayments([]);
      setLoadError(getApiErrorMessage(error, 'Unable to load the student payment records.'));
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);
  usePaymentPolling(() => {
    if (selectedStudent) void fetchStudentPayments(selectedStudent.id);
    else void fetchData();
  }, (selectedStudent ? studentPayments : payments).some(payment => payment.status === 'PENDING' || payment.status === 'ACTIVE'));

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
            {expired && <p className="text-xs text-amber-700">Payment instructions expired; recurring plan status is separate.</p>}
            {payment.status === 'CANCELLED' && payment.paymentType === 'SUBSCRIPTION' && <p className="text-xs text-muted-foreground">Cancelled subscription; confirmed collections remain recorded.</p>}
          </div>
          <div className="flex items-center gap-4"><div className="text-right space-y-1"><p className="text-[10px] text-muted-foreground uppercase font-semibold">Outstanding balance</p><p className="font-bold text-foreground">{getBalanceLabel(payment)}</p>{getStatusBadge(payment.status)}</div><Eye className="w-5 h-5 text-muted-foreground" /></div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) return <LoadingScreen />;
  const filteredStudents = students.filter(student => [student.firstName, student.surname, student.parentEmail].some(value => value?.toLowerCase().includes(searchTerm.toLowerCase())));
  const pendingActivePayments = studentPayments.filter(payment => payment.status === 'PENDING' || payment.status === 'ACTIVE');
  const historyPayments = studentPayments.filter(payment => payment.status !== 'PENDING' && payment.status !== 'ACTIVE');
  const summary = summarizePayments(selectedStudent ? studentPayments : payments);
  const modalPayment = selectedPayment?.onePipePaymentId
    ? studentPayments.find(payment => payment.onePipePaymentId === selectedPayment.onePipePaymentId) ?? selectedPayment
    : selectedPayment;

  return (
    <DashboardLayout title="Branch Dashboard">
      {loadError && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{loadError}</p>}
      {selectedStudent ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <Button variant="ghost" onClick={() => { selectedStudentIdRef.current = null; studentPaymentsRequestRef.current++; setSelectedPayment(null); setIsModalOpen(false); setSelectedStudent(null); setStudentPayments([]); setLoadError(null); void fetchData(); }} className="mb-4 -ml-2"><ArrowLeft className="w-4 h-4 mr-2" />Back to Student List</Button>
          <div><h2 className="text-3xl font-bold text-foreground">{selectedStudent.firstName} {selectedStudent.surname}</h2><p className="text-muted-foreground">{selectedStudent.classGrade} · {selectedStudent.parentEmail}</p></div>
          {!loadError && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Confirmed collections</p><p className="text-2xl font-bold">{formatNaira(summary.confirmedAmount)}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Outstanding finite balances</p><p className="text-2xl font-bold">{formatNaira(summary.remainingAmount)}</p>{summary.unknownCount > 0 && <p className="text-xs text-muted-foreground">Some balances lack verified accounting evidence.</p>}{summary.subscriptionCount > 0 && <p className="text-xs text-muted-foreground">Unlimited subscription balances have no finite total.</p>}</CardContent></Card></div>}
          <p className="text-sm text-muted-foreground">Administrative access permits viewing and read-only payment queries. Only the owning parent can manage payment plans.</p>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="w-full grid grid-cols-2 max-w-md mb-6"><TabsTrigger value="pending" className="flex items-center gap-2"><Clock className="w-4 h-4" />Pending & Active ({pendingActivePayments.length})</TabsTrigger><TabsTrigger value="history" className="flex items-center gap-2"><History className="w-4 h-4" />History ({historyPayments.length})</TabsTrigger></TabsList>
            <TabsContent value="pending" className="space-y-4">{pendingActivePayments.length === 0 ? <Card className="p-12 text-center text-muted-foreground border-dashed">No active or pending payments found.</Card> : pendingActivePayments.map(renderPayment)}</TabsContent>
            <TabsContent value="history" className="space-y-4">{historyPayments.length === 0 ? <Card className="p-12 text-center text-muted-foreground border-dashed">No payment history found.</Card> : historyPayments.map(renderPayment)}</TabsContent>
          </Tabs>
        </div>
      ) : (
        <>
          {!loadError && <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-card"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Students</p><p className="text-2xl font-bold text-foreground mt-1">{students.length}</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Confirmed Collections</p><p className="text-2xl font-bold text-primary mt-1">{formatNaira(summary.confirmedAmount)}</p></CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Outstanding Finite Balances</p><p className="text-2xl font-bold text-amber-600 mt-1">{formatNaira(summary.remainingAmount)}</p>{summary.unknownCount > 0 && <p className="text-xs text-muted-foreground">Includes unknown balances.</p>}{summary.subscriptionCount > 0 && <p className="text-xs text-muted-foreground">Unlimited subscriptions have no finite balance.</p>}</CardContent></Card>
            <Card className="shadow-card"><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pending / Active Plans</p><p className="text-2xl font-bold text-blue-600 mt-1">{payments.filter(payment => payment.status === 'PENDING' || payment.status === 'ACTIVE').length}</p><p className="text-xs text-muted-foreground">Plan count, not proof of payment.</p></CardContent></Card>
          </div>}
          <Card className="shadow-card">
            <CardHeader><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />Students</CardTitle><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search students..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} className="pl-9" /></div></div></CardHeader>
            <CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Class</TableHead><TableHead>Parent Name</TableHead><TableHead className="hidden sm:table-cell">Parent Email</TableHead><TableHead>School-Fee Plan Status</TableHead><TableHead className="w-10" /></TableRow></TableHeader><TableBody>{filteredStudents.map(student => <TableRow key={student.id}><TableCell className="font-medium text-foreground">{student.firstName} {student.surname}</TableCell><TableCell>{student.classGrade}</TableCell><TableCell>{student.parentFullName}</TableCell><TableCell className="hidden sm:table-cell text-muted-foreground">{student.parentEmail}</TableCell><TableCell>{getStatusBadge(student.status)}</TableCell><TableCell><Button variant="ghost" size="sm" aria-label={`View payments for ${student.firstName} ${student.surname}`} onClick={() => { selectedStudentIdRef.current = student.id; setSelectedPayment(null); setIsModalOpen(false); setSelectedStudent(student); setStudentPayments([]); void fetchStudentPayments(student.id); }}><Eye className="w-4 h-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent>
          </Card>
        </>
      )}
      <PaymentDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} payment={modalPayment} onCancelSuccess={() => { void fetchData(); if (selectedStudent) void fetchStudentPayments(selectedStudent.id); }} />
    </DashboardLayout>
  );
};

export default BranchAdminDashboard;