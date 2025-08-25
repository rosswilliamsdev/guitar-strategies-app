import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { validateAllTeachers } from "@/lib/teacher-validation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/admin/refresh-button";
import Link from "next/link";
import { 
  CheckCircle, 
  Users, 
  UserCheck, 
  UserX,
  ChevronRight
} from "lucide-react";

export const metadata = {
  title: "Teacher Validation Report | Admin",
  description: "View and manage teacher profile completeness",
};

export default async function TeacherValidationPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Get validation report for all teachers
  const report = await validateAllTeachers();

  const completionRate = report.totalTeachers > 0
    ? Math.round((report.completeProfiles / report.totalTeachers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Teacher Profile Validation
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage teacher profile completeness across the platform.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Teachers</p>
              <p className="text-2xl font-semibold">{report.totalTeachers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Complete Profiles</p>
              <p className="text-2xl font-semibold">{report.completeProfiles}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <UserX className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Incomplete Profiles</p>
              <p className="text-2xl font-semibold">{report.incompleteProfiles}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-semibold">{completionRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Common Issues */}
      {Object.keys(report.commonIssues).length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Common Missing Fields</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(report.commonIssues)
              .sort(([, a], [, b]) => b - a)
              .map(([field, count]) => (
                <div key={field} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {count} {count === 1 ? 'teacher' : 'teachers'}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Teachers with Issues */}
      {report.teachersWithIssues.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Teachers Requiring Attention</h2>
            <span className="text-sm text-muted-foreground">
              {report.teachersWithIssues.length} {report.teachersWithIssues.length === 1 ? 'teacher' : 'teachers'}
            </span>
          </div>
          
          <div className="space-y-3">
            {report.teachersWithIssues.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-sm text-muted-foreground">{teacher.email}</p>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-2">
                    {teacher.issues.slice(0, 3).map((issue, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-red-100 text-red-700"
                      >
                        {issue}
                      </span>
                    ))}
                    {teacher.issues.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        +{teacher.issues.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                
                <Link href={`/admin/teachers/${teacher.id}`}>
                  <Button variant="secondary" size="sm">
                    View Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Complete Message */}
      {report.incompleteProfiles === 0 && report.totalTeachers > 0 && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">All Teachers Ready!</h3>
              <p className="text-sm text-green-700 mt-1">
                All teacher profiles are complete and ready to accept student bookings.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-4">
        <Link href="/admin/teachers">
          <Button variant="secondary">
            Manage Teachers
          </Button>
        </Link>
        
        <RefreshButton />
      </div>
    </div>
  );
}