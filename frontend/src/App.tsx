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
import { DashboardPage } from './pages/DashboardPage';
import { NewRequestPage } from './pages/NewRequestPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { QueuePage } from './pages/QueuePage';
import { ProcessorPage } from './pages/ProcessorPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { ImportPage } from './pages/ImportPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  // Wrap in error boundary to catch initialization errors
  try {
    return (
      <MsalProvider instance={pca}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
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
                <Route path="requests/new" element={<ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}><NewRequestPage /></ProtectedRoute>} />
                <Route path="requests/my" element={<ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}><MyRequestsPage /></ProtectedRoute>} />
                <Route path="requests/:id" element={<RequestDetailPage />} />
                <Route path="queue/verifier" element={<ProtectedRoute allowedRoles={['VERIFIER', 'ADMIN']}><QueuePage queueType="verifier" /></ProtectedRoute>} />
                <Route path="queue/library" element={<ProtectedRoute allowedRoles={['LIBRARY', 'ADMIN']}><QueuePage queueType="library" /></ProtectedRoute>} />
                <Route path="queue/bursar" element={<ProtectedRoute allowedRoles={['BURSAR', 'ADMIN']}><QueuePage queueType="bursar" /></ProtectedRoute>} />
                <Route path="queue/academic" element={<ProtectedRoute allowedRoles={['ACADEMIC', 'ADMIN']}><QueuePage queueType="academic" /></ProtectedRoute>} />
                <Route path="processor" element={<ProtectedRoute allowedRoles={['PROCESSOR', 'ADMIN']}><ProcessorPage /></ProtectedRoute>} />
                <Route path="admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
                <Route path="admin/import" element={<ProtectedRoute allowedRoles={['ADMIN']}><ImportPage /></ProtectedRoute>} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </MsalProvider>
    );
  } catch (error) {
    console.error('App initialization error:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Application Error</h1>
        <p>Please check the browser console for details.</p>
        <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}

export default App;
