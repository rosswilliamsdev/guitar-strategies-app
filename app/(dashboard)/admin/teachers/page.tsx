import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ManageTeachers } from "@/components/admin/manage-teachers";
import type { Teacher } from "@/components/admin/manage-teachers";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function ManageTeachersPage() {
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

  // Fetch all teachers with their profiles and student counts
  const teachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
    },
    include: {
      teacherProfile: {
        include: {
          students: {
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
          <h1 className="text-2xl font-semibold text-foreground">
            Manage Teachers
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all teachers in the system
          </p>
        </div>
        <Link href="/admin/teachers/new">
          <Button variant="primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        </Link>
      </div>

      <ManageTeachers teachers={teachers as Teacher[]} />
    </div>
  );
}
