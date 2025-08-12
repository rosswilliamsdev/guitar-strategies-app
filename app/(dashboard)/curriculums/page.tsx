import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CurriculumList } from "@/components/curriculums/curriculum-list";

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
              : "Track your progress through learning checklists"}
          </p>
        </div>
      </div>

      <CurriculumList userRole={session.user.role} />
    </div>
  );
}