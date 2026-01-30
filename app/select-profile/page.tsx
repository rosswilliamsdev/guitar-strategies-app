import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ProfileSelector from "@/components/auth/profile-selector";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SelectProfilePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  console.log('SELECT-PROFILE PAGE:', {
    hasSession: !!session,
    accountType: session?.user?.accountType,
    activeStudentProfileId: session?.user?.activeStudentProfileId,
    profilesCount: session?.user?.studentProfiles?.length,
  });

  if (!session) {
    redirect("/login?error=session_required");
  }

  // Redirect if not a FAMILY account
  if (session.user.accountType !== "FAMILY") {
    console.log('Redirecting - not FAMILY account');
    redirect("/dashboard");
  }

  // Redirect if no student profiles - this is an error state
  if (!session.user.studentProfiles || session.user.studentProfiles.length === 0) {
    console.log('Redirecting - no student profiles');
    redirect("/login?error=no_profiles_found");
  }

  // Redirect if already has active profile selected
  if (session.user.activeStudentProfileId) {
    console.log('Redirecting to dashboard - has active profile:', session.user.activeStudentProfileId);
    redirect("/dashboard");
  }

  console.log('Rendering profile selector');

  // Get error message if present
  const errorMessage = params.error === 'profile_load_failed'
    ? 'Unable to load the selected profile. Please try selecting again.'
    : null;

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

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        <ProfileSelector
          profiles={session.user.studentProfiles}
        />
      </div>
    </div>
  );
}
