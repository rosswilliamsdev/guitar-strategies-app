"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AvailabilityCalendar } from "@/components/scheduling/AvailabilityCalendar"
import { BookingSuccessModal } from "@/components/booking/BookingSuccessModal"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import toast from "react-hot-toast"

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
  onSelectionChange?: (hasSelection: boolean, selectedSlots: any[], bookingMode: 'single' | 'recurring') => void
}

export function BookingInterface({
  teacherId,
  teacherName,
  studentTimezone = "America/New_York",
  onSelectionChange
}: BookingInterfaceProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)
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
          timezone: studentTimezone || "America/Chicago",
          isRecurring: false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book lesson')
      }

      // Store the booking result and show the success modal
      setBookingResult({
        type: 'single',
        lesson: data.lesson,
        teacherName
      })
      setShowSuccessModal(true)
      setSuccess(data.message || 'Lesson booked successfully!')

    } catch (error: any) {
      setError(error.message || 'Failed to book lesson')
      toast.error(error.message || 'Failed to book lesson')
    } finally {
      setLoading(false)
    }
  }

  const handleBookRecurring = async (slots: TimeSlot[], duration: 30 | 60) => {
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
          timezone: studentTimezone || "America/Chicago",
          isRecurring: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book weekly lesson time')
      }

      // Store the booking result and show the success modal
      setBookingResult({
        type: 'recurring',
        recurringSlot: data.slot,
        lessons: data.lessons,
        teacherName
      })
      setShowSuccessModal(true)
      setSuccess(data.message || 'Successfully booked your weekly lesson time!')

    } catch (error: any) {
      setError(error.message || 'Failed to book weekly lesson time')
      toast.error(error.message || 'Failed to book weekly lesson time')
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
        onSelectionChange={onSelectionChange}
      />

      {/* Success Modal */}
      {bookingResult && (
        <BookingSuccessModal
          open={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            setBookingResult(null)
          }}
          bookingType={bookingResult.type}
          teacherName={bookingResult.teacherName}
          lesson={bookingResult.lesson}
          recurringSlot={bookingResult.recurringSlot}
          lessons={bookingResult.lessons}
        />
      )}
    </div>
  )
}