import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ChecklistForm } from "@/components/student-checklists/checklist-form";

export const metadata = {
  title: "Edit Checklist | Guitar Strategies",
  description: "Edit your checklist",
};

export default async function EditChecklistPage({
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

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!studentProfile) {
    redirect("/dashboard");
  }

  const checklist = await prisma.studentChecklist.findFirst({
    where: {
      id: params.id,
      studentId: studentProfile.id,
    },
  });

  if (!checklist) {
    redirect("/student-checklists");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Edit Checklist</h1>
        <p className="text-muted-foreground mt-2">
          Update your checklist details.
        </p>
      </div>

      <ChecklistForm checklist={checklist} />
    </div>
  );
}