"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Star } from "lucide-react";

interface RecommendationFormProps {
  teacherId: string;
  recommendation?: {
    id: string;
    title: string;
    description: string;
    link?: string;
    category: string;
    price?: string;
    priority: number;
  };
}

const categories = [
  { value: "GEAR", label: "Gear & Equipment" },
  { value: "BOOKS", label: "Books & Method Books" },
  { value: "SOFTWARE", label: "Software & Tools" },
  { value: "ONLINE_COURSES", label: "Online Courses" },
  { value: "APPS", label: "Mobile Apps" },
  { value: "OTHER", label: "Other Resources" },
];

const priorities = [
  { value: "5", label: "Essential (Must Have)" },
  { value: "4", label: "High Priority (Strongly Recommended)" },
  { value: "3", label: "Recommended (Good to Have)" },
  { value: "2", label: "Optional (Nice to Have)" },
  { value: "1", label: "Consider Later (Future Purchase)" },
];

export function RecommendationForm({
  teacherId,
  recommendation,
}: RecommendationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Form state
  const [title, setTitle] = useState(recommendation?.title || "");
  const [description, setDescription] = useState(
    recommendation?.description || ""
  );
  const [link, setLink] = useState(recommendation?.link || "");
  const [category, setCategory] = useState(recommendation?.category || "");
  const [price, setPrice] = useState(recommendation?.price || "");
  const [priority, setPriority] = useState(
    recommendation?.priority.toString() || "3"
  );

  const validateUrl = (url: string) => {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || !category) {
      setError("Please fill in all required fields");
      return;
    }

    if (link && !validateUrl(link)) {
      setError("Please enter a valid URL for the link");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const url = recommendation
        ? `/api/recommendations/${recommendation.id}`
        : "/api/recommendations";

      const method = recommendation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          link: link || null,
          category,
          price: price || null,
          priority: parseInt(priority),
          teacherId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save recommendation");
      }

      // Success - redirect to recommendations page
      router.push("/recommendations");
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <Label htmlFor="title">Recommendation Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Fender Player Stratocaster"
            className="mt-2"
            required
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a description"
            rows={4}
            className="mt-2"
            required
          />
        </div>

        {/* Link */}
        <div>
          <Label htmlFor="link">Link (Optional)</Label>
          <Input
            id="link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com/product"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Add a link to where students can view or purchase this item
          </p>
        </div>

        {/* Category and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Priority *</Label>
            <Select value={priority} onValueChange={setPriority} required>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= parseInt(p.value)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span>{p.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Price */}
        <div>
          <Label htmlFor="price">Price Range (Optional)</Label>
          <Input
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g., $299, Free, $50-100"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Help students understand the expected cost
          </p>
        </div>

        {/* Priority Visual */}
        {priority && (
          <div className="p-4 bg-muted rounded-lg">
            <Label className="text-sm font-medium">Priority Preview:</Label>
            <div className="flex items-center space-x-2 mt-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= parseInt(priority)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {priorities.find((p) => p.value === priority)?.label}
              </span>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex space-x-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading
              ? recommendation
                ? "Updating..."
                : "Creating..."
              : recommendation
              ? "Update Recommendation"
              : "Create Recommendation"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/recommendations")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
