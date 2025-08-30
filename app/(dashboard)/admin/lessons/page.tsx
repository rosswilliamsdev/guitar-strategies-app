import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ManageLessons } from "@/components/admin/manage-lessons";

export default async function AdminLessonsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  // Fetch all lessons with teacher and student information
  const lessons = await prisma.lesson.findMany({
    include: {
      teacher: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      student: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  // Get statistics
  const stats = {
    totalLessons: lessons.length,
    completedLessons: lessons.filter((l) => l.status === "COMPLETED").length,
    cancelledLessons: lessons.filter((l) => l.status === "CANCELLED").length,
    totalDuration: lessons.reduce((sum, l) => sum + l.duration, 0),
    uniqueTeachers: new Set(lessons.map((l) => l.teacherId)).size,
    uniqueStudents: new Set(lessons.map((l) => l.studentId)).size,
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Manage Lessons
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage all lessons across the platform
        </p>
      </div>

      <ManageLessons lessons={lessons} stats={stats} />
    </div>
  );
}
