'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface LessonFormProps {
  lessonId?: string;
  studentId?: string;
  onSubmit?: (data: any) => void;
}

export function LessonForm({ lessonId, studentId, onSubmit }: LessonFormProps) {
  const [formData, setFormData] = useState({
    studentId: studentId || '',
    date: '',
    duration: 60,
    notes: '',
    homework: '',
    progress: '',
    focusAreas: '',
    songsPracticed: '',
    nextSteps: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Date & Time
            </label>
            <Input
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Duration (minutes)
            </label>
            <Input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              min="15"
              max="180"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Lesson Notes
          </label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="What did you work on in this lesson?"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Focus Areas
          </label>
          <Input
            value={formData.focusAreas}
            onChange={(e) => setFormData({ ...formData, focusAreas: e.target.value })}
            placeholder="e.g., Chord progressions, Scales, Technique"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Songs Practiced
          </label>
          <Input
            value={formData.songsPracticed}
            onChange={(e) => setFormData({ ...formData, songsPracticed: e.target.value })}
            placeholder="e.g., Wonderwall, Stairway to Heaven"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Student Progress
          </label>
          <Textarea
            value={formData.progress}
            onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
            placeholder="How is the student progressing?"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Homework/Next Steps
          </label>
          <Textarea
            value={formData.homework}
            onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
            placeholder="What should the student practice before the next lesson?"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="secondary">
            Cancel
          </Button>
          <Button type="submit">
            {lessonId ? 'Update Lesson' : 'Save Lesson'}
          </Button>
        </div>
      </form>
    </Card>
  );
}