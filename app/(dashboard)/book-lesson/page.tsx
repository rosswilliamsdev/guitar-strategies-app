import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { BookingInterface } from '@/components/booking/BookingInterface';

export const metadata = {
  title: 'Book a Lesson - Guitar Strategies',
  description: 'Schedule your guitar lesson with your teacher',
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

export default async function BookLessonPage() {
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
            You need to be assigned to a teacher before you can book lessons.
            Please contact your teacher or administrator.
          </p>
        </div>
      </div>
    );
  }

  const teacher = userData.studentProfile.teacher;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <BookingInterface
          teacherId={teacher.id}
          teacherName={teacher.user.name}
          studentTimezone={userData.studentProfile.goals || "America/New_York"} // Use goals field as timezone for now
        />
      </div>
    </div>
  );
}