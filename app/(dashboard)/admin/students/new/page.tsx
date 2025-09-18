import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CreateStudentForm } from "@/components/admin/create-student-form";

export default async function CreateStudentPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Check if user has admin access (either ADMIN role or TEACHER with admin flag)
  const hasAdminAccess = session.user.role === "ADMIN" ||
    (session.user.role === "TEACHER" && session.user.teacherProfile?.isAdmin === true);

  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  // Get all active teachers for the dropdown
  const teachersRaw = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      teacherProfile: {
        isActive: true,
      },
    },
    include: {
      teacherProfile: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Filter out teachers without teacherProfile (shouldn't happen but for type safety)
  const teachers = teachersRaw.filter(
    (teacher): teacher is typeof teacher & { teacherProfile: NonNullable<typeof teacher.teacherProfile> } =>
      teacher.teacherProfile !== null
  );

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Create New Student</h1>
        <p className="text-muted-foreground mt-1">
          Add a new student to the system
        </p>
      </div>

      <CreateStudentForm teachers={teachers} />
    </div>
  );
}