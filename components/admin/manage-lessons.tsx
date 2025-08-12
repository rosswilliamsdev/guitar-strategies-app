"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Filter
} from "lucide-react";
import Link from "next/link";

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

export function ManageLessons({ lessons, stats }: ManageLessonsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");

  // Get unique teachers for filter
  const uniqueTeachers = Array.from(
    new Set(lessons.map((l) => JSON.stringify({ id: l.teacher.id, name: l.teacher.user.name })))
  ).map((t) => JSON.parse(t));

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = 
      lesson.teacher.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.student.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.teacher.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.student.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || lesson.status === statusFilter;
    const matchesTeacher = teacherFilter === "all" || lesson.teacher.id === teacherFilter;

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

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
            <div className="text-right">
              <p className="text-2xl font-semibold">{stats.totalLessons}</p>
              <p className="text-xs text-muted-foreground">Total Lessons</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="text-right">
              <p className="text-2xl font-semibold">{stats.completedLessons}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="text-right">
              <p className="text-2xl font-semibold">{stats.cancelledLessons}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div className="text-right">
              <p className="text-2xl font-semibold">{formatDuration(stats.totalDuration)}</p>
              <p className="text-xs text-muted-foreground">Total Time</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <User className="h-8 w-8 text-muted-foreground" />
            <div className="text-right">
              <p className="text-2xl font-semibold">{stats.uniqueTeachers}</p>
              <p className="text-xs text-muted-foreground">Teachers</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
            <div className="text-right">
              <p className="text-2xl font-semibold">{stats.uniqueStudents}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by teacher or student name/email..."
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
          <span>Showing {filteredLessons.length} of {lessons.length} lessons</span>
          {(searchTerm || statusFilter !== "all" || teacherFilter !== "all") && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setTeacherFilter("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Lessons List */}
      <div className="space-y-4">
        {filteredLessons.map((lesson) => (
          <Card key={lesson.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                {/* Header Row */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(lesson.status)}
                    <Badge className={`text-xs ${getStatusColor(lesson.status)}`}>
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
                      <span className="text-xs font-medium text-muted-foreground">Teacher</span>
                    </div>
                    <p className="font-medium text-sm">{lesson.teacher.user.name}</p>
                    <p className="text-xs text-muted-foreground">{lesson.teacher.user.email}</p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Student</span>
                    </div>
                    <p className="font-medium text-sm">{lesson.student.user.name}</p>
                    <p className="text-xs text-muted-foreground">{lesson.student.user.email}</p>
                  </div>
                </div>

                {/* Notes Preview */}
                {lesson.notes && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Lesson Notes</p>
                    <div 
                      className="text-sm text-muted-foreground line-clamp-2"
                      dangerouslySetInnerHTML={{ 
                        __html: lesson.notes.substring(0, 200) + (lesson.notes.length > 200 ? '...' : '') 
                      }}
                    />
                  </div>
                )}

                {/* Homework Preview */}
                {lesson.homework && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Homework</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {lesson.homework}
                    </p>
                  </div>
                )}
              </div>

              {/* View Button */}
              <Link href={`/lessons/${lesson.id}`}>
                <Button variant="secondary" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </Link>
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
              : "Try adjusting your search or filters."
            }
          </p>
        </Card>
      )}
    </div>
  );
}