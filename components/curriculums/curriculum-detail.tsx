"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

  useEffect(() => {
    fetchCurriculum();
  }, [curriculumId]);

  const fetchCurriculum = async () => {
    try {
      const response = await fetch(`/api/curriculums/${curriculumId}`);
      if (response.ok) {
        const data = await response.json();
        setCurriculum(data);
      }
    } catch (error) {
      console.error("Error fetching curriculum:", error);
    } finally {
      setLoading(false);
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
        fetchCurriculum();
      }
    } catch (error) {
      console.error("Error updating progress:", error);
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
  const allItems = curriculum.sections.flatMap((section) => section.items);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
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
            </div>
            {curriculum.description && (
              <p className="text-muted-foreground">
                {curriculum.description}
              </p>
            )}
          </div>
          {userRole === "TEACHER" && (
            <Button
              variant="secondary"
              onClick={() => router.push(`/curriculums/${curriculumId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Checklist
            </Button>
          )}
        </div>
      </Card>

      {/* Progress Overview for Students */}
      {userRole === "STUDENT" && (() => {
        const progress = getStudentProgress();
        if (!progress) return null;

        return (
          <Card className="p-6">
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
          </Card>
        );
      })()}

      {/* Checklist Items */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Checklist Items</h2>
        {allItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No items in this checklist yet.</p>
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
                      <p className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
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
      </Card>
    </div>
  );
}