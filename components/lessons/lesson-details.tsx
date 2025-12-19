"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import {
  FileText,
  Paperclip,
  ExternalLink,
  Play,
  CheckSquare,
} from "lucide-react";
import { YouTubeEmbed } from "@/components/ui/youtube-embed";
import { log } from '@/lib/logger';

interface Lesson {
  id: string;
  date: string;
  duration: number;
  notes?: string;
  homework?: string;
  progress?: string;
  status: string;
  focusAreas?: string;
  songsPracticed?: string;
  nextSteps?: string;
  checklistItems?: string;
  student: {
    user: {
      name: string;
    };
  };
  teacher: {
    user: {
      name: string;
    };
  };
  attachments?: Array<{
    id: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    uploadedAt: string;
  }>;
  links?: Array<{
    id: string;
    title: string;
    url: string;
    description?: string;
    linkType: string;
    createdAt: string;
  }>;
}

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
}

interface LessonDetailsProps {
  lessonId: string;
  userId: string;
  canEdit: boolean;
}

export function LessonDetails({
  lessonId,
  userId,
  canEdit,
}: LessonDetailsProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await fetch(`/api/lessons/${lessonId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Lesson not found");
          } else {
            throw new Error("Failed to fetch lesson");
          }
          return;
        }
        const data = await response.json();
        setLesson(data.lesson);
        
        // Fetch checklist item details if they exist
        if (data.lesson.checklistItems) {
          try {
            const itemIds = JSON.parse(data.lesson.checklistItems);
            if (Array.isArray(itemIds) && itemIds.length > 0) {
              const checklistItemsData = await Promise.all(
                itemIds.map(async (itemId: string) => {
                  try {
                    // Try student checklist item first
                    const checklistResponse = await fetch(`/api/student-checklists/items/${itemId}`);
                    if (checklistResponse.ok) {
                      const itemData = await checklistResponse.json();
                      return itemData.item;
                    }

                    // If not found, try curriculum item
                    const curriculumResponse = await fetch(`/api/curriculums/items/${itemId}`);
                    if (curriculumResponse.ok) {
                      const itemData = await curriculumResponse.json();
                      return itemData.item;
                    }

                    // Item not found in either location
                    log.warn(`Checklist item not found: ${itemId}`);
                    return null;
                  } catch (err) {
                    log.error(`Error fetching checklist item ${itemId}:`, {
                      error: err instanceof Error ? err.message : String(err),
                      stack: err instanceof Error ? err.stack : undefined
                    });
                    return null;
                  }
                })
              );

              // Filter out any null responses and set valid items
              const validItems = checklistItemsData.filter((item): item is ChecklistItem => item !== null && item !== undefined);
              setChecklistItems(validItems);
            }
          } catch (parseError) {
            log.error('Error parsing checklist items:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        stack: parseError instanceof Error ? parseError.stack : undefined
      });
          }
        }
      } catch (error) {
        setError("Failed to load lesson details");
        log.error('Error fetching lesson:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading lesson details...</p>
      </Card>
    );
  }

  if (error || !lesson) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium text-foreground mb-2">
          {error || "Lesson not found"}
        </h3>
        <p className="text-muted-foreground mb-4">
          This lesson doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/lessons">
          <Button variant="secondary">Back to Lessons</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Lesson with {lesson.teacher.user.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(lesson.date), "PPp")} • {lesson.duration} min
          </p>
        </div>
        {canEdit && (
          <Link href={`/lessons/${lessonId}/edit`}>
            <Button size="sm">Edit Lesson</Button>
          </Link>
        )}
      </div>

      {/* Lesson Notes */}
      {lesson.notes && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              Lesson Notes
            </h3>
          </div>
          <div className="prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: lesson.notes }} />
          </div>
        </Card>
      )}

      {/* Checklist Items Completed */}
      {checklistItems.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckSquare className="h-5 w-5 text-turquoise-500" />
            <h3 className="text-lg font-semibold text-foreground">
              Checklist Items Completed
            </h3>
          </div>
          <div className="space-y-2">
            {checklistItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-start space-x-3 px-3 py-2 bg-turquoise-50 border border-turquoise-200 rounded-lg"
              >
                <CheckSquare className="h-4 w-4 text-turquoise-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-turquoise-800">
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-xs text-turquoise-600 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-turquoise-50 border border-turquoise-200 rounded-lg">
            <p className="text-sm text-turquoise-700">
              <span className="font-semibold">{checklistItems.length}</span> checklist item(s) were completed during this lesson.
            </p>
          </div>
        </Card>
      )}

      {/* Focus Areas & Songs */}
      {(lesson.focusAreas || lesson.songsPracticed) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lesson.focusAreas && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Focus Areas
              </h3>
              <div className="space-y-2">
                {lesson.focusAreas.split(",").map((area, index) => (
                  <div key={index} className="px-3 py-2 bg-muted rounded-md">
                    <span className="text-sm">{area.trim()}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {lesson.songsPracticed && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Songs Practiced
              </h3>
              <div className="space-y-2">
                {lesson.songsPracticed.split(",").map((song, index) => (
                  <div key={index} className="px-3 py-2 bg-muted rounded-md">
                    <span className="text-sm">{song.trim()}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Links & Resources */}
      {lesson.links && lesson.links.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              Links & Resources
            </h3>
          </div>
          <div className="space-y-6">
            {lesson.links.map((link) => (
              <div key={link.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {link.linkType === "YOUTUBE" && (
                        <Play className="h-4 w-4 text-red-500" />
                      )}
                      <h4 className="font-medium">{link.title}</h4>
                    </div>
                    {link.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {link.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {link.url}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(link.url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {/* Embed YouTube videos */}
                {link.linkType === "YOUTUBE" && (
                  <div className="mt-3">
                    <YouTubeEmbed
                      url={link.url}
                      title={link.title}
                      className="max-w-2xl"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* File Attachments */}
      {lesson.attachments && lesson.attachments.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              File Attachments
            </h3>
          </div>
          <div className="space-y-3">
            {lesson.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {attachment.originalName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB •{" "}
                      {attachment.mimeType}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(attachment.fileUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
