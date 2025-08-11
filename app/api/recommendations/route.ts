import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
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

    // Create recommendation
    const recommendation = await prisma.recommendation.create({
      data: {
        title,
        description,
        link: link || null,
        category,
        price: price || null,
        priority,
        teacherId: teacherProfile.id,
      }
    });

    return NextResponse.json({ 
      success: true, 
      recommendation 
    }, { status: 201 });

  } catch (error) {
    console.error('Recommendation creation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

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

    // Get recommendations
    const recommendations = await prisma.recommendation.findMany({
      where: {
        teacherId: teacherProfile.id
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ recommendations });

  } catch (error) {
    console.error('Recommendations fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}