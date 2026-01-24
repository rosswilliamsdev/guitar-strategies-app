import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TeacherScheduleView } from "@/components/schedule/teacher-schedule-view";
import { startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { getLessonsWithRecurring } from "@/lib/recurring-lessons";

// Force dynamic rendering and disable caching for this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "STUDENT") {
    redirect("/scheduling");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/lessons");
  }

  // Get teacher profile
  const teacher = await prisma.teacherProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
    },
  });

  if (!teacher) {
    redirect("/dashboard");
  }

  // Get current week's lessons including auto-generated recurring lessons
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(addWeeks(startDate, 11)); // Next 12 weeks

  const upcomingLessons = await getLessonsWithRecurring(
    teacher.id,
    startDate,
    endDate
  );

  // Get teacher availability for the next 12 weeks
  const availability = await prisma.teacherAvailability.findMany({
    where: {
      teacherId: teacher.id,
    },
  });

  // Get blocked time slots
  const blockedTimesData = await prisma.teacherBlockedTime.findMany({
    where: {
      teacherId: teacher.id,
      startTime: {
        gte: startDate,
      },
    },
  });

  // Convert null to undefined for compatibility
  const blockedTimes = blockedTimesData.map(bt => ({
    ...bt,
    reason: bt.reason ?? undefined,
  }));

  // Get lesson settings
  const lessonSettings = await prisma.teacherLessonSettings.findUnique({
    where: {
      teacherId: teacher.id,
    },
  });

  // Get teacher's students
  const students = await prisma.studentProfile.findMany({
    where: {
      teacherId: teacher.id,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Schedule</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your upcoming lessons and availability
        </p>
      </div>

      <TeacherScheduleView
        teacherId={teacher.id}
        upcomingLessons={upcomingLessons}
        availability={availability}
        blockedTimes={blockedTimes}
        lessonSettings={lessonSettings}
        students={students}
      />
    </div>
  );
}