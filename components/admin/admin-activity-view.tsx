"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminStats, formatRelativeTime } from "@/lib/dashboard-stats";
import {
  Users,
  UserCheck,
  BookOpen,
  Activity,
  Calendar,
  FileText,
  Mail,
} from "lucide-react";

interface AdminActivityViewProps {
  activity: AdminStats['recentActivity'];
}

function getActivityIcon(type: AdminStats['recentActivity'][0]['type']) {
  switch (type) {
    case 'lesson_completed':
      return <BookOpen className="h-5 w-5 text-green-500" />;
    case 'user_created':
      return <Users className="h-5 w-5 text-blue-500" />;
    case 'teacher_joined':
      return <UserCheck className="h-5 w-5 text-purple-500" />;
    case 'system_event':
      return <Activity className="h-5 w-5 text-yellow-500" />;
    case 'invoice_generated':
      return <FileText className="h-5 w-5 text-orange-500" />;
    case 'email_sent':
      return <Mail className="h-5 w-5 text-cyan-500" />;
    default:
      return <Calendar className="h-5 w-5 text-gray-500" />;
  }
}

function getActivityBadge(type: AdminStats['recentActivity'][0]['type']) {
  switch (type) {
    case 'lesson_completed':
      return <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Lesson</Badge>;
    case 'user_created':
      return <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">User</Badge>;
    case 'teacher_joined':
      return <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">Teacher</Badge>;
    case 'system_event':
      return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">System</Badge>;
    case 'invoice_generated':
      return <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">Invoice</Badge>;
    case 'email_sent':
      return <Badge variant="secondary" className="bg-cyan-50 text-cyan-700 border-cyan-200">Email</Badge>;
    default:
      return <Badge variant="secondary">Event</Badge>;
  }
}

export function AdminActivityView({ activity }: AdminActivityViewProps) {
  if (activity.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Recent Activity</h3>
        <p className="text-muted-foreground">
          Activity will appear here as users interact with the platform.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activity.map((item) => (
        <Card key={item.id} className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-1">
              {getActivityIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getActivityBadge(item.type)}
                  <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-foreground font-medium mb-1">
                {item.description}
              </p>
              {item.userEmail && (
                <p className="text-xs text-muted-foreground">
                  User: {item.userEmail}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
      
      {activity.length === 100 && (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">
            Showing first 100 activities. Use filters to narrow your search or contact support for more data.
          </p>
        </Card>
      )}
    </div>
  );
}