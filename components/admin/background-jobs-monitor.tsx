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
  Activity
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
      
      const response = await fetch("/api/admin/background-jobs/generate-lessons", {
        method: "POST",
      });
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
        <CardContent className="pt-6">
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
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{data?.summary.totalJobs || 0}</p>
                <p className="text-sm text-muted-foreground">Total Jobs Run</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
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
                      : "Failed"
                  }
                </p>
                <p className="text-sm text-muted-foreground">Last Job Status</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {data?.summary.lastRun 
                    ? format(new Date(data.summary.lastRun), "MMM dd")
                    : "Never"
                  }
                </p>
                <p className="text-sm text-muted-foreground">Last Run</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              {(data?.summary.healthIssues || 0) > 0 ? (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div>
                <p className="text-2xl font-bold">{data?.summary.healthIssues || 0}</p>
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
              <p className="text-green-600">All systems are healthy ✓</p>
            ) : (
              <div className="space-y-3">
                {data.systemHealth.issues.map((issue, index) => (
                  <div key={index} className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-yellow-800 text-sm">{issue}</p>
                  </div>
                ))}
                
                {data.systemHealth.suggestions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm mb-2">Suggestions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {data.systemHealth.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          {suggestion}
                        </li>
                      ))}
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
          <div className="flex space-x-3">
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
              onClick={fetchData} 
              variant="secondary"
              disabled={loading}
            >
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
                        {format(new Date(job.executedAt), "MMM dd, yyyy 'at' h:mm a")}
                      </p>
                      {job.errors && (
                        <p className="text-sm text-red-600 mt-1">{job.errors}</p>
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