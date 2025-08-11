import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { StudentList } from '@/components/students/student-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  // Get teacher profile to access students
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id }
  });

  if (!teacherProfile) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Teacher Profile Not Found</h1>
          <p className="text-muted-foreground">
            Unable to access students without a teacher profile.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Students
          </h1>
          <p className="text-muted-foreground">
            Manage your students and track their progress.
          </p>
        </div>
        <Link href="/students/invite">
          <Button>Invite Student</Button>
        </Link>
      </div>

      <StudentList teacherId={teacherProfile.id} />
    </div>
  );
}