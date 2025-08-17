'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Music, 
  Target, 
  DollarSign,
  Clock,
  ChevronRight,
  X,
  CalendarClock
} from 'lucide-react';

interface StudentData {
  student: {
    id: string;
    instrument: string;
    goals: string | null;
    phoneNumber: string | null;
    parentEmail: string | null;
    joinedAt: string;
    isActive: boolean;
    user: {
      id: string;
      name: string;
      email: string;
    };
    teacher: {
      user: {
        name: string;
      };
    };
    _count: {
      lessons: number;
    };
  };
  recentLessons: Array<{
    id: string;
    date: string;
    duration: number;
    status: string;
    notes: string | null;
    teacher: {
      user: {
        name: string;
      };
    };
  }>;
  upcomingLessons: Array<{
    id: string;
    date: string;
    duration: number;
    status: string;
  }>;
  recurringSlots: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    duration: number;
    status: string;
    monthlyRate: number;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    month: string;
    dueDate: string;
    total: number;
    status: string;
    paidAt: string | null;
  }>;
  paymentSummary: {
    totalPaid: number;
    totalOwed: number;
  };
}

interface StudentProfileProps {
  studentId: string;
  teacherId: string;
}

export function StudentProfile({ studentId, teacherId }: StudentProfileProps) {
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingSlot, setCancellingSlot] = useState<string | null>(null);
  const [cancellingLesson, setCancellingLesson] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/students/${studentId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch student');
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [studentId]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p>Loading student profile...</p>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Student not found
        </h3>
        <p className="text-gray-600 mb-4">
          This student doesn&apos;t exist or you don&apos;t have access to their profile.
        </p>
        <Link href="/students">
          <Button variant="secondary">Back to Students</Button>
        </Link>
      </Card>
    );
  }

  const { student, recentLessons, upcomingLessons, recurringSlots, invoices, paymentSummary } = data;

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  const formatSlotTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + duration);
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    };
    
    return `${formatTime(startDate)} - ${formatTime(endDate)}`;
  };

  const handleCancelSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to cancel this weekly time slot? This will free up the time for other students.')) {
      return;
    }

    setCancellingSlot(slotId);
    try {
      const response = await fetch(`/api/slots/${slotId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelDate: new Date(),
          reason: 'Cancelled from student profile',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel slot');
      }

      // Refresh the data
      const res = await fetch(`/api/students/${studentId}`);
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
      }
    } catch (error) {
      console.error('Error cancelling slot:', error);
      alert('Failed to cancel the time slot. Please try again.');
    } finally {
      setCancellingSlot(null);
    }
  };

  const handleCancelLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to cancel this lesson? This action cannot be undone.')) {
      return;
    }

    setCancellingLesson(lessonId);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Cancelled from student profile',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel lesson');
      }

      // Refresh the data
      const res = await fetch(`/api/students/${studentId}`);
      if (res.ok) {
        const newData = await res.json();
        setData(newData);
      }
    } catch (error: any) {
      console.error('Error cancelling lesson:', error);
      alert(`Failed to cancel the lesson: ${error.message}`);
    } finally {
      setCancellingLesson(null);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      OVERDUE: 'bg-red-100 text-red-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Student Info Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <User className="h-6 w-6" />
              {student.user.name}
            </h2>
            <p className="text-muted-foreground">Student Profile</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusBadge(student.isActive ? 'ACTIVE' : 'INACTIVE')}>
              {student.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Link href={`/lessons/new?studentId=${studentId}`}>
              <Button size="sm">New Lesson</Button>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{student.user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{student.phoneNumber || 'Not provided'}</span>
              </div>
              {student.parentEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>Parent: {student.parentEmail}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Learning Details</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Music className="h-4 w-4 text-muted-foreground" />
                <span>{student.instrument}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {format(new Date(student.joinedAt), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{student._count.lessons} total lessons</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Lesson Details</h3>
            {recurringSlots && recurringSlots.length > 0 ? (
              <div className="space-y-3">
                {recurringSlots.map((slot) => (
                  <div key={slot.id} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarClock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {getDayName(slot.dayOfWeek)}s
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground ml-6">
                      {formatSlotTime(slot.startTime, slot.duration)}
                    </div>
                    <div className="text-sm text-muted-foreground ml-6">
                      {slot.duration} minute lesson
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCancelSlot(slot.id)}
                      disabled={cancellingSlot === slot.id}
                      className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {cancellingSlot === slot.id ? (
                        <>Cancelling...</>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Cancel Weekly Time
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No recurring weekly lessons scheduled
              </div>
            )}
          </div>
        </div>

        {student.goals && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Goals</h3>
                <p className="text-sm text-gray-600">{student.goals}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Lessons</p>
              <p className="text-2xl font-semibold">{student._count.lessons}</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-semibold">{formatCurrency(paymentSummary.totalPaid)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <p className="text-2xl font-semibold">{formatCurrency(paymentSummary.totalOwed)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
      </div>

      {/* Upcoming Lessons */}
      {upcomingLessons.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upcoming Lessons</h3>
            <Link href={`/lessons?studentId=${studentId}&future=true`}>
              <Button variant="secondary" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingLessons.map((lesson) => (
              <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">
                    {format(new Date(lesson.date), 'EEEE, MMMM d')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(lesson.date), 'h:mm a')} • {lesson.duration} minutes
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadge(lesson.status)}>
                    {lesson.status}
                  </Badge>
                  {lesson.status === 'SCHEDULED' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCancelLesson(lesson.id)}
                      disabled={cancellingLesson === lesson.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {cancellingLesson === lesson.id ? (
                        <>Cancelling...</>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Lessons */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Lessons</h3>
          <Link href={`/lessons?studentId=${studentId}`}>
            <Button variant="secondary" size="sm">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        {recentLessons.length === 0 ? (
          <p className="text-gray-600">No lessons recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {recentLessons.map((lesson) => (
              <div key={lesson.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">
                    {format(new Date(lesson.date), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lesson.duration} minutes • {lesson.teacher.user.name}
                  </p>
                  {lesson.notes && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                      {lesson.notes.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadge(lesson.status)}>
                    {lesson.status}
                  </Badge>
                  <Link href={`/lessons/${lesson.id}`}>
                    <Button variant="secondary" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Payment History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Invoices</h3>
          <Link href={`/invoices?studentId=${studentId}`}>
            <Button variant="secondary" size="sm">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        {invoices.length === 0 ? (
          <p className="text-gray-600">No invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(invoice.month + '-01'), 'MMMM yyyy')} • Due {format(new Date(invoice.dueDate), 'MMM d')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(invoice.total)}</span>
                  <Badge className={getStatusBadge(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}