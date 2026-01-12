import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { teacherProfileSchema } from '@/lib/validations';
import { sanitizeRichText, sanitizePlainText, sanitizeEmail } from '@/lib/sanitize';
import { apiLog } from '@/lib/logger';

async function handleGET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teachers only.' }, { status: 403 });
    }

    // Fetch user and teacher profile data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        teacherProfile: true,
      },
    });

    if (!user || !user.teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Return profile data
    const profileData = {
      name: user.name,
      email: user.email,
      bio: user.teacherProfile.bio,
      timezone: user.teacherProfile.timezone,
      phoneNumber: user.teacherProfile.phoneNumber,
      venmoHandle: user.teacherProfile.venmoHandle,
      paypalEmail: user.teacherProfile.paypalEmail,
      zelleEmail: user.teacherProfile.zelleEmail,
    };

    return NextResponse.json(profileData);
  } catch (error) {
    apiLog.error('Error fetching teacher profile:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teachers only.' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the request body
    const validatedData = teacherProfileSchema.parse(body);

    // Check if teacher profile exists
    const existingProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!existingProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Sanitize data before saving
    const sanitizedName = sanitizePlainText(validatedData.name);
    const sanitizedBio = validatedData.bio ? sanitizeRichText(validatedData.bio) : null;
    const sanitizedPhoneNumber = validatedData.phoneNumber ? sanitizePlainText(validatedData.phoneNumber) : null;
    const sanitizedVenmoHandle = validatedData.venmoHandle ? sanitizePlainText(validatedData.venmoHandle) : null;
    const sanitizedPaypalEmail = validatedData.paypalEmail ? sanitizeEmail(validatedData.paypalEmail) : null;
    const sanitizedZelleEmail = validatedData.zelleEmail ? sanitizePlainText(validatedData.zelleEmail) : null;

    // Update user and teacher profile in a transaction
    await prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: sanitizedName,
          email: validatedData.email, // Email is already validated by Zod
        },
      });

      // Update teacher profile with sanitized data
      // Note: hourlyRate is updated separately through lesson settings
      await tx.teacherProfile.update({
        where: { userId: session.user.id },
        data: {
          bio: sanitizedBio,
          timezone: validatedData.timezone,
          phoneNumber: sanitizedPhoneNumber,
          venmoHandle: sanitizedVenmoHandle,
          paypalEmail: sanitizedPaypalEmail,
          zelleEmail: sanitizedZelleEmail,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    apiLog.error('Error updating teacher profile:', {
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
export const GET = handleGET;
export const PUT = handlePUT;