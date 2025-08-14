"use client"

import { useState, useEffect } from "react"
import { 
  format, 
  addDays, 
  addWeeks, 
  startOfWeek, 
  isSameDay, 
  isToday, 
  isBefore
} from "date-fns"
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/design"

interface TimeSlot {
  start: Date
  end: Date
  duration: 30
  price: number
  available: boolean
}

interface AvailabilityCalendarProps {
  teacherId: string
  studentTimezone?: string
  onBookSlot?: (slots: TimeSlot[], duration: 30 | 60) => Promise<void>
  onBookRecurring?: (slots: TimeSlot[], duration: 30 | 60, weeks: number) => Promise<void>
  loading?: boolean
  readonly?: boolean
}

export function AvailabilityCalendar({
  teacherId,
  studentTimezone = "America/New_York",
  onBookSlot,
  onBookRecurring,
  loading = false,
  readonly = false
}: AvailabilityCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()))
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([])
  const [recurringWeeks, setRecurringWeeks] = useState(4)
  const [bookingMode, setBookingMode] = useState<'single' | 'recurring'>('single')

  // Load available slots when week changes
  useEffect(() => {
    loadAvailableSlots()
  }, [currentWeek, teacherId])

  const loadAvailableSlots = async () => {
    setSlotsLoading(true)
    setError("")
    
    try {
      const startDate = currentWeek
      const endDate = addDays(currentWeek, 6) // 7 days in the week
      
      const response = await fetch(
        `/api/availability/${teacherId}?` +
        `startDate=${startDate.toISOString()}&` +
        `endDate=${endDate.toISOString()}&` +
        `timezone=${studentTimezone}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load available slots')
      }

      const data = await response.json()
      
      // Parse dates from ISO strings
      const parsedSlots = data.slots.map((slot: any) => ({
        ...slot,
        start: new Date(slot.start),
        end: new Date(slot.end)
      }))
      
      setSlots(parsedSlots)
    } catch (error: any) {
      setError(error.message || 'Failed to load available slots')
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  const handleBookSlots = async () => {
    if (!onBookSlot || readonly || selectedSlots.length === 0) return
    
    try {
      const duration = selectedSlots.length === 1 ? 30 : 60
      
      if (bookingMode === 'single') {
        await onBookSlot(selectedSlots, duration)
      } else if (onBookRecurring) {
        await onBookRecurring(selectedSlots, duration, recurringWeeks)
      }
      
      // Reload slots after booking
      await loadAvailableSlots()
      setSelectedSlots([])
    } catch (error: any) {
      setError(error.message || 'Failed to book time')
    }
  }

  const handleSlotClick = (slot: TimeSlot) => {
    if (readonly || !slot.available) return

    const isSelected = selectedSlots.some(s => s.start.getTime() === slot.start.getTime())
    
    if (isSelected) {
      // Deselect slot
      setSelectedSlots(prev => prev.filter(s => s.start.getTime() !== slot.start.getTime()))
    } else {
      // Select slot
      if (selectedSlots.length === 0) {
        // First slot selection
        setSelectedSlots([slot])
      } else if (selectedSlots.length === 1) {
        // Second slot selection - must be consecutive
        const firstSlot = selectedSlots[0]
        const timeDiff = Math.abs(slot.start.getTime() - firstSlot.start.getTime())
        const thirtyMinutes = 30 * 60 * 1000
        
        if (timeDiff === thirtyMinutes) {
          // Consecutive slot, add it
          const sortedSlots = [firstSlot, slot].sort((a, b) => a.start.getTime() - b.start.getTime())
          setSelectedSlots(sortedSlots)
        } else {
          // Non-consecutive, replace with new selection
          setSelectedSlots([slot])
        }
      } else {
        // Already have 2 slots, replace with new selection
        setSelectedSlots([slot])
      }
    }
  }

  const goToPreviousWeek = () => {
    const newWeek = addWeeks(currentWeek, -1)
    // Don't allow going to past weeks
    if (!isBefore(newWeek, startOfWeek(new Date()))) {
      setCurrentWeek(newWeek)
    }
  }

  const goToNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1)
    // Limit to 3 weeks in advance
    const maxWeek = addWeeks(new Date(), 3)
    if (!isBefore(maxWeek, newWeek)) {
      setCurrentWeek(newWeek)
    }
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(startOfWeek(new Date()))
  }

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`
  }

  const getDaysOfWeek = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeek, i))
    }
    return days
  }

  const getSlotsForDay = (date: Date) => {
    return slots
      .filter(slot => isSameDay(slot.start, date) && slot.available && slot.duration === 30)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }

  const isCurrentWeek = isSameDay(currentWeek, startOfWeek(new Date()))
  const canGoBack = !isSameDay(currentWeek, startOfWeek(new Date()))
  const canGoForward = isBefore(currentWeek, addWeeks(new Date(), 2))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Select one 30-minute slot, or two consecutive slots for a 60-minute session
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {!readonly && (
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setBookingMode('single')}
                className={cn(
                  "px-3 py-1 text-sm rounded transition-colors",
                  bookingMode === 'single' 
                    ? "bg-background shadow-sm" 
                    : "hover:bg-background/50"
                )}
              >
                Single Session
              </button>
              <button
                onClick={() => setBookingMode('recurring')}
                className={cn(
                  "px-3 py-1 text-sm rounded transition-colors",
                  bookingMode === 'recurring' 
                    ? "bg-background shadow-sm" 
                    : "hover:bg-background/50"
                )}
              >
                Weekly Series
              </button>
            </div>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            onClick={loadAvailableSlots}
            disabled={slotsLoading}
          >
            <RefreshCw className={cn("h-4 w-4", slotsLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={goToPreviousWeek}
          disabled={!canGoBack || slotsLoading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous Week
        </Button>

        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
          </span>
          {!isCurrentWeek && (
            <Button
              variant="secondary"
              size="sm"
              onClick={goToCurrentWeek}
            >
              Today
            </Button>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={goToNextWeek}
          disabled={!canGoForward || slotsLoading}
        >
          Next Week
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Recurring Options */}
      {bookingMode === 'recurring' && !readonly && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Weekly Recurring Lessons</h3>
              <p className="text-sm text-blue-700">
                Book the same time slot for multiple weeks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-blue-700">Weeks:</label>
              <select
                value={recurringWeeks}
                onChange={(e) => setRecurringWeeks(Number(e.target.value))}
                className="px-2 py-1 rounded border border-blue-300 bg-white text-sm"
              >
                {[2, 3, 4, 6, 8, 12].map(weeks => (
                  <option key={weeks} value={weeks}>{weeks} weeks</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {getDaysOfWeek().map((date, index) => {
          const daySlots = getSlotsForDay(date)
          const isPast = isBefore(date, new Date()) && !isToday(date)
          
          return (
            <div
              key={index}
              className={cn(
                "space-y-2",
                isPast && "opacity-50"
              )}
            >
              {/* Day Header */}
              <div className="text-center p-2 border rounded-lg bg-muted/50">
                <div className="text-sm font-medium">
                  {format(date, 'EEE')}
                </div>
                <div className={cn(
                  "text-lg font-semibold",
                  isToday(date) && "text-primary"
                )}>
                  {format(date, 'd')}
                </div>
                {isToday(date) && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    Today
                  </Badge>
                )}
              </div>

              {/* Time Slots */}
              <div className="space-y-1">
                {slotsLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                    <div className="text-xs">Loading...</div>
                  </div>
                ) : daySlots.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="text-xs">No slots available</div>
                  </div>
                ) : (
                  daySlots.map((slot, slotIndex) => {
                    const isSelected = selectedSlots.some(s => s.start.getTime() === slot.start.getTime())
                    return (
                      <button
                        key={slotIndex}
                        onClick={() => handleSlotClick(slot)}
                        disabled={isPast || loading || readonly}
                        className={cn(
                          "w-full p-2 text-left border rounded transition-colors",
                          "hover:bg-primary/5 hover:border-primary",
                          isSelected && "bg-primary/10 border-primary",
                          isPast && "cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {format(slot.start, 'h:mm a')}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              30min
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Booking Confirmation */}
      {selectedSlots.length > 0 && !readonly && (
        <Card className="p-4 border-primary bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">
                {bookingMode === 'single' ? 'Confirm Booking' : `Confirm ${recurringWeeks}-Week Series`}
              </h3>
              <div className="text-sm text-muted-foreground">
                {selectedSlots.length === 1 ? (
                  <>
                    {format(selectedSlots[0].start, 'EEEE, MMMM d')} at {format(selectedSlots[0].start, 'h:mm a')} 
                    (30 minutes)
                  </>
                ) : (
                  <>
                    {format(selectedSlots[0].start, 'EEEE, MMMM d')} from {format(selectedSlots[0].start, 'h:mm a')} to {format(selectedSlots[1].end, 'h:mm a')}
                    (60 minutes)
                  </>
                )}
                {bookingMode === 'recurring' && (
                  <span> × {recurringWeeks} weeks</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSlots([])}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBookSlots}
                disabled={loading}
                className="bg-primary hover:bg-turquoise-600"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {loading ? 'Booking...' : 'Book Time'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border rounded bg-background"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border rounded bg-primary/10 border-primary"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border rounded bg-muted"></div>
          <span>Unavailable</span>
        </div>
      </div>
    </div>
  )
}