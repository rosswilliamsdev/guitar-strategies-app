"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Clock,
  AlertTriangle,
  X
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

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

  useEffect(() => {
    fetchUpcomingLessons();
  }, [studentId]);

  const fetchUpcomingLessons = async () => {
    try {
      // Fetch all lessons for current month
      const response = await fetch(`/api/lessons`);
      if (!response.ok) throw new Error('Failed to fetch lessons');
      
      const data = await response.json();
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      // Filter to current month and only show lessons that can be cancelled (SCHEDULED status)
      const currentMonthLessons = (data.lessons || []).filter((lesson: any) => {
        const lessonDate = new Date(lesson.date);
        return lessonDate >= monthStart && 
               lessonDate <= monthEnd && 
               lesson.status === 'SCHEDULED';
      });
      
      setUpcomingLessons(currentMonthLessons);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setError('Failed to load upcoming lessons');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to cancel this lesson?')) {
      return;
    }

    setCancellingId(lessonId);
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
      console.error('Cancellation error:', error);
      setError(`Failed to cancel lesson: ${error.message}`);
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
        <p className="text-muted-foreground">No scheduled lessons this month to cancel.</p>
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
          Select a lesson to cancel from your current month schedule:
        </p>
        
        {upcomingLessons.map((lesson) => (
          <div
            key={lesson.id}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-md border"
          >
            <div className="flex-1">
              <span className="text-sm font-medium">
                {format(new Date(lesson.date), "h:mm a, MMMM d")} • {lesson.duration} min
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
          <Button variant="secondary" onClick={() => setConfirmCancelLesson(null)}>
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