"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Calendar,
  Clock,
  User,
  GraduationCap,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  MinusCircle,
  Eye,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { log } from "@/lib/logger";

interface Lesson {
  id: string;
  date: Date;
  duration: number;
  status: string;
  notes: string | null;
  homework: string | null;
  teacher: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
  student: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
}

interface Stats {
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  totalDuration: number;
  uniqueTeachers: number;
  uniqueStudents: number;
}

interface ManageLessonsProps {
  lessons: Lesson[];
  stats: Stats;
}

export function ManageLessons({ lessons }: ManageLessonsProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");

  // Selection and deletion state
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(
    new Set()
  );
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get unique teachers for filter
  const uniqueTeachers = Array.from(
    new Set(
      lessons.map((l) =>
        JSON.stringify({ id: l.teacher.id, name: l.teacher.user.name })
      )
    )
  ).map((t) => JSON.parse(t));

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.teacher.user.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      lesson.student.user.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      lesson.teacher.user.email
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      lesson.student.user.email
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || lesson.status === statusFilter;
    const matchesTeacher =
      teacherFilter === "all" || lesson.teacher.id === teacherFilter;

    return matchesSearch && matchesStatus && matchesTeacher;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "SCHEDULED":
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case "MISSED":
        return <MinusCircle className="h-4 w-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-50 text-green-700 border-green-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200";
      case "SCHEDULED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "MISSED":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLessons(new Set(filteredLessons.map((l) => l.id)));
    } else {
      setSelectedLessons(new Set());
    }
  };

  const handleSelectLesson = (lessonId: string, checked: boolean) => {
    const newSelected = new Set(selectedLessons);
    if (checked) {
      newSelected.add(lessonId);
    } else {
      newSelected.delete(lessonId);
    }
    setSelectedLessons(newSelected);
  };

  // Delete functions
  const handleDeleteClick = (lesson: Lesson) => {
    setLessonToDelete(lesson);
    setDeleteModalOpen(true);
  };

  const handleBulkDeleteClick = () => {
    setBulkDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!lessonToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/lessons/${lessonToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        toast.success("Lesson has been successfully deleted.");
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete lesson");
      }
    } catch (error) {
      log.error("Error deleting lesson:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error("An unexpected error occurred while deleting the lesson");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setLessonToDelete(null);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedLessons.size === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/admin/lessons/bulk-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonIds: Array.from(selectedLessons),
        }),
      });

      if (response.ok) {
        toast.success(
          `${selectedLessons.size} lesson(s) have been successfully deleted.`
        );
        setSelectedLessons(new Set());
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete lessons");
      }
    } catch (error) {
      log.error("Error deleting lessons:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error("An unexpected error occurred while deleting the lessons");
    } finally {
      setIsDeleting(false);
      setBulkDeleteModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="MISSED">Missed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {uniqueTeachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              Showing {filteredLessons.length} of {lessons.length} lessons
            </span>
            {selectedLessons.size > 0 && (
              <span className="font-medium text-foreground">
                {selectedLessons.size} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedLessons.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteClick}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete Selected ({selectedLessons.size})
              </Button>
            )}
            {(searchTerm ||
              statusFilter !== "all" ||
              teacherFilter !== "all") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTeacherFilter("all");
                  setSelectedLessons(new Set());
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Select All Header */}
      {filteredLessons.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={
                selectedLessons.size === filteredLessons.length &&
                filteredLessons.length > 0
              }
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              Select All ({filteredLessons.length} lessons)
            </span>
          </div>
        </Card>
      )}

      {/* Lessons List */}
      <div className="space-y-4">
        {filteredLessons.map((lesson) => (
          <Card key={lesson.id} className="p-4">
            <div className="flex items-start gap-4">
              {/* Selection Checkbox */}
              <div className="pt-1">
                <Checkbox
                  checked={selectedLessons.has(lesson.id)}
                  onCheckedChange={(checked) =>
                    handleSelectLesson(lesson.id, checked as boolean)
                  }
                />
              </div>

              <div className="flex-1 space-y-3">
                {/* Header Row */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(lesson.status)}
                    <Badge
                      className={`text-xs ${getStatusColor(lesson.status)}`}
                    >
                      {lesson.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(lesson.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {formatDuration(lesson.duration)}
                  </div>
                </div>

                {/* Teacher and Student Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Teacher
                      </span>
                    </div>
                    <p className="font-medium text-sm">
                      {lesson.teacher.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lesson.teacher.user.email}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Student
                      </span>
                    </div>
                    <p className="font-medium text-sm">
                      {lesson.student.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lesson.student.user.email}
                    </p>
                  </div>
                </div>

                {/* Notes Preview */}
                {lesson.notes && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Lesson Notes
                    </p>
                    <div
                      className="text-sm text-muted-foreground line-clamp-2"
                      dangerouslySetInnerHTML={{
                        __html:
                          lesson.notes.substring(0, 200) +
                          (lesson.notes.length > 200 ? "..." : ""),
                      }}
                    />
                  </div>
                )}

                {/* Homework Preview */}
                {lesson.homework && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Homework
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {lesson.homework}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(lesson)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Link href={`/lessons/${lesson.id}`}>
                  <Button variant="secondary" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredLessons.length === 0 && (
        <Card className="p-8 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No lessons found
          </h3>
          <p className="text-muted-foreground">
            {lessons.length === 0
              ? "No lessons have been created yet."
              : "Try adjusting your search or filters."}
          </p>
        </Card>
      )}

      {/* Individual Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Lesson
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lesson?
            </DialogDescription>
          </DialogHeader>

          {lessonToDelete && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Lesson Details:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Teacher: {lessonToDelete.teacher.user.name}</li>
                  <li>• Student: {lessonToDelete.student.user.name}</li>
                  <li>
                    • Date: {new Date(lessonToDelete.date).toLocaleDateString()}
                  </li>
                  <li>• Duration: {formatDuration(lessonToDelete.duration)}</li>
                  <li>• Status: {lessonToDelete.status}</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  This action will permanently delete:
                </p>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  <li>• The lesson record and all associated data</li>
                  <li>• Any notes or homework assignments</li>
                  <li>• Progress tracking information</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                <strong>This action cannot be undone.</strong> The lesson data
                will be permanently removed from the system.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Lesson
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={bulkDeleteModalOpen} onOpenChange={setBulkDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Multiple Lessons
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedLessons.size} selected
              lesson(s)?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                This action will permanently delete:
              </p>
              <ul className="text-sm text-red-700 space-y-1 ml-4">
                <li>
                  • {selectedLessons.size} lesson record(s) and all associated
                  data
                </li>
                <li>• Any notes or homework assignments for these lessons</li>
                <li>• Progress tracking information for these lessons</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium">
                Selected lessons include various teachers, students, and dates.
                All selected lessons will be permanently removed regardless of
                their current status.
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              <strong>This action cannot be undone.</strong> All selected lesson
              data will be permanently removed from the system.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setBulkDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedLessons.size} Lessons
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
