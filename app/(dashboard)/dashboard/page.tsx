import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { getAdminStats } from "@/lib/dashboard-stats";
import { log } from "@/lib/logger";

// Helper function to format dates
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const metadata = {
  title: "Dashboard",
  description: "Your Guitar Strategies dashboard",
};

export async function getTeacherData(userId: string) {
  try {
    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        students: {
          where: { isActive: true },
          include: { user: true },
        },
        lessons: {
          include: { student: { include: { user: true } } },
          orderBy: { date: "desc" },
        },
        libraryItems: true,
        lessonSettings: true,
      },
    });

    if (!teacherProfile) {
      return null;
    }

    // Calculate stats
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const lessonsThisWeek = teacherProfile.lessons.filter(
      (lesson) => new Date(lesson.date) >= startOfWeek
    ).length;

    const lessonsThisMonth = teacherProfile.lessons.filter(
      (lesson) => new Date(lesson.date) >= startOfMonth
    ).length;

    // Calculate monthly earnings based on actual lesson settings and durations
    const monthlyEarnings = teacherProfile.lessons
      .filter(
        (lesson) =>
          new Date(lesson.date) >= startOfMonth && lesson.status === "COMPLETED"
      )
      .reduce((total, lesson) => {
        // Use actual lesson duration and teacher's rates from lesson settings
        const lessonSettings = teacherProfile.lessonSettings;
        if (!lessonSettings) return total;

        const rate =
          lesson.duration === 60
            ? lessonSettings.price60Min || 0
            : lessonSettings.price30Min || 0;

        return total + rate;
      }, 0);

    const ratingsWithValues = teacherProfile.lessons
      .map((l) => l.studentRating)
      .filter((rating) => rating !== null && rating !== undefined) as number[];

    const avgRating =
      ratingsWithValues.length > 0
        ? ratingsWithValues.reduce((sum, rating) => sum + rating, 0) /
          ratingsWithValues.length
        : null;

    // Recent lessons (excluding cancelled)
    const recentLessons = teacherProfile.lessons
      .filter((lesson) => lesson.status !== "CANCELLED")
      .slice(0, 5)
      .map((lesson) => ({
        id: lesson.id,
        studentName: lesson.student.user.name,
        date: formatDate(lesson.date),
        duration: lesson.duration,
        status: lesson.status as string,
        notes: lesson.notes,
      }));

    return {
      teacherId: teacherProfile.id,
      stats: {
        activeStudents: teacherProfile.students.length,
        lessonsThisWeek,
        lessonsThisMonth,
        monthlyEarnings,
        avgRating,
        totalLessons: teacherProfile.lessons.length,
        libraryItems: teacherProfile.libraryItems.length,
      },
      recentLessons,
      teacherProfile: {
        bio: teacherProfile.bio,
        hourlyRate: teacherProfile.hourlyRate ?? undefined,
      },
    };
  } catch (error) {
    log.error("Error fetching teacher data:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

export async function getStudentData(userId: string) {
  try {
    log.info("Looking for student with userId", { userId });

    // Get student profile
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        teacher: {
          include: { user: true },
        },
        lessons: {
          orderBy: { date: "desc" },
        },
      },
    });

    log.info("Student profile found", { found: !!studentProfile });

    if (!studentProfile) {
      return null;
    }

    // Calculate stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const lessonsThisMonth = studentProfile.lessons.filter(
      (lesson) =>
        new Date(lesson.date) >= startOfMonth && lesson.status === "COMPLETED"
    ).length;

    const completedLessons = studentProfile.lessons.filter(
      (lesson) => lesson.status === "COMPLETED"
    ).length;

    const ratingsWithValues = studentProfile.lessons
      .map((l) => l.teacherRating)
      .filter((rating) => rating !== null && rating !== undefined) as number[];

    const avgLessonRating =
      ratingsWithValues.length > 0
        ? ratingsWithValues.reduce((sum, rating) => sum + rating, 0) /
          ratingsWithValues.length
        : null;

    // Recent lessons (excluding cancelled)
    const recentLessons = studentProfile.lessons
      .filter((lesson) => lesson.status !== "CANCELLED")
      .slice(0, 5)
      .map((lesson) => ({
        id: lesson.id,
        date: formatDate(lesson.date),
        duration: lesson.duration,
        status: lesson.status as string,
        notes: lesson.notes,
        homework: lesson.homework,
      }));

    // Upcoming assignments (from recent lessons with homework)
    const upcomingAssignments = studentProfile.lessons
      .filter((lesson) => lesson.homework && lesson.status === "COMPLETED")
      .slice(0, 3)
      .map((lesson) => ({
        id: lesson.id,
        homework: lesson.homework!,
        fromLesson: formatDate(lesson.date),
      }));

    return {
      studentId: studentProfile.id,
      stats: {
        totalLessons: studentProfile.lessons.length,
        lessonsThisMonth,
        practiceStreak: 7, // TODO: Calculate based on actual practice data
        avgLessonRating,
        completedLessons,
      },
      recentLessons,
      studentProfile: {
        teacherName: studentProfile.teacher.user.name,
        teacherEmail: studentProfile.teacher.user.email,
        goals: studentProfile.goals,
        instrument: studentProfile.instrument,
      },
      upcomingAssignments,
    };
  } catch (error) {
    log.error("Error fetching student data:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // All teachers get the dual-role dashboard
  if (session.user.role === "TEACHER") {
    const teacherData = await getTeacherData(session.user.id);

    if (teacherData) {
      const { DualRoleDashboard } = await import("./dual-role-dashboard");
      const adminStats = await getAdminStats();
      return (
        <DualRoleDashboard
          user={session.user}
          teacherData={teacherData}
          adminStats={adminStats}
        />
      );
    }
  }

  if (session.user.role === "STUDENT") {
    const studentData = await getStudentData(session.user.id);

    if (studentData) {
      return <StudentDashboard {...studentData} />;
    } else {
      log.error("Student profile not found", { userId: session.user.id });
      redirect("/login?error=profile_not_found");
    }
  }

  // If we reach here, user has an invalid or unrecognized role
  log.error("Invalid user role or missing profile", {
    userId: session.user.id,
    role: session.user.role,
  });
  redirect("/login?error=invalid_role");
}
