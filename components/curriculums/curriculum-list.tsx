"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, ChevronRight, Users, CheckCircle, Trophy, Star, Crown, Music, Music2, Volume2, Trash2, MoreVertical } from "lucide-react";
import { log, emailLog } from '@/lib/logger';

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
  const [deletingCurriculum, setDeletingCurriculum] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    fetchCurriculums();
  }, []);

  const fetchCurriculums = async () => {
    try {
      const response = await fetch("/api/curriculums");
      if (response.ok) {
        const data = await response.json();
        log.info('Fetched curriculums from API', {
          count: data.curriculums?.length || 0,
          curriculums: data.curriculums?.map((c: any) => ({
            id: c.id,
            title: c.title,
            sectionCount: c.sections?.length || 0,
            itemCount: c.sections?.reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0) || 0
          }))
        });
        // API returns { curriculums: [...] }, extract the array
        setCurriculums(data.curriculums || []);
      } else {
        log.error('Failed to fetch curriculums', {
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error) {
      log.error('Error fetching curriculums:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCurriculum = async (curriculumId: string, curriculumTitle: string) => {
    setDeletingCurriculum(curriculumId);
    try {
      const response = await fetch(`/api/curriculums/${curriculumId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        log.info('Curriculum deleted successfully', {
          curriculumId,
          curriculumTitle
        });
        // Remove the curriculum from the local state
        setCurriculums(prev => prev.filter(c => c.id !== curriculumId));
      } else {
        const errorData = await response.json();
        log.error('Failed to delete curriculum', {
          status: response.status,
          error: errorData.error,
          curriculumId
        });
        alert('Failed to delete curriculum. Please try again.');
      }
    } catch (error) {
      log.error('Error deleting curriculum:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        curriculumId
      });
      alert('An error occurred while deleting the curriculum. Please try again.');
    } finally {
      setDeletingCurriculum(null);
      setShowDeleteModal(null);
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent === 100) return "bg-gradient-to-r from-teal-400 via-cyan-400 to-slate-400 shadow-lg";
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
          <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto" />
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
          const studentProgress =
            userRole === "STUDENT" ? curriculum.studentProgress?.[0] : null;

          const totalItems = curriculum.sections?.reduce(
            (sum, section) => sum + (section.items?.length || 0),
            0
          ) || 0;

          return (
            <div key={curriculum.id} className="relative">
              {/* Delete button for teachers - positioned absolutely in top-right */}
              {userRole === "TEACHER" && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 z-10 p-2 h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteModal(curriculum.id);
                  }}
                  disabled={deletingCurriculum === curriculum.id}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              
              <Link href={`/curriculums/${curriculum.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-8">  {/* Add right padding to avoid delete button overlap */}
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground hover:text-primary">
                            {curriculum.title}
                          </h3>
                          {userRole === "STUDENT" && studentProgress && studentProgress.progressPercent === 100 && (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-teal-100 via-cyan-100 to-slate-100 text-teal-800 border border-teal-200 flex items-center gap-1 shadow-md">
                              <Music className="h-3 w-3 text-teal-600" />
                              <Star className="h-2 w-2 text-cyan-500" />
                              Mastered!
                              <Star className="h-2 w-2 text-slate-400" />
                            </span>
                          )}
                        </div>
                        {curriculum.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {curriculum.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>{totalItems} items</span>
                      </div>
                      {userRole === "TEACHER" &&
                        curriculum.studentProgress?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>
                              {curriculum.studentProgress.length} students
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Student Progress Bar */}
                    {userRole === "STUDENT" && studentProgress && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className={`font-medium ${studentProgress.progressPercent === 100 ? 'text-teal-600' : ''}`}>
                            {studentProgress.progressPercent === 100 ? (
                              <span className="flex items-center gap-1">
                                <Music className="h-4 w-4 text-teal-600" />
                                <Star className="h-3 w-3 text-cyan-500" />
                                {studentProgress.completedItems} / {studentProgress.totalItems} mastered!
                              </span>
                            ) : (
                              `${studentProgress.completedItems} / ${studentProgress.totalItems} completed`
                            )}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressColor(
                              studentProgress.progressPercent
                            )}`}
                            style={{
                              width: `${studentProgress.progressPercent}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Teacher: Student Progress Summary */}
                    {userRole === "TEACHER" &&
                      curriculum.studentProgress?.length > 0 && (
                        <div className="border-t pt-4">
                          <p className="text-xs text-muted-foreground mb-2">
                            Recent Student Progress
                          </p>
                          <div className="space-y-1">
                            {curriculum.studentProgress
                              ?.slice(0, 3)
                              .map((progress) => (
                                <div
                                  key={progress.id}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-muted-foreground truncate">
                                    {progress.student?.user.name ||
                                      "Unknown Student"}
                                  </span>
                                  <span className="font-medium">
                                    {Math.round(progress.progressPercent)}%
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                </Card>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Checklist
              </h3>
              <p className="text-gray-600">
                Are you sure you want to delete &quot;{curriculums.find(c => c.id === showDeleteModal)?.title}&quot;? This action cannot be undone.
                {(() => {
                  const curriculum = curriculums.find(c => c.id === showDeleteModal);
                  const hasProgress = (curriculum?.studentProgress?.length || 0) > 0;
                  return hasProgress && (
                    <span className="block mt-2 text-amber-600 font-medium">
                      Warning: This checklist has student progress data that will be lost.
                    </span>
                  );
                })()}
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(null)}
                disabled={deletingCurriculum === showDeleteModal}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const curriculum = curriculums.find(c => c.id === showDeleteModal);
                  if (curriculum) {
                    handleDeleteCurriculum(curriculum.id, curriculum.title);
                  }
                }}
                disabled={deletingCurriculum === showDeleteModal}
                
              >
                {deletingCurriculum === showDeleteModal ? 'Deleting...' : 'Delete Checklist'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
