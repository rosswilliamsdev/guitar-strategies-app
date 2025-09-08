"use client";

import { useState, useEffect } from "react"
import { ChevronUp, ChevronDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string // Format: "HH:MM"
  onChange: (time: string) => void
  label?: string
  error?: string
  disabled?: boolean
  min?: string // Minimum time
  max?: string // Maximum time
  step?: number // Step in minutes (default: 30)
  className?: string
  placeholder?: string
}

export function TimePicker({
  value = "",
  onChange,
  label,
  error,
  disabled = false,
  min = "00:00",
  max = "23:59",
  step = 30,
  className,
  placeholder = "Select time"
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hours, setHours] = useState<string>("")
  const [minutes, setMinutes] = useState<string>("")

  // Parse value into hours and minutes
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":")
      setHours(h || "")
      setMinutes(m || "")
    } else {
      setHours("")
      setMinutes("")
    }
  }, [value])

  // Generate time options based on step
  const generateTimeOptions = () => {
    const options: string[] = []
    const [minHour, minMinute] = min.split(":").map(Number)
    const [maxHour, maxMinute] = max.split(":").map(Number)
    
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += step) {
        const totalMinutes = h * 60 + m
        const minTotalMinutes = minHour * 60 + minMinute
        const maxTotalMinutes = maxHour * 60 + maxMinute
        
        if (totalMinutes >= minTotalMinutes && totalMinutes <= maxTotalMinutes) {
          const hourStr = h.toString().padStart(2, "0")
          const minStr = m.toString().padStart(2, "0")
          options.push(`${hourStr}:${minStr}`)
        }
      }
    }
    
    return options
  }

  const timeOptions = generateTimeOptions()

  const handleTimeSelect = (time: string) => {
    onChange(time)
    setIsOpen(false)
  }

  const incrementHours = () => {
    const currentHour = parseInt(hours) || 0
    const newHour = currentHour < 23 ? currentHour + 1 : 0
    const newTime = `${newHour.toString().padStart(2, "0")}:${minutes || "00"}`
    onChange(newTime)
  }

  const decrementHours = () => {
    const currentHour = parseInt(hours) || 0
    const newHour = currentHour > 0 ? currentHour - 1 : 23
    const newTime = `${newHour.toString().padStart(2, "0")}:${minutes || "00"}`
    onChange(newTime)
  }

  const incrementMinutes = () => {
    const currentMinute = parseInt(minutes) || 0
    const newMinute = currentMinute + step < 60 ? currentMinute + step : 0
    const newTime = `${hours || "00"}:${newMinute.toString().padStart(2, "0")}`
    onChange(newTime)
  }

  const decrementMinutes = () => {
    const currentMinute = parseInt(minutes) || 0
    const newMinute = currentMinute - step >= 0 ? currentMinute - step : 60 - step
    const newTime = `${hours || "00"}:${newMinute.toString().padStart(2, "0")}`
    onChange(newTime)
  }

  const formatTimeDisplay = (time: string) => {
    if (!time) return placeholder
    const [h, m] = time.split(":")
    const hour = parseInt(h)
    const period = hour >= 12 ? "PM" : "AM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${m} ${period}`
  }

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Main Input Display */}
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "w-full px-3 py-2 text-left",
            "border rounded-md",
            "bg-background",
            "flex items-center justify-between",
            "transition-colors",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted cursor-pointer",
            error ? "border-red-500" : "border-input",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            "select-none"
          )}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-disabled={disabled}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault()
              setIsOpen(!isOpen)
            }
          }}
        >
          <span className={cn(
            "flex items-center gap-2",
            !value && "text-muted-foreground"
          )}>
            <Clock className="h-4 w-4" />
            {formatTimeDisplay(value)}
          </span>
          
          {/* Spinner Controls */}
          {!disabled && value && (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    incrementHours()
                  }}
                  className="p-0.5 hover:bg-muted rounded"
                  aria-label="Increment hours"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    decrementHours()
                  }}
                  className="p-0.5 hover:bg-muted rounded"
                  aria-label="Decrement hours"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              
              <span className="text-sm">:</span>
              
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    incrementMinutes()
                  }}
                  className="p-0.5 hover:bg-muted rounded"
                  aria-label="Increment minutes"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    decrementMinutes()
                  }}
                  className="p-0.5 hover:bg-muted rounded"
                  aria-label="Decrement minutes"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dropdown List */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto">
            {timeOptions.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => handleTimeSelect(time)}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-muted transition-colors",
                  value === time && "bg-primary/10 text-primary font-medium"
                )}
              >
                {formatTimeDisplay(time)}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}