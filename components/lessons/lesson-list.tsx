'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, Clock, User, FileText } from 'lucide-react';

// Utility function to strip HTML tags and return plain text
const stripHtml = (html: string): string => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

interface Lesson {
  id: string;
  date: string;
  duration: number;
  notes?: string;
  status: string;
  student: {
    user: {
      name: string;
    };
  };
  teacher: {
    user: {
      name: string;
    };
  };
}

interface LessonListProps {
  userId: string;
  userRole: string;
}

export function LessonList({ userId, userRole }: LessonListProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch('/api/lessons');
        if (!response.ok) {
          throw new Error('Failed to fetch lessons');
        }
        const data = await response.json();
        setLessons(data.lessons || []);
      } catch (error) {
        setError('Failed to load lessons');
        console.error('Error fetching lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, []);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading lessons...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="secondary">
          Try Again
        </Button>
      </Card>
    );
  }

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
        <Card key={lesson.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(lesson.date), 'PPp')}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{lesson.duration} min</span>
                </div>
                <Badge variant={lesson.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {lesson.status}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {userRole === 'TEACHER' 
                    ? `Student: ${lesson.student.user.name}`
                    : `Teacher: ${lesson.teacher.user.name}`
                  }
                </span>
              </div>
              
              {lesson.notes && (
                <div className="flex items-start space-x-2 mt-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="line-clamp-2">{stripHtml(lesson.notes)}</p>
                  </div>
                </div>
              )}
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