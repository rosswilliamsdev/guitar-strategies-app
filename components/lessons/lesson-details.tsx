'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LessonDetailsProps {
  lessonId: string;
  userId: string;
  canEdit: boolean;
}

export function LessonDetails({ lessonId, userId, canEdit }: LessonDetailsProps) {
  // TODO: Fetch lesson details from API
  const lesson = null;

  if (!lesson) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Lesson not found
        </h3>
        <p className="text-gray-600 mb-4">
          This lesson doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/lessons">
          <Button variant="secondary">Back to Lessons</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Lesson Details</h2>
          {canEdit && (
            <Link href={`/lessons/${lessonId}/edit`}>
              <Button size="sm">Edit Lesson</Button>
            </Link>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Date:</span> {/* lesson.date */}
          </div>
          <div>
            <span className="font-medium">Duration:</span> {/* lesson.duration */} minutes
          </div>
          <div>
            <span className="font-medium">Student:</span> {/* lesson.student.name */}
          </div>
          <div>
            <span className="font-medium">Teacher:</span> {/* lesson.teacher.name */}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Lesson Notes</h3>
        <p className="text-gray-600">
          No notes available for this lesson.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Progress & Homework</h3>
        <p className="text-gray-600">
          No homework assigned for this lesson.
        </p>
      </Card>
    </div>
  );
}