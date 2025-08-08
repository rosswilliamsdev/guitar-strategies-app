import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { StudentList } from '@/components/students/student-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Students',
  description: 'Manage your students',
};

export default async function StudentsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display-xl font-display text-brand-black mb-2">
            Students
          </h1>
          <p className="text-body text-brand-gray">
            Manage your students and track their progress.
          </p>
        </div>
        <Link href="/students/invite">
          <Button>Invite Student</Button>
        </Link>
      </div>

      <StudentList teacherId={session.user.id} />
    </div>
  );
}