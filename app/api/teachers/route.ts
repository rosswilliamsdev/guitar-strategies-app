import { NextResponse } from 'next/server';
import { prisma, dbQuery } from '@/lib/db-with-retry';
import { apiLog } from '@/lib/logger';

export async function GET() {
  try {
    const teachers = await dbQuery(() =>
      prisma.teacherProfile.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          user: {
            name: 'asc',
          },
        },
      })
    );

    apiLog.info('Fetched teachers successfully', { count: teachers.length });
    return NextResponse.json({ teachers });
  } catch (error) {
    apiLog.error('Failed to fetch teachers', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    console.error('Teachers API Error:', error);

    return NextResponse.json(
      {
        message: 'Failed to fetch teachers',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}