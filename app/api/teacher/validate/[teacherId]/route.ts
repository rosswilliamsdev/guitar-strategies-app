import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateTeacherProfile, canTeacherAcceptBookings } from "@/lib/teacher-validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { teacherId } = await params;

    // Teachers can only validate their own profile
    // Admins can validate any teacher
    if (session.user.role === "TEACHER") {
      if (session.user.teacherProfile?.id !== teacherId) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    } else if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const validation = await validateTeacherProfile(teacherId);
    
    return NextResponse.json(validation);
  } catch (error) {
    console.error("Error validating teacher profile:", error);
    return NextResponse.json(
      { error: "Failed to validate teacher profile" },
      { status: 500 }
    );
  }
}

// Quick check endpoint for booking capability
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params;
    const canAccept = await canTeacherAcceptBookings(teacherId);
    
    return new NextResponse(null, {
      status: canAccept ? 200 : 400,
      headers: {
        'X-Can-Accept-Bookings': canAccept.toString(),
      },
    });
  } catch (error) {
    console.error("Error checking teacher booking capability:", error);
    return new NextResponse(null, { status: 500 });
  }
}