"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { log } from "@/lib/logger";

interface UpcomingLesson {
  id: string;
  date: Date | string; // Can be Date object or ISO string from serialization
  duration: number;
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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelLesson = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lessons/${lesson.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Cancelled by teacher",
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
      log.error("Error cancelling lesson:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to cancel lesson. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isLessonCancelled = lesson.status === "CANCELLED";
  const isLessonCompleted = lesson.status === "COMPLETED";

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
                  <span className="font-medium">
                    {lesson.student.user.name}
                  </span>
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
                  {format(new Date(lesson.date), "h:mm a")} ({lesson.duration}{" "}
                  min)
                </div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Student Email: </span>
                <span>{lesson.student.user.email}</span>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          {!isLessonCancelled && !isLessonCompleted && (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowCancelConfirm(true)}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <AlertTriangle className="h-4 w-4" />
                Cancel Lesson
              </Button>
            </div>
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
                  Are you sure you want to cancel this lesson? This action
                  cannot be undone. The student will need to be notified of the
                  cancellation.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep Lesson
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelLesson}
                    disabled={isLoading}
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
