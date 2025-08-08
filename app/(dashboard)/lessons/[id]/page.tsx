import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LessonDetails } from '@/components/lessons/lesson-details';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LessonPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: LessonPageProps) {
  // TODO: Fetch lesson details for metadata
  return {
    title: `Lesson ${params.id}`,
    description: 'View lesson details and progress',
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // TODO: Verify user has access to this lesson
  // const lesson = await getLessonById(params.id, session.user.id);
  // if (!lesson) {
  //   notFound();
  // }

  const canEdit = session.user.role === 'TEACHER';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display-xl font-display text-brand-black mb-2">
            Lesson Details
          </h1>
          <p className="text-body text-brand-gray">
            View lesson information and progress notes.
          </p>
        </div>
        {canEdit && (
          <Link href={`/lessons/${params.id}/edit`}>
            <Button>Edit Lesson</Button>
          </Link>
        )}
      </div>

      <LessonDetails 
        lessonId={params.id} 
        userId={session.user.id}
        canEdit={canEdit}
      />
    </div>
  );
}