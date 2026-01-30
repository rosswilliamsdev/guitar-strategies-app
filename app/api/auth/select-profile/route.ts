import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { authLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Only allow FAMILY accounts to select profiles
    if (session.user.accountType !== "FAMILY") {
      return NextResponse.json(
        { error: "Profile selection is only available for family accounts" },
        { status: 403 }
      );
    }

    const { profileId } = await req.json();

    if (!profileId) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 }
      );
    }

    // Verify the profile belongs to this user
    const profile = await prisma.studentProfile.findFirst({
      where: {
        id: profileId,
        userId: session.user.id,
      },
    });

    if (!profile) {
      authLog.warn("Attempted to select unauthorized profile", {
        userId: session.user.id,
        profileId,
      });
      return NextResponse.json(
        { error: "Profile not found or access denied" },
        { status: 404 }
      );
    }

    // Save the selected profile to the database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeStudentProfileId: profileId },
    });

    authLog.info("Profile selected and saved to database", {
      userId: session.user.id,
      profileId,
      email: session.user.email,
    });

    // Create response with redirect
    return NextResponse.json({
      success: true,
      profileId,
      message: "Profile selected successfully",
      redirect: "/dashboard",
    });
  } catch (error) {
    authLog.error("Error selecting profile", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to select profile" },
      { status: 500 }
    );
  }
}
