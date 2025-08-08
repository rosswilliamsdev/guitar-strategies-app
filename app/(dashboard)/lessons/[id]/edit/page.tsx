import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LessonForm } from '@/components/lessons/lesson-form';

interface EditLessonPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: EditLessonPageProps) {
  return {
    title: `Edit Lesson ${params.id}`,
    description: 'Edit lesson details and progress',
  };
}

export default async function EditLessonPage({ params }: EditLessonPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  // TODO: Verify teacher owns this lesson
  // const lesson = await getLessonById(params.id, session.user.id);
  // if (!lesson) {
  //   notFound();
  // }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display-xl font-display text-brand-black mb-2">
          Edit Lesson
        </h1>
        <p className="text-body text-brand-gray">
          Update lesson details, progress, and assignments.
        </p>
      </div>

      <LessonForm 
        teacherId={session.user.id}
        lessonId={params.id}
        mode="edit"
      />
    </div>
  );
}