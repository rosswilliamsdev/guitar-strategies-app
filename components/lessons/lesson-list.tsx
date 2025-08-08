'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LessonListProps {
  userId: string;
  userRole: string;
}

export function LessonList({ userId, userRole }: LessonListProps) {
  // TODO: Fetch lessons from API
  const lessons: any[] = [];

  if (lessons.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No lessons yet
        </h3>
        <p className="text-gray-600 mb-4">
          {userRole === 'TEACHER' 
            ? 'Start by logging your first lesson with a student.'
            : 'Your teacher will log lessons here after each session.'
          }
        </p>
        {userRole === 'TEACHER' && (
          <Link href="/lessons/new">
            <Button>Log First Lesson</Button>
          </Link>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {lessons.map((lesson) => (
        <Card key={lesson.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{lesson.title}</h3>
              <p className="text-sm text-gray-600">{lesson.date}</p>
            </div>
            <Link href={`/lessons/${lesson.id}`}>
              <Button variant="secondary" size="sm">
                View Details
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}