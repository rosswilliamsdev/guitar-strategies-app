'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface StudentListProps {
  teacherId: string;
}

export function StudentList({ teacherId }: StudentListProps) {
  // TODO: Fetch students from API
  const students: any[] = [];

  if (students.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No students yet
        </h3>
        <p className="text-gray-600 mb-4">
          Start by inviting your first student to join your teaching platform.
        </p>
        <Link href="/students/invite">
          <Button>Invite First Student</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {students.map((student) => (
        <Card key={student.id} className="p-6">
          <div className="text-center">
            <h3 className="font-medium text-lg mb-2">{student.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{student.email}</p>
            <p className="text-xs text-gray-500 mb-4">
              Skill Level: {student.skillLevel || 'Beginner'}
            </p>
            
            <div className="space-y-2">
              <Link href={`/students/${student.id}`} className="block">
                <Button variant="secondary" size="sm" className="w-full">
                  View Profile
                </Button>
              </Link>
              <Link href={`/lessons/new?studentId=${student.id}`} className="block">
                <Button size="sm" className="w-full">
                  Log Lesson
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}