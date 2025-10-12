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

  // Check for admin access (ADMIN role or TEACHER with isAdmin flag)
  const hasAdminAccess = session?.user && (
    session.user.role === 'ADMIN' ||
    (session.user.role === 'TEACHER' && session.user.teacherProfile?.isAdmin === true)
  );

  if (!hasAdminAccess) {
    redirect('/dashboard');
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