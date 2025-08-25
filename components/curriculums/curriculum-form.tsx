"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus, X } from "lucide-react";
import Link from "next/link";

interface ChecklistItem {
  title: string;
}

interface ChecklistFormProps {
  checklist?: {
    id: string;
    title: string;
  };
}

export function CurriculumForm({ checklist }: ChecklistFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: checklist?.title || "",
  });
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addItem = () => {
    const firstLine = newItemTitle.split("\n")[0].trim();
    if (!firstLine) {
      setErrors({ newItem: "Item title is required" });
      return;
    }

    setItems([
      ...items,
      {
        title: firstLine,
      },
    ]);

    // Remove the first line from the textarea
    const remainingLines = newItemTitle.split("\n").slice(1).join("\n");
    setNewItemTitle(remainingLines);
    setErrors({});
  };

  const addBulkItems = () => {
    if (!newItemTitle.trim()) {
      setErrors({ newItem: "Please enter at least one item" });
      return;
    }

    const newItemsToAdd = newItemTitle
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((title) => ({
        title,
      }));

    if (newItemsToAdd.length === 0) {
      setErrors({ newItem: "Please enter at least one item" });
      return;
    }

    setItems([...items, ...newItemsToAdd]);
    setNewItemTitle("");
    setErrors({});
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof ChecklistItem,
    value: string
  ) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    if (!formData.title.trim()) {
      setErrors({ title: "Title is required" });
      return;
    }

    setLoading(true);
    try {
      // Create or update the checklist
      const url = checklist
        ? `/api/curriculums/${checklist.id}`
        : "/api/curriculums";
      const method = checklist ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          isPublished: true, // Automatically published for students
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save checklist");
      }

      const savedChecklist = await response.json();

      // If this is a new checklist and we have items, add them
      if (!checklist && items.length > 0) {
        // Create a default section first
        const sectionResponse = await fetch("/api/curriculums/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            curriculumId: savedChecklist.id,
            title: "Checklist Items",
            category: "OTHER",
          }),
        });

        if (sectionResponse.ok) {
          const createdSection = await sectionResponse.json();

          // Add all items to this section
          for (const item of items) {
            await fetch("/api/curriculums/items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sectionId: createdSection.id,
                title: item.title,
              }),
            });
          }
        }
      }

      router.push(`/curriculums/${savedChecklist.id}`);
    } catch (error) {
      console.error("Error saving checklist:", error);
      setErrors({
        submit:
          error instanceof Error ? error.message : "Failed to save checklist",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {checklist ? "Edit Checklist" : "Create New Checklist"}
          </h2>
          <Link href="/curriculums">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Checklists
            </Button>
          </Link>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {errors.submit}
          </div>
        )}

        {/* Basic Details */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Checklist Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Daily Practice Routine"
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title}</p>
            )}
          </div>
        </div>

        {/* Items Section (only for new checklists) */}
        {!checklist && (
          <div className="space-y-4 border-t pt-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Checklist Items</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add items to your checklist. You can always add more items
                later.
              </p>
            </div>

            {/* Add New Items */}
            <div className="space-y-2">
              <Textarea
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Enter checklist items (one per line)&#10;Press Ctrl+Enter to add all items"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    addBulkItems();
                  } else if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    newItemTitle.trim().indexOf("\n") === -1
                  ) {
                    e.preventDefault();
                    addItem();
                  }
                }}
                rows={3}
                className={`resize-none ${
                  errors.newItem ? "border-red-500" : ""
                }`}
              />
              <div className="flex justify-between items-center">
                {errors.newItem && (
                  <p className="text-sm text-red-500">{errors.newItem}</p>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addItem}
                    disabled={!newItemTitle.trim()}
                  >
                    Add Single Item
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addBulkItems}
                    disabled={!newItemTitle.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add All Items
                  </Button>
                </div>
              </div>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {items.length} item{items.length !== 1 ? "s" : ""} added
                </p>
                {items.map((item, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          value={item.title}
                          onChange={(e) =>
                            updateItem(index, "title", e.target.value)
                          }
                          placeholder="Item title"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href="/curriculums">
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="primary" type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading
              ? "Saving..."
              : checklist
              ? "Update Checklist"
              : "Create Checklist"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
