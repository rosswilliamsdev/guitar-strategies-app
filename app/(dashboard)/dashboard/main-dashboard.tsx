"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { User } from "next-auth";

interface DashboardProps {
  user: User;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, trend }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-semibold text-foreground mt-1">
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

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  buttonText: string;
}

function QuickAction({
  title,
  description,
  href,
  buttonText,
}: QuickActionProps) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Link href={href}>
          <Button size="sm" className="w-full">
            {buttonText}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export function MainDashboard({ user }: DashboardProps) {
  // Role-specific stats and actions
  const getStatsForRole = () => {
    switch (user.role) {
      case "ADMIN":
        return [
          { title: "Total Users", value: 156, description: "Active accounts" },
          { title: "Total Lessons", value: 342, description: "All lessons" },
          {
            title: "Monthly Revenue",
            value: "$2,450",
            trend: { value: 12, isPositive: true },
          },
          { title: "System Health", value: "99.9%", description: "Uptime" },
        ];
      case "TEACHER":
        return [
          {
            title: "Active Students",
            value: 24,
            description: "Enrolled students",
          },
          {
            title: "Lessons This Week",
            value: 18,
            trend: { value: 8, isPositive: true },
          },
          {
            title: "Monthly Earnings",
            value: "$1,250",
            trend: { value: 15, isPositive: true },
          },
          {
            title: "Avg Rating",
            value: "4.8",
            description: "Student feedback",
          },
        ];
      case "STUDENT":
      default:
        return [
          {
            title: "Lessons Completed",
            value: 12,
            trend: { value: 25, isPositive: true },
          },
          { title: "Practice Hours", value: "24h", description: "This month" },
          {
            title: "Current Streak",
            value: "7 days",
            description: "Keep it up!",
          },
          { title: "Next Lesson", value: "Tomorrow", description: "2:00 PM" },
        ];
    }
  };

  const getQuickActionsForRole = () => {
    switch (user.role) {
      case "ADMIN":
        return [
          {
            title: "User Management",
            description: "Manage users, roles, and permissions",
            href: "/admin/users",
            buttonText: "Manage Users",
          },
          {
            title: "System Analytics",
            description: "View detailed system metrics",
            href: "/admin/analytics",
            buttonText: "View Analytics",
          },
          {
            title: "Content Review",
            description: "Review and approve lesson content",
            href: "/admin/content",
            buttonText: "Review Content",
          },
        ];
      case "TEACHER":
        return [
          {
            title: "Create New Lesson",
            description: "Add a new lesson to your curriculum",
            href: "/lessons/new",
            buttonText: "Create Lesson",
          },
          {
            title: "Student Progress",
            description: "Track your students' learning progress",
            href: "/students",
            buttonText: "View Students",
          },
          {
            title: "Schedule Management",
            description: "Manage your teaching schedule",
            href: "/schedule",
            buttonText: "View Schedule",
          },
        ];
      case "STUDENT":
      default:
        return [
          {
            title: "My Checklists",
            description: "Track your personal practice goals",
            href: "/student-checklists",
            buttonText: "View Checklists",
          },
          {
            title: "Teacher Checklists",
            description: "View checklists from your teacher",
            href: "/curriculums",
            buttonText: "View Teacher Lists",
          },
          {
            title: "Recent Lessons",
            description: "Review your recent lesson notes",
            href: "/lessons",
            buttonText: "View Lessons",
          },
        ];
    }
  };

  const stats = getStatsForRole();
  const quickActions = getQuickActionsForRole();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Welcome back, {user.name}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your {user.role.toLowerCase()} account
          today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <QuickAction key={index} {...action} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-6">
          Recent Activity
        </h2>
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="font-medium text-foreground">
                  System notification
                </p>
                <p className="text-sm text-muted-foreground">
                  Welcome to Guitar Strategies!
                </p>
              </div>
              <span className="text-xs text-muted-foreground">Just now</span>
            </div>
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p>More activity will appear here as you use the platform.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
