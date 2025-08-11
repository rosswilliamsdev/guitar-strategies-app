import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTeacherEarningsHistory } from '@/lib/payments';

// GET /api/payments/history - Get teacher's earnings history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const monthsBack = parseInt(searchParams.get('months') || '6');

    // Get earnings history
    const history = await getTeacherEarningsHistory(teacherProfile.id, monthsBack);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching earnings history:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch earnings history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}