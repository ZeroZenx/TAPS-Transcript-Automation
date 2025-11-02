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

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call local login endpoint
      const localResponse = await fetch('/api/auth/login-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!localResponse.ok) {
        const error = await localResponse.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await localResponse.json();
      
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
          <CardDescription>Transcript Automation Portal System</CardDescription>
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
              <p className="text-xs text-center text-muted-foreground">
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
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

