'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface StudentProfileProps {
  studentId: string;
  teacherId: string;
}

export function StudentProfile({ studentId, teacherId }: StudentProfileProps) {
  // TODO: Fetch student profile from API
  const student = null;

  if (!student) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Student not found
        </h3>
        <p className="text-gray-600 mb-4">
          This student doesn&apos;t exist or you don&apos;t have access to their profile.
        </p>
        <Link href="/students">
          <Button variant="secondary">Back to Students</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Info Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Student Profile</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">Active</Badge>
            <Link href={`/lessons/new?studentId=${studentId}`}>
              <Button size="sm">New Lesson</Button>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Contact Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> Student Name
              </div>
              <div>
                <span className="font-medium">Email:</span> student@example.com
              </div>
              <div>
                <span className="font-medium">Phone:</span> Not provided
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Learning Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Skill Level:</span> Beginner
              </div>
              <div>
                <span className="font-medium">Instrument:</span> Guitar
              </div>
              <div>
                <span className="font-medium">Joined:</span> Today
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Goals & Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Goals & Progress</h3>
        <p className="text-gray-600">
          No goals set yet. Add goals during the next lesson.
        </p>
      </Card>

      {/* Recent Lessons */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Lessons</h3>
          <Link href={`/lessons?studentId=${studentId}`}>
            <Button variant="secondary" size="sm">
              View All Lessons
            </Button>
          </Link>
        </div>
        <p className="text-gray-600">
          No lessons recorded yet.
        </p>
      </Card>

      {/* Payment History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Payment History</h3>
        <p className="text-gray-600">
          No payment history available.
        </p>
      </Card>
    </div>
  );
}