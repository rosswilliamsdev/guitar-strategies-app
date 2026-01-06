import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Reset Password',
  description: 'Reset your Guitar Strategies password',
};

interface ResetPasswordPageProps {
  params: {
    token: string;
  };
}

export default function ResetPasswordPage({ params }: ResetPasswordPageProps) {
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

      <ResetPasswordForm token={params.token} />

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
