import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CurriculumDetail } from "@/components/curriculums/curriculum-detail";

interface CurriculumPageProps {
  params: {
    id: string;
  };
}

export default async function CurriculumPage({ params }: CurriculumPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <CurriculumDetail curriculumId={params.id} userRole={session.user.role} />;
}