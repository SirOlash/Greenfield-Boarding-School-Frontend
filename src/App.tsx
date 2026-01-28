import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Dashboards
import SuperAdminDashboard from "./pages/dashboards/SuperAdminDashboard";
import BranchAdminDashboard from "./pages/dashboards/BranchAdminDashboard";
import ParentDashboard from "./pages/dashboards/ParentDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />

            {/* Super Admin Routes */}
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/*"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Branch Admin Routes */}
            <Route
              path="/branch-admin"
              element={
                <ProtectedRoute allowedRoles={['BRANCH_ADMIN']}>
                  <BranchAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/branch-admin/*"
              element={
                <ProtectedRoute allowedRoles={['BRANCH_ADMIN']}>
                  <BranchAdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Parent Routes */}
            <Route
              path="/parent"
              element={
                <ProtectedRoute allowedRoles={['PARENT']}>
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parent/*"
              element={
                <ProtectedRoute allowedRoles={['PARENT']}>
                  <ParentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
