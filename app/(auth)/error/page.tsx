import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AuthErrorPageProps {
  searchParams: {
    error?: string;
  };
}

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const error = searchParams.error;

  const getErrorMessage = (error?: string) => {
    switch (error) {
      case 'Configuration':
        return 'There was a problem with the server configuration.';
      case 'AccessDenied':
        return 'You do not have permission to access this resource.';
      case 'Verification':
        return 'The verification link has expired or is invalid.';
      default:
        return 'An authentication error occurred. Please try again.';
    }
  };

  return (
    <Card className="p-6">
      <div className="text-center">
        <h1 className="text-display-lg font-display text-brand-black mb-2">
          Authentication Error
        </h1>
        <p className="text-body text-brand-gray mb-6">
          {getErrorMessage(error)}
        </p>
        <Link href="/login">
          <Button>Back to Login</Button>
        </Link>
      </div>
    </Card>
  );
}