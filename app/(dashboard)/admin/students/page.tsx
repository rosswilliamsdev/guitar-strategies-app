import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ManageStudents, type Student } from "@/components/admin/manage-students";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function ManageStudentsPage() {
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

  // Fetch all students with their profiles and teacher info
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
    },
    include: {
      studentProfile: {
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
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Manage Students</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all students in the system
          </p>
        </div>
        <Link href="/admin/students/new">
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </Link>
      </div>

      <ManageStudents students={students as Student[]} />
    </div>
  );
}