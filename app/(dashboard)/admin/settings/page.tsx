import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";

export const metadata = {
  title: "Admin Settings - Guitar Strategies",
  description: "Configure platform-wide settings and defaults",
};

export default async function AdminSettingsPage() {
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
        <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure platform-wide settings and defaults
        </p>
      </div>

      <AdminSettingsForm />
    </div>
  );
}