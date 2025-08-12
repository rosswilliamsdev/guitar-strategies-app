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
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  GraduationCap
} from "lucide-react";

export interface Student {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  studentProfile: {
    id: string;
    goals: string | null;
    instrument: string;
    isActive: boolean;
    teacher: {
      id: string;
      user: {
        name: string;
        email: string;
      };
    };
  } | null;
}

interface ManageStudentsProps {
  students: Student[];
}

export function ManageStudents({ students }: ManageStudentsProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentProfile?.teacher?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStudentStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/students/${studentId}/toggle`, {
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
      console.error("Error toggling student status:", error);
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
              placeholder="Search students or teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>{filteredStudents.length} students</span>
            <span>{filteredStudents.filter(s => s.studentProfile?.isActive).length} active</span>
          </div>
        </div>
      </Card>

      {/* Students List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredStudents.map((student) => {
          const profile = student.studentProfile;
          const isActive = profile?.isActive ?? true;

          return (
            <Card key={student.id} className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{student.name}</h3>
                      {isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(student.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isActive ? "secondary" : "primary"}
                    onClick={() => toggleStudentStatus(student.id, isActive)}
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

                {/* Teacher Info */}
                {profile?.teacher && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{profile.teacher.user.name}</p>
                        <p className="text-xs text-muted-foreground">{profile.teacher.user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Student Details */}
                {profile?.instrument && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Instrument:</span>
                    <Badge className="text-xs bg-background border">
                      {profile.instrument}
                    </Badge>
                  </div>
                )}

                {/* Goals */}
                {profile?.goals && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Goals:</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {profile.goals}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No students found
          </h3>
          <p className="text-muted-foreground">
            {students.length === 0 
              ? "No students have registered yet."
              : "Try adjusting your search criteria."
            }
          </p>
        </Card>
      )}
    </div>
  );
}