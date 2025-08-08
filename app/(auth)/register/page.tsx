import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Register',
  description: 'Create your Guitar Strategies account',
};

export default function RegisterPage() {
  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <h1 className="text-display-lg font-display text-brand-black mb-2">
          Get started
        </h1>
        <p className="text-body text-brand-gray">
          Create your account to start your musical journey
        </p>
      </div>

      <RegisterForm />

      <div className="mt-6 text-center">
        <p className="text-body-sm text-brand-gray">
          Already have an account?{' '}
          <Link 
            href="/login" 
            className="text-cta-primary hover:text-cta-hover font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}