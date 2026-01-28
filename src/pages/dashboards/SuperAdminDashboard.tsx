import React, { useState, useEffect } from 'react';
import { Building2, Users, CreditCard, TrendingUp, Plus, Trash2, MapPin, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DashboardLayout from '@/components/DashboardLayout';
import LoadingScreen from '@/components/LoadingScreen';
import axiosInstance from '@/lib/axiosConfig';
import { formatNaira } from '@/lib/feeConfig';

interface Branch {
  id: number;
  businessName: string;
  branchCode: string;
  billerCode: string;
  address: string;
  adminEmail: string;
  phoneNumber: string;
  contactPersonName: string;
  studentCount?: number;
  totalPayments?: number;
}

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

interface DashboardStats {
  totalBranches: string;
  totalStudents: string;
  totalRevenue: number;
  activePayments: string;
}

const SuperAdminDashboard: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
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

  useEffect(() => {
    Promise.all([fetchBranches(), fetchStats()]).finally(() => setIsLoading(false));
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get<DashboardStats>('/super-admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axiosInstance.get<Branch[]>('/branches');
      setBranches(response.data);
    } catch (error) {
      console.error('Failed to fetch branches');
      setBranches([]);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axiosInstance.post('/branches', formData);
      await fetchBranches();
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
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create branch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranch = async (id: number) => {
    if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      return;
    }
    try {
      await axiosInstance.delete(`/branches/${id}`);
      await fetchBranches();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete branch');
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <DashboardLayout title="Super Admin Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Branches</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalBranches || '0'}</p>
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
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.totalStudents || '0'}</p>
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
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatNaira(stats?.totalRevenue || 0)}</p>
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
                <p className="text-sm text-muted-foreground">Active Payments</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats?.activePayments || '0'}</p>
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
                    {(branch.studentCount !== undefined || branch.totalPayments !== undefined) && (
                      <div className="flex gap-4 mt-2 text-sm">
                        {branch.studentCount !== undefined && (
                          <span className="text-primary font-medium">
                            {branch.studentCount} students
                          </span>
                        )}
                        {branch.totalPayments !== undefined && (
                          <span className="text-foreground font-medium">
                            {formatNaira(branch.totalPayments)} collected
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteBranch(branch.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
