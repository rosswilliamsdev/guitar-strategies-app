import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentChecklistList } from "@/components/student-checklists/checklist-list";

export const metadata = {
  title: "My Checklists | Guitar Strategies",
  description: "Manage your personal practice checklists and learning goals",
};

export default async function StudentChecklistsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Checklists</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage your personal practice routines, repertoire lists, technique exercises, and learning objectives.
        </p>
      </div>

      <StudentChecklistList />
    </div>
  );
}