"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar as CalendarIcon, 
  Clock,
  DollarSign,
  User
} from "lucide-react"
import { RecurringSlot, SlotSubscription, MonthlyBilling } from "@/types"
import { getDayName, formatSlotTime } from "@/lib/slot-helpers"

interface SlotWithDetails extends RecurringSlot {
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
  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`
  }

  const getRecentBilling = (slot: SlotWithDetails) => {
    const activeSubscription = slot.subscriptions.find(sub => sub.status === 'ACTIVE')
    if (!activeSubscription || activeSubscription.billingRecords.length === 0) return null
    return activeSubscription.billingRecords[0]
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
            You don't have a recurring weekly lesson slot yet.
          </p>
          <p className="text-sm text-blue-600">
            Contact your teacher to set up a regular weekly lesson time with {teacherName}.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Weekly Lesson Time</h2>
      </div>

      <div className="space-y-4">
        {/* Render recurring slots */}
        {recurringSlots.map((slot) => {
          const recentBilling = getRecentBilling(slot)
          
          return (
            <Card key={slot.id} className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <div className="space-y-4">
                {/* Main slot info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">
                      {getDayName(slot.dayOfWeek)}s
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatSlotTime(slot.startTime, slot.duration)}</span>
                  </div>
                </div>

                {/* Teacher and billing info */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{teacherName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {slot.duration} minute lessons
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {formatPrice(slot.monthlyRate)}/month
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Varies by calendar
                    </div>
                  </div>
                </div>

                {/* Recent billing info */}
                {recentBilling && (
                  <div className="pt-2 border-t border-primary/20">
                    <div className="text-xs text-muted-foreground">
                      Last billing: {recentBilling.month} • 
                      {recentBilling.actualLessons} of {recentBilling.expectedLessons} lessons • 
                      <span className={`ml-1 font-medium ${
                        recentBilling.status === 'PAID' ? 'text-green-600' : 
                        recentBilling.status === 'OVERDUE' ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        {recentBilling.status.toLowerCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
        
        {/* Render regular recurring lessons */}
        {recurringLessons.map((lesson) => {
          const lessonDate = new Date(lesson.date)
          const dayName = lessonDate.toLocaleDateString('en-US', { weekday: 'long' })
          const timeString = lessonDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
          
          return (
            <Card key={lesson.id} className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <div className="space-y-4">
                {/* Main lesson info */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-lg">
                        {dayName}s
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{timeString} ({lesson.duration} min)</span>
                    </div>
                  </div>
                  
                </div>

                {/* Teacher info */}
                <div className="pt-2 border-t border-primary/20">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{teacherName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Weekly recurring lesson time
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Quick tip */}
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        💡 <strong>Tip:</strong> Your weekly time slot is reserved every week. You can book additional lessons below for extra practice or makeup sessions.
      </div>
    </div>
  )
}