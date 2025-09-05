/**
 * @fileoverview Teacher profile validation API endpoint.
 * 
 * Validates teacher profile completeness and readiness for accepting bookings.
 * Returns detailed validation information including missing fields, warnings, and setup steps.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { validateTeacherProfile } from '@/lib/teacher-validation';
import { apiLog, dbLog } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only allow teachers to validate their own profile, or admins to validate any
    if (!session || (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teacherId } = params;

    // If teacher, verify they're validating their own profile
    if (session.user.role === 'TEACHER' && session.user.teacherProfile?.id !== teacherId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate the teacher profile (function will fetch the profile internally)
    const validation = await validateTeacherProfile(teacherId);

    return NextResponse.json(validation);

  } catch (error) {
    apiLog.error('Error validating teacher profile:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: 'Failed to validate teacher profile' },
      { status: 500 }
    );
  }
}