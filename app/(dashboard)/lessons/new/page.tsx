import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LessonForm } from '@/components/lessons/lesson-form';

export const metadata = {
  title: 'Log Lesson',
  description: 'Quick lesson logging for teachers',
};

export default async function NewLessonPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  // Get teacher profile to pass the correct teacherId
  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id }
  });

  if (!teacherProfile) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Log Lesson
        </h1>
        <p className="text-muted-foreground mt-2">
          Quick lesson logging - select student and add notes. Date/time will be recorded automatically.
        </p>
      </div>

      <LessonForm teacherId={teacherProfile.id} />
    </div>
  );
}