import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useAuth } from '../hooks/useAuth';
import { loginRequest } from '../lib/msal-config';
import { authApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';

export function LoginPage() {
  const navigate = useNavigate();
  const { instance } = useMsal();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [loginMethod, setLoginMethod] = useState<'azure' | 'local'>('azure');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleAzureLogin = async () => {
    try {
      await login();
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: 'Login Failed',
        description: 'Failed to sign in with Microsoft. Try local login instead.',
        variant: 'destructive',
      });
    }
  };

  const handleDemoLogin = async (role: 'admin' | 'library' | 'bursar' | 'academic' | 'verifier' | 'processor' = 'admin') => {
    setLoading(true);
    setLoginMethod('local');
    
    try {
      const demoAccounts = {
        admin: { email: 'admin@example.com', password: 'demo123' },
        library: { email: 'library@example.com', password: 'demo123' },
        bursar: { email: 'bursar@example.com', password: 'demo123' },
        academic: { email: 'academic@example.com', password: 'demo123' },
        verifier: { email: 'verifier@example.com', password: 'demo123' },
        processor: { email: 'processor@example.com', password: 'demo123' },
      };
      
      const { email: demoEmail, password: demoPassword } = demoAccounts[role];
      
      // Call local login endpoint using the API service
      const response = await authApi.loginLocal({
        email: demoEmail,
        password: demoPassword,
      });

      const data = response.data;
      
      // Store authentication data
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('user_info', JSON.stringify(data.user));

      // Update auth context immediately
      if (data.user) {
        console.log('Login - User data:', data.user);
        window.dispatchEvent(new Event('userLogin'));
        window.dispatchEvent(new Event('storage'));
      }

      toast({
        title: 'Success',
        description: 'Logged in successfully with demo account',
      });

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        window.location.href = '/dashboard';
      }, 100);
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocalLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      // Use the current email/password state (or fallback to demo credentials)
      const loginEmail = email || 'admin@example.com';
      const loginPassword = password || 'demo123';
      
      // Call local login endpoint using the API service
      const response = await authApi.loginLocal({
        email: loginEmail,
        password: loginPassword,
      });

      const data = response.data;
      
      // Store authentication data
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('user_info', JSON.stringify(data.user));

      // Update auth context immediately
      if (data.user) {
        console.log('Login - User data:', data.user);
        // Trigger custom event for auth update
        window.dispatchEvent(new Event('userLogin'));
        // Also trigger storage event
        window.dispatchEvent(new Event('storage'));
      }

      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });

      // Force navigation after a brief delay to ensure state updates
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        // Force reload if navigation doesn't work
        window.location.href = '/dashboard';
      }, 100);
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">TAPS</CardTitle>
          <CardDescription>Transcript Automation and Processing Service</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Login Method Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setLoginMethod('azure')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                loginMethod === 'azure'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Microsoft 365
            </button>
            <button
              onClick={() => setLoginMethod('local')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                loginMethod === 'local'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Local Login
            </button>
          </div>

          {loginMethod === 'azure' ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Sign in with your Microsoft account to access the transcript request system.
              </p>
              <Button onClick={handleAzureLogin} className="w-full" size="lg">
                Sign in with Microsoft
              </Button>
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-medium text-center text-muted-foreground mb-2">Quick Demo Logins:</p>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('admin')}
                  variant="outline"
                  className="w-full"
                >
                  👤 Admin Login
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('library')}
                  variant="outline"
                  className="w-full bg-purple-50 hover:bg-purple-100 border-purple-200"
                >
                  📚 Library Login
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('bursar')}
                  variant="outline"
                  className="w-full bg-green-50 hover:bg-green-100 border-green-200"
                >
                  💰 Bursar Login
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('academic')}
                  variant="outline"
                  className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  🎓 Academic Login
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('verifier')}
                  variant="outline"
                  className="w-full bg-orange-50 hover:bg-orange-100 border-orange-200"
                >
                  📋 Registry (Verifier) Login
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('processor')}
                  variant="outline"
                  className="w-full bg-amber-50 hover:bg-amber-100 border-amber-200"
                >
                  ✅ Registry (Processor) Login
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Microsoft 365 unavailable?{' '}
                <button
                  onClick={() => setLoginMethod('local')}
                  className="text-primary hover:underline"
                >
                  Use local login
                </button>
              </p>
            </>
          ) : (
            <form onSubmit={handleLocalLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-medium text-center text-muted-foreground mb-2">Quick Demo Logins:</p>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('admin')}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  👤 Admin Login
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('library')}
                  variant="outline"
                  className="w-full bg-purple-50 hover:bg-purple-100 border-purple-200"
                  disabled={loading}
                >
                  📚 Library Login
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('bursar')}
                  variant="outline"
                  className="w-full bg-green-50 hover:bg-green-100 border-green-200"
                  disabled={loading}
                >
                  💰 Bursar Login
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDemoLogin('academic')}
                  variant="outline"
                  className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200"
                  disabled={loading}
                >
                  🎓 Academic Login
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Need an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="text-primary hover:underline"
                  >
                    Register here
                  </button>
                  {' '}or{' '}
                  <button
                    type="button"
                    onClick={() => setLoginMethod('azure')}
                    className="text-primary hover:underline"
                  >
                    Use Microsoft 365
                  </button>
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

