import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { apiLog, dbLog } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    apiLog.info('Starting cancel all recurring lessons request', {
      endpoint: '/api/lessons/cancel-all-recurring',
      method: 'POST'
    })
    
    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbLog.debug('Database connection test successful')
    } catch (dbError) {
      dbLog.error('Database connection failed', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
        stack: dbError instanceof Error ? dbError.stack : undefined
      })
      throw new Error('Database connection failed')
    }
    
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'STUDENT') {
      apiLog.warn('Unauthorized request - not a student', {
        role: session?.user?.role || 'none',
        endpoint: '/api/lessons/cancel-all-recurring'
      })
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in as a student' },
        { status: 401 }
      )
    }

    apiLog.info('Student authenticated for recurring cancellation', {
      email: session.user.email,
      userId: session.user.id
    })

    // For FAMILY accounts, use activeStudentProfileId
    // For INDIVIDUAL accounts, find by userId
    const studentProfile = session.user.activeStudentProfileId
      ? await prisma.studentProfile.findUnique({
          where: { id: session.user.activeStudentProfileId },
        })
      : await prisma.studentProfile.findFirst({
          where: { userId: session.user.id, isActive: true },
        });

    if (!studentProfile) {
      apiLog.error('Student profile not found', {
        userId: session.user.id,
        email: session.user.email
      })
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    apiLog.debug('Student profile found', {
      studentId: studentProfile.id,
      teacherId: studentProfile.teacherId
    })

    // First, check what active recurring data exists
    const existingSlots = await prisma.recurringSlot.findMany({
      where: {
        studentId: studentProfile.id,
        status: 'ACTIVE'
      }
    })
    dbLog.info('Found active recurring slots', {
      count: existingSlots.length,
      studentId: studentProfile.id
    })

    // Also check for any cancelled slots that might conflict
    const cancelledSlots = await prisma.recurringSlot.findMany({
      where: {
        studentId: studentProfile.id,
        status: 'CANCELLED'
      }
    })
    dbLog.debug('Found cancelled recurring slots', {
      count: cancelledSlots.length,
      studentId: studentProfile.id
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const existingLessons = await prisma.lesson.findMany({
      where: {
        studentId: studentProfile.id,
        isRecurring: true,
        status: 'SCHEDULED',
        date: { gte: today }
      }
    })
    dbLog.info('Found future recurring lessons', {
      count: existingLessons.length,
      studentId: studentProfile.id,
      fromDate: today.toISOString()
    })

    // Check if there's anything to cancel
    if (existingSlots.length === 0 && existingLessons.length === 0) {
      apiLog.info('No active recurring data found to cancel', {
        studentId: studentProfile.id,
        slotsFound: 0,
        lessonsFound: 0
      })
      return NextResponse.json({ 
        success: true, 
        message: 'No active recurring lessons to cancel',
        slotsDeleted: 0,
        lessonsCancelled: 0
      })
    }

    // Cancel all recurring slots for this student
    await prisma.$transaction(async (tx) => {
      dbLog.info('Starting transaction to cancel recurring data', {
        studentId: studentProfile.id,
        slotsToDelete: existingSlots.length,
        lessonsToCancel: existingLessons.length
      })

      let slotsUpdated = { count: 0 }
      let lessonsUpdated = { count: 0 }

      // Delete any recurring slots (only if they exist)
      if (existingSlots.length > 0) {
        slotsUpdated = await tx.recurringSlot.deleteMany({
          where: {
            studentId: studentProfile.id,
            status: 'ACTIVE'
          }
        })
        dbLog.info('Deleted recurring slots', {
          count: slotsUpdated.count,
          studentId: studentProfile.id
        })
      }

      // Cancel all future recurring lessons (only if they exist)
      if (existingLessons.length > 0) {
        lessonsUpdated = await tx.lesson.updateMany({
          where: {
            studentId: studentProfile.id,
            isRecurring: true,
            status: 'SCHEDULED',
            date: { gte: today }
          },
          data: {
            status: 'CANCELLED'
          }
        })
        dbLog.info('Cancelled future lessons', {
          count: lessonsUpdated.count,
          studentId: studentProfile.id
        })
      }

      // Return counts for confirmation
      return { slotsDeleted: slotsUpdated.count, lessonsCancelled: lessonsUpdated.count }
    })

    apiLog.info('Successfully cancelled all recurring data', {
      studentId: studentProfile.id,
      email: session.user.email
    })
    return NextResponse.json({ 
      success: true,
      message: 'All recurring lessons have been cancelled successfully' 
    })
  } catch (error) {
    apiLog.error('Error cancelling all recurring lessons', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      endpoint: '/api/lessons/cancel-all-recurring'
    })
    return NextResponse.json(
      { 
        error: 'Failed to cancel recurring lessons',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}