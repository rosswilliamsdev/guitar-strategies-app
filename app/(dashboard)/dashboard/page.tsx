import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Redirect to role-specific dashboard
  if (session.user.role === 'TEACHER') {
    redirect('/dashboard/teacher');
  } else if (session.user.role === 'STUDENT') {
    redirect('/dashboard/student');
  } else if (session.user.role === 'ADMIN') {
    redirect('/dashboard/admin');
  }

  // Fallback redirect
  redirect('/login');
}