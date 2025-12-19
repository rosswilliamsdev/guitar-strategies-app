"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface StudentDashboardProps {
  studentId: string;
  recentLessons: Array<{
    id: string;
    date: string;
    duration: number;
    status: string;
    notes?: string | null;
    homework?: string | null;
  }>;
  studentProfile: {
    teacherName: string;
    teacherEmail: string;
    goals?: string | null;
    instrument: string;
  };
}

export function StudentDashboard({
  studentId,
  recentLessons = [],
  studentProfile,
}: StudentDashboardProps) {
  const safeStudentProfile = studentProfile || {
    teacherName: "Unknown Teacher",
    teacherEmail: "unknown@guitarstrategies.com",
    goals: undefined,
    instrument: "guitar",
  };

  const quickActions = [
    {
      href: "/lessons",
      text: "View Lessons",
      variant: "primary" as const,
      description: "See your lesson history",
    },
    {
      href: "/curriculums",
      text: "Checklists",
      variant: "secondary" as const,
      description: "Track your progress",
    },
    {
      href: "/recommendations",
      text: "Recommendations",
      variant: "secondary" as const,
      description: "View teacher recommendations",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Student Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Continue your guitar learning journey.
        </p>
        <div className="mt-3 text-sm">
          <span className="text-muted-foreground">Your teacher: </span>
          <span className="font-medium text-foreground">
            {safeStudentProfile.teacherName}
          </span>
        </div>
      </div>

      {/* Quick Actions & Recent Lessons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div className="space-y-2">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href} className="block">
                <Button
                  variant={action.variant}
                  className="w-full justify-start"
                  size="sm"
                >
                  {action.text}
                </Button>
              </Link>
            ))}
          </div>
        </Card>

        {/* Recent Lessons */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Lessons</h3>
            <Link href="/lessons">
              <Button variant="secondary" size="sm">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentLessons.length > 0 ? (
              recentLessons.slice(0, 4).map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/lessons/${lesson.id}`}
                  className="block hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors"
                >
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">
                        {lesson.date}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.duration} min
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        lesson.status === "COMPLETED"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : lesson.status === "SCHEDULED"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-gray-50 text-gray-700 border border-gray-200"
                      }`}
                    >
                      {lesson.status.toLowerCase()}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No lessons completed yet.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Learning Goals */}
      {safeStudentProfile.goals && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Learning Goals</h3>
          <p className="text-muted-foreground">{safeStudentProfile.goals}</p>
          <div className="mt-4">
            <Link href="/settings/profile">
              <Button variant="secondary" size="sm">
                Update Goals
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
