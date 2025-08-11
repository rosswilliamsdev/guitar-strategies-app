'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Student {
  id: string;
  instrument: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface StudentListProps {
  teacherId: string;
}

export function StudentList({ teacherId }: StudentListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/students')
      .then(res => res.json())
      .then(data => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [teacherId]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p>Loading students...</p>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium mb-2">
          No students yet
        </h3>
        <p className="text-muted-foreground mb-4">
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
            <h3 className="font-medium text-lg mb-2">{student.user.name}</h3>
            <p className="text-sm text-muted-foreground mb-2">{student.user.email}</p>
            <p className="text-xs text-muted-foreground mb-4">
              {student.instrument}
            </p>
            
            <div className="space-y-2">
              <Link href={`/students/${student.id}`} className="block">
                <Button variant="secondary" size="sm" className="w-full">
                  View Profile
                </Button>
              </Link>
              <Link href={`/lessons/new?studentId=${student.id}`} className="block">
                <Button size="sm" className="w-full">
                  New Lesson
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}