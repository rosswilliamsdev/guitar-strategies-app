"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { User } from "next-auth";
import { UserStats, AdminStats, formatRelativeTime } from "@/lib/dashboard-stats";
import {
  Users,
  UserCheck,
  BookOpen,
  Activity,
  FileText,
  Mail,
} from "lucide-react";

interface DashboardProps {
  user: User;
  userStats?: UserStats;
  adminStats?: AdminStats;
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

export function MainDashboard({ user, userStats, adminStats }: DashboardProps) {
  // If admin user with admin stats, show only recent activity
  if (user.role === 'ADMIN' && adminStats) {
    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Welcome back, {user.name}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here&apos;s the latest platform activity.
          </p>
        </div>

        {/* Recent Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {adminStats.recentActivity.length === 0 ? (
            <p className="text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {adminStats.recentActivity.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 pb-3 border-b border-border last:border-b-0"
                >
                  <div className="flex-shrink-0 mt-1">
                    {activity.type === "lesson_completed" && (
                      <BookOpen className="h-4 w-4 text-green-500" />
                    )}
                    {activity.type === "user_created" && (
                      <Users className="h-4 w-4 text-blue-500" />
                    )}
                    {activity.type === "teacher_joined" && (
                      <UserCheck className="h-4 w-4 text-purple-500" />
                    )}
                    {activity.type === "invoice_generated" && (
                      <FileText className="h-4 w-4 text-orange-500" />
                    )}
                    {activity.type === "email_sent" && (
                      <Mail className="h-4 w-4 text-cyan-500" />
                    )}
                    {activity.type === "system_event" && (
                      <Activity className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div className="text-center pt-2">
                <Link href="/admin/activity">
                  <Button variant="secondary" size="sm">
                    View All Activity
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Role-specific stats and actions for non-admin users
  const getStatsForRole = () => {
    // If we have userStats, use real data
    if (userStats) {
      return [
        { title: "Total Platform Users", value: userStats.totalUsers, description: "Registered accounts" },
        { title: "Platform Status", value: userStats.platformActivity, description: "Current status" },
        { title: "System Health", value: userStats.systemStatus, description: "Operational status" },
        { title: "Your Role", value: user.role, description: "Account type" },
      ];
    }

    // Fallback to basic info if no stats available
    return [
      { title: "Welcome", value: "👋", description: "Getting started" },
      { title: "Your Role", value: user.role, description: "Account type" },
      { title: "Status", value: "Active", description: "Account status" },
      { title: "Getting Started", value: "📚", description: "Setup in progress" },
    ];
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
            title: "Checklists",
            description: "Track your progress and personal practice goals",
            href: "/curriculums",
            buttonText: "View Checklists",
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
          Here&apos;s what&apos;s happening with your {user.role.toLowerCase()} account
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
