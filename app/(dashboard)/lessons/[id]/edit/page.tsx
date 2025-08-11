import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LessonForm } from '@/components/lessons/lesson-form';

interface EditLessonPageProps {
  params: {
    id: string;
  };
}

export const metadata = {
  title: 'Edit Lesson',
  description: 'Edit lesson details and content',
};

export default async function EditLessonPage({ params }: EditLessonPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  // Fetch the lesson data
  const lesson = await prisma.lesson.findUnique({
    where: { id: params.id },
    include: {
      student: {
        include: { user: true }
      },
      teacher: {
        include: { user: true }
      },
      attachments: true,
      links: true,
    },
  });

  if (!lesson) {
    notFound();
  }

  // Verify teacher owns this lesson
  if (lesson.teacher.userId !== session.user.id) {
    redirect('/lessons');
  }

  // Transform the data for the form
  const initialData = {
    studentId: lesson.studentId,
    notes: lesson.notes || '',
    homework: lesson.homework || '',
    progress: lesson.progress || '',
    focusAreas: lesson.focusAreas || '',
    songsPracticed: lesson.songsPracticed || '',
    nextSteps: lesson.nextSteps || '',
    duration: lesson.duration,
    status: lesson.status,
    existingAttachments: lesson.attachments || [],
    existingLinks: lesson.links || [],
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Edit Lesson</h1>
        <p className="text-muted-foreground mt-2">
          Update lesson details and content for {lesson.student.user.name}
        </p>
      </div>

      <LessonForm 
        teacherId={lesson.teacherId}
        lessonId={params.id}
        initialData={initialData}
      />
    </div>
  );
}
