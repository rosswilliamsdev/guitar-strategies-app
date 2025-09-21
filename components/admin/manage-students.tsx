"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search,
  Users,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  GraduationCap,
  Trash2,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { log, emailLog, invoiceLog, schedulerLog } from '@/lib/logger';

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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Student details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [studentToView, setStudentToView] = useState<Student | null>(null);

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
      log.error('Error toggling student status:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
    setDeleteModalOpen(true);
  };

  const handleViewDetails = (student: Student) => {
    setStudentToView(student);
    setDetailsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/students/${studentToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        toast.success(
          `${studentToDelete.name} has been successfully removed from the system.`
        );
        // Refresh the page
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete student");
      }
    } catch (error) {
      log.error('Error deleting student:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error("An unexpected error occurred while deleting the student");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setStudentToDelete(null);
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
              placeholder="Search"
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
            <Card key={student.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div 
                className="space-y-3"
                onClick={() => handleViewDetails(student)}
              >
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
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(student)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
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

      {/* Student Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Student Details: {studentToView?.name}
            </DialogTitle>
            <DialogDescription>
              Complete information about this student&apos;s profile and learning journey
            </DialogDescription>
          </DialogHeader>
          
          {studentToView && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-sm">{studentToView.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{studentToView.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center gap-2">
                      {studentToView.studentProfile?.isActive ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">Inactive</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Joined</label>
                    <p className="text-sm">{new Date(studentToView.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Learning Information */}
              {studentToView.studentProfile && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Learning Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Instrument</label>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-background border">
                          {studentToView.studentProfile.instrument}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Assigned Teacher</label>
                      <p className="text-sm">
                        {studentToView.studentProfile.teacher 
                          ? studentToView.studentProfile.teacher.user.name
                          : 'No teacher assigned'
                        }
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Learning Goals</label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-lg">
                        {studentToView.studentProfile.goals || 'No goals specified'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Teacher Information */}
              {studentToView.studentProfile?.teacher && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Assigned Teacher</h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{studentToView.studentProfile.teacher.user.name}</p>
                        <p className="text-xs text-muted-foreground">{studentToView.studentProfile.teacher.user.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDetailsModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Student Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{studentToDelete?.name}</strong>&apos;s account?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                This action will permanently delete:
              </p>
              <ul className="text-sm text-red-700 space-y-1 ml-4">
                <li>• The student&apos;s account and profile</li>
                <li>• All lessons associated with this student</li>
                <li>• All invoices and payment records</li>
                <li>• All checklist progress and completion data</li>
                <li>• All recurring lesson bookings</li>
              </ul>
            </div>
            
            {studentToDelete?.studentProfile?.teacher && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium">
                  📚 Currently assigned to teacher: {studentToDelete.studentProfile.teacher.user.name}
                </p>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              <strong>This action cannot be undone.</strong> Please ensure you have backed up any necessary data before proceeding.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Student
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}