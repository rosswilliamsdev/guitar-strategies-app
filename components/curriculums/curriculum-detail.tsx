"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfettiModal } from "@/components/ui/confetti-modal";
import {
  fireItemConfetti,
  fireChecklistCompleteConfetti,
} from "@/lib/confetti";
import { Edit, ArrowLeft, Trophy, Trash2 } from "lucide-react";
import Link from "next/link";
import { log } from "@/lib/logger";

interface CurriculumItem {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
}

interface CurriculumSection {
  id: string;
  title: string;
  description?: string;
  category: string;
  sortOrder: number;
  items: CurriculumItem[];
}

interface ItemProgress {
  itemId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "NEEDS_REVIEW";
}

interface StudentProgress {
  id: string;
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  itemProgress: ItemProgress[];
}

interface Curriculum {
  id: string;
  title: string;
  description?: string;
  level: string;
  isPublished: boolean;
  sections: CurriculumSection[];
  studentProgress?: StudentProgress | StudentProgress[];
}

interface CurriculumDetailProps {
  curriculumId: string;
  userRole: string;
}

export function CurriculumDetail({
  curriculumId,
  userRole,
}: CurriculumDetailProps) {
  const router = useRouter();
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previousCompletedCount, setPreviousCompletedCount] = useState(0);
  const checkboxRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    fetchCurriculum();
  }, [curriculumId]);

  // Track completion changes for celebrations (students only)
  useEffect(() => {
    if (!curriculum || userRole !== "STUDENT") return;

    const progress = getStudentProgress();
    if (!progress) return;

    const currentCompletedCount = progress.completedItems;
    const totalItems = progress.totalItems;

    // If we just completed the entire checklist
    if (
      currentCompletedCount === totalItems &&
      totalItems > 0 &&
      previousCompletedCount < totalItems
    ) {
      setTimeout(() => {
        fireChecklistCompleteConfetti();
        setShowCelebrationModal(true);
      }, 300); // Small delay for smoother experience
    }

    setPreviousCompletedCount(currentCompletedCount);
  }, [curriculum, userRole, previousCompletedCount]);

  const fetchCurriculum = async () => {
    try {
      const response = await fetch(`/api/curriculums/${curriculumId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        // API returns { curriculum: {...} }, extract the curriculum object
        const curriculumData = data.curriculum || data;

        log.info('Fetched curriculum detail', {
          curriculumId,
          title: curriculumData.title,
          sectionCount: curriculumData.sections?.length || 0,
          itemCount: curriculumData.sections?.reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0) || 0,
        });

        setCurriculum(curriculumData);
      } else {
        log.error("Failed to fetch curriculum", {
          status: response.status,
          curriculumId,
        });
      }
    } catch (error) {
      log.error("Error fetching curriculum:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCurriculum = async () => {
    if (!curriculum) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/curriculums/${curriculumId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        log.info("Curriculum deleted successfully", {
          curriculumId,
          curriculumTitle: curriculum.title,
        });
        // Redirect back to curriculums list
        router.push("/curriculums");
      } else {
        const errorData = await response.json();
        log.error("Failed to delete curriculum", {
          status: response.status,
          error: errorData.error,
          curriculumId,
        });
        alert("Failed to delete curriculum. Please try again.");
      }
    } catch (error) {
      log.error("Error deleting curriculum:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        curriculumId,
      });
      alert(
        "An error occurred while deleting the curriculum. Please try again."
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const getStudentProgress = () => {
    if (!curriculum?.studentProgress) return null;
    return Array.isArray(curriculum.studentProgress)
      ? curriculum.studentProgress[0]
      : curriculum.studentProgress;
  };

  const getItemProgress = (itemId: string) => {
    const progress = getStudentProgress();
    return progress?.itemProgress?.find((p) => p.itemId === itemId);
  };

  const handleToggleProgress = async (itemId: string, isCompleted: boolean) => {
    if (userRole !== "STUDENT") return;

    try {
      const response = await fetch(`/api/curriculums/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curriculumId,
          itemId,
          status: isCompleted ? "COMPLETED" : "NOT_STARTED",
        }),
      });

      if (response.ok) {
        // Fire confetti for item completion
        if (isCompleted) {
          const checkboxElement = checkboxRefs.current[itemId];
          fireItemConfetti(checkboxElement || undefined);
        }
        fetchCurriculum();
      }
    } catch (error) {
      log.error("Error updating progress:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading checklist...</div>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Checklist not found</p>
      </div>
    );
  }

  // Get all items from all sections in a flat list
  const allItems = curriculum.sections?.flatMap((section) => section.items || []) || [];

  return (
    <Card className="p-6">
      {/* Header with title and edit button */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/curriculums">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold text-foreground">
              {curriculum.title}
            </h1>
            {userRole === "STUDENT" &&
              (() => {
                const progress = getStudentProgress();
                return (
                  progress &&
                  progress.progressPercent === 100 &&
                  progress.totalItems > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-medium">
                      <Trophy className="h-3 w-3" />
                      <span>COMPLETED</span>
                    </div>
                  )
                );
              })()}
          </div>
          {curriculum.description && (
            <p className="text-muted-foreground ml-11">
              {curriculum.description}
            </p>
          )}
        </div>
        {userRole === "TEACHER" && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => router.push(`/curriculums/${curriculumId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Checklist
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Progress Overview for Students */}
      {userRole === "STUDENT" &&
        (() => {
          const progress = getStudentProgress();
          if (!progress) return null;

          return (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {progress.completedItems} / {progress.totalItems} completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-turquoise-500 transition-all"
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

      {/* Checklist Items - directly without separate heading */}
      {allItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No items in this checklist yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allItems
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => {
              const progress = getItemProgress(item.id);
              const isCompleted = progress?.status === "COMPLETED";

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50"
                >
                  {userRole === "STUDENT" ? (
                    <Checkbox
                      ref={(el) => { checkboxRefs.current[item.id] = el; }}
                      checked={isCompleted}
                      onCheckedChange={(checked) =>
                        handleToggleProgress(item.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-2 w-4 h-4 border-2 border-gray-300 rounded bg-white" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isCompleted ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Celebration Modal */}
      {userRole === "STUDENT" &&
        curriculum &&
        (() => {
          const progress = getStudentProgress();
          return (
            progress && (
              <ConfettiModal
                isOpen={showCelebrationModal}
                onClose={() => setShowCelebrationModal(false)}
                checklistTitle={curriculum.title}
                completedItems={progress.completedItems}
                totalItems={progress.totalItems}
              />
            )
          );
        })()}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Checklist
              </h3>
              <p className="text-gray-600">
                Are you sure you want to delete "{curriculum?.title}"? This
                action cannot be undone.
                {curriculum?.studentProgress &&
                  Array.isArray(curriculum.studentProgress) &&
                  curriculum.studentProgress.length > 0 && (
                    <span className="block mt-2 text-amber-600 font-medium">
                      Warning: This checklist has student progress data that
                      will be lost.
                    </span>
                  )}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCurriculum}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Checklist"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
