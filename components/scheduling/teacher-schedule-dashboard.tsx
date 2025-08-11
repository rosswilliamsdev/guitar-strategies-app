'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Settings, Users, Calendar, ExternalLink } from 'lucide-react';

interface TeacherProfile {
  id: string;
  calendlyUrl?: string;
  students: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface TeacherScheduleDashboardProps {
  teacherProfile: TeacherProfile;
}

export function TeacherScheduleDashboard({ teacherProfile }: TeacherScheduleDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Schedule Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your Calendly integration and view student scheduling
          </p>
        </div>
        <Link href="/settings">
          <Button variant="secondary" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </Link>
      </div>

      {/* Calendly Status */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Calendly Integration
              </h3>
              {teacherProfile.calendlyUrl ? (
                <p className="text-sm text-muted-foreground">
                  Connected: {teacherProfile.calendlyUrl}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not configured
                </p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-3">
            {teacherProfile.calendlyUrl && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(teacherProfile.calendlyUrl!, '_blank')}
                className="flex items-center space-x-2"
              >
                <ExternalLink className="h-4 w-4" />
                <span>View Calendar</span>
              </Button>
            )}
            <Link href="/settings">
              <Button size="sm">
                {teacherProfile.calendlyUrl ? 'Update URL' : 'Add Calendly URL'}
              </Button>
            </Link>
          </div>
        </div>

        {!teacherProfile.calendlyUrl && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Get Started with Calendly
            </h4>
            <div className="text-sm text-blue-800 space-y-2">
              <p>1. Create a free Calendly account at calendly.com</p>
              <p>2. Set up your availability and event types</p>
              <p>3. Copy your Calendly URL and add it in Settings</p>
              <p>4. Students will be able to book lessons directly</p>
            </div>
          </div>
        )}
      </Card>

      {/* Active Students */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Active Students ({teacherProfile.students.length})
          </h3>
        </div>

        {teacherProfile.students.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No active students yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {teacherProfile.students.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
              >
                <div>
                  <h4 className="font-medium text-foreground">
                    {student.user.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {student.user.email}
                  </p>
                </div>
                {teacherProfile.calendlyUrl && (
                  <p className="text-sm text-muted-foreground">
                    Can book via your Calendly link
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}