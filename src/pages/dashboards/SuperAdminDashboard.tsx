import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Users, CreditCard, TrendingUp, Plus, MapPin, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingScreen from '@/components/LoadingScreen';
import axiosInstance from '@/lib/axiosConfig';
import { formatNaira } from '@/lib/feeConfig';
import { Branch, BranchPaymentDto, DashboardStats } from '@/types/payment-api';
import { normalizeBranchPayment, summarizePayments } from '@/lib/paymentPresentation';
import { getApiErrorMessage } from '@/lib/apiErrors';
import { toast } from 'sonner';

interface BranchFormData {
  adminEmail: string;
  adminPassword: string;
  businessName: string;
  businessShortName: string;
  address: string;
  rcNumber: string;
  tin: string;
  contactFirstName: string;
  contactSurname: string;
  contactPhoneNumber: string;
  whatsappNumber: string;
  settlementAccountNumber: string;
  settlementBankCode: string;
}

const SuperAdminDashboard: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [branchSummaries, setBranchSummaries] = useState<Record<number, ReturnType<typeof summarizePayments>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<BranchFormData>({
    adminEmail: '',
    adminPassword: '',
    businessName: '',
    businessShortName: '',
    address: '',
    rcNumber: '',
    tin: '',
    contactFirstName: '',
    contactSurname: '',
    contactPhoneNumber: '',
    whatsappNumber: '',
    settlementAccountNumber: '',
    settlementBankCode: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const [branchResponse, statsResponse] = await Promise.all([
        axiosInstance.get<Branch[]>('/branches'),
        axiosInstance.get<DashboardStats>('/super-admin/stats'),
      ]);
      setBranches(branchResponse.data);
      setStats(statsResponse.data);
      const summaries = await Promise.all(branchResponse.data.map(async branch => {
        try {
          // There is no unfiltered GET /payments contract. Super administrators
          // may read each authorized branch, whose response uses `type`.
          const response = await axiosInstance.get<BranchPaymentDto[]>(`/payments?branchId=${branch.id}`);
          return [branch.id, summarizePayments(response.data.map(normalizeBranchPayment))] as const;
        } catch {
          return [branch.id, { confirmedAmount: null, remainingAmount: null, unknownCount: 1, subscriptionCount: 0 }] as const;
        }
      }));
      setBranchSummaries(Object.fromEntries(summaries));
      setLoadError(null);
    } catch (error: unknown) {
      setLoadError(getApiErrorMessage(error, 'Unable to load the administrative dashboard.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axiosInstance.post('/branches', formData);
      await fetchData();
      setIsDialogOpen(false);
      setFormData({
        adminEmail: '',
        adminPassword: '',
        businessName: '',
        businessShortName: '',
        address: '',
        rcNumber: '',
        tin: '',
        contactFirstName: '',
        contactSurname: '',
        contactPhoneNumber: '',
        whatsappNumber: '',
        settlementAccountNumber: '',
        settlementBankCode: '',
      });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to create branch'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout title="Super Admin Dashboard">
      {loadError && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{loadError}</p>}
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Branches</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalBranches ?? 'Unknown'}</p>
              </div>
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalStudents ?? 'Unknown'}</p>
              </div>
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed Collections</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatNaira(stats?.totalRevenue ?? null)}</p>
              </div>
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.activePayments ?? 'Unknown'}</p>
              </div>
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches Section */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            School Branches
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Branch</DialogTitle>
                <DialogDescription>
                  Enter the details for the new school branch below. All fields are required.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateBranch} className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="Greenfield Main Campus"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Short Name / Code</Label>
                    <Input
                      value={formData.businessShortName}
                      onChange={(e) => setFormData({ ...formData, businessShortName: e.target.value })}
                      placeholder="GF-MAIN"
                      required
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Address</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Full address"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Admin Email</Label>
                    <Input
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      placeholder="admin@branch.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Admin Password</Label>
                    <Input
                      type="password"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      placeholder="Strong password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact First Name</Label>
                    <Input
                      value={formData.contactFirstName}
                      onChange={(e) => setFormData({ ...formData, contactFirstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Surname</Label>
                    <Input
                      value={formData.contactSurname}
                      onChange={(e) => setFormData({ ...formData, contactSurname: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (234...)</Label>
                    <Input
                      value={formData.contactPhoneNumber}
                      onChange={(e) => setFormData({ ...formData, contactPhoneNumber: e.target.value })}
                      placeholder="2348012345678"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp (080...)</Label>
                    <Input
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      placeholder="08012345678"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RC Number</Label>
                    <Input
                      value={formData.rcNumber}
                      onChange={(e) => setFormData({ ...formData, rcNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TIN</Label>
                    <Input
                      value={formData.tin}
                      onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Settlement Account</Label>
                    <Input
                      value={formData.settlementAccountNumber}
                      onChange={(e) => setFormData({ ...formData, settlementAccountNumber: e.target.value })}
                      placeholder="10-digit account"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Settlement Bank Code</Label>
                    <Input
                      value={formData.settlementBankCode}
                      onChange={(e) => setFormData({ ...formData, settlementBankCode: e.target.value })}
                      placeholder="e.g., 057"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full shadow-button">
                  Create Branch
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {branches.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No branches created yet. Click "Add Branch" to create one.
              </p>
            ) : (
              branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-secondary rounded-xl gap-4"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{branch.businessName} ({branch.branchCode})</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {branch.address}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {branch.adminEmail}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Contact: {branch.contactPersonName}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="text-primary font-medium">Confirmed collections: {formatNaira(branchSummaries[branch.id]?.confirmedAmount ?? null)}</span>
                      <span className="text-foreground font-medium">Outstanding finite balances: {formatNaira(branchSummaries[branch.id]?.remainingAmount ?? null)}</span>
                    </div>
                    {(branchSummaries[branch.id]?.unknownCount ?? 0) > 0 && <p className="text-xs text-muted-foreground mt-1">Some balances lack verified accounting evidence.</p>}
                    {(branchSummaries[branch.id]?.subscriptionCount ?? 0) > 0 && <p className="text-xs text-muted-foreground mt-1">Unlimited subscriptions have no finite remaining balance.</p>}
                  </div>

                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
