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
import {
  Calendar,
  Clock,
  User,
  FileText,
  Search,
  CalendarDays,
  X,
} from "lucide-react";

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
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [cancellingLessons, setCancellingLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const response = await fetch("/api/lessons");
        if (!response.ok) {
          throw new Error("Failed to fetch lessons");
        }
        const data = await response.json();
        setLessons(data.lessons || []);
      } catch (error) {
        setError("Failed to load lessons");
        console.error("Error fetching lessons:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, []);

  const handleCancelLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to cancel this lesson?')) {
      return;
    }

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
      console.error('Error cancelling lesson:', error);
      setError(error.message || 'Failed to cancel lesson');
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
    return lessons.filter((lesson) => {
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
  }, [lessons, searchTerm, selectedStudent, dateFilter]);

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
            : "Your teacher will create lessons here after each session."}
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
                  {/* Header with date, time, duration, and status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(lesson.date), "MMM d")}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(lesson.date), "h:mm a")}</span>
                      <span>•</span>
                      <span>{lesson.duration}min</span>
                      {lesson.status === 'CANCELLED' && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 font-medium">CANCELLED</span>
                        </>
                      )}
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
                      {lesson.status === 'SCHEDULED' && new Date(lesson.date) > new Date() && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelLesson(lesson.id)}
                          disabled={cancellingLessons.has(lesson.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 h-6"
                        >
                          {cancellingLessons.has(lesson.id) ? '...' : 'Cancel'}
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
    </div>
  );
}
