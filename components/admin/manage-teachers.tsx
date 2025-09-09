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
  User,
  DollarSign,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { log, emailLog, invoiceLog } from '@/lib/logger';

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
    phoneNumber: string | null;
    timezone: string | null;
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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Teacher details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [teacherToView, setTeacherToView] = useState<Teacher | null>(null);

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTeacherStatus = async (
    teacherId: string,
    currentStatus: boolean
  ) => {
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
      log.error('Error toggling teacher status:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };

  const handleDeleteClick = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleViewDetails = (teacher: Teacher) => {
    setTeacherToView(teacher);
    setDetailsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/teachers/${teacherToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        toast.success(
          `${teacherToDelete.name} has been successfully removed from the system.`
        );
        // Refresh the page
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete teacher");
      }
    } catch (error) {
      log.error('Error deleting teacher:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      toast.error("An unexpected error occurred while deleting the teacher");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setTeacherToDelete(null);
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
            <span>
              {
                filteredTeachers.filter((t) => t.teacherProfile?.isActive)
                  .length
              }{" "}
              active
            </span>
            <span>
              {filteredTeachers.reduce(
                (sum, t) => sum + (t.teacherProfile?.students?.length || 0),
                0
              )}{" "}
              total students
            </span>
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
            <Card key={teacher.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div 
                className="space-y-3"
                onClick={() => handleViewDetails(teacher)}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {teacher.name}
                      </h3>
                      {isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {teacher.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(teacher.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-red-500 hover:bg-red-700 text-white border-red-600"
                      onClick={() => handleDeleteClick(teacher)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
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
                {(profile?.venmoHandle ||
                  profile?.paypalEmail ||
                  profile?.zelleEmail) && (
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
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Students:
                    </p>
                    <div className="space-y-1">
                      {profile!.students.slice(0, 3).map((student) => (
                        <p
                          key={student.id}
                          className="text-xs text-muted-foreground"
                        >
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
              : "Try adjusting your search criteria."}
          </p>
        </Card>
      )}

      {/* Teacher Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Teacher Details: {teacherToView?.name}
            </DialogTitle>
            <DialogDescription>
              Complete information about this teacher&apos;s profile and activity
            </DialogDescription>
          </DialogHeader>
          
          {teacherToView && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                    <p className="text-sm">{teacherToView.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{teacherToView.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center gap-2">
                      {teacherToView.teacherProfile?.isActive ? (
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
                    <p className="text-sm">{new Date(teacherToView.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Teaching Information */}
              {teacherToView.teacherProfile && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Teaching Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Hourly Rate</label>
                      <p className="text-sm">
                        {teacherToView.teacherProfile.hourlyRate 
                          ? `$${(teacherToView.teacherProfile.hourlyRate / 100).toFixed(0)}/hour`
                          : 'Not set'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Students</label>
                      <p className="text-sm">{teacherToView.teacherProfile.students?.length || 0}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                      <p className="text-sm">{teacherToView.teacherProfile.phoneNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Timezone</label>
                      <p className="text-sm">{teacherToView.teacherProfile.timezone || 'America/New_York'}</p>
                    </div>
                  </div>
                  
                  {teacherToView.teacherProfile.bio && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Bio</label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{teacherToView.teacherProfile.bio}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Methods */}
              {teacherToView.teacherProfile && (teacherToView.teacherProfile.venmoHandle || teacherToView.teacherProfile.paypalEmail || teacherToView.teacherProfile.zelleEmail) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Payment Methods</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {teacherToView.teacherProfile.venmoHandle && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">Venmo</Badge>
                        <span className="text-sm">{teacherToView.teacherProfile.venmoHandle}</span>
                      </div>
                    )}
                    {teacherToView.teacherProfile.paypalEmail && (
                      <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">PayPal</Badge>
                        <span className="text-sm">{teacherToView.teacherProfile.paypalEmail}</span>
                      </div>
                    )}
                    {teacherToView.teacherProfile.zelleEmail && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Badge className="bg-green-100 text-green-700 border-green-200">Zelle</Badge>
                        <span className="text-sm">{teacherToView.teacherProfile.zelleEmail}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Students List */}
              {teacherToView.teacherProfile?.students && teacherToView.teacherProfile.students.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    Students ({teacherToView.teacherProfile.students.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {teacherToView.teacherProfile.students.map((student) => (
                      <div key={student.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{student.user.name}</p>
                          <p className="text-xs text-muted-foreground">{student.user.email}</p>
                        </div>
                      </div>
                    ))}
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
              Delete Teacher Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{teacherToDelete?.name}</strong>&apos;s account?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                This action will permanently delete:
              </p>
              <ul className="text-sm text-red-700 space-y-1 ml-4">
                <li>• The teacher&apos;s account and profile</li>
                <li>• All lessons associated with this teacher</li>
                <li>• All student-teacher relationships</li>
                <li>• All invoices and payment records</li>
                <li>• All availability and scheduling data</li>
              </ul>
            </div>

            {teacherToDelete?.teacherProfile?.students &&
              teacherToDelete.teacherProfile.students.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ This teacher has{" "}
                    {teacherToDelete.teacherProfile.students.length} active
                    student
                    {teacherToDelete.teacherProfile.students.length > 1
                      ? "s"
                      : ""}{" "}
                    who will need to be reassigned.
                  </p>
                </div>
              )}

            <p className="text-sm text-muted-foreground">
              <strong>This action cannot be undone.</strong> Please ensure you
              have backed up any necessary data before proceeding.
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
              variant="secondary"
              className="bg-red-600 hover:bg-red-700 text-white border-red-600"
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
                  Delete Teacher
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
