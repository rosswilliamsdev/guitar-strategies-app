"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TeacherDashboardProps {
  teacherId: string;
  stats: {
    activeStudents: number;
    lessonsThisWeek: number;
    lessonsThisMonth: number;
    monthlyEarnings: number;
    avgRating: number | null;
    totalLessons: number;
    libraryItems: number;
  };
  recentLessons: Array<{
    id: string;
    studentName: string;
    date: string;
    duration: number;
    status: string;
    notes?: string;
  }>;
  teacherProfile?: {
    bio?: string;
    hourlyRate?: number;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

function StatCard({
  title,
  value,
  description,
  trend,
  color = "text-primary",
}: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className={`text-2xl font-semibold mt-1 ${color}`}>{value}</h3>
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

export function TeacherDashboard({
  teacherId,
  stats,
  recentLessons,
  teacherProfile,
}: TeacherDashboardProps) {
  const dashboardStats = [
    {
      title: "Active Students",
      value: stats.activeStudents,
      description: "Currently enrolled",
      color: "text-blue-600",
    },
    {
      title: "This Week",
      value: stats.lessonsThisWeek,
      description: "Lessons completed",
      color: "text-green-600",
    },
    {
      title: "Monthly Earnings",
      value: `$${(stats.monthlyEarnings / 100).toFixed(2)}`,
      description: "This month",
      color: "text-purple-600",
    },
    {
      title: "Library Items",
      value: stats.libraryItems,
      description: "Resources shared",
      color: "text-orange-600",
    },
  ];

  const quickActions = [
    {
      href: "/lessons/new",
      text: "New Lesson",
      variant: "primary" as const,
      description: "Record a completed lesson",
    },
    {
      href: "/students",
      text: "View Students",
      variant: "secondary" as const,
      description: "Manage your students",
    },
    {
      href: "/library/upload",
      text: "Upload Resource",
      variant: "secondary" as const,
      description: "Add to your library",
    },
    {
      href: "/settings/profile",
      text: "Profile Settings",
      variant: "secondary" as const,
      description: "Update your information",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Teacher Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's your teaching overview.
        </p>
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
                        {lesson.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.duration} min • {lesson.date}
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
                No recent lessons found.
                <br />
                <Link
                  href="/lessons/new"
                  className="text-primary hover:underline"
                >
                  Create your first lesson
                </Link>
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
    </div>
  );
}
