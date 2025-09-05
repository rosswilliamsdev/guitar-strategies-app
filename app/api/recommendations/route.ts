/**
 * @fileoverview API routes for teacher recommendations management.
 * 
 * Handles CRUD operations for teacher recommendations including:
 * - POST: Create new recommendations (teachers only)
 * - GET: Retrieve teacher's recommendations with sorting
 * 
 * Security:
 * - Session-based authentication required
 * - Only teachers can create and manage recommendations
 * - Validation for required fields and data integrity
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog, dbLog } from '@/lib/logger';

/**
 * POST /api/recommendations
 * 
 * Creates a new recommendation. Only accessible to teachers.
 * 
 * Request Body:
 * - title: Recommendation title (required)
 * - description: Detailed description (required)
 * - link: Optional URL link to the recommendation
 * - category: Category enum (GEAR, BOOKS, SOFTWARE, ONLINE_COURSES, APPS, OTHER)
 * - price: Optional price information as string
 * - priority: Priority level 1-5 (required, 5 being highest)
 * 
 * Validation:
 * - Validates required fields
 * - Ensures priority is within 1-5 range
 * - Validates category against allowed values
 * 
 * @param request - Next.js request object with recommendation data
 * @returns JSON response with created recommendation or error
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile to associate with recommendation
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const { title, description, link, category, price, priority } = await request.json();

    // Validate required fields
    if (!title || !description || !category || priority === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, category, and priority are required' 
      }, { status: 400 });
    }

    // Validate priority range (1-5 scale)
    if (priority < 1 || priority > 5) {
      return NextResponse.json({ 
        error: 'Priority must be between 1 and 5' 
      }, { status: 400 });
    }

    // Validate category against allowed enum values
    const validCategories = ['GEAR', 'BOOKS', 'SOFTWARE', 'ONLINE_COURSES', 'APPS', 'OTHER'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category' 
      }, { status: 400 });
    }

    // Create recommendation with validated data
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
    apiLog.error('Recommendation creation error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * GET /api/recommendations
 * 
 * Retrieves all recommendations for the authenticated teacher.
 * 
 * Authorization:
 * - Only teachers can access this endpoint
 * - Teachers can only view their own recommendations
 * 
 * Sorting:
 * - Primary: By priority (highest first)
 * - Secondary: By creation date (newest first)
 * 
 * @param request - Next.js request object
 * @returns JSON response with recommendations array or error
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile to find associated recommendations
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    // Get all recommendations for this teacher, sorted by priority and date
    const recommendations = await prisma.recommendation.findMany({
      where: {
        teacherId: teacherProfile.id
      },
      orderBy: [
        { priority: 'desc' },    // Highest priority first
        { createdAt: 'desc' }    // Newest first for same priority
      ]
    });

    return NextResponse.json({ recommendations });

  } catch (error) {
    apiLog.error('Recommendations fetch error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}