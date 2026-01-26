import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      accountType: session.user.accountType,
      studentProfilesCount: session.user.studentProfiles?.length || 0,
      activeStudentProfileId: session.user.activeStudentProfileId,
      isAdmin: session.user.isAdmin,
    },
    studentProfiles: session.user.studentProfiles?.map(profile => ({
      id: profile.id,
      goals: profile.goals,
      instrument: profile.instrument,
    })),
  });
}
