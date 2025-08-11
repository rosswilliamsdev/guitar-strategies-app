'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Save, X, Upload, Link as LinkIcon, FileText, Trash2, ExternalLink } from 'lucide-react';

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

export function LessonForm({ teacherId, lessonId, initialData }: LessonFormProps) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const [formData, setFormData] = useState({
    studentId: initialData?.studentId || '',
    notes: initialData?.notes || '',
  });

  // File and link management
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState('');

  // Fetch teacher's students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch(`/api/students?teacherId=${teacherId}`);
        if (response.ok) {
          const data = await response.json();
          setStudents(data.students || []);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, [teacherId]);

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // 10MB limit
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError('');
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Link handling
  const detectLinkType = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YOUTUBE';
    if (url.includes('vimeo.com')) return 'VIMEO';
    if (url.includes('spotify.com')) return 'SPOTIFY';
    return 'WEBSITE';
  };

  const addLink = () => {
    if (!currentLink.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(currentLink);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLinks(prev => [...prev, currentLink.trim()]);
    setCurrentLink('');
    setError('');
  };

  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.studentId) {
        setError('Please select a student');
        return;
      }

      // First, create the lesson
      const submitData = {
        studentId: formData.studentId,
        date: new Date().toISOString(),
        duration: 30,
        notes: formData.notes || '',
        status: 'COMPLETED'
      };

      const url = lessonId ? `/api/lessons/${lessonId}` : '/api/lessons';
      const method = lessonId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lesson');
      }

      const lessonResponse = await response.json();
      const createdLessonId = lessonResponse.lesson.id;

      // Upload files if any
      if (selectedFiles.length > 0) {
        const fileFormData = new FormData();
        selectedFiles.forEach((file, index) => {
          fileFormData.append(`files`, file);
        });
        fileFormData.append('lessonId', createdLessonId);

        const fileResponse = await fetch('/api/lessons/attachments', {
          method: 'POST',
          body: fileFormData,
        });

        if (!fileResponse.ok) {
          console.error('Failed to upload files, but lesson was saved');
        }
      }

      // Create links if any
      if (links.length > 0) {
        const linksData = links.map(url => ({
          title: 'Resource Link',
          url: url,
          description: null,
          lessonId: createdLessonId,
          linkType: detectLinkType(url)
        }));

        const linksResponse = await fetch('/api/lessons/links', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ links: linksData }),
        });

        if (!linksResponse.ok) {
          const errorData = await linksResponse.json();
          console.error('Failed to save links:', errorData);
        }
      }

      // Success - redirect to lessons page
      router.push('/lessons');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/lessons');
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
          <Select value={formData.studentId} onValueChange={(value) => setFormData({ ...formData, studentId: value })}>
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
              onChange={(content) => setFormData({ ...formData, notes: content })}
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
                  if (e.key === 'Enter') {
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
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm truncate">{link}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(link, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
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
            
            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Files:</Label>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
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
                      variant="ghost"
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
              ? 'Saving...' 
              : lessonId 
                ? 'Update Lesson' 
                : 'Save Lesson'
            }
          </Button>
        </div>
      </form>
    </Card>
  );
}