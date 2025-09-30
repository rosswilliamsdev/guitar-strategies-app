import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAuthErrorResponse } from '@/lib/api-responses';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return createAuthErrorResponse();
    }

    // Student slot booking has been disabled - only teachers can book for students
    return NextResponse.json({
      error: 'Student booking disabled',
      message: 'Students can no longer book slots directly. Please contact your teacher to schedule lessons.'
    }, { status: 403 });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}