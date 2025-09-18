import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateTeacherForm } from "@/components/admin/create-teacher-form";

export default async function CreateTeacherPage() {
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

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Create New Teacher</h1>
        <p className="text-muted-foreground mt-1">
          Add a new teacher to the system
        </p>
      </div>

      <CreateTeacherForm />
    </div>
  );
}