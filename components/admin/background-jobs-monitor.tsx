"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Calendar,
  Users,
  Activity,
  UserCheck,
  BookOpen,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface JobLog {
  id: string;
  jobName: string;
  executedAt: string;
  success: boolean;
  lessonsGenerated: number;
  teachersProcessed: number;
  errors: string | null;
}

interface SystemHealth {
  isHealthy: boolean;
  issues: string[];
  suggestions: string[];
  indicators: {
    totalUsers: number;
    activeTeachers: number;
    activeStudents: number;
    activeRecurringSlots: number;
    teachersWithSettings: number;
    teachersWithoutSettings: number;
    oldSlotsCount: number;
    recentLessons: number;
    pendingInvoices: number;
  };
}

interface JobHistoryData {
  jobHistory: JobLog[];
  systemHealth: SystemHealth;
  summary: {
    totalJobs: number;
    recentSuccess: boolean | null;
    lastRun: string | null;
    healthIssues: number;
  };
}

export function BackgroundJobsMonitor() {
  const [data, setData] = useState<JobHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/background-jobs/history");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch data");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const triggerJob = async () => {
    try {
      setExecuting(true);

      const response = await fetch(
        "/api/admin/background-jobs/generate-lessons",
        {
          method: "POST",
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to trigger job");
      }

      // Refresh data after job execution
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger job");
    } finally {
      setExecuting(false);
    }
  };

  const triggerInvoiceJob = async () => {
    try {
      setExecuting(true);

      const response = await fetch(
        "/api/admin/background-jobs/generate-invoices",
        {
          method: "POST",
        }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to trigger invoice job");
      }

      // Refresh data after job execution
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger invoice job");
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent className="">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>Error loading background jobs data: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {data?.summary.totalJobs || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Jobs Run</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="">
            <div className="flex items-center space-x-2">
              {data?.summary.recentSuccess ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : data?.summary.recentSuccess === false ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="text-2xl font-bold">
                  {data?.summary.recentSuccess === null
                    ? "N/A"
                    : data?.summary.recentSuccess
                    ? "Success"
                    : "Failed"}
                </p>
                <p className="text-sm text-muted-foreground">Last Job Status</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {data?.summary.lastRun
                    ? format(new Date(data.summary.lastRun), "MMM dd")
                    : "Never"}
                </p>
                <p className="text-sm text-muted-foreground">Last Run</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="">
            <div className="flex items-center space-x-2">
              {(data?.summary.healthIssues || 0) > 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div>
                <p className="text-2xl font-bold">
                  {data?.summary.healthIssues || 0}
                </p>
                <p className="text-sm text-muted-foreground">Health Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      {data?.systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {data.systemHealth.isHealthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <span>System Health</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Current system status and recommendations
            </p>
          </CardHeader>
          <CardContent>
            {data.systemHealth.isHealthy ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-green-600 mb-4">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">All systems are healthy ✓</span>
                </div>

                {/* System Health Indicators Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-lg font-semibold text-green-800">
                        {data.systemHealth.indicators.totalUsers}
                      </p>
                      <p className="text-xs text-green-600">Total Users</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-lg font-semibold text-blue-800">
                        {data.systemHealth.indicators.activeTeachers}
                      </p>
                      <p className="text-xs text-blue-600">Active Teachers</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <Users className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-lg font-semibold text-purple-800">
                        {data.systemHealth.indicators.activeStudents}
                      </p>
                      <p className="text-xs text-purple-600">Active Students</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
                    <Calendar className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="text-lg font-semibold text-teal-800">
                        {data.systemHealth.indicators.activeRecurringSlots}
                      </p>
                      <p className="text-xs text-teal-600">Recurring Slots</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <BookOpen className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-lg font-semibold text-orange-800">
                        {data.systemHealth.indicators.recentLessons}
                      </p>
                      <p className="text-xs text-orange-600">Lessons (30d)</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-lg font-semibold text-yellow-800">
                        {data.systemHealth.indicators.pendingInvoices}
                      </p>
                      <p className="text-xs text-yellow-600">
                        Pending Invoices
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configuration Health */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                  <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Configuration Status</span>
                  </h4>
                  <div className="flex justify-between items-center text-sm">
                    <span>Teachers with Settings:</span>
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800"
                    >
                      {data.systemHealth.indicators.teachersWithSettings} of{" "}
                      {data.systemHealth.indicators.activeTeachers}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {data.systemHealth.issues.map((issue, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"
                  >
                    <p className="text-yellow-800 text-sm">{issue}</p>
                  </div>
                ))}

                {data.systemHealth.suggestions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm mb-2">Suggestions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {data.systemHealth.suggestions.map(
                        (suggestion, index) => (
                          <li
                            key={index}
                            className="text-sm text-muted-foreground"
                          >
                            {suggestion}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Controls</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manually trigger jobs or refresh data
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={triggerJob}
              disabled={executing}
              className="bg-primary hover:bg-primary/90"
            >
              {executing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {executing ? "Generating..." : "Generate Lessons Now"}
            </Button>

            <Button
              onClick={triggerInvoiceJob}
              disabled={executing}
              variant="secondary"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              {executing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="mr-2 h-4 w-4" />
              )}
              {executing ? "Generating..." : "Generate Monthly Invoices"}
            </Button>

            <Button onClick={fetchData} variant="secondary" disabled={loading}>
              {loading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Job Executions</CardTitle>
          <p className="text-sm text-muted-foreground">
            History of automatic lesson generation jobs
          </p>
        </CardHeader>
        <CardContent>
          {data?.jobHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No job executions found
            </p>
          ) : (
            <div className="space-y-3">
              {data?.jobHistory.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-3">
                    {job.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{job.jobName}</span>
                        <Badge variant={job.success ? "default" : "error"}>
                          {job.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(
                          new Date(job.executedAt),
                          "MMM dd, yyyy 'at' h:mm a"
                        )}
                      </p>
                      {job.errors && (
                        <p className="text-sm text-red-600 mt-1">
                          {job.errors}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-sm">
                    <div className="flex items-center space-x-4 text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{job.lessonsGenerated}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{job.teachersProcessed}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
