"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { Calendar, Clock, User, X } from "lucide-react";

interface Student {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface BookStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  time: string;
  students: Student[];
  onBook: (studentId: string, type: "single" | "recurring") => Promise<void>;
}

export function BookStudentModal({
  isOpen,
  onClose,
  date,
  time,
  students,
  onBook,
}: BookStudentModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [bookingType, setBookingType] = useState<"single" | "recurring">("single");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent) {
      setError("Please select a student");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await onBook(selectedStudent, bookingType);
      onClose();
      // Reset form
      setSelectedStudent("");
      setBookingType("single");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book lesson");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 bg-background">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Book Student</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(date, "EEEE, MMMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{time}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="student">Select Student</Label>
            <Select.Root value={selectedStudent} onValueChange={setSelectedStudent}>
              <Select.Trigger className="w-full px-3 py-2 border rounded-md bg-background flex items-center justify-between">
                <Select.Value placeholder="Choose a student..." />
                <ChevronDown className="h-4 w-4" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-background border rounded-md shadow-lg z-50">
                  <Select.Viewport className="p-1">
                    {students.map((student) => (
                      <Select.Item 
                        key={student.id} 
                        value={student.id}
                        className="px-3 py-2 hover:bg-muted cursor-pointer rounded flex items-center gap-2"
                      >
                        <Select.ItemText>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{student.user.name}</span>
                            <span className="text-muted-foreground text-sm">
                              ({student.user.email})
                            </span>
                          </div>
                        </Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          <div>
            <Label>Booking Type</Label>
            <RadioGroup value={bookingType} onValueChange={(value) => setBookingType(value as "single" | "recurring")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single" />
                <Label htmlFor="single" className="font-normal cursor-pointer">
                  Single lesson
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recurring" id="recurring" />
                <Label htmlFor="recurring" className="font-normal cursor-pointer">
                  Recurring weekly lesson
                </Label>
              </div>
            </RadioGroup>
          </div>


          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !selectedStudent}
              className="flex-1"
            >
              {isLoading ? "Booking..." : "Book Lesson"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}