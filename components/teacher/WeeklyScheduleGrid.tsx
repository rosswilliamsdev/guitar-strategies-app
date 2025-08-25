"use client";

import { useState } from "react"
import { Plus, Trash2, Copy, Save } from "lucide-react"
import { TimePicker } from "@/components/ui/time-picker"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/design"
import { availabilitySchema } from "@/lib/validations"
import type { z } from "zod"

type AvailabilitySlot = z.infer<typeof availabilitySchema>

interface WeeklyScheduleGridProps {
  availability?: AvailabilitySlot[]
  onChange?: (availability: AvailabilitySlot[]) => void
  onSave?: (availability: AvailabilitySlot[]) => Promise<void>
  loading?: boolean
  readonly?: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
]

export function WeeklyScheduleGrid({
  availability = [],
  onChange,
  onSave,
  loading = false,
  readonly = false,
}: WeeklyScheduleGridProps) {
  const [localAvailability, setLocalAvailability] = useState<AvailabilitySlot[]>(availability)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const slots = readonly ? availability : localAvailability

  const handleAddSlot = (dayOfWeek: number) => {
    const newSlot: AvailabilitySlot = {
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    }
    
    const updated = [...localAvailability, newSlot]
    setLocalAvailability(updated)
    onChange?.(updated)
  }

  const handleUpdateSlot = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updated = [...localAvailability]
    updated[index] = { ...updated[index], [field]: value }
    
    // Validate the slot
    try {
      availabilitySchema.parse(updated[index])
      const errorKey = `${index}-${field}`
      const newErrors = { ...errors }
      delete newErrors[errorKey]
      setErrors(newErrors)
    } catch (error: any) {
      const errorKey = `${index}-${field}`
      setErrors({ ...errors, [errorKey]: error.errors?.[0]?.message || "Invalid input" })
    }
    
    setLocalAvailability(updated)
    onChange?.(updated)
  }

  const handleRemoveSlot = (index: number) => {
    const updated = localAvailability.filter((_, i) => i !== index)
    setLocalAvailability(updated)
    onChange?.(updated)
  }

  const handleCopyDay = (dayOfWeek: number) => {
    const daySlots = localAvailability.filter(slot => slot.dayOfWeek === dayOfWeek)
    
    // Copy to all other days
    const newSlots: AvailabilitySlot[] = []
    for (let day = 0; day < 7; day++) {
      if (day === dayOfWeek) continue
      
      // Remove existing slots for this day
      const otherSlots = localAvailability.filter(slot => slot.dayOfWeek !== day)
      
      // Add copied slots
      daySlots.forEach(slot => {
        newSlots.push({
          ...slot,
          dayOfWeek: day,
        })
      })
    }
    
    const updated = [
      ...localAvailability.filter(slot => slot.dayOfWeek === dayOfWeek),
      ...newSlots,
    ]
    
    setLocalAvailability(updated)
    onChange?.(updated)
  }

  const handleSave = async () => {
    if (!onSave) return
    
    setSaving(true)
    try {
      await onSave(localAvailability)
    } finally {
      setSaving(false)
    }
  }

  const getDaySlots = (dayOfWeek: number) => {
    return slots
      .map((slot, index) => ({ ...slot, index }))
      .filter(slot => slot.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const hasSlots = (dayOfWeek: number) => {
    return slots.some(slot => slot.dayOfWeek === dayOfWeek)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Weekly Availability</h3>
        {!readonly && onSave && (
          <Button
            onClick={handleSave}
            disabled={saving || Object.keys(errors).length > 0}
            className="bg-primary hover:bg-turquoise-600"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Schedule"}
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day.value}
            className={cn(
              "border rounded-lg p-4",
              !hasSlots(day.value) && "bg-muted/50"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm md:text-base">
                <span className="md:hidden">{day.short}</span>
                <span className="hidden md:inline">{day.label}</span>
              </h4>
              
              {!readonly && (
                <div className="flex items-center gap-2">
                  {hasSlots(day.value) && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyDay(day.value)}
                      title="Copy to all days"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddSlot(day.value)}
                    className="text-primary hover:text-turquoise-600"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">Add Time</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {getDaySlots(day.value).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No availability set
                </p>
              ) : (
                getDaySlots(day.value).map((slot) => (
                  <div
                    key={`${slot.dayOfWeek}-${slot.index}`}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <TimePicker
                        value={slot.startTime}
                        onChange={(time) => handleUpdateSlot(slot.index!, "startTime", time)}
                        disabled={readonly}
                        placeholder="Start"
                        step={30}
                        error={errors[`${slot.index}-startTime`]}
                      />
                      <TimePicker
                        value={slot.endTime}
                        onChange={(time) => handleUpdateSlot(slot.index!, "endTime", time)}
                        disabled={readonly}
                        placeholder="End"
                        step={30}
                        error={errors[`${slot.index}-endTime`]}
                      />
                    </div>
                    
                    {!readonly && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRemoveSlot(slot.index!)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {!readonly && (
        <div className="text-sm text-muted-foreground">
          <p>💡 Tip: Set your availability for each day of the week. You can copy one day's schedule to all other days using the copy button.</p>
        </div>
      )}
    </div>
  )
}