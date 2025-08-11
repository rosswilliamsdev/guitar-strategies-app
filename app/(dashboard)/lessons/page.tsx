import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LessonList } from '@/components/lessons/lesson-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Lessons',
  description: 'Manage your guitar lessons',
};

export default async function LessonsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Lessons
          </h1>
          <p className="text-muted-foreground mt-2">
            {session.user.role === 'TEACHER' 
              ? 'Manage all your student lessons'
              : 'View your lesson history and progress'
            }
          </p>
        </div>
        {session.user.role === 'TEACHER' && (
          <Link href="/lessons/new">
            <Button>New Lesson</Button>
          </Link>
        )}
      </div>

      <LessonList 
        userId={session.user.id} 
        userRole={session.user.role}
      />
    </div>
  );
}