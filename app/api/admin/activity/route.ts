import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getAllActivity } from '@/lib/dashboard-stats';
import { apiLog, emailLog, invoiceLog } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check for admin access (ADMIN role or TEACHER with isAdmin flag)
    const hasAdminAccess = session?.user && (
      session.user.role === 'ADMIN' ||
      (session.user.role === 'TEACHER' && session.user.teacherProfile?.isAdmin === true)
    );

    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      dateRange: searchParams.get('dateRange') as 'today' | 'week' | 'month' | 'all' || 'month',
      activityType: searchParams.get('activityType') as 'user_created' | 'lesson_completed' | 'teacher_joined' | 'system_event' | 'invoice_generated' | 'email_sent' | 'all' || 'all',
      userRole: searchParams.get('userRole') as 'STUDENT' | 'TEACHER' | 'ADMIN' | 'all' || 'all',
      userId: searchParams.get('userId') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0')
    };

    const result = await getAllActivity(filters);

    return NextResponse.json(result);
  } catch (error) {
    apiLog.error('Error fetching activity:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}