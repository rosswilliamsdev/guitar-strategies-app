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
import { AlertCircle, Save, X } from 'lucide-react';

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

      // Prepare data for submission with automatic date/time and default duration
      const submitData = {
        studentId: formData.studentId,
        date: new Date(), // Current date/time
        duration: 30, // Default 30 minutes
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
              placeholder="What did you work on in this lesson? Include techniques practiced, songs played, areas of improvement, etc.

You can use formatting like:
• Bold text for important points
• Lists for techniques or songs
• Quotes for student feedback"
              className="min-h-[150px] w-full"
            />
          </div>
        </div>

        {/* Auto-populated info display */}
        <div className="bg-muted p-4 rounded-lg">
          <h4 className="text-sm font-medium text-foreground mb-2">Automatically recorded:</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>• <strong>Date & Time:</strong> {new Date().toLocaleString()}</div>
            <div>• <strong>Duration:</strong> 30 minutes (default)</div>
            <div>• <strong>Status:</strong> Completed</div>
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