import { NextResponse } from 'next/server';
import { prisma, dbQuery } from '@/lib/db-with-retry';
import { apiLog } from '@/lib/logger';

export async function GET() {
  try {
    const organizations = await dbQuery(() =>
      prisma.organization.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
        },
        orderBy: {
          name: 'asc',
        },
      })
    );

    apiLog.info('Fetched organizations successfully', { count: organizations.length });
    return NextResponse.json({ organizations });
  } catch (error) {
    apiLog.error('Failed to fetch organizations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        message: 'Failed to fetch organizations',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}