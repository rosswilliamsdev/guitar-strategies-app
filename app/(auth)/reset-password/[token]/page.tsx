import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Card } from '@/components/ui/card';
import { validatePasswordResetToken } from '@/lib/auth-utils';
import { AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Reset Password',
  description: 'Reset your Guitar Strategies password',
};

interface ResetPasswordPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { token } = await params;

  // Validate token on server before rendering form
  const validation = await validatePasswordResetToken(token);

  // Show error if token is invalid or expired
  if (!validation.valid) {
    return (
      <Card className="p-6">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Invalid or Expired Link
          </h1>
          <p className="text-muted-foreground">
            {validation.error}
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/forgot-password"
            className="block w-full text-center py-2 px-4 bg-primary text-white rounded-md hover:bg-turquoise-600 transition-colors"
          >
            Request New Reset Link
          </Link>

          <Link
            href="/login"
            className="block w-full text-center py-2 px-4 border border-border rounded-md hover:bg-muted transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </Card>
    );
  }

  // Token is valid, show the form
  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Reset your password
        </h1>
        <p className="text-muted-foreground">
          Enter your new password below
        </p>
      </div>

      <ResetPasswordForm token={token} />

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link
            href="/login"
            className="text-turquoise-600 hover:text-turquoise-700 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}
