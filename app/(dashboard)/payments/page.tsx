import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { InvoiceDashboard } from '@/components/payments/invoice-dashboard';

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/login');
  }

  // Only teachers can access payments
  if (session.user.role !== 'TEACHER') {
    redirect('/dashboard');
  }

  return <InvoiceDashboard />;
}