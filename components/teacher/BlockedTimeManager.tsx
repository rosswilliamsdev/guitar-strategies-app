"use client";

import { useState } from "react"
import { Plus, Trash2, Calendar, Clock, Save, AlertTriangle } from "lucide-react"
import { format, addDays, startOfDay } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"
import { blockedTimeSchema } from "@/lib/validations"
import type { z } from "zod"

type BlockedTime = {
  id?: string
  startTime: Date
  endTime: Date
  reason?: string
  timezone: string
}

interface BlockedTimeManagerProps {
  blockedTimes?: BlockedTime[]
  onAdd?: (blockedTime: Omit<BlockedTime, "id">) => Promise<void>
  onRemove?: (id: string) => Promise<void>
  timezone: string
  loading?: boolean
  readonly?: boolean
}

export function BlockedTimeManager({
  blockedTimes = [],
  onAdd,
  onRemove,
  timezone,
  loading = false,
  readonly = false,
}: BlockedTimeManagerProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newBlockedTime, setNewBlockedTime] = useState({
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "17:00",
    reason: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!onAdd) return

    try {
      setErrors({})

      // Parse dates and times
      const startDateTime = new Date(`${newBlockedTime.startDate}T${newBlockedTime.startTime}:00`)
      const endDateTime = new Date(`${newBlockedTime.endDate}T${newBlockedTime.endTime}:00`)

      // Validate with schema
      const blockedTimeData = {
        startTime: startDateTime,
        endTime: endDateTime,
        reason: newBlockedTime.reason || undefined,
        timezone,
      }

      blockedTimeSchema.parse(blockedTimeData)

      setSaving(true)
      await onAdd(blockedTimeData)
      
      // Reset form
      setNewBlockedTime({
        startDate: "",
        startTime: "09:00",
        endDate: "",
        endTime: "17:00",
        reason: "",
      })
      setIsAdding(false)
    } catch (error: any) {
      if (error.errors) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          newErrors[err.path?.[0] || "general"] = err.message
        })
        setErrors(newErrors)
      } else {
        setErrors({ general: error.message || "Failed to add blocked time" })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (!onRemove) return
    
    try {
      setSaving(true)
      await onRemove(id)
    } catch (error: any) {
      setErrors({ general: error.message || "Failed to remove blocked time" })
    } finally {
      setSaving(false)
    }
  }

  const formatDateRange = (start: Date, end: Date) => {
    const startStr = format(start, "MMM d, yyyy 'at' h:mm a")
    const endStr = format(end, "MMM d, yyyy 'at' h:mm a")
    return `${startStr} - ${endStr}`
  }

  const isValidDateRange = () => {
    if (!newBlockedTime.startDate || !newBlockedTime.endDate) return false
    
    const startDateTime = new Date(`${newBlockedTime.startDate}T${newBlockedTime.startTime}:00`)
    const endDateTime = new Date(`${newBlockedTime.endDate}T${newBlockedTime.endTime}:00`)
    
    return endDateTime > startDateTime
  }

  const getReasonColor = (reason?: string) => {
    if (!reason) return "bg-neutral-100 text-neutral-700"
    
    const normalizedReason = reason.toLowerCase()
    if (normalizedReason.includes("vacation") || normalizedReason.includes("holiday")) {
      return "bg-blue-100 text-blue-700"
    }
    if (normalizedReason.includes("sick") || normalizedReason.includes("medical")) {
      return "bg-red-100 text-red-700"
    }
    if (normalizedReason.includes("personal") || normalizedReason.includes("family")) {
      return "bg-purple-100 text-purple-700"
    }
    return "bg-yellow-100 text-yellow-700"
  }

  // Sort blocked times by start date
  const sortedBlockedTimes = [...blockedTimes].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Blocked Time Periods</h3>
        {!readonly && (
          <Button
            onClick={() => setIsAdding(true)}
            disabled={isAdding || loading}
            className="bg-primary hover:bg-turquoise-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Block Time
          </Button>
        )}
      </div>

      {/* Add New Blocked Time Form */}
      {isAdding && !readonly && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Block New Time Period</h4>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsAdding(false)
                setErrors({})
              }}
            >
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date & Time</Label>
              <div className="flex gap-2">
                <Input
                  id="startDate"
                  type="date"
                  value={newBlockedTime.startDate}
                  onChange={(e) => setNewBlockedTime({ ...newBlockedTime, startDate: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="flex-1"
                />
                <TimePicker
                  value={newBlockedTime.startTime}
                  onChange={(time) => setNewBlockedTime({ ...newBlockedTime, startTime: time })}
                  className="w-32"
                />
              </div>
              {errors.startTime && (
                <p className="text-sm text-red-500">{errors.startTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date & Time</Label>
              <div className="flex gap-2">
                <Input
                  id="endDate"
                  type="date"
                  value={newBlockedTime.endDate}
                  onChange={(e) => setNewBlockedTime({ ...newBlockedTime, endDate: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd")}
                  className="flex-1"
                />
                <TimePicker
                  value={newBlockedTime.endTime}
                  onChange={(time) => setNewBlockedTime({ ...newBlockedTime, endTime: time })}
                  className="w-32"
                />
              </div>
              {errors.endTime && (
                <p className="text-sm text-red-500">{errors.endTime}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                value={newBlockedTime.reason}
                onChange={(e) => setNewBlockedTime({ ...newBlockedTime, reason: e.target.value })}
                placeholder="e.g., Vacation, Personal, Medical appointment"
                maxLength={200}
              />
              {errors.reason && (
                <p className="text-sm text-red-500">{errors.reason}</p>
              )}
            </div>
          </div>

          {errors.general && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-700">{errors.general}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAdding(false)
                setErrors({})
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!isValidDateRange() || saving}
              className="bg-primary hover:bg-turquoise-600"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Adding..." : "Add Blocked Time"}
            </Button>
          </div>
        </div>
      )}

      {/* Existing Blocked Times */}
      <div className="space-y-3">
        {sortedBlockedTimes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No blocked time periods</p>
            {!readonly && (
              <p className="text-sm">Add time periods when you're unavailable for lessons</p>
            )}
          </div>
        ) : (
          sortedBlockedTimes.map((blockedTime) => (
            <div
              key={blockedTime.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {formatDateRange(blockedTime.startTime, blockedTime.endTime)}
                  </span>
                </div>
                {blockedTime.reason && (
                  <span className={cn(
                    "inline-block px-2 py-1 rounded-full text-xs font-medium",
                    getReasonColor(blockedTime.reason)
                  )}>
                    {blockedTime.reason}
                  </span>
                )}
              </div>

              {!readonly && blockedTime.id && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRemove(blockedTime.id!)}
                  disabled={saving}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {!readonly && (
        <div className="text-sm text-muted-foreground">
          <p>💡 Tip: Block time for vacations, holidays, or personal commitments. Students won&apos;t be able to book lessons during these periods.</p>
        </div>
      )}
    </div>
  )
}