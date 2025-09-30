import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog, dbLog } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      include: {
        teacher: {
          include: { user: true }
        }
      }
    });

    if (!recommendation) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    // Check if the teacher owns this recommendation
    if (recommendation.teacher.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ recommendation });

  } catch (error) {
    apiLog.error('Recommendation fetch error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { title, description, link, category, price, priority } = await request.json();

    if (!title || !description || !category || priority === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, category, and priority are required' 
      }, { status: 400 });
    }

    // Validate priority range
    if (priority < 1 || priority > 5) {
      return NextResponse.json({ 
        error: 'Priority must be between 1 and 5' 
      }, { status: 400 });
    }

    // Validate category
    const validCategories = ['GEAR', 'BOOKS', 'SOFTWARE', 'ONLINE_COURSES', 'APPS', 'OTHER'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category' 
      }, { status: 400 });
    }

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

    // Update recommendation
    const recommendation = await prisma.recommendation.update({
      where: { id },
      data: {
        title,
        description,
        link: link || null,
        category,
        price: price || null,
        priority,
      }
    });

    return NextResponse.json({ 
      success: true, 
      recommendation 
    });

  } catch (error) {
    apiLog.error('Recommendation update error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Delete recommendation
    await prisma.recommendation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    apiLog.error('Recommendation deletion error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}