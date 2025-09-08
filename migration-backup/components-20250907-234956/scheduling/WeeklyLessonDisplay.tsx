"use client";

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar as CalendarIcon, 
  Clock,
  DollarSign,
  User,
  X,
  AlertCircle
} from "lucide-react"
import { RecurringSlot, SlotSubscription, MonthlyBilling } from "@/types"
import { getDayName, formatSlotTime } from "@/lib/slot-helpers"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { log, schedulerLog } from '@/lib/logger';

interface SlotWithDetails {
  id: string;
  dayOfWeek: number;
  startTime: string;
  duration: number;
  perLessonPrice: number;
  teacher: {
    user: { name: string }
  }
  subscriptions: Array<SlotSubscription & {
    billingRecords: MonthlyBilling[]
  }>
}

interface WeeklyLessonDisplayProps {
  recurringSlots: SlotWithDetails[]
  teacherName: string
  recurringLessons?: Array<{
    id: string
    date: Date
    duration: number
    isRecurring: boolean
  }>
}

export function WeeklyLessonDisplay({ 
  recurringSlots, 
  teacherName,
  recurringLessons = []
}: WeeklyLessonDisplayProps) {
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`
  }

  // Calculate how many times this day occurs in the current month
  const calculateCurrentMonthOccurrences = (dayOfWeek: number) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 // getMonth() returns 0-11
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0)
    let count = 0
    
    for (let date = new Date(startOfMonth); date <= endOfMonth; date.setDate(date.getDate() + 1)) {
      if (date.getDay() === dayOfWeek) {
        count++
      }
    }
    
    return count
  }

  const getRecentBilling = (slot: SlotWithDetails) => {
    const activeSubscription = slot.subscriptions.find(sub => sub.status === 'ACTIVE')
    if (!activeSubscription || activeSubscription.billingRecords.length === 0) return null
    return activeSubscription.billingRecords[0]
  }

  const handleCancelRecurring = async () => {
    setShowCancelDialog(false)
    setIsCancelling(true)
    try {
      const response = await fetch('/api/lessons/cancel-all-recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        log.error('Cancel recurring lessons error response:', {
        error: errorData instanceof Error ? errorData.message : String(errorData),
        stack: errorData instanceof Error ? errorData.stack : undefined
      });
        throw new Error(errorData.error || 'Failed to cancel recurring lessons')
      }

      // Refresh the page to show updated data
      router.refresh()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel recurring lessons'
      log.error('Error cancelling recurring lessons:', {
        error: errorMessage instanceof Error ? errorMessage.message : String(errorMessage),
        stack: errorMessage instanceof Error ? errorMessage.stack : undefined
      });
      setErrorMessage(errorMessage || 'Failed to cancel recurring lessons. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  // Check if there are any recurring lessons (either slots or regular recurring lessons)
  const hasRecurringTime = recurringSlots.length > 0 || recurringLessons.length > 0

  if (!hasRecurringTime) {
    return (
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-blue-900">
            Your Weekly Lesson Time
          </h2>
          <p className="text-blue-700">
            You don&apos;t have a recurring weekly lesson slot yet.
          </p>
          <p className="text-sm text-blue-600">
            Contact your teacher to set up a regular weekly lesson time with {teacherName}.
          </p>
        </div>
      </Card>
    )
  }

  // Use the first recurring slot if available, otherwise use first recurring lesson
  const activeSlot = recurringSlots[0]
  const activeLesson = recurringLessons[0]
  
  let displayInfo = null
  
  if (activeSlot) {
    const recentBilling = getRecentBilling(activeSlot)
    const currentMonthOccurrences = calculateCurrentMonthOccurrences(activeSlot.dayOfWeek)
    // Calculate accurate monthly rate for current month using stored per-lesson price
    const actualMonthlyRate = activeSlot.perLessonPrice * currentMonthOccurrences
    
    displayInfo = {
      dayName: getDayName(activeSlot.dayOfWeek),
      time: formatSlotTime(activeSlot.startTime, activeSlot.duration),
      duration: activeSlot.duration,
      monthlyRate: actualMonthlyRate,
      occurrences: currentMonthOccurrences,
      recentBilling
    }
  } else if (activeLesson) {
    const lessonDate = new Date(activeLesson.date)
    displayInfo = {
      dayName: lessonDate.toLocaleDateString('en-US', { weekday: 'long' }),
      time: lessonDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      duration: activeLesson.duration,
      monthlyRate: null,
      recentBilling: null
    }
  }

  if (!displayInfo) return null

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Weekly Lesson Time</h2>

        <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="space-y-4">
            {/* Main slot info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">
                  {displayInfo.dayName}s
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{displayInfo.time}</span>
                {displayInfo.duration && (
                  <span className="text-sm">({displayInfo.duration} min)</span>
                )}
              </div>
            </div>

            {/* Pricing and teacher info */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{teacherName}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {displayInfo.duration} minute lessons
                </div>
              </div>
              
              {displayInfo.monthlyRate && (
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {formatPrice(displayInfo.monthlyRate)}/month
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {displayInfo.occurrences} lessons this month
                  </div>
                </div>
              )}
            </div>

            {/* Recent billing info */}
            {displayInfo.recentBilling && (
              <div className="pt-2 border-t border-primary/20">
                <div className="text-xs text-muted-foreground">
                  Last billing: {displayInfo.recentBilling.month} • 
                  {displayInfo.recentBilling.actualLessons} of {displayInfo.recentBilling.expectedLessons} lessons • 
                  <span className={`ml-1 font-medium ${
                    displayInfo.recentBilling.status === 'PAID' ? 'text-green-600' : 
                    displayInfo.recentBilling.status === 'OVERDUE' ? 'text-red-600' : 
                    'text-blue-600'
                  }`}>
                    {displayInfo.recentBilling.status.toLowerCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Cancel button inside card */}
            <div className="pt-3 border-t border-primary/20">
              <Button
                onClick={() => setShowCancelDialog(true)}
                disabled={isCancelling}
                variant="secondary"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                size="sm"
              >
                {isCancelling ? (
                  "Cancelling..."
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel Weekly Time
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick tip */}
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 <strong>Tip:</strong> Your weekly time slot is reserved every week. You can book additional lessons below for extra practice or makeup sessions.
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Weekly Lesson Time</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your weekly lesson time? This will cancel all future recurring lessons.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowCancelDialog(false)}>
              Keep Lessons
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCancelRecurring}
            >
              Cancel Recurring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={!!errorMessage} onOpenChange={() => setErrorMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error
            </DialogTitle>
            <DialogDescription className="text-foreground">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorMessage(null)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}