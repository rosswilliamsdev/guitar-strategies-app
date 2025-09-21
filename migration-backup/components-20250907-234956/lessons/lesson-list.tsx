"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { SkeletonLessonCard, Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  User,
  FileText,
  Search,
  CalendarDays,
  X,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { log, schedulerLog } from '@/lib/logger';

// Utility function to strip HTML tags and return plain text
const stripHtml = (html: string): string => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

interface Lesson {
  id: string;
  date: string;
  duration: number;
  notes?: string;
  homework?: string;
  progress?: string;
  focusAreas?: string;
  songsPracticed?: string;
  nextSteps?: string;
  status: string;
  student: {
    id: string;
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

export function LessonList({ userRole }: LessonListProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  // Default to 'thisMonth' for teachers, 'all' for students
  const [dateFilter, setDateFilter] = useState<string>(userRole === "TEACHER" ? "thisMonth" : "all");
  const [sortOrder, setSortOrder] = useState<"latest" | "earliest">("latest");
  const [cancellingLessons, setCancellingLessons] = useState<Set<string>>(new Set());
  const [confirmCancelLesson, setConfirmCancelLesson] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch("/api/lessons");
        if (!response.ok) {
          throw new Error("Failed to fetch lessons");
        }
        const data = await response.json();
        // Sort lessons by date in descending order (most recent first)
        const sortedLessons = (data.lessons || []).sort((a: Lesson, b: Lesson) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setLessons(sortedLessons);
      } catch (error) {
        setError("Failed to load lessons");
        log.error('Error fetching lessons:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, []);

  const handleCancelLesson = async (lessonId: string) => {
    setConfirmCancelLesson(null);
    setCancellingLessons(prev => new Set(prev).add(lessonId));

    try {
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel lesson');
      }

      // Remove the cancelled lesson from the local state
      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      
    } catch (error: any) {
      log.error('Error cancelling lesson:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      setErrorMessage(error.message || 'Failed to cancel lesson');
    } finally {
      setCancellingLessons(prev => {
        const newSet = new Set(prev);
        newSet.delete(lessonId);
        return newSet;
      });
    }
  };

  // Get unique students for filter dropdown (teachers only)
  const students = useMemo(() => {
    if (userRole !== "TEACHER") return [];
    const uniqueStudents = lessons.reduce((acc, lesson) => {
      const student = lesson.student;
      if (!acc.find((s) => s.id === student.id)) {
        acc.push(student);
      }
      return acc;
    }, [] as Array<{ id: string; user: { name: string } }>);
    return uniqueStudents;
  }, [lessons, userRole]);

  // Filter lessons based on search term, student, and date
  const filteredLessons = useMemo(() => {
    const filtered = lessons.filter((lesson) => {
      // Exclude cancelled lessons
      if (lesson.status === 'CANCELLED') {
        return false;
      }

      // For students, only show completed lessons
      if (userRole === 'STUDENT' && lesson.status !== 'COMPLETED') {
        return false;
      }

      // Search filter - searches in notes, homework, progress, focusAreas, songsPracticed, nextSteps
      const searchableContent = [
        lesson.notes || "",
        lesson.homework || "",
        lesson.progress || "",
        lesson.focusAreas || "",
        lesson.songsPracticed || "",
        lesson.nextSteps || "",
        lesson.student.user.name,
        lesson.teacher.user.name,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchTerm.length === 0 ||
        stripHtml(searchableContent)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      // Student filter (teachers only)
      const matchesStudent =
        selectedStudent === "all" || lesson.student.id === selectedStudent;

      // Date filter
      const lessonDate = new Date(lesson.date);
      const now = new Date();
      let matchesDate = true;

      switch (dateFilter) {
        case "thisWeek":
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          matchesDate = lessonDate >= startOfWeek && lessonDate <= endOfWeek;
          break;
        case "thisMonth":
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          matchesDate = lessonDate >= monthStart && lessonDate <= monthEnd;
          break;
        case "lastMonth":
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lastMonthStart = startOfMonth(lastMonth);
          const lastMonthEnd = endOfMonth(lastMonth);
          matchesDate =
            lessonDate >= lastMonthStart && lessonDate <= lastMonthEnd;
          break;
        case "last3Months":
          const threeMonthsAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 3,
            1
          );
          matchesDate = lessonDate >= threeMonthsAgo;
          break;
        default:
          matchesDate = true;
      }

      return matchesSearch && matchesStudent && matchesDate;
    });
    
    // Sort filtered lessons by date based on sortOrder
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "latest" ? dateB - dateA : dateA - dateB;
    });
  }, [lessons, searchTerm, selectedStudent, dateFilter, userRole, sortOrder]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Search and Filter Controls Skeleton */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex gap-4">
              {userRole === "TEACHER" && (
                <Skeleton className="h-10 w-48" />
              )}
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
        </Card>

        {/* Results Header Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Lesson Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonLessonCard key={index} />
          ))}
        </div>
      </div>
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

  // Show empty state only if there are no lessons at all, not when filtered results are empty
  if (lessons.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No lessons yet
        </h3>
        <p className="text-gray-600 mb-4">
          {userRole === "TEACHER"
            ? "Start by creating your first lesson with a student."
            : "No completed lessons yet. Your teacher will log lessons here after each session."}
        </p>
        {userRole === "TEACHER" && (
          <Link href="/lessons/new">
            <Button>New Lesson</Button>
          </Link>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search lessons"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-4">
            {userRole === "TEACHER" && students.length > 0 && (
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger className="w-48">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48">
                <CalendarDays className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="last3Months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {filteredLessons.length}{" "}
            {filteredLessons.length === 1 ? "Lesson" : "Lessons"}
            {searchTerm && ` matching "${searchTerm}"`}
          </h2>
          <Select
            value={sortOrder}
            onValueChange={(value) =>
              setSortOrder(value as "latest" | "earliest")
            }
          >
            <SelectTrigger className="w-40">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest First</SelectItem>
              <SelectItem value="earliest">Earliest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredLessons.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No lessons found
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria.
            </p>
            <Button
              onClick={() => {
                setSearchTerm("");
                setSelectedStudent("all");
                setDateFilter("all");
              }}
              variant="secondary"
            >
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLessons.map((lesson) => (
              <Card
                key={lesson.id}
                className="p-3 hover:shadow-md transition-shadow"
              >
                <div className="space-y-1">
                  {/* Header with date, time, and duration */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(lesson.date), "MMM d")}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(lesson.date), "h:mm a")}</span>
                      <span>•</span>
                      <span>{lesson.duration}min</span>
                    </div>
                  </div>

                  {/* Student/Teacher name and buttons */}
                  <div className="flex items-center justify-between space-x-2">
                    <span className="font-medium text-sm text-foreground truncate flex-1">
                      {userRole === "TEACHER"
                        ? lesson.student.user.name
                        : lesson.teacher.user.name}
                    </span>
                    <div className="flex items-center space-x-1">
                      {/* Cancel button - only show for future lessons and scheduled status */}
                      {lesson.status === "SCHEDULED" &&
                        new Date(lesson.date) > new Date() && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setConfirmCancelLesson(lesson.id)}
                            disabled={cancellingLessons.has(lesson.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 h-6"
                          >
                            {cancellingLessons.has(lesson.id)
                              ? "..."
                              : "Cancel"}
                          </Button>
                        )}
                      <Link href={`/lessons/${lesson.id}`}>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-turquoise-600 text-white text-xs px-2 py-1 h-6"
                        >
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Notes preview */}
                  {lesson.notes && (
                    <div className="text-xs text-muted-foreground">
                      <p className="line-clamp-1 leading-tight">
                        {stripHtml(lesson.notes)}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Lesson Confirmation Dialog */}
      <Dialog
        open={!!confirmCancelLesson}
        onOpenChange={() => setConfirmCancelLesson(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this lesson? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmCancelLesson(null)}
            >
              Keep Lesson
            </Button>
            <Button
              variant={"destructive"}
              onClick={() =>
                confirmCancelLesson && handleCancelLesson(confirmCancelLesson)
              }
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
            <Button onClick={() => setErrorMessage(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
