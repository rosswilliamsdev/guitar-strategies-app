"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  AlertCircle,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { log, schedulerLog } from '@/lib/logger';

interface UpcomingLesson {
  id: string;
  date: Date;
  duration: number;
  status: string;
  isRecurring: boolean;
  teacher: {
    user: { name: string }
  };
}

interface LessonCancellationCardProps {
  studentId: string;
}

export function LessonCancellationCard({ studentId }: LessonCancellationCardProps) {
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [confirmCancelLesson, setConfirmCancelLesson] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUpcomingLessons();
  }, [studentId]);

  const fetchUpcomingLessons = async () => {
    try {
      // Fetch all lessons
      const response = await fetch(`/api/lessons`);
      if (!response.ok) throw new Error('Failed to fetch lessons');
      
      const data = await response.json();
      const now = new Date();
      
      // Filter to only show lessons that can be cancelled (SCHEDULED status and in the future)
      // Sort by date and take only the next 5 lessons
      const upcomingLessons = (data.lessons || [])
        .filter((lesson: any) => {
          const lessonDate = new Date(lesson.date);
          return lesson.status === 'SCHEDULED' &&
                 lessonDate > now; // Only show future lessons that can be cancelled
        })
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort by date (earliest first)
        .slice(0, 5); // Take only the next 5 lessons
      
      setUpcomingLessons(upcomingLessons);
    } catch (error) {
      log.error('Error fetching lessons:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      setError('Failed to load upcoming lessons');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLesson = async (lessonId: string) => {
    setCancellingId(lessonId);
    setConfirmCancelLesson(null); // Close the confirmation dialog
    
    // Double-check the lesson is still in the future
    const lesson = upcomingLessons.find(l => l.id === lessonId);
    if (lesson && new Date(lesson.date) <= new Date()) {
      setErrorMessage('This lesson has already started and cannot be cancelled.');
      setCancellingId(null);
      // Refresh the list to remove past lessons
      fetchUpcomingLessons();
      return;
    }
    
    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel lesson');
      }

      // Remove the cancelled lesson from the list
      setUpcomingLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      
      // Clear any previous errors
      setError('');
      
    } catch (error: any) {
      log.error('Cancellation error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      setErrorMessage(error.message || 'Failed to cancel lesson. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Need to cancel?</h3>
        </div>
        <p className="text-muted-foreground">Loading upcoming lessons...</p>
      </Card>
    );
  }

  if (upcomingLessons.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Need to cancel?</h3>
        </div>
        <p className="text-muted-foreground">No upcoming scheduled lessons to cancel.</p>
      </Card>
    );
  }

  return (
    <>
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <h3 className="text-lg font-semibold">Need to cancel?</h3>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground mb-3">
          Select a lesson to cancel from your upcoming schedule:
        </p>
        
        {upcomingLessons.map((lesson) => (
          <div
            key={lesson.id}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-md border"
          >
            <div className="flex-1">
              <span className="text-sm font-medium">
                {format(new Date(lesson.date), "EEE, MMM d 'at' h:mm a")} • {lesson.duration} min
              </span>
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmCancelLesson(lesson.id)}
              disabled={cancellingId === lesson.id}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {cancellingId === lesson.id ? (
                "Cancelling..."
              ) : (
                "Cancel"
              )}
            </Button>
          </div>
        ))}

      </div>
    </Card>

    {/* Cancel Lesson Confirmation Dialog */}
    <Dialog open={!!confirmCancelLesson} onOpenChange={() => setConfirmCancelLesson(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Lesson</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this lesson? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={() => setConfirmCancelLesson(null)}>
            Keep Lesson
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => confirmCancelLesson && handleCancelLesson(confirmCancelLesson)}
          >
            Cancel Lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Error Dialog */}
    <Dialog open={!!errorMessage} onOpenChange={() => setErrorMessage(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error
          </DialogTitle>
          <DialogDescription className="text-foreground">
            {errorMessage}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setErrorMessage(null)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}