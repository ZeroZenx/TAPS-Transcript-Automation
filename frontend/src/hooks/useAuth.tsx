import { createContext, useContext, useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { loginRequest } from '../lib/msal-config';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Always call useMsal hook (React rules require this)
  const msalHook = useMsal();
  const instance = msalHook?.instance || null;
  const accounts = msalHook?.accounts || [];
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get user info from API (only if Azure login or local token exists)
  const hasAuth = accounts.length > 0 || !!sessionStorage.getItem('auth_token');
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await authApi.getMe();
      return response.data.user;
    },
    enabled: hasAuth,
    retry: false,
  });

  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
    setIsLoading(isUserLoading);
  }, [userData, isUserLoading]);

  // Check for local auth token on mount and when storage changes
  useEffect(() => {
    const checkLocalAuth = async () => {
      const localToken = sessionStorage.getItem('auth_token');
      const userInfoStr = sessionStorage.getItem('user_info');
      
      if (localToken) {
        // Always try to get fresh user data from API when token exists
        try {
          const response = await authApi.getMe();
          const freshUser = response.data.user;
          setUser(freshUser);
          // Update stored user info with fresh data
          sessionStorage.setItem('user_info', JSON.stringify(freshUser));
          setIsLoading(false);
          console.log('Auth - User loaded from API:', freshUser);
        } catch (error) {
          console.error('Auth - API call failed, using stored user:', error);
          // If API call fails, use stored user info as fallback
          if (userInfoStr) {
            try {
              const storedUser = JSON.parse(userInfoStr);
              setUser(storedUser);
              setIsLoading(false);
              console.log('Auth - Using stored user:', storedUser);
            } catch (e) {
              console.error('Auth - Invalid stored user info:', e);
              sessionStorage.removeItem('auth_token');
              sessionStorage.removeItem('user_info');
              setIsLoading(false);
            }
          } else {
            setIsLoading(false);
          }
        }
      } else if (!localToken && accounts.length === 0) {
        setIsLoading(false);
      }
    };

    checkLocalAuth();

    // Also listen for custom event when login happens
    const handleLogin = () => {
      checkLocalAuth();
    };

    window.addEventListener('storage', handleLogin);
    window.addEventListener('userLogin', handleLogin);
    return () => {
      window.removeEventListener('storage', handleLogin);
      window.removeEventListener('userLogin', handleLogin);
    };
  }, []);

  const login = async () => {
    if (!instance) {
      throw new Error('Microsoft 365 login is not available. Please use Local Login instead.');
    }
    try {
      const response = await instance.loginPopup(loginRequest);
      const account = response.account;
      
      if (account) {
        // Store token
        const tokenResponse = await instance.acquireTokenSilent({
          ...loginRequest,
          account: account,
        });
        sessionStorage.setItem('msal_access_token', tokenResponse.accessToken);
        sessionStorage.setItem('user_info', JSON.stringify({
          email: account.username,
          name: account.name || account.username,
          role: 'STUDENT', // Will be updated from API
        }));

        // Call backend login
        await authApi.login({
          email: account.username,
          name: account.name || account.username,
          token: tokenResponse.accessToken,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (instance) {
        await instance.logoutPopup();
      }
      sessionStorage.clear();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

