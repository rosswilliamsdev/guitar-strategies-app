"use client"

import { BookingInterface } from "@/components/booking/BookingInterface"

interface BookingSectionProps {
  teacherId: string
  teacherName: string
  hasRecurringSlots: boolean
  studentTimezone?: string
}

export function BookingSection({ teacherId, teacherName, hasRecurringSlots, studentTimezone }: BookingSectionProps) {

  return (
    <div className="space-y-4">
      <div className="border-t pt-8">
        <div className="mb-2">
          <h2 className="text-xl font-semibold">
            {hasRecurringSlots ? 'Book Additional Time' : 'Book a Time'}
          </h2>
        </div>
        
        <p className="text-muted-foreground mb-6">
          {hasRecurringSlots 
            ? 'Schedule additional time outside your regular weekly slot'
            : 'Reserve your time with your teacher'}
        </p>
        
        <BookingInterface
          teacherId={teacherId}
          teacherName={teacherName}
          studentTimezone={studentTimezone}
        />
      </div>
    </div>
  )
}