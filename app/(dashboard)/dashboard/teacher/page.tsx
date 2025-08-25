import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { TeacherDashboard } from '@/components/dashboard/teacher-dashboard';
import { getTeacherData } from '../page';

export const metadata = {
  title: 'Teacher Dashboard',
  description: 'Manage your students, lessons, and schedule',
};

export default async function TeacherDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  const teacherData = await getTeacherData(session.user.id);

  if (!teacherData) {
    redirect('/dashboard');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display-xl font-display text-brand-black mb-2">
          Welcome back, {session.user.name}
        </h1>
        <p className="text-body text-brand-gray">
          Here's what's happening with your students today.
        </p>
      </div>

      <TeacherDashboard {...teacherData} />
    </div>
  );
}