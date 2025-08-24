import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    console.log('Starting cancel all recurring lessons request')
    
    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection successful')
    } catch (dbError) {
      console.error('Database connection failed:', dbError)
      throw new Error('Database connection failed')
    }
    
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'STUDENT') {
      console.log('Unauthorized request - not a student')
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in as a student' },
        { status: 401 }
      )
    }

    console.log('Student authenticated:', session.user.email)

    // Get the student profile
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!studentProfile) {
      console.log('Student profile not found for user:', session.user.id)
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    console.log('Found student profile:', studentProfile.id)

    // First, check what active recurring data exists
    const existingSlots = await prisma.recurringSlot.findMany({
      where: {
        studentId: studentProfile.id,
        status: 'ACTIVE'
      }
    })
    console.log('Found active recurring slots:', existingSlots.length)

    // Also check for any cancelled slots that might conflict
    const cancelledSlots = await prisma.recurringSlot.findMany({
      where: {
        studentId: studentProfile.id,
        status: 'CANCELLED'
      }
    })
    console.log('Found cancelled recurring slots:', cancelledSlots.length)

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
    console.log('Found future recurring lessons:', existingLessons.length)

    // Check if there's anything to cancel
    if (existingSlots.length === 0 && existingLessons.length === 0) {
      console.log('No active recurring data found to cancel')
      return NextResponse.json({ 
        success: true, 
        message: 'No active recurring lessons to cancel',
        slotsDeleted: 0,
        lessonsCancelled: 0
      })
    }

    // Cancel all recurring slots for this student
    await prisma.$transaction(async (tx) => {
      console.log('Starting transaction to cancel recurring data')

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
        console.log('Deleted recurring slots:', slotsUpdated.count)
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
        console.log('Cancelled future lessons:', lessonsUpdated.count)
      }

      // Return counts for confirmation
      return { slotsDeleted: slotsUpdated.count, lessonsCancelled: lessonsUpdated.count }
    })

    console.log('Successfully cancelled all recurring data')
    return NextResponse.json({ 
      success: true,
      message: 'All recurring lessons have been cancelled successfully' 
    })
  } catch (error) {
    console.error('Error cancelling all recurring lessons:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Failed to cancel recurring lessons',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}