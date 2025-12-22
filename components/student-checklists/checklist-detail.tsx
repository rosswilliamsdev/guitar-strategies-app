"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfettiModal } from "@/components/ui/confetti-modal";
import { fireItemConfetti, fireChecklistCompleteConfetti } from "@/lib/confetti";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  Clock,
  Link as LinkIcon,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { log } from '@/lib/logger';

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  dueDate?: string;
  notes?: string;
  resourceUrl?: string;
  estimatedMinutes?: number;
  sortOrder?: number;
  createdAt: string;
}

interface StudentChecklist {
  id: string;
  title: string;
  isActive: boolean;
  items: ChecklistItem[];
  stats: {
    totalItems: number;
    completedItems: number;
    progressPercent: number;
  };
}

interface ChecklistDetailProps {
  checklistId: string;
}

export function ChecklistDetail({ checklistId }: ChecklistDetailProps) {
  const router = useRouter();
  const [checklist, setChecklist] = useState<StudentChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [previousCompletedCount, setPreviousCompletedCount] = useState(0);
  const checkboxRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    fetchChecklist();
  }, [checklistId]);

  // Track completion changes for celebrations
  useEffect(() => {
    if (!checklist) return;
    
    const currentCompletedCount = checklist.stats.completedItems;
    const totalItems = checklist.stats.totalItems;
    
    // If we just completed the entire checklist
    if (currentCompletedCount === totalItems && totalItems > 0 && previousCompletedCount < totalItems) {
      setTimeout(() => {
        fireChecklistCompleteConfetti();
        setShowCelebrationModal(true);
      }, 300); // Small delay for smoother experience
    }
    
    setPreviousCompletedCount(currentCompletedCount);
  }, [checklist, previousCompletedCount]);

  const fetchChecklist = async () => {
    try {
      // Add timestamp to bypass all caching layers
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/student-checklists/${checklistId}?_t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        log.info('Fetched student checklist detail', {
          checklistId,
          title: data.title,
          itemCount: data.items?.length || 0,
        });
        setChecklist(data);
      } else {
        log.error('Failed to fetch student checklist', {
          status: response.status,
          checklistId,
        });
      }
    } catch (error) {
      log.error('Error fetching checklist:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleItemCompletion = async (itemId: string, isCompleted: boolean) => {
    // Optimistically update the local state immediately for better UX
    if (checklist) {
      const updatedItems = checklist.items.map(item =>
        item.id === itemId
          ? { ...item, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined }
          : item
      );

      const completedCount = updatedItems.filter(item => item.isCompleted).length;
      const totalCount = updatedItems.length;
      const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      setChecklist({
        ...checklist,
        items: updatedItems,
        stats: {
          totalItems: totalCount,
          completedItems: completedCount,
          progressPercent
        }
      });
    }

    try {
      const response = await fetch(`/api/student-checklists/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted }),
      });

      if (response.ok) {
        // Fire confetti for item completion
        if (isCompleted) {
          const checkboxElement = checkboxRefs.current[itemId];
          fireItemConfetti(checkboxElement || undefined);
        }
        // Don't refetch - optimistic update is sufficient
        // The data will refresh naturally when the user navigates away and back
      } else {
        // If the request failed, revert the optimistic update
        fetchChecklist();
      }
    } catch (error) {
      log.error('Error toggling item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Revert the optimistic update on error
      fetchChecklist();
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/student-checklists/items/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        log.info('Deleted checklist item', { itemId, checklistId });
        await fetchChecklist();
      } else {
        const errorData = await response.json();
        log.error('Failed to delete checklist item', {
          itemId,
          status: response.status,
          error: errorData
        });
      }
    } catch (error) {
      log.error('Error deleting item:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };


  const deleteChecklist = async () => {
    if (!confirm("Are you sure you want to delete this checklist? This action cannot be undone.")) return;

    try {
      const response = await fetch(`/api/student-checklists/${checklistId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/curriculums");
      }
    } catch (error) {
      log.error('Error deleting checklist:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
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

  if (!checklist) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-muted-foreground">Checklist not found.</p>
          <Link href="/curriculums">
            <Button variant="primary" className="mt-4">
              Back to Checklists
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const sortedItems = [...checklist.items].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const completedItems = sortedItems.filter((item) => item.isCompleted);
  const pendingItems = sortedItems.filter((item) => !item.isCompleted);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/curriculums">
                <Button variant="secondary" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-semibold">{checklist.title}</h1>
              {checklist.stats.progressPercent === 100 && checklist.stats.totalItems > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xs font-medium">
                  <Trophy className="h-3 w-3" />
                  <span>COMPLETED</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/curriculums/my/${checklistId}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={deleteChecklist}

            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {checklist.stats.completedItems} / {checklist.stats.totalItems} completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                checklist.stats.progressPercent === 100
                  ? "bg-green-500"
                  : checklist.stats.progressPercent >= 50
                  ? "bg-turquoise-500"
                  : "bg-blue-500"
              }`}
              style={{ width: `${checklist.stats.progressPercent}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Items List */}
      <div className="space-y-4">
        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              To Do ({pendingItems.length})
            </h3>
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      ref={(el) => { checkboxRefs.current[item.id] = el; }}
                      checked={item.isCompleted}
                      onCheckedChange={(checked) =>
                        toggleItemCompletion(item.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.title}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {item.dueDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {item.estimatedMinutes && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{item.estimatedMinutes} min</span>
                              </div>
                            )}
                            {item.resourceUrl && (
                              <a
                                href={item.resourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-primary"
                              >
                                <LinkIcon className="h-3 w-3" />
                                <span>Resource</span>
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Completed ({completedItems.length})
            </h3>
            <div className="space-y-2 opacity-60">
              {completedItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      ref={(el) => { checkboxRefs.current[item.id] = el; }}
                      checked={item.isCompleted}
                      onCheckedChange={(checked) =>
                        toggleItemCompletion(item.id, checked as boolean)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium line-through">{item.title}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                      className="ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {checklist.items.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No items in this checklist yet. Add your first item to get started!
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Celebration Modal */}
      {checklist && (
        <ConfettiModal
          isOpen={showCelebrationModal}
          onClose={() => setShowCelebrationModal(false)}
          checklistTitle={checklist.title}
          completedItems={checklist.stats.completedItems}
          totalItems={checklist.stats.totalItems}
        />
      )}
    </div>
  );
}