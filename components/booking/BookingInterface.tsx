"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AvailabilityCalendar } from "@/components/scheduling/AvailabilityCalendar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"

interface TimeSlot {
  start: Date
  end: Date
  duration: 30
  price: number
  available: boolean
}

interface BookingInterfaceProps {
  teacherId: string
  teacherName: string
  studentTimezone?: string
}

export function BookingInterface({
  teacherId,
  teacherName,
  studentTimezone = "America/New_York"
}: BookingInterfaceProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string>("")
  const [error, setError] = useState<string>("")
  const router = useRouter()

  const handleBookSlot = async (slots: TimeSlot[], duration: 30 | 60) => {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/lessons/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          date: slots[0].start, // Use the first slot's start time
          duration,
          timezone: studentTimezone,
          isRecurring: false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book lesson')
      }

      setSuccess(data.message || 'Lesson booked successfully!')
      
      // Redirect to lessons page after a short delay
      setTimeout(() => {
        router.push('/lessons')
      }, 2000)

    } catch (error: any) {
      setError(error.message || 'Failed to book lesson')
    } finally {
      setLoading(false)
    }
  }

  const handleBookRecurring = async (slots: TimeSlot[], duration: 30 | 60, weeks: number) => {
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/lessons/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          date: slots[0].start, // Use the first slot's start time
          duration,
          timezone: studentTimezone,
          isRecurring: true,
          recurringWeeks: weeks,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book recurring lessons')
      }

      setSuccess(data.message || `Successfully booked ${weeks} recurring lessons!`)
      
      // Redirect to lessons page after a short delay
      setTimeout(() => {
        router.push('/lessons')
      }, 3000)

    } catch (error: any) {
      setError(error.message || 'Failed to book recurring lessons')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Availability Calendar */}
      <AvailabilityCalendar
        teacherId={teacherId}
        studentTimezone={studentTimezone}
        onBookSlot={handleBookSlot}
        onBookRecurring={handleBookRecurring}
        loading={loading}
      />
    </div>
  )
}