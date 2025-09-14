"use client";

import { User } from "next-auth";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { AdminStats, formatRelativeTime } from "@/lib/dashboard-stats";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useViewMode } from "./view-mode-context";
import {
  Users,
  UserCheck,
  BookOpen,
  Activity,
  FileText,
  Mail,
} from "lucide-react";

interface DualRoleDashboardProps {
  user: User;
  teacherData: any; // TeacherData type from the dashboard
  adminStats: AdminStats;
}

export function DualRoleDashboard({ user, teacherData, adminStats }: DualRoleDashboardProps) {
  // Use the shared view mode context
  const { viewMode: view, setViewMode: setView } = useViewMode();

  // Get the appropriate dashboard title
  const dashboardTitle = view === "teacher" ? "Teacher Dashboard" : "Admin Dashboard";

  return (
    <div className="space-y-6">
      {/* Page Header with Toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">
          {dashboardTitle}
        </h1>

        {/* Toggle Switch */}
        <div className="bg-neutral-100 rounded-lg p-1 flex gap-1">
          <button
            onClick={() => setView("teacher")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "teacher"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            👨‍🏫 Teacher
          </button>
          <button
            onClick={() => setView("admin")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "admin"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            👨‍💼 Admin
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      {view === "teacher" ? (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Here's what's happening with your teaching today.
          </p>
          <TeacherDashboard {...teacherData} hideTitle />
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-muted-foreground">
            Here's the latest platform activity.
          </p>
          {/* Simple Admin View - Just Recent Activity */}
          <AdminActivityView adminStats={adminStats} />
        </div>
      )}
    </div>
  );
}

// Simple admin activity view component
function AdminActivityView({ adminStats }: { adminStats: AdminStats }) {
  return (
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
  );
}