"use client"

import { useState } from "react"
import { BookingInterface } from "@/components/booking/BookingInterface"
import { CheckCircle } from "lucide-react"
import toast from "react-hot-toast"

interface BookingSectionProps {
  teacherId: string
  teacherName: string
  hasRecurringSlots: boolean
  studentTimezone?: string
}

export function BookingSection({ teacherId, teacherName, hasRecurringSlots, studentTimezone }: BookingSectionProps) {
  const [hasSelection, setHasSelection] = useState(false)
  const [selectedSlots, setSelectedSlots] = useState<any[]>([])
  const [currentBookingMode, setCurrentBookingMode] = useState<'single' | 'recurring'>('single')
  const [validationError, setValidationError] = useState("")

  const handleSelectionChange = (hasSelection: boolean, slots: any[], bookingMode: 'single' | 'recurring') => {
    setHasSelection(hasSelection)
    setSelectedSlots(slots)
    setCurrentBookingMode(bookingMode)
    // Clear validation error when selection changes
    if (hasSelection) {
      setValidationError("")
    }
  }

  const handleTopBooking = async () => {
    if (!hasSelection || selectedSlots.length === 0) {
      setValidationError("Please select a time slot first")
      return
    }

    try {
      const duration = selectedSlots.length === 1 ? 30 : 60
      
      const response = await fetch('/api/lessons/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          date: selectedSlots[0].start,
          duration,
          timezone: studentTimezone || "America/Chicago",
          isRecurring: currentBookingMode === 'recurring',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book time')
      }

      // Show success toast
      if (currentBookingMode === 'recurring') {
        toast.success(`Successfully booked recurring weekly time slot for ${duration} minutes`)
      } else {
        toast.success(`Successfully booked ${duration}-minute lesson`)
      }

      // Refresh the page after a short delay to show the toast
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (error: any) {
      setValidationError(error.message || 'Failed to book time')
      toast.error(error.message || 'Failed to book time')
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-t pt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">
            {hasRecurringSlots ? 'Book Additional Time' : 'Book a Time'}
          </h2>
          <button 
            onClick={handleTopBooking}
            className="px-4 py-2 bg-primary hover:bg-turquoise-600 text-white rounded-md flex items-center gap-2 transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            Book Time
          </button>
        </div>
        
        {validationError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{validationError}</p>
          </div>
        )}
        
        <p className="text-muted-foreground mb-6">
          {hasRecurringSlots 
            ? 'Schedule additional time outside your regular weekly slot'
            : 'Reserve your time with your teacher'}
        </p>
        
        <BookingInterface
          teacherId={teacherId}
          teacherName={teacherName}
          studentTimezone={studentTimezone}
          onSelectionChange={handleSelectionChange}
        />
      </div>
    </div>
  )
}