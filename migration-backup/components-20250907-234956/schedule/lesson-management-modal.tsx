"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { User, Calendar, Clock, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { log, emailLog } from '@/lib/logger';

interface UpcomingLesson {
  id: string;
  date: Date;
  duration: number;
  notes?: string;
  status: string;
  student: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
}

interface LessonManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: UpcomingLesson;
  onUpdate: () => void;
}

export function LessonManagementModal({
  isOpen,
  onClose,
  lesson,
  onUpdate,
}: LessonManagementModalProps) {
  const [mode, setMode] = useState<"view" | "notes" | "cancel">("view");
  const [notes, setNotes] = useState(lesson.notes || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleSaveNotes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          // Don't change status when saving notes - notes are for reminders, not completion
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update lesson notes");
      }

      toast.success("Lesson notes saved successfully");
      onUpdate();
      onClose();
    } catch (error) {
      log.error('Error updating lesson:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error("Failed to save notes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelLesson = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lessons/${lesson.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Cancelled by teacher"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel lesson");
      }

      toast.success("Lesson cancelled successfully");
      onUpdate();
      onClose();
    } catch (error) {
      log.error('Error cancelling lesson:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel lesson. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isLessonCancelled = lesson.status === "CANCELLED";
  const isLessonCompleted = lesson.status === "COMPLETED";

  // Check if lesson can be cancelled (same logic as backend)
  const canCancelLesson = () => {
    if (lesson.status !== "SCHEDULED") {
      return { canCancel: false, reason: `Cannot cancel lesson with status: ${lesson.status}` };
    }

    const now = new Date();
    const lessonTime = new Date(lesson.date);
    const bufferTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours buffer

    if (lessonTime <= now) {
      return { canCancel: false, reason: "Cannot cancel lessons that have already started or passed" };
    }

    if (lessonTime <= bufferTime) {
      return { canCancel: false, reason: "Cannot cancel lessons within 2 hours of start time" };
    }

    return { canCancel: true };
  };

  const cancellationCheck = canCancelLesson();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Lesson Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lesson Details Card */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{lesson.student.user.name}</span>
                </div>
                <Badge 
                  className={`${
                    isLessonCancelled 
                      ? "bg-red-100 text-red-700 border-red-200" 
                      : isLessonCompleted
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-blue-100 text-blue-700 border-blue-200"
                  }`}
                >
                  {lesson.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(lesson.date), "EEEE, MMMM d, yyyy")}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {format(new Date(lesson.date), "h:mm a")} ({lesson.duration} min)
                </div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Student Email: </span>
                <span>{lesson.student.user.email}</span>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          {!isLessonCancelled && (
            <div className="flex items-center gap-3">
              <Button
                variant={mode === "notes" ? "primary" : "secondary"}
                onClick={() => mode === "notes" ? handleSaveNotes() : setMode("notes")}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {mode === "notes" 
                  ? (isLoading ? "Saving..." : "Save Notes")
                  : (lesson.notes ? "Edit Notes" : "Add Notes")
                }
              </Button>
              
              {cancellationCheck.canCancel ? (
                <Button
                  variant="secondary"
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Cancel Lesson
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm" title={cancellationCheck.reason}>
                    Cannot Cancel
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cancellation restriction notice */}
          {!isLessonCancelled && !cancellationCheck.canCancel && (
            <Card className="p-3 border-amber-200 bg-amber-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700">{cancellationCheck.reason}</p>
              </div>
            </Card>
          )}

          {/* Notes Section */}
          {mode === "notes" && (
            <Card className="p-4">
              <h3 className="font-medium mb-3">Lesson Notes</h3>
              <div className="space-y-4">
                <RichTextEditor
                  content={notes}
                  onChange={setNotes}
                  placeholder="Add notes about this lesson..."
                  className="min-h-[200px]"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMode("view");
                      setNotes(lesson.notes || "");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveNotes}
                    disabled={isLoading}
                  >
                    {isLoading ? "Saving..." : "Save Notes"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Display existing notes if any */}
          {mode === "view" && lesson.notes && (
            <Card className="p-4">
              <h3 className="font-medium mb-3">Lesson Notes</h3>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: lesson.notes }}
              />
            </Card>
          )}

          {/* Cancel Confirmation */}
          {showCancelConfirm && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-medium text-red-900">Cancel Lesson</h3>
                </div>
                <p className="text-sm text-red-700">
                  Are you sure you want to cancel this lesson? This action cannot be undone.
                  The student will need to be notified of the cancellation.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep Lesson
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCancelLesson}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoading ? "Cancelling..." : "Cancel Lesson"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}