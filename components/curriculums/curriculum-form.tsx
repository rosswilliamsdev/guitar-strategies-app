"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCurriculumSchema } from "@/lib/validations";
import { Plus, X, GripVertical } from "lucide-react";
import { z } from "zod";

type CurriculumFormData = z.infer<typeof createCurriculumSchema>;

interface ChecklistSection {
  id: string;
  title: string;
  category: string;
  items: string[];
}

interface ChecklistItem {
  id: string;
  title: string;
}

export function CurriculumForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<CurriculumFormData>({
    title: "",
    description: "",
    level: "BEGINNER" as any,
    isPublished: false,
  });
  
  // Checklist sections
  const [sections, setSections] = useState<ChecklistSection[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionCategory, setNewSectionCategory] = useState("SONGS");

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    
    const newSection: ChecklistSection = {
      id: generateId(),
      title: newSectionTitle,
      category: newSectionCategory,
      items: []
    };
    
    setSections([...sections, newSection]);
    setNewSectionTitle("");
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const addItem = (sectionId: string, item: string) => {
    if (!item.trim()) return;
    
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, items: [...section.items, item.trim()] }
        : section
    ));
  };

  const removeItem = (sectionId: string, itemIndex: number) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, items: section.items.filter((_, i) => i !== itemIndex) }
        : section
    ));
  };

  const addBulkItems = (sectionId: string, bulkText: string) => {
    const items = bulkText
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, items: [...section.items, ...items] }
        : section
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate form data
      const validatedData = createCurriculumSchema.parse(formData);

      // Create curriculum first
      const curriculumResponse = await fetch("/api/curriculums", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      });

      if (!curriculumResponse.ok) {
        const error = await curriculumResponse.json();
        throw new Error(error.error || "Failed to create curriculum");
      }

      const curriculum = await curriculumResponse.json();

      // Create sections and items
      for (const section of sections) {
        const sectionResponse = await fetch("/api/curriculums/sections", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            curriculumId: curriculum.id,
            title: section.title,
            category: section.category,
          }),
        });

        if (sectionResponse.ok) {
          const createdSection = await sectionResponse.json();
          
          // Create items for this section
          for (const itemTitle of section.items) {
            await fetch("/api/curriculums/items", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sectionId: createdSection.id,
                title: itemTitle,
              }),
            });
          }
        }
      }

      router.push(`/curriculums/${curriculum.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("Error creating curriculum:", error);
        setErrors({ general: "Failed to create checklist. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {errors.general}
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Checklist Title *</Label>
          <Input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Beginner Guitar Fundamentals"
            className={errors.title ? "border-red-500" : ""}
          />
          {errors.title && (
            <p className="text-sm text-red-500">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe what students will learn in this checklist..."
            rows={4}
            className={errors.description ? "border-red-500" : ""}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        {/* Level */}
        <div className="space-y-2">
          <Label htmlFor="level">Skill Level *</Label>
          <Select
            value={formData.level}
            onValueChange={(value) => setFormData({ ...formData, level: value as any })}
          >
            <SelectTrigger id="level" className={errors.level ? "border-red-500" : ""}>
              <SelectValue placeholder="Select skill level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BEGINNER">Beginner</SelectItem>
              <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
              <SelectItem value="ADVANCED">Advanced</SelectItem>
              <SelectItem value="PROFESSIONAL">Professional</SelectItem>
            </SelectContent>
          </Select>
          {errors.level && (
            <p className="text-sm text-red-500">{errors.level}</p>
          )}
        </div>

        {/* Checklist Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Checklist Sections</Label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addSection}
              disabled={!newSectionTitle.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </div>
          
          {/* New Section Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="e.g., Classic Rock Songs, Guitar Solos, Chord Progressions"
                onKeyPress={(e) => e.key === "Enter" && e.preventDefault()}
              />
            </div>
            <Select value={newSectionCategory} onValueChange={setNewSectionCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SONGS">Songs</SelectItem>
                <SelectItem value="CHORDS">Chords</SelectItem>
                <SelectItem value="SCALES">Scales</SelectItem>
                <SelectItem value="RIFFS">Riffs</SelectItem>
                <SelectItem value="SOLOS">Solos</SelectItem>
                <SelectItem value="TECHNIQUE">Technique</SelectItem>
                <SelectItem value="THEORY">Theory</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Existing Sections */}
          {sections.map((section) => (
            <ChecklistSectionBuilder
              key={section.id}
              section={section}
              onRemoveSection={removeSection}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onAddBulkItems={addBulkItems}
            />
          ))}
        </div>

        {/* Publish Status */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isPublished"
            checked={formData.isPublished}
            onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <Label htmlFor="isPublished" className="cursor-pointer">
            Publish immediately (students can see this checklist)
          </Label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center gap-4 pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Checklist"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/curriculums")}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface ChecklistSectionBuilderProps {
  section: ChecklistSection;
  onRemoveSection: (sectionId: string) => void;
  onAddItem: (sectionId: string, item: string) => void;
  onRemoveItem: (sectionId: string, itemIndex: number) => void;
  onAddBulkItems: (sectionId: string, bulkText: string) => void;
}

function ChecklistSectionBuilder({
  section,
  onRemoveSection,
  onAddItem,
  onRemoveItem,
  onAddBulkItems,
}: ChecklistSectionBuilderProps) {
  const [newItem, setNewItem] = useState("");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const handleAddItem = () => {
    if (newItem.trim()) {
      onAddItem(section.id, newItem);
      setNewItem("");
    }
  };

  const handleBulkAdd = () => {
    if (bulkText.trim()) {
      onAddBulkItems(section.id, bulkText);
      setBulkText("");
      setShowBulkAdd(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold">{section.title}</h4>
            <p className="text-xs text-muted-foreground">{section.category}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onRemoveSection(section.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Current Items */}
        {section.items.length > 0 && (
          <div className="space-y-1">
            {section.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                <span>{item}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onRemoveItem(section.id, index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add Single Item */}
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add checklist item..."
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddItem())}
            className="text-sm"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddItem}
            disabled={!newItem.trim()}
          >
            Add
          </Button>
        </div>

        {/* Bulk Add Toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowBulkAdd(!showBulkAdd)}
          >
            {showBulkAdd ? "Hide" : "Bulk Add"}
          </Button>
        </div>

        {/* Bulk Add Interface */}
        {showBulkAdd && (
          <div className="space-y-2">
            <Label htmlFor={`bulk-${section.id}`} className="text-sm">
              Paste multiple items (one per line):
            </Label>
            <Textarea
              id={`bulk-${section.id}`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Sweet Child O' Mine - Guns N' Roses\nStairway to Heaven - Led Zeppelin\nHotel California - Eagles\nComfortably Numb - Pink Floyd`}
              rows={4}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleBulkAdd}
                disabled={!bulkText.trim()}
              >
                Add All
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBulkText("");
                  setShowBulkAdd(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}