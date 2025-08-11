import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CalendlyEmbed } from "@/components/scheduling/calendly-embed";
import { TeacherScheduleDashboard } from "@/components/scheduling/teacher-schedule-dashboard";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "TEACHER") {
    // Teacher view - show their scheduling management
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        students: {
          where: { isActive: true },
          include: { user: true },
        },
      },
    });

    if (!teacherProfile) {
      redirect("/dashboard");
    }

    return (
      <TeacherScheduleDashboard 
        teacherProfile={{
          id: teacherProfile.id,
          calendlyUrl: teacherProfile.calendlyUrl || undefined,
          students: teacherProfile.students.map(student => ({
            id: student.id,
            user: {
              id: student.user.id,
              name: student.user.name,
              email: student.user.email,
            }
          }))
        }} 
      />
    );
  }

  if (session.user.role === "STUDENT") {
    // Student view - show teacher's scheduling
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        teacher: {
          include: { user: true },
        },
      },
    });

    if (!studentProfile || !studentProfile.teacher) {
      return (
        <div className="space-y-6">
          <h1 className="text-3xl font-semibold text-foreground">
            Schedule Lessons
          </h1>
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Teacher Assigned
            </h3>
            <p className="text-muted-foreground">
              You haven&apos;t been assigned to a teacher yet. Please contact
              support.
            </p>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <CalendlyEmbed
          calendlyUrl={studentProfile.teacher.calendlyUrl || ""}
          teacherName={studentProfile.teacher.user.name}
          height={700}
        />
      </div>
    );
  }

  // Admin fallback
  redirect("/dashboard");
}
