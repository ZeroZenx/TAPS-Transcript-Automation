import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Try local token first
  const localToken = sessionStorage.getItem('auth_token');
  if (localToken) {
    config.headers.Authorization = `Bearer ${localToken}`;
    return config;
  }

  // Fallback to Azure AD token
  const azureToken = sessionStorage.getItem('msal_access_token');
  if (azureToken) {
    config.headers.Authorization = `Bearer ${azureToken}`;
    // Also add user info from session
    const userInfo = sessionStorage.getItem('user_info');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      config.headers['x-user-email'] = user.email;
      config.headers['x-user-name'] = user.name;
      config.headers['x-user-role'] = user.role;
    }
  }
  return config;
});

export default api;

// Auth endpoints
export const authApi = {
  login: (data: { email: string; name: string; token: string }) =>
    api.post('/auth/login', data),
  loginLocal: (data: { email: string; password: string }) =>
    api.post('/auth/login-local', data),
  register: (data: { email: string; name: string; password: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Request endpoints
export const requestsApi = {
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/requests', { params }),
  getMy: () => api.get('/requests/my'),
  getById: (id: string) => api.get(`/requests/${id}`),
  create: (data: any) => api.post('/requests', data),
  update: (id: string, data: any) => api.patch(`/requests/${id}`, data),
};

// Admin endpoints
export const adminApi = {
  getUsers: (params?: { page?: number; limit?: number; role?: string }) =>
    api.get('/admin/users', { params }),
  updateUserRole: (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }),
  getStats: () => api.get('/admin/stats'),
};

// Import endpoints
export const importApi = {
  importTSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Don't set Content-Type - let axios set it with boundary for multipart/form-data
    return api.post('/import/tsv', formData);
  },
};

// Audit endpoints
export const auditApi = {
  getLogs: (params?: {
    requestId?: string;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/audit', { params }),
  getRequestLogs: (requestId: string) =>
    api.get(`/audit/request/${requestId}`),
  getStats: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/audit/stats', { params }),
};

// Reports endpoints
export const reportsApi = {
  getReports: (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    department?: string;
    program?: string;
    studentEmail?: string;
    format?: 'json' | 'csv';
  }) => {
    if (params?.format === 'csv') {
      return api.get('/reports', {
        params,
        responseType: 'blob',
      });
    }
    return api.get('/reports', { params });
  },
  getSummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/summary', { params }),
};

// Settings endpoints
export const settingsApi = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data: any) => api.patch('/settings', data),
  testEmail: (testEmail: string) => api.post('/settings/test-email', { testEmail }),
  sendMessage: (requestId: string, message: string, recipient: string) => 
    api.post('/settings/send-message', { requestId, message, recipient }),
};

// Analytics endpoints
export const analyticsApi = {
  getPerformance: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/performance', { params }),
  getVolumeTrends: (params?: { period?: string; groupBy?: string }) =>
    api.get('/analytics/volume-trends', { params }),
  getBottlenecks: () => api.get('/analytics/bottlenecks'),
  getForecast: (params?: { days?: string }) =>
    api.get('/analytics/forecast', { params }),
  getCustomReport: (data: {
    filters?: any;
    dateRange?: { startDate?: string; endDate?: string };
    groupBy?: string;
  }) => api.post('/analytics/custom-report', data),
};

// SLA endpoints
export const slaApi = {
  getMetrics: (params?: {
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/sla', { params }),
  getCompliance: () => api.get('/sla/compliance'),
  checkPending: () => api.post('/sla/check-pending'),
};

// Backup endpoints
export const backupApi = {
  create: (data?: { backupType?: string }) => api.post('/backup/create', data),
  getAll: (params?: { status?: string; backupType?: string }) =>
    api.get('/backup', { params }),
  restore: (id: string) => api.post(`/backup/restore/${id}`),
  delete: (id: string) => api.delete(`/backup/${id}`),
  export: (data: { includeTypes?: string[] }) => api.post('/backup/export', data),
  import: (data: { data: any }) => api.post('/backup/import', data),
};

// Monitoring endpoints
export const monitoringApi = {
  getHealth: () => api.get('/monitoring/health'),
  getErrors: (params?: {
    resolved?: string;
    errorType?: string;
    limit?: string;
  }) => api.get('/monitoring/errors', { params }),
  resolveError: (id: string) => api.post(`/monitoring/errors/${id}/resolve`),
  getPerformance: (params?: { hours?: string }) =>
    api.get('/monitoring/performance', { params }),
};

// Scheduled Reports endpoints
export const scheduledReportsApi = {
  getAll: () => api.get('/scheduled-reports'),
  create: (data: {
    name: string;
    reportType: string;
    frequency: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    recipients: string[];
    filters?: any;
  }) => api.post('/scheduled-reports', data),
  update: (id: string, data: any) => api.patch(`/scheduled-reports/${id}`, data),
  delete: (id: string) => api.delete(`/scheduled-reports/${id}`),
  run: (id: string) => api.post(`/scheduled-reports/${id}/run`),
};
