import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { BackgroundJobsMonitor } from "@/components/admin/background-jobs-monitor";

export const metadata = {
  title: "Background Jobs - Guitar Strategies Admin",
  description: "Monitor and manage automatic lesson generation jobs",
};

export default async function BackgroundJobsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Background Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Monitor automatic lesson generation and system health
        </p>
      </div>

      <BackgroundJobsMonitor />
    </div>
  );
}