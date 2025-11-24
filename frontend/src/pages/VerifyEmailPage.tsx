import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/use-toast';
import { CheckCircle2, XCircle, Mail, ArrowLeft } from 'lucide-react';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setError('Verification token is missing');
      setLoading(false);
    }
  }, [token]);

  const verifyEmail = async () => {
    if (!token) return;

    try {
      await authApi.verifyEmail({ token });
      setVerified(true);
      toast({
        title: 'Email verified',
        description: 'Your email has been verified successfully.',
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed. The link may have expired.');
      toast({
        title: 'Verification failed',
        description: err.response?.data?.error?.message || 'The verification link is invalid or has expired.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    // This would need an email input, but for now just redirect to login
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 animate-pulse">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Verifying your email</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Email verified</CardTitle>
            <CardDescription>
              Your email has been verified successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Continue to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>Verification failed</CardTitle>
          <CardDescription>
            {error || 'The verification link is invalid or has expired.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            You can request a new verification email from the login page.
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Go to login
            </Button>
            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full"
            >
              Request new verification email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

