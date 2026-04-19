import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Public
import LandingPage from '@/pages/LandingPage';

// Auth pages
import IdentityGateway from '@/pages/auth/IdentityGateway';

// User Portal
import UserLayout from '@/layouts/UserLayout';
import UserDashboard from '@/pages/user/UserDashboard';
import ConsentRequests from '@/pages/user/ConsentRequests';
import ConsentHistory from '@/pages/user/ConsentHistory';
import UserProfile from '@/pages/user/UserProfile';
import UserDataSharingRequests from '@/pages/user/DataSharingRequests';

// Organization Dashboard
import OrgLayout from '@/layouts/OrgLayout';
import OrgDashboard from '@/pages/org/OrgDashboard';
import ManageConsents from '@/pages/org/ManageConsents';
import CreateConsent from '@/pages/org/CreateConsent';
import ConsentDetails from '@/pages/org/ConsentDetails';
import Analytics from '@/pages/org/Analytics';
import AuditLogs from '@/pages/org/AuditLogs';
import OrgDataSharingRequests from '@/pages/org/DataSharingRequests';
import CreateDataSharingRequest from '@/pages/org/CreateDataSharingRequest';
import DataSharingTransactions from '@/pages/org/DataSharingTransactions';
import OrgDsarRequests from '@/pages/org/DsarRequests';
import BreachIncidents from '@/pages/org/BreachIncidents';
import ComplianceDashboard from '@/pages/org/ComplianceDashboard';
import UserDsarRequests from '@/pages/user/DsarRequests';
import RetentionPolicies from '@/pages/org/RetentionPolicies';
import PrivacyNotices from '@/pages/org/PrivacyNotices';
import PurposeRegistry from '@/pages/org/PurposeRegistry';
import RopaRegistry from '@/pages/org/RopaRegistry';
import DpiaManagement from '@/pages/org/DpiaManagement';
import SensitiveDataRecords from '@/pages/org/SensitiveDataRecords';
import DisclosureRegister from '@/pages/org/DisclosureRegister';
import DestructionCertificates from '@/pages/org/DestructionCertificates';

const ProtectedRoute = ({
  children,
  requiredRoles,
}: {
  children: React.ReactNode;
  requiredRoles?: string[];
}) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <Routes>
      {/* Public landing — always shown, no auto-redirect */}
      <Route path="/" element={<LandingPage />} />

      {/* Identity Gateway — user tab */}
      <Route path="/login" element={<IdentityGateway defaultTab="user" />} />
      {/* Identity Gateway — org tab */}
      <Route path="/admin/login" element={<IdentityGateway defaultTab="org" />} />

      {/* User Portal */}
      <Route
        path="/portal"
        element={
          <ProtectedRoute requiredRoles={['user', 'org_admin', 'super_admin']}>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<UserDashboard />} />
        <Route path="requests" element={<ConsentRequests />} />
        <Route path="history" element={<ConsentHistory />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="data-sharing" element={<UserDataSharingRequests />} />
        <Route path="data-rights" element={<UserDsarRequests />} />
      </Route>

      {/* Organization Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRoles={['org_admin', 'super_admin']}>
            <OrgLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OrgDashboard />} />
        <Route path="consents" element={<ManageConsents />} />
        <Route path="consents/new" element={<CreateConsent />} />
        <Route path="consents/:id" element={<ConsentDetails />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="data-sharing" element={<OrgDataSharingRequests />} />
        <Route path="data-sharing/new" element={<CreateDataSharingRequest />} />
        <Route path="data-sharing/transactions" element={<DataSharingTransactions />} />
        <Route path="dsar" element={<OrgDsarRequests />} />
        <Route path="breaches" element={<BreachIncidents />} />
        <Route path="compliance" element={<ComplianceDashboard />} />
        <Route path="retention" element={<RetentionPolicies />} />
        <Route path="privacy-notices" element={<PrivacyNotices />} />
        <Route path="purposes" element={<PurposeRegistry />} />
        <Route path="ropa" element={<RopaRegistry />} />
        <Route path="dpia" element={<DpiaManagement />} />
        <Route path="sensitive-data" element={<SensitiveDataRecords />} />
        <Route path="disclosure" element={<DisclosureRegister />} />
        <Route path="destruction" element={<DestructionCertificates />} />
      </Route>

      {/* Fallback */}
      <Route path="/unauthorized" element={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-500 mt-2">You don't have permission to view this page.</p>
          </div>
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
