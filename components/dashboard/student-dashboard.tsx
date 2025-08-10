"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface StudentDashboardProps {
  studentId: string;
  stats: {
    totalLessons: number;
    lessonsThisMonth: number;
    practiceStreak: number;
    skillLevel: string;
    avgLessonRating: number | null;
    completedLessons: number;
  };
  recentLessons: Array<{
    id: string;
    date: string;
    duration: number;
    status: string;
    notes?: string;
    homework?: string;
  }>;
  studentProfile: {
    teacherName: string;
    teacherEmail: string;
    goals?: string;
    instrument: string;
    skillLevel: string;
  };
  upcomingAssignments: Array<{
    id: string;
    homework: string;
    fromLesson: string;
  }>;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, color = "text-primary", trend }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className={`text-2xl font-semibold mt-1 ${color}`}>
            {value}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {trend && (
          <div
            className={`text-xs ${
              trend.isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </div>
        )}
      </div>
    </Card>
  );
}

export function StudentDashboard({ 
  studentId, 
  stats, 
  recentLessons = [],
  studentProfile,
  upcomingAssignments = [] 
}: StudentDashboardProps) {
  // Provide default values if data is missing
  const safeStats = stats || {
    totalLessons: 0,
    lessonsThisMonth: 0,
    practiceStreak: 0,
    skillLevel: 'Beginner',
    avgLessonRating: null,
    completedLessons: 0,
  };

  const safeStudentProfile = studentProfile || {
    teacherName: 'Unknown Teacher',
    teacherEmail: 'unknown@guitarstrategies.com',
    goals: undefined,
    instrument: 'guitar',
    skillLevel: 'BEGINNER',
  };
  const dashboardStats = [
    {
      title: "Total Lessons",
      value: safeStats.totalLessons,
      description: "Completed lessons",
      color: "text-blue-600",
    },
    {
      title: "This Month", 
      value: safeStats.lessonsThisMonth,
      description: "Lessons completed",
      color: "text-green-600",
    },
    {
      title: "Practice Streak",
      value: `${safeStats.practiceStreak} days`,
      description: "Keep it up!",
      color: "text-orange-600",
    },
    {
      title: "Skill Level",
      value: safeStats.skillLevel,
      description: "Current level",
      color: "text-purple-600",
    },
  ];

  const quickActions = [
    {
      href: `/teacher/${safeStudentProfile.teacherEmail.replace('@guitarstrategies.com', '')}`,
      text: "Book Lesson",
      variant: "default" as const,
      description: "Schedule with your teacher",
    },
    {
      href: "/lessons",
      text: "View Lessons", 
      variant: "secondary" as const,
      description: "See your lesson history",
    },
    {
      href: "/library",
      text: "Study Materials",
      variant: "secondary" as const, 
      description: "Access shared resources",
    },
    {
      href: "/progress",
      text: "Track Progress",
      variant: "secondary" as const,
      description: "View your improvement",
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
          <span className="font-medium text-foreground">{safeStudentProfile.teacherName}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
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
                <div
                  key={lesson.id}
                  className="flex items-start justify-between py-2 border-b border-border last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">
                      {lesson.date}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lesson.duration} minutes • {lesson.status.toLowerCase()}
                    </p>
                    {lesson.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {lesson.notes}
                      </p>
                    )}
                  </div>
                  {lesson.homework && (
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      homework
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No lessons completed yet.<br />
                <Link href={`/teacher/${safeStudentProfile.teacherEmail.replace('@guitarstrategies.com', '')}`} className="text-primary hover:underline">
                  Book your first lesson
                </Link>
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Learning Progress & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Learning Progress */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Learning Progress</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lessons Completed</span>
              <span className="font-semibold">{safeStats.completedLessons}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Rating</span>
              <span className="font-semibold">
                {safeStats.avgLessonRating ? `${safeStats.avgLessonRating.toFixed(1)}/5` : "Not rated yet"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Instrument</span>
              <span className="font-semibold capitalize">{safeStudentProfile.instrument}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Level</span>
              <span className="font-semibold capitalize">
                {safeStudentProfile.skillLevel.toLowerCase()}
              </span>
            </div>
          </div>
        </Card>

        {/* Current Assignments */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Assignments</h3>
          <div className="space-y-3">
            {upcomingAssignments.length > 0 ? (
              upcomingAssignments.slice(0, 3).map((assignment, index) => (
                <div key={assignment.id} className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-foreground">
                    Assignment #{index + 1}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {assignment.homework}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    From lesson: {assignment.fromLesson}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">
                  No current assignments
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Complete lessons to get practice assignments
                </p>
              </div>
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