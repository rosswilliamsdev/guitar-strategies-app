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

      <LessonDetails 
        lessonId={params.id} 
        userId={session.user.id}
        canEdit={canEdit}
      />
    </div>
  );
}