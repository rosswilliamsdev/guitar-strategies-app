"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Calendar,
  Clock,
  Link as LinkIcon,
  X,
} from "lucide-react";
import Link from "next/link";

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
}

interface ChecklistDetailProps {
  checklistId: string;
}

export function ChecklistDetail({ checklistId }: ChecklistDetailProps) {
  const router = useRouter();
  const [checklist, setChecklist] = useState<StudentChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    dueDate: "",
    estimatedMinutes: "",
    resourceUrl: "",
    notes: "",
  });

  useEffect(() => {
    fetchChecklist();
  }, [checklistId]);

  const fetchChecklist = async () => {
    try {
      const response = await fetch(`/api/student-checklists/${checklistId}`);
      if (response.ok) {
        const data = await response.json();
        setChecklist(data);
      }
    } catch (error) {
      console.error("Error fetching checklist:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemCompletion = async (itemId: string, isCompleted: boolean) => {
    try {
      const response = await fetch(`/api/student-checklists/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted }),
      });

      if (response.ok) {
        fetchChecklist();
      }
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  const addSingleItem = async () => {
    const firstLine = newItem.title.split('\n')[0].trim();
    if (!firstLine) return;

    try {
      const response = await fetch("/api/student-checklists/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistId,
          title: firstLine,
          estimatedMinutes: newItem.estimatedMinutes ? Number(newItem.estimatedMinutes) : undefined,
          dueDate: newItem.dueDate || undefined,
          resourceUrl: newItem.resourceUrl || undefined,
          notes: newItem.notes || undefined,
        }),
      });

      if (response.ok) {
        // Remove the first line from the textarea
        const remainingLines = newItem.title.split('\n').slice(1).join('\n');
        setNewItem({
          ...newItem,
          title: remainingLines,
        });
        fetchChecklist();
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const addBulkItems = async () => {
    if (!newItem.title.trim()) return;

    const items = newItem.title
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (items.length === 0) return;

    try {
      // Add all items
      for (const itemTitle of items) {
        await fetch("/api/student-checklists/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklistId,
            title: itemTitle,
            estimatedMinutes: newItem.estimatedMinutes ? Number(newItem.estimatedMinutes) : undefined,
            dueDate: newItem.dueDate || undefined,
            resourceUrl: newItem.resourceUrl || undefined,
            notes: newItem.notes || undefined,
          }),
        });
      }

      setNewItem({
        title: "",
        dueDate: "",
        estimatedMinutes: "",
        resourceUrl: "",
        notes: "",
      });
      setShowAddItem(false);
      fetchChecklist();
    } catch (error) {
      console.error("Error adding items:", error);
    }
  };


  const deleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const response = await fetch(`/api/student-checklists/items/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchChecklist();
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const toggleArchive = async () => {
    if (!checklist) return;

    try {
      const response = await fetch(`/api/student-checklists/${checklistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !checklist.isArchived }),
      });

      if (response.ok) {
        fetchChecklist();
      }
    } catch (error) {
      console.error("Error toggling archive:", error);
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
      console.error("Error deleting checklist:", error);
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

  const sortedItems = [...checklist.items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
              {checklist.isArchived && (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                  Archived
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleArchive}
            >
              {checklist.isArchived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restore
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </>
              )}
            </Button>
            <Link href={`/curriculums/my/${checklistId}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={deleteChecklist}
              className="text-red-600 hover:text-red-700"
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

      {/* Add Item Button/Form */}
      {!showAddItem ? (
        <Button
          variant="primary"
          onClick={() => setShowAddItem(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Item
        </Button>
      ) : (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add New Item</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddItem(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <Label htmlFor="new-title">Items</Label>
              <Textarea
                id="new-title"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Add checklist items (one per line)&#10;Press Ctrl+Enter to add all items"
                rows={3}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    addBulkItems();
                  } else if (e.key === "Enter" && !e.shiftKey && newItem.title.trim().indexOf('\n') === -1) {
                    e.preventDefault();
                    addSingleItem();
                  }
                }}
              />
            </div>


            <div>
              <Label htmlFor="new-due">Due Date (Optional)</Label>
              <Input
                id="new-due"
                type="date"
                value={newItem.dueDate}
                onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
              />
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowAddItem(false)}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={addSingleItem}
                  disabled={!newItem.title.trim()}
                >
                  Add Single Item
                </Button>
                <Button
                  variant="primary"
                  onClick={addBulkItems}
                  disabled={!newItem.title.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add All Items
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

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
                          variant="secondary"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          className="ml-2"
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
                      variant="secondary"
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
    </div>
  );
}