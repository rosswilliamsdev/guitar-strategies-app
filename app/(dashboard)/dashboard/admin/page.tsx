import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';

export const metadata = {
  title: 'Admin Dashboard',
  description: 'Manage platform users and settings',
};

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display-xl font-display text-brand-black mb-2">
          Admin Dashboard
        </h1>
        <p className="text-body text-brand-gray">
          Manage platform users, settings, and analytics.
        </p>
      </div>

      <AdminDashboard />
    </div>
  );
}