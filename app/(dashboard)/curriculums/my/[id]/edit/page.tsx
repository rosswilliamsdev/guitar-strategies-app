import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentChecklistForm } from "@/components/student-checklists/checklist-form";

export const metadata = {
  title: "Edit Personal Checklist | Guitar Strategies",
  description: "Edit your personal practice checklist",
};

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditPersonalChecklistPage({ params }: PageProps) {
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
        <h1 className="text-3xl font-bold text-foreground">Edit Personal Checklist</h1>
        <p className="text-muted-foreground mt-2">
          Update your personal practice checklist and learning goals.
        </p>
      </div>

      <StudentChecklistForm checklistId={params.id} />
    </div>
  );
}