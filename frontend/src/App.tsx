import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MsalProvider } from '@azure/msal-react';
import { pca } from './lib/msal-config';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Toaster } from './components/ui/toaster';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardPage } from './pages/DashboardPage';
import { NewRequestPage } from './pages/NewRequestPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { QueuePage } from './pages/QueuePage';
import { ProcessorPage } from './pages/ProcessorPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ImportPage } from './pages/ImportPage';
import { AuditPage } from './pages/AuditPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdvancedDashboardPage } from './pages/AdvancedDashboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <MsalProvider instance={pca}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="requests/new" element={<ProtectedRoute allowedRoles={['STUDENT', 'VERIFIER', 'PROCESSOR', 'ADMIN']}><NewRequestPage /></ProtectedRoute>} />
                <Route path="requests/my" element={<ProtectedRoute allowedRoles={['STUDENT', 'VERIFIER', 'PROCESSOR', 'ADMIN']}><MyRequestsPage /></ProtectedRoute>} />
                <Route path="requests/:id" element={<RequestDetailPage />} />
                <Route path="queue/verifier" element={<ProtectedRoute allowedRoles={['VERIFIER', 'ADMIN']}><QueuePage queueType="verifier" /></ProtectedRoute>} />
                <Route path="queue/library" element={<ProtectedRoute allowedRoles={['LIBRARY', 'ADMIN']}><QueuePage queueType="library" /></ProtectedRoute>} />
                <Route path="queue/bursar" element={<ProtectedRoute allowedRoles={['BURSAR', 'ADMIN']}><QueuePage queueType="bursar" /></ProtectedRoute>} />
                <Route path="queue/academic" element={<ProtectedRoute allowedRoles={['ACADEMIC', 'ADMIN']}><QueuePage queueType="academic" /></ProtectedRoute>} />
                <Route path="processor" element={<ProtectedRoute allowedRoles={['PROCESSOR', 'ADMIN']}><ProcessorPage /></ProtectedRoute>} />
                <Route path="admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
                <Route path="admin/import" element={<ProtectedRoute allowedRoles={['ADMIN']}><ImportPage /></ProtectedRoute>} />
                <Route path="admin/audit" element={<ProtectedRoute allowedRoles={['ADMIN']}><AuditPage /></ProtectedRoute>} />
                <Route path="admin/reports" element={<ProtectedRoute allowedRoles={['ADMIN']}><ReportsPage /></ProtectedRoute>} />
                <Route path="admin/advanced" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdvancedDashboardPage /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
              </Route>
            </Routes>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </MsalProvider>
    </ErrorBoundary>
  );
}

export default App;
