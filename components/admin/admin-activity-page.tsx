"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminActivityView } from "@/components/admin/admin-activity-view";
import { AdminStats } from "@/lib/dashboard-stats";
import { Loader2, Filter, DollarSign, RefreshCw } from "lucide-react";
import { log } from '@/lib/logger';

interface ActivityFilters {
  dateRange: 'today' | 'week' | 'month' | 'all';
  activityType: 'user_created' | 'lesson_completed' | 'teacher_joined' | 'system_event' | 'invoice_generated' | 'email_sent' | 'all';
  userRole: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'all';
}

export function AdminActivityPage() {
  const [activities, setActivities] = useState<AdminStats['recentActivity']>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  const [filters, setFilters] = useState<ActivityFilters>({
    dateRange: 'month',
    activityType: 'all',
    userRole: 'all'
  });

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateRange: filters.dateRange,
        activityType: filters.activityType,
        userRole: filters.userRole,
        limit: '100' // Show more results
      });

      const response = await fetch(`/api/admin/activity?${params}`);
      if (!response.ok) throw new Error('Failed to fetch activity');
      
      const data = await response.json();
      setActivities(data.activities);
      setTotalCount(data.totalCount);
    } catch (error) {
      log.error('Error fetching activity:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [filters]);

  const updateFilter = (key: keyof ActivityFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const triggerInvoiceGeneration = async () => {
    try {
      setGeneratingInvoices(true);
      const response = await fetch('/api/admin/background-jobs/generate-invoices', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to trigger invoice generation');
      }

      // Refresh activity after job execution
      await fetchActivity();
    } catch (error) {
      log.error('Error triggering invoice generation:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setGeneratingInvoices(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Actions */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Admin Actions</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Manually trigger automated jobs and system tasks
        </p>

        <Button
          onClick={triggerInvoiceGeneration}
          disabled={generatingInvoices || loading}
          className="bg-primary hover:bg-primary/90"
        >
          {generatingInvoices ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="mr-2 h-4 w-4" />
          )}
          {generatingInvoices ? "Generating..." : "Generate Monthly Invoices"}
        </Button>
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Date Range
            </label>
            <Select value={filters.dateRange} onValueChange={(value) => updateFilter('dateRange', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Activity Type
            </label>
            <Select value={filters.activityType} onValueChange={(value) => updateFilter('activityType', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="lesson_completed">Lessons</SelectItem>
                <SelectItem value="user_created">New Users</SelectItem>
                <SelectItem value="teacher_joined">Teachers Joined</SelectItem>
                <SelectItem value="invoice_generated">Invoices</SelectItem>
                <SelectItem value="email_sent">Emails Sent</SelectItem>
                <SelectItem value="system_event">System Events</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              User Role
            </label>
            <Select value={filters.userRole} onValueChange={(value) => updateFilter('userRole', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="STUDENT">Students</SelectItem>
                <SelectItem value="TEACHER">Teachers</SelectItem>
                <SelectItem value="ADMIN">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalCount > 0 ? `Showing ${activities.length} of ${totalCount} activities` : 'No activities found'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActivity}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </Card>

      {/* Activity List */}
      {loading ? (
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading activities...</p>
        </Card>
      ) : (
        <AdminActivityView activity={activities} />
      )}
    </div>
  );
}