"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Users,
  Mail,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from "lucide-react";

export interface Teacher {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  teacherProfile: {
    id: string;
    bio: string | null;
    hourlyRate: number | null;
    isActive: boolean;
    venmoHandle: string | null;
    paypalEmail: string | null;
    zelleEmail: string | null;
    students: Array<{
      id: string;
      user: {
        name: string;
        email: string;
      };
    }>;
  } | null;
}

interface ManageTeachersProps {
  teachers: Teacher[];
}

export function ManageTeachers({ teachers }: ManageTeachersProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTeacherStatus = async (teacherId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/teachers/${teacherId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        // Refresh the page or update the local state
        window.location.reload();
      }
    } catch (error) {
      console.error("Error toggling teacher status:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Stats */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{filteredTeachers.length} teachers</span>
            <span>{filteredTeachers.filter(t => t.teacherProfile?.isActive).length} active</span>
            <span>{filteredTeachers.reduce((sum, t) => sum + (t.teacherProfile?.students?.length || 0), 0)} total students</span>
          </div>
        </div>
      </Card>

      {/* Teachers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTeachers.map((teacher) => {
          const profile = teacher.teacherProfile;
          const studentCount = profile?.students?.length || 0;
          const isActive = profile?.isActive ?? true;

          return (
            <Card key={teacher.id} className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{teacher.name}</h3>
                      {isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{teacher.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(teacher.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isActive ? "secondary" : "primary"}
                    onClick={() => toggleTeacherStatus(teacher.id, isActive)}
                  >
                    {isActive ? (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{studentCount} students</span>
                  </div>
                  {profile?.hourlyRate && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${(profile.hourlyRate / 100).toFixed(0)}/hour</span>
                    </div>
                  )}
                </div>

                {/* Payment Methods */}
                {(profile?.venmoHandle || profile?.paypalEmail || profile?.zelleEmail) && (
                  <div className="flex flex-wrap items-center gap-1">
                    {profile.venmoHandle && (
                      <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Venmo
                      </Badge>
                    )}
                    {profile.paypalEmail && (
                      <Badge className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        PayPal
                      </Badge>
                    )}
                    {profile.zelleEmail && (
                      <Badge className="text-xs bg-green-50 text-green-700 border-green-200">
                        Zelle
                      </Badge>
                    )}
                  </div>
                )}

                {/* Bio */}
                {profile?.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {profile.bio}
                  </p>
                )}

                {/* Students Preview */}
                {studentCount > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Students:</p>
                    <div className="space-y-1">
                      {profile!.students.slice(0, 3).map((student) => (
                        <p key={student.id} className="text-xs text-muted-foreground">
                          {student.user.name} ({student.user.email})
                        </p>
                      ))}
                      {studentCount > 3 && (
                        <p className="text-xs text-muted-foreground italic">
                          +{studentCount - 3} more students
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredTeachers.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No teachers found
          </h3>
          <p className="text-muted-foreground">
            {teachers.length === 0 
              ? "No teachers have registered yet."
              : "Try adjusting your search criteria."
            }
          </p>
        </Card>
      )}
    </div>
  );
}