"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Save,
  X,
  Upload,
  Link as LinkIcon,
  FileText,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { log, emailLog } from '@/lib/logger';

interface LessonFormProps {
  teacherId: string;
  lessonId?: string;
  initialData?: any;
}

interface Student {
  id: string;
  user: {
    name: string;
    email: string;
  };
}

interface CurriculumItem {
  id: string;
  title: string;
  description?: string;
}

interface CurriculumSection {
  id: string;
  title: string;
  category: string;
  items: CurriculumItem[];
}

interface StudentCurriculum {
  id: string;
  title: string;
  createdByRole?: string;
  creatorName?: string;
  sections: CurriculumSection[];
  studentProgress?: {
    itemProgress: Array<{
      itemId: string;
      status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "NEEDS_REVIEW";
    }>;
  };
}

export function LessonForm({
  teacherId,
  lessonId,
  initialData,
}: LessonFormProps) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentCurriculums, setStudentCurriculums] = useState<StudentCurriculum[]>([]);
  const [selectedCurriculumItems, setSelectedCurriculumItems] = useState<string[]>([]);
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const [isChecklistSectionExpanded, setIsChecklistSectionExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [formData, setFormData] = useState({
    studentId: initialData?.studentId || "",
    notes: initialData?.notes || "",
    duration: initialData?.duration || 30,
    status: initialData?.status || "COMPLETED",
    version: initialData?.version || 1,
  });

  // File and link management
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>(
    initialData?.existingAttachments || []
  );
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [existingLinks, setExistingLinks] = useState(
    initialData?.existingLinks || []
  );
  const [currentLink, setCurrentLink] = useState("");

  // Initialize existing links and checklist items for editing
  useEffect(() => {
    if (initialData?.existingLinks && initialData.existingLinks.length > 0) {
      const existingUrls = initialData.existingLinks.map(
        (link: any) => link.url
      );
      setLinks(existingUrls);
    }
    
    // Load previously selected checklist items
    if (initialData?.checklistItems) {
      try {
        const items = JSON.parse(initialData.checklistItems);
        if (Array.isArray(items)) {
          setSelectedCurriculumItems(items);
        }
      } catch (error) {
        log.error('Error parsing checklist items:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      }
    }
  }, [initialData]);

  // Fetch teacher's students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch(`/api/students?teacherId=${teacherId}`);
        if (response.ok) {
          const data = await response.json();
          // API returns paginated response with data.data
          setStudents(data.data || data.students || []);
        }
      } catch (error) {
        log.error('Error fetching students:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      }
    };

    fetchStudents();
  }, [teacherId]);

  // Fetch student's checklists when student is selected
  useEffect(() => {
    const fetchStudentChecklists = async () => {
      if (!formData.studentId) {
        setStudentCurriculums([]);
        setSelectedCurriculumItems([]);
        return;
      }

      try {
        const response = await fetch(`/api/student-checklists?studentId=${formData.studentId}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Transform the checklist data to match the expected format
          const transformedChecklists = data.checklists?.map((checklist: any) => ({
              id: checklist.id,
              title: checklist.title,
              createdByRole: checklist.createdByRole || 'STUDENT',
              creatorName: checklist.creator?.name || 'Unknown',
              sections: [{
                id: 'main',
                title: 'Checklist Items',
                category: 'checklist',
                items: checklist.items?.map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  isCompleted: item.isCompleted,
                  completedAt: item.completedAt,
                })) || []
              }],
              studentProgress: {
                itemProgress: checklist.items?.map((item: any) => ({
                  itemId: item.id,
                  status: item.isCompleted ? "COMPLETED" : "NOT_STARTED"
                })) || []
              }
          })) || [];
          
          setStudentCurriculums(transformedChecklists);
        } else {
          const errorData = await response.json();
          log.error('API error:', {
        error: errorData instanceof Error ? errorData.message : String(errorData),
        stack: errorData instanceof Error ? errorData.stack : undefined
      });
        }
      } catch (error) {
        log.error('Error fetching student checklists:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      }
    };

    fetchStudentChecklists();
  }, [formData.studentId]);

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setError("");
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (attachmentId: string) => {
    setExistingAttachments((prev) =>
      prev.filter((att) => att.id !== attachmentId)
    );
    setRemovedAttachmentIds((prev) => [...prev, attachmentId]);
  };

  // Link handling
  const detectLinkType = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be"))
      return "YOUTUBE";
    if (url.includes("vimeo.com")) return "VIMEO";
    if (url.includes("spotify.com")) return "SPOTIFY";
    return "WEBSITE";
  };

  const addLink = () => {
    if (!currentLink.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(currentLink);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setLinks((prev) => [...prev, currentLink.trim()]);
    setCurrentLink("");
    setError("");
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // Curriculum item handling
  const toggleCurriculumItem = (itemId: string) => {
    setSelectedCurriculumItems((prev: string[]) => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Checklist expansion handling
  const toggleChecklistExpansion = (checklistId: string) => {
    setExpandedChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checklistId)) {
        newSet.delete(checklistId);
      } else {
        newSet.add(checklistId);
      }
      return newSet;
    });
  };

  const toggleChecklistSection = () => {
    setIsChecklistSectionExpanded(prev => !prev);
  };

  const getItemProgress = (itemId: string, curriculum: StudentCurriculum) => {
    return curriculum.studentProgress?.itemProgress?.find(p => p.itemId === itemId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Validate required fields
      if (!formData.studentId) {
        setError("Please select a student");
        return;
      }

      // Prepare lesson data
      const submitData = {
        studentId: formData.studentId,
        date: lessonId ? undefined : new Date().toISOString(), // Don't change date when editing
        duration: formData.duration,
        notes: formData.notes || "",
        status: formData.status,
        checklistItems: selectedCurriculumItems.length > 0 ? JSON.stringify(selectedCurriculumItems) : null,
        version: lessonId ? formData.version : undefined, // Only include version for updates
      };

      const url = lessonId ? `/api/lessons/${lessonId}` : "/api/lessons";
      const method = lessonId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save lesson");
      }

      const lessonResponse = await response.json();
      const currentLessonId = lessonId || lessonResponse.lesson?.id;

      if (!currentLessonId) {
        throw new Error('Failed to get lesson ID from response');
      }

      // Upload files if any
      if (selectedFiles.length > 0) {
        log.info(`Uploading ${selectedFiles.length} files for lesson ${currentLessonId}`);
        const fileFormData = new FormData();
        selectedFiles.forEach((file) => {
          fileFormData.append('files', file);
          log.info(`Added file: ${file.name}, size: ${file.size}`);
        });

        try {
          const fileResponse = await fetch(`/api/lessons/${currentLessonId}/attachments`, {
            method: "POST",
            body: fileFormData,
          });

          if (!fileResponse.ok) {
            const errorData = await fileResponse.json();
            log.error('File upload failed:', {
              error: errorData instanceof Error ? errorData.message : String(errorData),
              stack: errorData instanceof Error ? errorData.stack : undefined
            });
            throw new Error(`File upload failed: ${errorData.error || 'Unknown error'}`);
          }

          const fileResult = await fileResponse.json();
          log.info('Files uploaded successfully:', fileResult);
        } catch (fileError) {
          log.error('File upload error:', {
            error: fileError instanceof Error ? fileError.message : String(fileError),
            stack: fileError instanceof Error ? fileError.stack : undefined
          });
          // Don't fail the entire save, but show a warning
          setError(`Lesson saved but file upload failed: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }

      // Handle removed attachments when editing
      if (lessonId && removedAttachmentIds.length > 0) {
        log.info(`Removing ${removedAttachmentIds.length} attachments`);
        try {
          // Delete each attachment individually
          for (const attachmentId of removedAttachmentIds) {
            const removeResponse = await fetch(`/api/lessons/${currentLessonId}/attachments/${attachmentId}`, {
              method: "DELETE",
            });

            if (!removeResponse.ok) {
              const errorData = await removeResponse.json();
              log.error('Failed to remove attachment:', {
                error: errorData instanceof Error ? errorData.message : String(errorData),
                stack: errorData instanceof Error ? errorData.stack : undefined,
                attachmentId
              });
            } else {
              log.info('Attachment removed successfully:', { attachmentId });
            }
          }
        } catch (removeError) {
          log.error('Error removing attachments:', {
            error: removeError instanceof Error ? removeError.message : String(removeError),
            stack: removeError instanceof Error ? removeError.stack : undefined
          });
        }
      }

      // Handle links - use PUT for editing, POST for new lessons
      if (lessonId) {
        // Editing lesson - replace all links
        const linksData = links.map((url) => ({
          title: "Resource Link",
          url: url,
          description: null,
          linkType: detectLinkType(url),
        }));

        const linksResponse = await fetch("/api/lessons/links", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            lessonId: currentLessonId,
            links: linksData 
          }),
        });

        if (!linksResponse.ok) {
          const errorData = await linksResponse.json();
          log.error('Failed to update links:', {
        error: errorData instanceof Error ? errorData.message : String(errorData),
        stack: errorData instanceof Error ? errorData.stack : undefined
      });
        }
      } else if (links.length > 0) {
        // Creating new lesson - add all links
        const linksData = links.map((url) => ({
          title: "Resource Link",
          url: url,
          description: null,
          lessonId: currentLessonId,
          linkType: detectLinkType(url),
        }));

        const linksResponse = await fetch("/api/lessons/links", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ links: linksData }),
        });

        if (!linksResponse.ok) {
          const errorData = await linksResponse.json();
          log.error('Failed to save links:', {
        error: errorData instanceof Error ? errorData.message : String(errorData),
        stack: errorData instanceof Error ? errorData.stack : undefined
      });
        }
      }

      // Update checklist/curriculum items as completed
      if (selectedCurriculumItems.length > 0) {
        try {
          for (const itemId of selectedCurriculumItems) {
            // Find which checklist/curriculum contains this item
            const checklist = studentCurriculums.find(c =>
              c.sections.some(s => s.items.some(i => i.id === itemId))
            );

            if (checklist) {
              // Check if it's a teacher-created curriculum or student checklist
              if (checklist.createdByRole === "TEACHER") {
                // Update curriculum item progress
                await fetch("/api/curriculums/progress", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    studentId: formData.studentId,
                    curriculumId: checklist.id,
                    itemId: itemId,
                    status: "COMPLETED",
                  }),
                });
              } else {
                // Update student checklist item
                await fetch(`/api/student-checklists/items/${itemId}`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    isCompleted: true,
                    completedAt: new Date().toISOString(),
                  }),
                });
              }
            }
          }
        } catch (progressError) {
          log.error('Error updating checklist progress:', {
        error: progressError instanceof Error ? progressError.message : String(progressError),
        stack: progressError instanceof Error ? progressError.stack : undefined
      });
          // Don't fail the lesson submission if checklist update fails
        }
      }

      // Success - use hard navigation to bypass cache
      if (lessonId) {
        window.location.href = `/lessons/${lessonId}`;
      } else {
        window.location.href = "/lessons";
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (lessonId) {
      router.push(`/lessons/${lessonId}`);
    } else {
      router.push("/lessons");
    }
  };

  return (
    <Card className="p-8 max-w-4xl mx-auto">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Student Selection */}
        <div>
          <Label htmlFor="student">Student *</Label>
          <Select
            value={formData.studentId}
            onValueChange={(value) =>
              setFormData({ ...formData, studentId: value })
            }
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select a student" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Choose which student this lesson is for
          </p>
        </div>

        {/* Curriculum Progress */}
        {formData.studentId && studentCurriculums.length > 0 && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={toggleChecklistSection}
              className="flex items-center justify-between w-full p-2 -m-2 hover:bg-muted/30 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-2">
                <svg 
                  className={`w-4 h-4 transition-transform ${isChecklistSectionExpanded ? 'rotate-90' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="text-left">
                  <Label className="text-base font-semibold cursor-pointer">Checklist Progress</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isChecklistSectionExpanded 
                      ? "Check off checklist items the student practiced or completed during this lesson"
                      : `${studentCurriculums.length} checklist${studentCurriculums.length === 1 ? '' : 's'} available`
                    }
                  </p>
                </div>
              </div>
              {selectedCurriculumItems.length > 0 && (
                <span className="px-2 py-1 text-xs bg-turquoise-100 text-turquoise-700 rounded-full border border-turquoise-200">
                  {selectedCurriculumItems.length} item{selectedCurriculumItems.length === 1 ? '' : 's'} checked
                </span>
              )}
            </button>
            
            {isChecklistSectionExpanded && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {studentCurriculums.map((curriculum) => {
                const isTeacherCreated = curriculum.createdByRole === 'TEACHER';
                const isExpanded = expandedChecklists.has(curriculum.id);
                return (
                <Card 
                  key={curriculum.id} 
                  className={`p-4 ${isTeacherCreated 
                    ? 'border-turquoise-200 bg-turquoise-50' 
                    : 'border-neutral-200 bg-white'}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleChecklistExpansion(curriculum.id)}
                    className="flex items-center justify-between w-full mb-3 p-1 -m-1 hover:bg-black/5 rounded transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <svg 
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <h4 className="font-semibold text-sm cursor-pointer">{curriculum.title}</h4>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      isTeacherCreated 
                        ? 'bg-turquoise-100 text-turquoise-700 border border-turquoise-200' 
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}>
                      {isTeacherCreated ? '👨‍🏫 Teacher' : '🎸 Student'}
                    </span>
                  </button>
                  {isExpanded && (
                    <>
                      {curriculum.creatorName && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Created by {curriculum.creatorName}
                        </p>
                      )}
                      <div className="space-y-3">
                    {curriculum.sections.map((section) => (
                      <div key={section.id}>
                        <h5 className="font-medium text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                          {section.title}
                        </h5>
                        <div className="space-y-1.5 ml-2">
                          {section.items.map((item) => {
                            const progress = getItemProgress(item.id, curriculum);
                            const isCompleted = progress?.status === "COMPLETED" || (item as any)?.isCompleted;
                            const isSelected = selectedCurriculumItems.includes(item.id);
                            
                            // For teacher curricula: show strikethrough when selected
                            // For student checklists: show strikethrough when completed AND selected
                            const shouldShowStrikethrough = isTeacherCreated ? isSelected : (isCompleted && isSelected);
                            
                            return (
                              <label
                                key={item.id}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleCurriculumItem(item.id)}
                                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                />
                                <span className={`text-sm flex-1 ${shouldShowStrikethrough ? 'line-through text-muted-foreground' : ''}`}>
                                  {item.title}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      ))}
                      </div>
                    </>
                  )}
                </Card>
                );
              })}
            </div>
            
                {selectedCurriculumItems.length > 0 && (
                  <div className="p-3 bg-turquoise-50 border border-turquoise-200 rounded-lg">
                    <p className="text-sm text-turquoise-700">
                      <span className="font-semibold">{selectedCurriculumItems.length}</span> checklist item(s) will be marked as completed when you save this lesson.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Lesson Notes */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="notes">Lesson Notes</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Record what happened during the lesson (optional but recommended)
            </p>
          </div>
          <div className="w-full">
            <RichTextEditor
              content={formData.notes}
              onChange={(content) =>
                setFormData({ ...formData, notes: content })
              }
              placeholder="What did you work on in this lesson? Techniques practiced, songs played, progress notes..."
              className="min-h-[150px] w-full"
            />
          </div>
        </div>

        {/* Links */}
        <div className="space-y-3">
          <div>
            <Label>Links (Optional)</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Add YouTube videos, websites, or other resource URLs
            </p>
          </div>

          <div className="space-y-4">
            {/* Add Link Input */}
            <div className="flex gap-2">
              <Input
                type="url"
                value={currentLink}
                onChange={(e) => setCurrentLink(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
              />
              <Button
                type="button"
                onClick={addLink}
                variant="secondary"
                disabled={!currentLink.trim()}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Added Links List */}
            {links.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Added Links:</Label>
                {links.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm truncate">{link}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(link, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeLink(index)}
                        
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* File Attachments */}
        <div className="space-y-3">
          <div>
            <Label>File Attachments (Optional)</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Attach PDFs, images, audio files, or other lesson materials
            </p>
          </div>

          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Input
                type="file"
                onChange={handleFileChange}
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.m4a"
                className="cursor-pointer"
              />
            </div>

            {/* Existing Attachments */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Current Attachments:
                </Label>
                {existingAttachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-blue-600" />
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
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          window.open(attachment.fileUrl, "_blank")
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeExistingAttachment(attachment.id)}
                        
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  New Files to Upload:
                </Label>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFile(index)}
                     
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading
              ? "Saving..."
              : lessonId
              ? "Update Lesson"
              : "Save Lesson"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
