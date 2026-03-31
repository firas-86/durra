/**
 * التطبيق الرئيسي: إدارة المسارات، التوثيق، والتصميم العام
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Workers from "./pages/Workers";
import Tasks from "./pages/Tasks";
import Evaluations from "./pages/Evaluations";
import AddEvaluation from "./pages/AddEvaluation";
import EditEvaluation from "./pages/EditEvaluation";
import MonthlyReport from "./pages/MonthlyReport";
import AccountStatement from "./pages/AccountStatement";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import AdminUsers from "./pages/AdminUsers";
import AuditLogs from "./pages/AuditLogs";
import Attendance from "./pages/Attendance";
import ProductionTomato from "./pages/ProductionTomato";
import ProductionKetchup from "./pages/ProductionKetchup";
import ProductionManagement from "./pages/ProductionManagement";
import PackagingDepartment from "./pages/PackagingDepartment";
import PalletTracking from "./pages/PalletTracking";

import Laboratory from "./pages/Laboratory";
import WarehousePage from "./pages/WarehousePage";
import WorkerDashboard from "./pages/WorkerDashboard";

// مكون حماية المسارات: يتحقق من تسجيل الدخول والصلاحيات قبل عرض الصفحة
import Orders from "./pages/Orders";

function ProtectedRoute({ children, permission, role }: { children: React.ReactNode, permission?: string, role?: string }) {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-durra-green font-bold">جاري التحميل...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect worker to dashboard if trying to access other pages
  if (user.role === 'worker' && role !== 'worker') {
    // Allow access to settings page
    if (location.pathname === '/settings') {
      return <>{children}</>;
    }
    return <Navigate to="/worker-dashboard" replace />;
  }

  // Redirect non-worker trying to access worker dashboard
  if (role === 'worker' && user.role !== 'worker') {
    return <Navigate to="/" replace />;
  }

  if (permission && user.role !== "admin" && !(user.permissions || []).includes(permission)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gray-50" dir="rtl">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">عذراً، لا تملك صلاحية</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة. يرجى التواصل مع المسؤول لتفعيل حسابك أو تسجيل الدخول بحساب آخر.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="w-full bg-durra-green text-white px-6 py-3 rounded-xl hover:bg-durra-green-light transition-all font-bold shadow-md active:scale-95"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// إدارة المسارات مع تأثيرات الانتقال الحركية
function AnimatedRoutes() {
  const location = useLocation();
  const { user } = useAuth(); // Need user here for conditional routing

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} className="w-full h-full">
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route path="/worker-dashboard" element={
            <ProtectedRoute role="worker">
              <Layout><WorkerDashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/" element={
            user?.role === 'worker' ? <Navigate to="/worker-dashboard" replace /> :
            <ProtectedRoute permission="view_dashboard">
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute permission="view_orders">
              <Layout><Orders /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/workers" element={
            <ProtectedRoute permission="view_workers">
              <Layout><Workers /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/tasks" element={
            <ProtectedRoute permission="view_tasks">
              <Layout><Tasks /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/evaluations" element={
            <ProtectedRoute permission="view_evaluations">
              <Layout><Evaluations /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/evaluations/new" element={
            <ProtectedRoute permission="add_evaluation">
              <Layout><AddEvaluation /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/evaluations/edit/:id" element={
            <ProtectedRoute permission="edit_evaluation">
              <Layout><EditEvaluation /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute permission="view_reports">
              <Layout><MonthlyReport /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute permission="view_attendance">
              <Layout><Attendance /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/account-statement" element={
            <ProtectedRoute permission="view_account_statements">
              <Layout><AccountStatement /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute permission="manage_users">
              <Layout><AdminUsers /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/audit-logs" element={
            <ProtectedRoute permission="view_audit_logs">
              <Layout><AuditLogs /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/production/tomato" element={
            <ProtectedRoute permission="view_production_tomato">
              <Layout><ProductionTomato /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/production/ketchup" element={
            <ProtectedRoute permission="view_production_ketchup">
              <Layout><ProductionKetchup /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/production/management" element={
            <ProtectedRoute permission="manage_production">
              <Layout><ProductionManagement /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/packaging" element={
            <ProtectedRoute permission="view_packaging">
              <Layout><PackagingDepartment /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/laboratory" element={
            <ProtectedRoute permission="view_laboratory">
              <Layout><Laboratory /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/warehouse" element={
            <ProtectedRoute permission="view_warehouse">
              <Layout><WarehousePage /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/pallet-tracking" element={
            <ProtectedRoute permission="track_pallets">
              <Layout><PalletTracking /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout><Settings /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AnimatedRoutes />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
