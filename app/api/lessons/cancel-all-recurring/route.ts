import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Cancel all recurring - Session:', session?.user?.email, session?.user?.role)
    
    if (!session || session.user.role !== 'STUDENT') {
      console.error('Unauthorized access attempt:', session?.user?.email, session?.user?.role)
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in as a student' },
        { status: 401 }
      )
    }

    // Get the student profile
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!studentProfile) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      )
    }

    // Cancel all recurring slots for this student
    const result = await prisma.$transaction(async (tx) => {
      // Cancel any recurring slots
      const slotsResult = await tx.recurringSlot.updateMany({
        where: {
          studentId: studentProfile.id,
          status: 'ACTIVE'
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      })
      console.log('Cancelled recurring slots:', slotsResult.count)

      // Cancel any active slot subscriptions
      const currentMonth = new Date().toISOString().slice(0, 7) // Format: "2025-01"
      const subscriptionsResult = await tx.slotSubscription.updateMany({
        where: {
          studentId: studentProfile.id,
          status: 'ACTIVE'
        },
        data: {
          status: 'CANCELLED',
          endMonth: currentMonth
        }
      })
      console.log('Cancelled slot subscriptions:', subscriptionsResult.count)

      // Cancel all future recurring lessons
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const lessonsResult = await tx.lesson.updateMany({
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
      console.log('Cancelled future recurring lessons:', lessonsResult.count)
      
      return {
        slots: slotsResult.count,
        subscriptions: subscriptionsResult.count,
        lessons: lessonsResult.count
      }
    })
    
    console.log('Transaction completed successfully:', result)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling all recurring lessons:', error)
    return NextResponse.json(
      { error: 'Failed to cancel recurring lessons' },
      { status: 500 }
    )
  }
}