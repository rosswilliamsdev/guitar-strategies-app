import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { teacherProfileSchema } from '@/lib/validations';

export async function GET() {
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
    console.error('Error fetching teacher profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    // Update user and teacher profile in a transaction
    await prisma.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: validatedData.name,
          email: validatedData.email,
        },
      });

      // Update teacher profile - explicitly handle empty strings as null
      await tx.teacherProfile.update({
        where: { userId: session.user.id },
        data: {
          bio: validatedData.bio || null,
          timezone: validatedData.timezone,
          phoneNumber: validatedData.phoneNumber || null,
          venmoHandle: validatedData.venmoHandle || null,
          paypalEmail: validatedData.paypalEmail || null,
          zelleEmail: validatedData.zelleEmail || null,
        },
      });
    });

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating teacher profile:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}