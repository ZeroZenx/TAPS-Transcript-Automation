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
