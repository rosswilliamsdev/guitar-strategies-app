import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChecklistForm } from "@/components/student-checklists/checklist-form";

export const metadata = {
  title: "New Personal Checklist | Guitar Strategies",
  description: "Create a new personal practice checklist",
};

export default async function NewPersonalChecklistPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create Personal Checklist</h1>
        <p className="text-muted-foreground mt-2">
          Create a personal practice checklist to track your learning goals and practice routines.
        </p>
      </div>

      <ChecklistForm />
    </div>
  );
}