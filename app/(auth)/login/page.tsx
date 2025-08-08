import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Login',
  description: 'Sign in to your Guitar Strategies account',
};

export default function LoginPage() {
  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <h1 className="text-display-lg font-display text-brand-black mb-2">
          Welcome back
        </h1>
        <p className="text-body text-brand-gray">
          Sign in to your account to continue
        </p>
      </div>

      <LoginForm />

      <div className="mt-6 text-center">
        <p className="text-body-sm text-brand-gray">
          Don't have an account?{' '}
          <Link 
            href="/register" 
            className="text-cta-primary hover:text-cta-hover font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </Card>
  );
}