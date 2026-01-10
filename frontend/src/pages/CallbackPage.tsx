import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { oidcCallback } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export const CallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      if (!code) {
        toast.error('Authentication failed', { description: 'No code returned from provider' });
        navigate('/login');
        return;
      }

      try {
        const data = await oidcCallback(code);
        login(data.access_token);
        toast.success('Welcome back, Commander.');
        navigate('/dashboard');
      } catch (error) {
        console.error('OIDC Callback Error:', error);
        toast.error('Authentication failed', { description: 'Could not exchange code for token' });
        navigate('/login');
      }
    };

    handleCallback();
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Finalizing secure handshake...
        </p>
      </div>
    </div>
  );
};
