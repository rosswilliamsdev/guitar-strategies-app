import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ProfileSelector from "@/components/auth/profile-selector";

export default async function SelectProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Redirect if not a FAMILY account
  if (session.user.accountType !== "FAMILY") {
    redirect("/dashboard");
  }

  // Redirect if no student profiles
  if (!session.user.studentProfiles || session.user.studentProfiles.length === 0) {
    redirect("/dashboard");
  }

  // Redirect if already has active profile selected
  if (session.user.activeStudentProfileId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Select Student Profile
          </h1>
          <p className="text-neutral-600">
            Welcome back, {session.user.name}. Choose which student&apos;s information you&apos;d like to view.
          </p>
        </div>

        <ProfileSelector
          profiles={session.user.studentProfiles}
        />
      </div>
    </div>
  );
}
