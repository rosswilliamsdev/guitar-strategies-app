import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminActivityPage } from '@/components/admin/admin-activity-page';

export const metadata = {
  title: 'Admin Activity',
  description: 'View all platform activity and system events',
};

export default async function AdminActivityPageServer() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Platform Activity
        </h1>
        <p className="text-muted-foreground">
          View all recent activity across the platform with advanced filtering options.
        </p>
      </div>

      <AdminActivityPage />
    </div>
  );
}