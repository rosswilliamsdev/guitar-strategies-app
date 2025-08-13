"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, ChevronRight, CheckCircle2, Clock, Archive } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  dueDate?: string;
  createdAt: string;
}

interface StudentChecklist {
  id: string;
  title: string;
  isActive: boolean;
  isArchived: boolean;
  items: ChecklistItem[];
  stats: {
    totalItems: number;
    completedItems: number;
    progressPercent: number;
  };
  createdAt: string;
  updatedAt: string;
}

export function StudentChecklistList() {
  const [checklists, setChecklists] = useState<StudentChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchChecklists();
  }, [showArchived]);

  const fetchChecklists = async () => {
    try {
      const params = new URLSearchParams();
      if (showArchived) params.append("includeArchived", "true");
      
      const response = await fetch(`/api/student-checklists?${params}`);
      if (response.ok) {
        const data = await response.json();
        setChecklists(data);
      }
    } catch (error) {
      console.error("Error fetching checklists:", error);
    } finally {
      setLoading(false);
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
        <div className="text-muted-foreground">Loading your checklists...</div>
      </div>
    );
  }

  const activeChecklists = checklists.filter(c => !c.isArchived);
  const archivedChecklists = checklists.filter(c => c.isArchived);

  if (activeChecklists.length === 0 && !showArchived) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">No Checklists Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Create your first personal checklist to track your practice routine, repertoire, techniques, and learning progress.
          </p>
          <Link href="/curriculums/my/new">
            <Button variant="primary" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Checklist
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">My Checklists</h2>
          {archivedChecklists.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? "Hide" : "Show"} Archived ({archivedChecklists.length})
            </Button>
          )}
        </div>
        <Link href="/curriculums/my/new">
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            New Checklist
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(showArchived ? checklists : activeChecklists).map((checklist) => (
          <Card
            key={checklist.id}
            className={`p-6 hover:shadow-md transition-shadow ${
              checklist.isArchived ? "opacity-60" : ""
            }`}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <h3 className="text-lg font-semibold text-foreground">
                      {checklist.title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {checklist.stats.completedItems} / {checklist.stats.totalItems} items
                  </span>
                </div>
                {checklist.items.some(item => item.dueDate) && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Has due dates</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{checklist.stats.progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(
                      checklist.stats.progressPercent
                    )}`}
                    style={{ width: `${checklist.stats.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  {checklist.isArchived && (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                      Archived
                    </span>
                  )}
                  {checklist.stats.progressPercent === 100 && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 border border-green-200">
                      Completed
                    </span>
                  )}
                </div>

                <Link href={`/curriculums/my/${checklist.id}`}>
                  <Button variant="secondary" size="sm">
                    View Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}