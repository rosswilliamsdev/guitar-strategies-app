"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { StudentProfile, User } from "@/types";

interface StudentListProps {
  teacherId: string;
  students: (StudentProfile & { user: User })[];
}

export function StudentList({ teacherId, students }: StudentListProps) {
  if (students.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium mb-2">No students yet</h3>
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
            <p className="text-xs text-muted-foreground mb-4">
              {student.instrument}
            </p>

            <div className="space-y-2">
              <Link href={`/students/${student.id}`} className="block">
                <Button variant="secondary" size="sm" className="w-full">
                  View Profile
                </Button>
              </Link>
              <Link
                href={`/lessons/new?studentId=${student.id}`}
                className="block"
              >
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
