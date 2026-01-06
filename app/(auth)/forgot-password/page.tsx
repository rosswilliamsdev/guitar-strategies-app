import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Forgot Password',
  description: 'Reset your Guitar Strategies password',
};

export default function ForgotPasswordPage() {
  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Forgot your password?
        </h1>
        <p className="text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password
        </p>
      </div>

      <ForgotPasswordForm />

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
