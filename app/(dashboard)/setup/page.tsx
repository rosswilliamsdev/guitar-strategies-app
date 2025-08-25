import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeacherSetupWizard } from "@/components/teacher/setup-wizard";
import { validateTeacherProfile } from "@/lib/teacher-validation";

export const metadata = {
  title: "Complete Your Profile | Guitar Strategies",
  description: "Set up your teacher profile to start accepting student bookings",
};

export default async function SetupPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const teacherId = session.user.teacherProfile?.id;
  
  if (!teacherId) {
    // This shouldn't happen, but handle it gracefully
    redirect("/dashboard");
  }

  // Get current validation status
  const validation = await validateTeacherProfile(teacherId);

  // If profile is already complete, redirect to dashboard
  if (validation.canAcceptBookings) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">
          Complete Your Teacher Profile
        </h1>
        <p className="text-muted-foreground mt-2">
          Let&apos;s get your profile set up so students can start booking lessons with you.
        </p>
      </div>

      <TeacherSetupWizard 
        teacherId={teacherId} 
        initialValidation={validation}
      />
    </div>
  );
}