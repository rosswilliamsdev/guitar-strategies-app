import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CurriculumList } from "@/components/curriculums/curriculum-list";
import { StudentChecklistList } from "@/components/student-checklists/checklist-list";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CurriculumsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">
            Checklists
          </h1>
          <p className="text-muted-foreground mt-2">
            {session.user.role === "TEACHER" 
              ? "Create and manage learning checklists for your students"
              : "Track your progress through learning checklists and manage your personal practice lists"}
          </p>
        </div>
      </div>

      <CurriculumList userRole={session.user.role} />

      {/* Student Personal Checklists Section - Only show for students */}
      {session.user.role === "STUDENT" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">My Personal Checklists</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage your personal practice routines, repertoire lists, and learning objectives
            </p>
          </div>
          <StudentChecklistList />
        </div>
      )}
    </div>
  );
}