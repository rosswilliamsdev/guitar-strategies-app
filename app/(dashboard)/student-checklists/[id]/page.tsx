import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChecklistDetail } from "@/components/student-checklists/checklist-detail";

export const metadata = {
  title: "Checklist Details | Guitar Strategies",
  description: "View and manage your checklist items",
};

export default async function ChecklistDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <ChecklistDetail checklistId={params.id} />
    </div>
  );
}