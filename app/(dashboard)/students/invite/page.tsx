import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InviteStudentForm } from '@/components/students/invite-student-form';
import { Card } from '@/components/ui/card';

export const metadata = {
  title: 'Invite Student',
  description: 'Invite a new student to join',
};

export default async function InviteStudentPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  // Get teacher profile
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!teacherProfile) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold mb-4">Teacher Profile Not Found</h1>
          <p className="text-muted-foreground">
            Unable to invite students without a teacher profile.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Invite Student</h1>
        <p className="text-muted-foreground">
          Create an account for a new student and they'll receive login credentials.
        </p>
      </div>

      <InviteStudentForm teacherId={teacherProfile.id} teacherName={teacherProfile.user.name} />
    </div>
  );
}
