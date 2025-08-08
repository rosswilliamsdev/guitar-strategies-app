import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LessonForm } from '@/components/lessons/lesson-form';

export const metadata = {
  title: 'Log New Lesson',
  description: 'Record a new lesson with your student',
};

export default async function NewLessonPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display-xl font-display text-brand-black mb-2">
          Log New Lesson
        </h1>
        <p className="text-body text-brand-gray">
          Record lesson details, progress, and assignments.
        </p>
      </div>

      <LessonForm teacherId={session.user.id} />
    </div>
  );
}