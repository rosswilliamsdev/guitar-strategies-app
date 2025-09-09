import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EmailTestInterface from '@/components/admin/email-test-interface';

export default async function EmailTestPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Email System Test</h1>
          <p className="text-muted-foreground">
            Test the email notification system to ensure it&apos;s working properly.
          </p>
        </div>
      </div>

      <EmailTestInterface />
    </div>
  );
}