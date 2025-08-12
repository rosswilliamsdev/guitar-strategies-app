import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CurriculumForm } from "@/components/curriculums/curriculum-form";

export default async function NewCurriculumPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "TEACHER") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">
          Create New Curriculum
        </h1>
        <p className="text-muted-foreground mt-2">
          Design a structured learning path for your students
        </p>
      </div>

      <CurriculumForm />
    </div>
  );
}