"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, ChevronRight, Users, BookOpen, CheckCircle } from "lucide-react";

interface CurriculumSection {
  id: string;
  title: string;
  description?: string;
  category: string;
  sortOrder: number;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    sortOrder: number;
  }>;
}

interface StudentProgress {
  id: string;
  studentId: string;
  curriculumId: string;
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  student?: {
    user: {
      name: string;
      email: string;
    };
  };
  itemProgress?: Array<{
    itemId: string;
    status: string;
  }>;
}

interface Curriculum {
  id: string;
  title: string;
  description?: string;
  level: string;
  isPublished: boolean;
  isActive: boolean;
  sections: CurriculumSection[];
  studentProgress: StudentProgress[];
  createdAt: string;
  updatedAt: string;
}

interface CurriculumListProps {
  userRole: string;
}

export function CurriculumList({ userRole }: CurriculumListProps) {
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurriculums();
  }, []);

  const fetchCurriculums = async () => {
    try {
      const response = await fetch("/api/curriculums");
      if (response.ok) {
        const data = await response.json();
        setCurriculums(data);
      }
    } catch (error) {
      console.error("Error fetching curriculums:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "BEGINNER":
        return "bg-green-100 text-green-700 border-green-200";
      case "INTERMEDIATE":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "ADVANCED":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "PROFESSIONAL":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent === 100) return "bg-green-500";
    if (percent >= 75) return "bg-turquoise-500";
    if (percent >= 50) return "bg-blue-500";
    if (percent >= 25) return "bg-yellow-500";
    return "bg-gray-300";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading checklists...</div>
      </div>
    );
  }

  if (curriculums.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">No Checklists Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {userRole === "TEACHER"
              ? "Create your first checklist to provide structured learning paths for your students."
              : "Your teacher hasn't created any checklists yet. Check back later!"}
          </p>
          {userRole === "TEACHER" && (
            <Link href="/curriculums/new">
              <Button variant="primary" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create First Checklist
              </Button>
            </Link>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {userRole === "TEACHER" && (
        <div className="flex justify-end">
          <Link href="/curriculums/new">
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              New Checklist
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {curriculums.map((curriculum) => {
          // For students, calculate their own progress
          const studentProgress = userRole === "STUDENT" 
            ? curriculum.studentProgress[0] 
            : null;

          const totalSections = curriculum.sections.length;
          const totalItems = curriculum.sections.reduce(
            (sum, section) => sum + section.items.length,
            0
          );

          return (
            <Card key={curriculum.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {curriculum.title}
                    </h3>
                    {curriculum.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {curriculum.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full border ${getLevelColor(
                      curriculum.level
                    )}`}
                  >
                    {curriculum.level.toLowerCase()}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{totalSections} sections</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>{totalItems} items</span>
                  </div>
                  {userRole === "TEACHER" && curriculum.studentProgress.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{curriculum.studentProgress.length} students</span>
                    </div>
                  )}
                </div>

                {/* Student Progress Bar */}
                {userRole === "STUDENT" && studentProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {studentProgress.completedItems} / {studentProgress.totalItems} completed
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getProgressColor(
                          studentProgress.progressPercent
                        )}`}
                        style={{ width: `${studentProgress.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Teacher: Student Progress Summary */}
                {userRole === "TEACHER" && curriculum.studentProgress.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground mb-2">Recent Student Progress</p>
                    <div className="space-y-1">
                      {curriculum.studentProgress.slice(0, 3).map((progress) => (
                        <div key={progress.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate">
                            {progress.student?.user.name || "Unknown Student"}
                          </span>
                          <span className="font-medium">
                            {Math.round(progress.progressPercent)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Badges */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {userRole === "TEACHER" && (
                      <>
                        {curriculum.isPublished ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 border border-green-200">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            Draft
                          </span>
                        )}
                      </>
                    )}
                    {userRole === "STUDENT" && studentProgress && (
                      <>
                        {studentProgress.progressPercent === 100 ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 border border-green-200">
                            Completed
                          </span>
                        ) : studentProgress.progressPercent > 0 ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                            In Progress
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            Not Started
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <Link href={`/curriculums/${curriculum.id}`}>
                    <Button variant="secondary" size="sm">
                      {userRole === "TEACHER" ? "Manage" : "View"}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}