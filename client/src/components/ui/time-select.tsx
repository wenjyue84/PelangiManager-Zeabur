"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

interface TimeSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

// Generate time options in 30-minute intervals
const generateTimeOptions = () => {
  const times = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = new Date()
      time.setHours(hour, minute, 0, 0)
      
      // Format time as 12-hour format with AM/PM
      const formattedTime = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      
      // Store the 12-hour format as the value to match existing system
      const value = formattedTime
      
      times.push({ label: formattedTime, value })
    }
  }
  return times
}

const timeOptions = generateTimeOptions()

// Common check-in/check-out time presets
const commonTimes = [
  { label: "12:00 AM (Midnight)", value: "12:00 AM" },
  { label: "1:00 AM", value: "1:00 AM" },
  { label: "2:00 AM", value: "2:00 AM" },
  { label: "3:00 AM", value: "3:00 AM" },
  { label: "4:00 AM", value: "4:00 AM" },
  { label: "5:00 AM", value: "5:00 AM" },
  { label: "6:00 AM", value: "6:00 AM" },
  { label: "7:00 AM", value: "7:00 AM" },
  { label: "8:00 AM", value: "8:00 AM" },
  { label: "9:00 AM", value: "9:00 AM" },
  { label: "10:00 AM", value: "10:00 AM" },
  { label: "11:00 AM", value: "11:00 AM" },
  { label: "12:00 PM (Noon)", value: "12:00 PM" },
  { label: "1:00 PM", value: "1:00 PM" },
  { label: "2:00 PM", value: "2:00 PM" },
  { label: "3:00 PM", value: "3:00 PM" },
  { label: "4:00 PM", value: "4:00 PM" },
  { label: "5:00 PM", value: "5:00 PM" },
  { label: "6:00 PM", value: "6:00 PM" },
  { label: "7:00 PM", value: "7:00 PM" },
  { label: "8:00 PM", value: "8:00 PM" },
  { label: "9:00 PM", value: "9:00 PM" },
  { label: "10:00 PM", value: "10:00 PM" },
  { label: "11:00 PM", value: "11:00 PM" },
]

export function TimeSelect({ value, onValueChange, placeholder, className }: TimeSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="p-2">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Common Times</div>
          {commonTimes.map((time) => (
            <SelectItem key={time.value} value={time.value}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {time.label}
              </div>
            </SelectItem>
          ))}
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2 mt-4">All Times (30-min intervals)</div>
          {timeOptions.map((time) => (
            <SelectItem key={time.value} value={time.value}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {time.label}
              </div>
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  )
}