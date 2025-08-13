import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentChecklistDetail } from "@/components/student-checklists/checklist-detail";

export const metadata = {
  title: "Personal Checklist | Guitar Strategies",
  description: "View and manage your personal practice checklist",
};

interface PageProps {
  params: {
    id: string;
  };
}

export default async function PersonalChecklistDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <StudentChecklistDetail checklistId={params.id} />
    </div>
  );
}