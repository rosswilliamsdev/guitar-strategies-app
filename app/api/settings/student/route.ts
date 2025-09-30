import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { studentProfileSchema } from '@/lib/validations';
import { apiLog, dbLog, emailLog } from '@/lib/logger';
import { withRateLimit } from '@/lib/rate-limit';

async function handlePUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Access denied. Students only.' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the request body
    const validatedData = studentProfileSchema.parse(body);

    // Check if student profile exists
    const existingProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!existingProfile) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    // Update user and student profile in a transaction
    await prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: validatedData.name,
          email: validatedData.email,
        },
      });

      // Update student profile
      await tx.studentProfile.update({
        where: { userId: session.user.id },
        data: {
          goals: validatedData.goals,
          phoneNumber: validatedData.phoneNumber,
          parentEmail: validatedData.parentEmail,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    apiLog.error('Error updating student profile:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export handlers directly (rate limiting temporarily disabled for Next.js 15 compatibility)
export const PUT = handlePUT;