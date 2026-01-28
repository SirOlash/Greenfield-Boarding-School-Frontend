import React, { useState, useEffect } from 'react';
import { Users, CreditCard, Clock, Search, Eye, ArrowLeft, History, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import axiosInstance from '@/lib/axiosConfig';
import { formatNaira } from '@/lib/feeConfig';
import PaymentDetailsModal, { PaymentDetails } from '@/components/dashboards/PaymentDetailsModal';
import CreatePaymentModal from '@/components/dashboards/CreatePaymentModal';

interface Student {
  id: number;
  firstName: string;
  surname: string;
  classGrade: string;
  parentEmail: string;
  parentFullName: string;
  paymentType: string;
  status: string;
  pendingAmount?: number;
}

const BranchAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Student Detail View State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentPayments, setStudentPayments] = useState<PaymentDetails[]>([]);
  const [isDetailView, setIsDetailView] = useState(false);

  // Payment Modals State
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user?.branchId]);

  const fetchData = async () => {
    try {
      const [studentsRes, paymentsRes] = await Promise.all([
        axiosInstance.get<Student[]>(`/students?branchId=${user?.branchId}`),
        axiosInstance.get<PaymentDetails[]>(`/payments?branchId=${user?.branchId}`),
      ]);
      setStudents(studentsRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Failed to fetch data');
      setStudents([]);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentPayments = async (studentId: number) => {
    try {
      const response = await axiosInstance.get<PaymentDetails[]>(`/payments?studentId=${studentId}`);
      console.log('API Response (BranchAdmin -> fetchStudentPayments):', response.data);
      setStudentPayments(response.data);
    } catch (error) {
      console.log('Failed to fetch student payments');
      setStudentPayments([]);
    }
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    fetchStudentPayments(student.id);
    setIsDetailView(true);
  };

  const handleBackToList = () => {
    setIsDetailView(false);
    setSelectedStudent(null);
    setStudentPayments([]);
  };

  const handleViewPayment = (payment: PaymentDetails) => {
    setSelectedPayment(payment);
    setIsModalOpen(true);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    switch (s) {
      case 'PENDING': return <Badge variant="pending">Pending</Badge>;
      case 'ACTIVE': return <Badge variant="active">Active</Badge>;
      case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <LoadingScreen />;

  const pendingActivePayments = studentPayments.filter(p => ['PENDING', 'ACTIVE'].includes(p.status.toUpperCase()));
  const historyPayments = studentPayments.filter(p => ['COMPLETED', 'CANCELLED'].includes(p.status.toUpperCase()));

  return (
    <DashboardLayout title="Branch Dashboard">
      {isDetailView && selectedStudent ? (
        /* Student Detail View */
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
          <Button variant="ghost" onClick={handleBackToList} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Student List
          </Button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {selectedStudent.firstName} {selectedStudent.surname}
              </h2>
              <p className="text-muted-foreground">{selectedStudent.classGrade} • {selectedStudent.parentEmail}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                AD-HOC Payments
              </Button>
              {pendingActivePayments.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-amber-700">
                    {formatNaira(pendingActivePayments.reduce((acc, curr) => acc + (curr.paymentType?.toUpperCase() === 'INSTALLMENT' && curr.remainingAmount != null ? curr.remainingAmount : curr.amount), 0))}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue="pending" className="w-full">
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
                  No active or pending payments found.
                </Card>
              ) : (
                pendingActivePayments.map((payment, index) => (
                  <Card key={`${payment.id}-${index}`} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewPayment(payment)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{payment.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground capitalize">{payment.paymentType?.replace(/_/g, ' ').toLowerCase() || 'Payment'}</p>
                          {payment.paymentType?.toUpperCase() === 'INSTALLMENT' && (
                            <span className="ml-1 text-[10px] font-medium opacity-80">
                              ({payment.completedPayments ?? 0}/{payment.numberOfPayments || (payment as any).numberOfInstallments || 0})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right flex flex-col items-end">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-0.5">
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
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {historyPayments.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground border-dashed">
                  No payment history found.
                </Card>
              ) : (
                historyPayments.map((payment, index) => (
                  <Card key={`${payment.id}-${index}`} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewPayment(payment)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{payment.description}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground capitalize">{payment.paymentType?.replace(/_/g, ' ').toLowerCase() || 'Payment'}</p>
                          {payment.paymentType?.toUpperCase() === 'INSTALLMENT' && (
                            <span className="ml-1 text-[10px] font-medium opacity-80">
                              ({payment.completedPayments ?? 0}/{payment.numberOfPayments || (payment as any).numberOfInstallments || 0})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right flex flex-col items-end">
                          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-0.5">
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
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* List View */
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold text-foreground mt-1">{students.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">
                  {payments.filter(p => p.status.toUpperCase() === 'PENDING').length}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold text-blue-500 mt-1">
                  {payments.filter(p => p.status.toUpperCase() === 'ACTIVE').length}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {payments.filter(p => p.status.toUpperCase() === 'COMPLETED').length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Students
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Parent Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Parent Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student, index) => (
                      <TableRow key={`${student.id}-${index}`}>
                        <TableCell className="font-medium text-foreground">
                          {student.firstName} {student.surname}
                        </TableCell>
                        <TableCell>{student.classGrade}</TableCell>
                        <TableCell>{student.parentFullName}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {student.parentEmail}
                        </TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleViewStudent(student)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment details Modal */}
      <PaymentDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payment={selectedPayment}
        onCancelSuccess={() => {
          fetchData();
          if (selectedStudent) fetchStudentPayments(selectedStudent.id);
        }}
      />

      {/* Create Ad-hoc Payment Modal */}
      {selectedStudent && (
        <CreatePaymentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          studentId={selectedStudent.id}
          studentName={`${selectedStudent.firstName} ${selectedStudent.surname}`}
          onSuccess={() => fetchStudentPayments(selectedStudent.id)}
        />
      )}
    </DashboardLayout>
  );
};

export default BranchAdminDashboard;
