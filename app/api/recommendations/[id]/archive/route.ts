import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if recommendation exists and belongs to teacher
    const existingRecommendation = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        teacher: true
      }
    });

    if (!existingRecommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    if (existingRecommendation.teacher.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Toggle archive status
    const recommendation = await prisma.recommendation.update({
      where: { id },
      data: {
        isArchived: !existingRecommendation.isArchived
      }
    });

    return NextResponse.json({ 
      success: true, 
      recommendation,
      message: recommendation.isArchived ? 'Recommendation archived' : 'Recommendation restored'
    });

  } catch (error) {
    console.error('Recommendation archive error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}