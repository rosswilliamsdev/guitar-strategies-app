import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChecklistForm } from "@/components/student-checklists/checklist-form";

export const metadata = {
  title: "Create Checklist | Guitar Strategies",
  description: "Create a new personal checklist",
};

export default async function NewChecklistPage() {
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
        <h1 className="text-3xl font-bold text-foreground">Create New Checklist</h1>
        <p className="text-muted-foreground mt-2">
          Create a personal checklist to track your practice routine, repertoire, techniques, and more.
        </p>
      </div>

      <ChecklistForm />
    </div>
  );
}