import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
    await prisma.$transaction(async (tx) => {
      // Cancel any recurring slots
      await tx.recurringSlot.updateMany({
        where: {
          studentId: studentProfile.id,
          status: 'ACTIVE'
        },
        data: {
          status: 'CANCELLED'
        }
      })

      // Cancel any active slot subscriptions
      await tx.slotSubscription.updateMany({
        where: {
          studentId: studentProfile.id,
          status: 'ACTIVE'
        },
        data: {
          status: 'CANCELLED',
          endDate: new Date()
        }
      })

      // Cancel all future recurring lessons
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await tx.lesson.updateMany({
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
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cancelling all recurring lessons:', error)
    return NextResponse.json(
      { error: 'Failed to cancel recurring lessons' },
      { status: 500 }
    )
  }
}