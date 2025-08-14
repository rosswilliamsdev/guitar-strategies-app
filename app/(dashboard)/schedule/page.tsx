import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TeacherScheduleView } from "@/components/schedule/teacher-schedule-view";
import { startOfWeek, endOfWeek, addWeeks } from "date-fns";

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

  // Get current week's lessons
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(addWeeks(startDate, 2)); // Next 3 weeks

  const upcomingLessons = await prisma.lesson.findMany({
    where: {
      teacherId: teacher.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["SCHEDULED", "COMPLETED"],
      },
    },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  // Get teacher availability for the next 3 weeks
  const availability = await prisma.teacherAvailability.findMany({
    where: {
      teacherId: teacher.id,
    },
  });

  // Get blocked time slots
  const blockedTimes = await prisma.teacherBlockedTime.findMany({
    where: {
      teacherId: teacher.id,
      startTime: {
        gte: startDate,
      },
    },
  });

  // Get lesson settings
  const lessonSettings = await prisma.teacherLessonSettings.findUnique({
    where: {
      teacherId: teacher.id,
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
      />
    </div>
  );
}