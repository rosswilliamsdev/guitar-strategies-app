"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  BookOpen,
  GripVertical,
} from "lucide-react";
import toast from "react-hot-toast";

interface CurriculumItem {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  difficulty?: number;
  estimatedMinutes?: number;
  resourceUrl?: string;
  notes?: string;
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
  studentNotes?: string;
  teacherNotes?: string;
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [showNewSection, setShowNewSection] = useState(false);
  const [showNewItem, setShowNewItem] = useState<string | null>(null);

  useEffect(() => {
    fetchCurriculum();
  }, [curriculumId]);

  const fetchCurriculum = async () => {
    try {
      const response = await fetch(`/api/curriculums/${curriculumId}`);
      if (response.ok) {
        const data = await response.json();
        setCurriculum(data);
        // Expand all sections by default
        setExpandedSections(
          new Set(data.sections.map((s: CurriculumSection) => s.id))
        );
      }
    } catch (error) {
      console.error("Error fetching curriculum:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;

    try {
      const response = await fetch("/api/curriculums/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curriculumId,
          title: newSectionTitle,
          category: "OTHER",
        }),
      });

      if (response.ok) {
        setNewSectionTitle("");
        setShowNewSection(false);
        fetchCurriculum();
      }
    } catch (error) {
      console.error("Error adding section:", error);
    }
  };

  const handleAddItem = async (sectionId: string) => {
    if (!newItemTitle.trim()) return;

    try {
      const response = await fetch("/api/curriculums/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          title: newItemTitle,
        }),
      });

      if (response.ok) {
        setNewItemTitle("");
        setShowNewItem(null);
        fetchCurriculum();
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleToggleProgress = async (
    itemId: string,
    currentStatus?: string
  ) => {
    // Students cannot toggle progress - read only
    return;
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

  const getSectionProgress = (section: CurriculumSection) => {
    const progress = getStudentProgress();
    if (!progress)
      return { completed: 0, total: section.items.length, percentage: 0 };

    const completed = section.items.filter((item) => {
      const itemProgress = progress.itemProgress?.find(
        (p) => p.itemId === item.id
      );
      return itemProgress?.status === "COMPLETED";
    }).length;

    return {
      completed,
      total: section.items.length,
      percentage:
        section.items.length > 0 ? (completed / section.items.length) * 100 : 0,
    };
  };

  const checkForCelebrations = (
    previousCurriculum: Curriculum,
    updatedCurriculum: Curriculum
  ) => {
    const previousProgress = Array.isArray(previousCurriculum.studentProgress)
      ? previousCurriculum.studentProgress[0]
      : previousCurriculum.studentProgress;

    const currentProgress = Array.isArray(updatedCurriculum.studentProgress)
      ? updatedCurriculum.studentProgress[0]
      : updatedCurriculum.studentProgress;

    if (!currentProgress) return;

    // Check for section completions
    updatedCurriculum.sections.forEach((section) => {
      const getSectionCompletionCount = (
        curriculum: Curriculum,
        sectionId: string
      ) => {
        const progress = Array.isArray(curriculum.studentProgress)
          ? curriculum.studentProgress[0]
          : curriculum.studentProgress;

        if (!progress) return 0;

        const sectionItems =
          curriculum.sections.find((s) => s.id === sectionId)?.items || [];
        return sectionItems.filter((item) => {
          const itemProgress = progress.itemProgress?.find(
            (p) => p.itemId === item.id
          );
          return itemProgress?.status === "COMPLETED";
        }).length;
      };

      const previousCompleted = getSectionCompletionCount(
        previousCurriculum,
        section.id
      );
      const currentCompleted = getSectionCompletionCount(
        updatedCurriculum,
        section.id
      );
      const totalItems = section.items.length;

      // Section just completed
      if (
        previousCompleted < totalItems &&
        currentCompleted === totalItems &&
        totalItems > 0
      ) {
        toast.success(
          `🎸 Section Complete! You've mastered "${section.title}"!`,
          {
            duration: 5000,
            style: {
              background: "linear-gradient(135deg, #14b8b3 0%, #0d9289 100%)",
              color: "white",
              fontWeight: "600",
            },
          }
        );
      }
    });

    // Check for full curriculum completion
    const previousPercent = previousProgress?.progressPercent || 0;
    const currentPercent = currentProgress.progressPercent || 0;

    if (previousPercent < 100 && currentPercent === 100) {
      toast.success(
        `🏆 CHECKLIST COMPLETE! You've finished "${updatedCurriculum.title}"! Congratulations! 🎉`,
        {
          duration: 8000,
          style: {
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            color: "white",
            fontWeight: "700",
            fontSize: "16px",
          },
        }
      );
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "COMPLETED":
        return <Check className="h-4 w-4 text-green-600" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "NEEDS_REVIEW":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            {curriculum.title}
          </h1>
          {curriculum.description && (
            <p className="text-muted-foreground mt-2">
              {curriculum.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-4">
            <span className="px-3 py-1 text-sm rounded-full bg-turquoise-100 text-turquoise-700 border border-turquoise-200">
              {curriculum.level.toLowerCase()}
            </span>
            {userRole === "TEACHER" && (
              <span
                className={`px-3 py-1 text-sm rounded-full ${
                  curriculum.isPublished
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                {curriculum.isPublished ? "Published" : "Draft"}
              </span>
            )}
          </div>
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

      {/* Progress Overview for Students */}
      {userRole === "STUDENT" &&
        curriculum.studentProgress &&
        (() => {
          const progress = Array.isArray(curriculum.studentProgress)
            ? curriculum.studentProgress[0]
            : curriculum.studentProgress;

          if (!progress) return null;

          return (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Your Progress</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed Items</span>
                  <span className="font-medium">
                    {progress.completedItems} / {progress.totalItems}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-turquoise-500 transition-all"
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {Math.round(progress.progressPercent)}% complete
                </p>
              </div>
            </Card>
          );
        })()}

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Checklist Content</h2>
          {userRole === "TEACHER" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowNewSection(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          )}
        </div>

        {/* New Section Form */}
        {showNewSection && userRole === "TEACHER" && (
          <Card className="p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="new-section">New Section Title</Label>
                <Input
                  id="new-section"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g., Basic Chords"
                  onKeyPress={(e) => e.key === "Enter" && handleAddSection()}
                />
              </div>
              <Button variant="primary" size="sm" onClick={handleAddSection}>
                Add
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowNewSection(false);
                  setNewSectionTitle("");
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Sections List */}
        {curriculum.sections.map((section) => (
          <Card key={section.id} className="overflow-hidden">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center gap-3">
                {expandedSections.has(section.id) ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <h3 className="font-semibold">{section.title}</h3>
                  {section.description && (
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {userRole === "STUDENT" &&
                  (() => {
                    const sectionProgress = getSectionProgress(section);
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {sectionProgress.completed}/{sectionProgress.total}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-turquoise-500 transition-all"
                            style={{ width: `${sectionProgress.percentage}%` }}
                          />
                        </div>
                        {sectionProgress.percentage === 100 && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    );
                  })()}
                <span className="text-sm text-muted-foreground">
                  {section.items.length} items
                </span>
                {userRole === "TEACHER" && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSection(section.id);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {expandedSections.has(section.id) && (
              <div className="border-t">
                {/* Items */}
                <div className="divide-y">
                  {section.items.map((item) => {
                    const progress = getItemProgress(item.id);
                    return (
                      <div key={item.id} className="p-4 hover:bg-muted/30">
                        <div className="flex items-start gap-3">
                          {userRole === "STUDENT" && (
                            <div className="mt-1 w-4 h-4 flex items-center justify-center">
                              {progress?.status === "COMPLETED" ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <div className="w-4 h-4 border-2 border-gray-300 rounded bg-white" />
                              )}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.title}</p>
                              {progress && getStatusIcon(progress.status)}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                            {item.estimatedMinutes && (
                              <p className="text-xs text-muted-foreground mt-2">
                                ~{item.estimatedMinutes} minutes
                              </p>
                            )}
                          </div>
                          {userRole === "TEACHER" && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingItem(item.id)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Item Button */}
                {userRole === "TEACHER" && (
                  <div className="p-4 border-t">
                    {showNewItem === section.id ? (
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Input
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            placeholder="e.g., Practice C Major chord"
                            onKeyPress={(e) =>
                              e.key === "Enter" && handleAddItem(section.id)
                            }
                          />
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddItem(section.id)}
                        >
                          Add
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowNewItem(null);
                            setNewItemTitle("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowNewItem(section.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
