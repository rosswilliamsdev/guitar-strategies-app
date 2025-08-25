import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { StudentDashboard } from '@/components/dashboard/student-dashboard';
import { getStudentData } from '../page';

export const metadata = {
  title: 'Student Dashboard',
  description: 'Track your progress and upcoming lessons',
};

export default async function StudentDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'STUDENT') {
    redirect('/login');
  }

  const studentData = await getStudentData(session.user.id);

  if (!studentData) {
    redirect('/dashboard');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display-xl font-display text-brand-black mb-2">
          Welcome back, {session.user.name}
        </h1>
        <p className="text-body text-brand-gray">
          Continue your musical journey.
        </p>
      </div>

      <StudentDashboard {...studentData} />
    </div>
  );
}