import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { CurriculumEditForm } from "@/components/curriculums/curriculum-edit-form";

interface EditCurriculumPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCurriculumPage({ params }: EditCurriculumPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // Fetch the curriculum to edit
  const curriculum = await prisma.curriculum.findFirst({
    where: {
      id: id,
      teacherId: session.user.teacherProfile?.id,
    },
    include: {
      sections: {
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!curriculum) {
    redirect("/curriculums");
  }

  return (
    <div className="container max-w-4xl py-6">
      <CurriculumEditForm curriculum={curriculum} />
    </div>
  );
}