import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LessonDetails } from '@/components/lessons/lesson-details';

interface LessonPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: LessonPageProps) {
  const { id } = await params;
  // TODO: Fetch lesson details for metadata
  return {
    title: `Lesson ${id}`,
    description: 'View lesson details and progress',
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // TODO: Verify user has access to this lesson
  // const lesson = await getLessonById(id, session.user.id);
  // if (!lesson) {
  //   notFound();
  // }

  const canEdit = session.user.role === 'TEACHER';

  return (
    <div>

      <LessonDetails
        lessonId={id} 
        userId={session.user.id}
        canEdit={canEdit}
      />
    </div>
  );
}