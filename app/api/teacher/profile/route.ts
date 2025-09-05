import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog, dbLog, emailLog } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teachers only.' }, { status: 403 });
    }

    // Get teacher profile with payment methods
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        venmoHandle: true,
        paypalEmail: true,
        zelleEmail: true,
        hourlyRate: true,
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      paymentMethods: {
        venmoHandle: teacherProfile.venmoHandle,
        paypalEmail: teacherProfile.paypalEmail,
        zelleEmail: teacherProfile.zelleEmail,
      },
      profile: {
        name: teacherProfile.user.name,
        email: teacherProfile.user.email,
        hourlyRate: teacherProfile.hourlyRate,
      }
    });
  } catch (error) {
    apiLog.error('Error fetching teacher profile:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}