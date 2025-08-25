import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SchedulingClient } from '@/components/scheduling/SchedulingClient';

export const metadata = {
  title: 'Scheduling - Guitar Strategies',
  description: 'Manage your lesson schedule and book additional lessons',
};

async function getStudentData(userId: string) {
  try {
    const studentData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            teacher: {
              include: { 
                user: true,
                lessonSettings: true 
              }
            },
            recurringSlots: {
              where: { status: 'ACTIVE' },
              include: {
                teacher: {
                  include: { user: true }
                },
                subscriptions: {
                  where: { status: 'ACTIVE' },
                  include: {
                    billingRecords: {
                      orderBy: { month: 'desc' },
                      take: 1
                    }
                  }
                }
              }
            },
            lessons: {
              where: { 
                isRecurring: true,
                status: 'SCHEDULED',
                date: { gte: new Date() } // Only future recurring lessons
              },
              orderBy: { date: 'asc' },
              take: 1
            }
          }
        }
      }
    });
    return studentData;
  } catch (error) {
    console.error('Error fetching student data:', error);
    return null;
  }
}

export default async function SchedulingPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'STUDENT') {
    redirect('/dashboard');
  }

  const userData = await getStudentData(session.user.id);

  if (!userData?.studentProfile?.teacher) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-semibold mb-4">No Teacher Assigned</h1>
          <p className="text-muted-foreground mb-6">
            You need to be assigned to a teacher before you can access scheduling.
            Please contact your teacher or administrator.
          </p>
        </div>
      </div>
    );
  }

  const teacher = userData.studentProfile.teacher;
  const recurringSlots = userData.studentProfile.recurringSlots || [];
  const recurringLessons = userData.studentProfile.lessons || [];

  return (
    <SchedulingClient
      teacherId={teacher.id}
      teacherName={teacher.user.name}
      recurringSlots={recurringSlots}
      recurringLessons={recurringLessons}
      studentId={userData.studentProfile.id}
      studentTimezone={userData.studentProfile.goals || "America/New_York"}
    />
  );
}