import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-responses';

async function handlePOST(request: NextRequest) {
  try {
    // Student self-booking has been disabled - only teachers can book for students
    return NextResponse.json({
      error: 'Student booking disabled',
      message: 'Students can no longer book lessons directly. Please contact your teacher to schedule lessons.'
    }, { status: 403 });

  } catch (error: any) {
    return handleApiError(error);
  }
}

// Export handler directly (rate limiting temporarily disabled for Next.js 15 compatibility)
export const POST = handlePOST;