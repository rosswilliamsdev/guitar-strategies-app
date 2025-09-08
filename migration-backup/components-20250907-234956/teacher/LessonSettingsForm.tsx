"use client";

import { useState } from "react"
import { Clock, DollarSign, Calendar, Save, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/design"
import { lessonSettingsSchema } from "@/lib/validations"
import type { z } from "zod"

type LessonSettings = z.infer<typeof lessonSettingsSchema>

interface LessonSettingsFormProps {
  settings?: LessonSettings
  onSave?: (settings: LessonSettings) => Promise<void>
  loading?: boolean
  readonly?: boolean
}

export function LessonSettingsForm({
  settings = {
    allows30Min: true,
    allows60Min: true,
    price30Min: 0,
    price60Min: 0,
    advanceBookingDays: 21,
  },
  onSave,
  loading = false,
  readonly = false,
}: LessonSettingsFormProps) {
  const [formData, setFormData] = useState<LessonSettings>(settings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handleChange = (field: keyof LessonSettings, value: any) => {
    const updated = { ...formData, [field]: value }
    setFormData(updated)

    // Clear field-specific errors
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const validateAndSave = async () => {
    if (!onSave) return

    try {
      setErrors({})
      
      // Validate with schema
      const validatedData = lessonSettingsSchema.parse(formData)

      setSaving(true)
      await onSave(validatedData)
    } catch (error: any) {
      if (error.errors) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          newErrors[err.path?.[0] || "general"] = err.message
        })
        setErrors(newErrors)
      } else {
        setErrors({ general: error.message || "Failed to save lesson settings" })
      }
    } finally {
      setSaving(false)
    }
  }

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2)
  }

  const parsePriceInput = (value: string) => {
    const numValue = parseFloat(value) || 0
    return Math.round(numValue * 100) // Convert to cents
  }

  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(settings)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lesson Settings</h3>
        {!readonly && onSave && hasChanges() && (
          <Button
            onClick={validateAndSave}
            disabled={saving || Object.keys(errors).length > 0}
            className="bg-primary hover:bg-turquoise-600"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        )}
      </div>

      {/* Lesson Durations */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-primary" />
          <h4 className="font-medium">Lesson Durations</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allows30Min"
                checked={formData.allows30Min}
                onCheckedChange={(checked) => handleChange("allows30Min", checked)}
                disabled={readonly}
              />
              <Label htmlFor="allows30Min" className="font-medium">
                30-minute lessons
              </Label>
            </div>
            
            {formData.allows30Min && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="price30Min">Price per 30-minute lesson</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price30Min"
                    type="number"
                    value={formatPrice(formData.price30Min)}
                    onChange={(e) => handleChange("price30Min", parsePriceInput(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="pl-9"
                    disabled={readonly}
                  />
                </div>
                {errors.price30Min && (
                  <p className="text-sm text-red-500">{errors.price30Min}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allows60Min"
                checked={formData.allows60Min}
                onCheckedChange={(checked) => handleChange("allows60Min", checked)}
                disabled={readonly}
              />
              <Label htmlFor="allows60Min" className="font-medium">
                60-minute lessons
              </Label>
            </div>
            
            {formData.allows60Min && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="price60Min">Price per 60-minute lesson</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price60Min"
                    type="number"
                    value={formatPrice(formData.price60Min)}
                    onChange={(e) => handleChange("price60Min", parsePriceInput(e.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="pl-9"
                    disabled={readonly}
                  />
                </div>
                {errors.price60Min && (
                  <p className="text-sm text-red-500">{errors.price60Min}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {(!formData.allows30Min && !formData.allows60Min) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-700">You must enable at least one lesson duration.</p>
            </div>
          </div>
        )}
      </div>

      {/* Booking Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h4 className="font-medium">Booking Settings</h4>
        </div>

        <div className="space-y-2">
          <Label htmlFor="advanceBookingDays">
            Maximum advance booking (days)
          </Label>
          <Input
            id="advanceBookingDays"
            type="number"
            value={formData.advanceBookingDays}
            onChange={(e) => handleChange("advanceBookingDays", parseInt(e.target.value) || 21)}
            min="1"
            max="90"
            disabled={readonly}
            className="w-32"
          />
          <p className="text-sm text-muted-foreground">
            Students can book lessons up to {formData.advanceBookingDays} days in advance.
          </p>
          {errors.advanceBookingDays && (
            <p className="text-sm text-red-500">{errors.advanceBookingDays}</p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-3">Settings Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>30-minute lessons:</span>
            <span className={cn(
              formData.allows30Min ? "text-green-600" : "text-red-500",
              "font-medium"
            )}>
              {formData.allows30Min ? `$${formatPrice(formData.price30Min)}` : "Disabled"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>60-minute lessons:</span>
            <span className={cn(
              formData.allows60Min ? "text-green-600" : "text-red-500",
              "font-medium"
            )}>
              {formData.allows60Min ? `$${formatPrice(formData.price60Min)}` : "Disabled"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Advance booking limit:</span>
            <span className="font-medium">{formData.advanceBookingDays} days</span>
          </div>
        </div>
      </div>

      {errors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-700">{errors.general}</p>
          </div>
        </div>
      )}

      {!readonly && (
        <div className="text-sm text-muted-foreground">
          <p>💡 Tip: Set competitive pricing for your lessons. Students will see these prices when booking.</p>
        </div>
      )}
    </div>
  )
}