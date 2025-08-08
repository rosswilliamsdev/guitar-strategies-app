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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-display-xl font-display text-brand-black mb-2">
            Lessons
          </h1>
          <p className="text-body text-brand-gray">
            {session.user.role === 'TEACHER' 
              ? 'Manage all your student lessons'
              : 'View your lesson history and progress'
            }
          </p>
        </div>
        {session.user.role === 'TEACHER' && (
          <Link href="/lessons/new">
            <Button>Log New Lesson</Button>
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