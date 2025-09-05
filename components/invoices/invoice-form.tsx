"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, startOfMonth, endOfMonth } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Calendar,
  DollarSign,
  User as UserIcon,
} from "lucide-react";
import { createInvoiceSchema } from "@/lib/validations";
import type { StudentProfile, User, Lesson } from "@/types";
import { log, emailLog, invoiceLog, schedulerLog } from '@/lib/logger';

interface InvoiceFormProps {
  teacherId: string;
  students: (StudentProfile & { user: User })[];
  defaultStudentId?: string;
  defaultMonth?: string;
}

interface LessonForInvoice {
  id: string;
  date: Date;
  duration: number;
  notes?: string;
  selected: boolean;
}

interface InvoiceItemForm {
  id: string;
  description: string;
  lessonId?: string;
  lessonDate?: Date;
  quantity: number;
  rate: number; // in cents
  rateDisplay: string; // for display purposes
  amount: number; // in cents
}

export function InvoiceForm({
  teacherId,
  students,
  defaultStudentId,
  defaultMonth,
}: InvoiceFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState(
    defaultStudentId || ""
  );
  const [selectedMonth, setSelectedMonth] = useState(
    defaultMonth || format(new Date(), "yyyy-MM")
  );
  const [dueDate, setDueDate] = useState(
    format(addDays(new Date(), 14), "yyyy-MM-dd")
  );
  const [notes, setNotes] = useState("");
  
  // Custom invoice fields
  const [customFullName, setCustomFullName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  // Lessons and items
  const [availableLessons, setAvailableLessons] = useState<LessonForInvoice[]>(
    []
  );
  const [items, setItems] = useState<InvoiceItemForm[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Teacher's hourly rate
  const [hourlyRate, setHourlyRate] = useState<number>(6000); // Default $60 in cents

  // Load teacher's hourly rate
  useEffect(() => {
    const loadTeacherRate = async () => {
      try {
        const response = await fetch("/api/teacher/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.profile.hourlyRate) {
            setHourlyRate(data.profile.hourlyRate);
          }
        }
      } catch (error) {
        log.error('Error loading teacher rate:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      }
    };

    loadTeacherRate();
  }, []);

  // Load lessons when student or month changes
  useEffect(() => {
    if (selectedStudentId && selectedStudentId !== "custom" && selectedMonth) {
      loadLessonsForMonth();
    }
  }, [selectedStudentId, selectedMonth]);

  const loadLessonsForMonth = async () => {
    setLoadingLessons(true);
    try {
      // Parse the selected month (YYYY-MM format) properly to avoid timezone issues
      const [year, month] = selectedMonth.split('-');
      const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
      const endDate = endOfMonth(startDate);

      const response = await fetch(
        `/api/lessons?studentId=${selectedStudentId}&dateFrom=${startDate.toISOString()}&dateTo=${endDate.toISOString()}&status=SCHEDULED`
      );

      if (response.ok) {
        const data = await response.json();
        const lessons: Lesson[] = Array.isArray(data.lessons) ? data.lessons : [];
        const lessonItems = lessons.map((lesson) => ({
          id: lesson.id,
          date: new Date(lesson.date),
          duration: lesson.duration,
          notes: lesson.notes || undefined,
          selected: true, // Auto-select all lessons
        }));

        setAvailableLessons(lessonItems);

        // Auto-generate invoice items from lessons
        const invoiceItems: InvoiceItemForm[] = lessonItems.map(
          (lesson, index) => {
            const rateInCents = Math.round((hourlyRate / 60) * lesson.duration);
            return {
              id: `item-${index}`,
              description: `Guitar Lesson - ${format(
                lesson.date,
                "MMM d, yyyy"
              )}`,
              lessonId: lesson.id,
              lessonDate: lesson.date,
              quantity: 1,
              rate: rateInCents,
              rateDisplay: (rateInCents / 100).toFixed(2),
              amount: rateInCents,
            };
          }
        );

        setItems(invoiceItems);
      }
    } catch (error) {
      log.error('Error loading lessons:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoadingLessons(false);
    }
  };

  const addCustomItem = () => {
    const newItem: InvoiceItemForm = {
      id: `custom-${Date.now()}`,
      description: "",
      quantity: 1,
      rate: hourlyRate,
      rateDisplay: (hourlyRate / 100).toFixed(2),
      amount: hourlyRate,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof InvoiceItemForm, value: any) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Handle rate display updates specially
          if (field === "rateDisplay") {
            const numericValue = parseFloat(value) || 0;
            updated.rate = Math.round(numericValue * 100);
            updated.amount = updated.quantity * updated.rate;
          }
          // Recalculate amount when quantity changes
          else if (field === "quantity") {
            updated.amount = updated.quantity * updated.rate;
          }
          // Direct rate updates (from lesson items)
          else if (field === "rate") {
            updated.rateDisplay = (updated.rate / 100).toFixed(2);
            updated.amount = updated.quantity * updated.rate;
          }

          return updated;
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const toggleLessonSelection = (lessonId: string) => {
    setAvailableLessons((lessons) =>
      lessons.map((lesson) =>
        lesson.id === lessonId
          ? { ...lesson, selected: !lesson.selected }
          : lesson
      )
    );

    // Update items based on selection
    const lesson = availableLessons.find((l) => l.id === lessonId);
    if (lesson?.selected) {
      // Remove item for this lesson
      setItems(items.filter((item) => item.lessonId !== lessonId));
    } else if (lesson) {
      // Add item for this lesson
      const rateInCents = Math.round((hourlyRate / 60) * lesson.duration);
      const newItem: InvoiceItemForm = {
        id: `lesson-${lessonId}`,
        description: `Guitar Lesson - ${format(lesson.date, "MMM d, yyyy")}`,
        lessonId: lesson.id,
        lessonDate: lesson.date,
        quantity: 1,
        rate: rateInCents,
        rateDisplay: (rateInCents / 100).toFixed(2),
        amount: rateInCents,
      };
      setItems([...items, newItem]);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Skip Zod validation and send data directly to API
      // The API will handle its own validation
      
      // Prepare the request body
      const requestBody: any = {
        month: selectedMonth,
        dueDate: new Date(dueDate),
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          lessonDate: item.lessonDate,
          lessonId: item.lessonId,
        })),
        notes,
      };
      
      // Add either studentId or custom invoice fields
      if (selectedStudentId === "custom") {
        requestBody.customFullName = customFullName;
        requestBody.customEmail = customEmail;
      } else {
        requestBody.studentId = selectedStudentId;
      }

      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create invoice");
      }

      const { invoice } = await response.json();

      // Redirect to the created invoice
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">
          Create New Invoice
        </h3>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 mb-6">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Student and Month Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="student">Student *</Label>
            <Select
              value={selectedStudentId}
              onValueChange={(value) => {
                setSelectedStudentId(value);
                // Clear custom fields when switching away from custom
                if (value !== "custom") {
                  setCustomFullName("");
                  setCustomEmail("");
                }
              }}
            >
              <SelectTrigger className="mt-2">
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select student" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">
                  <span className="font-medium">Custom Invoice (Non-System Student)</span>
                </SelectItem>
                <Separator className="my-1" />
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="month">Month *</Label>
            <div className="relative mt-2">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
        </div>
        
        {/* Custom Invoice Fields */}
        {selectedStudentId === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                value={customFullName}
                onChange={(e) => setCustomFullName(e.target.value)}
                placeholder="Enter student's full name"
                className="mt-2"
                required={selectedStudentId === "custom"}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="Enter student's email address"
                className="mt-2"
                required={selectedStudentId === "custom"}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="dueDate">Due Date *</Label>
          <div className="relative mt-2">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        {/* Lesson Selection */}
        {selectedStudentId && selectedStudentId !== "custom" && selectedMonth && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium text-foreground mb-4">
                Lessons for {selectedStudent?.user.name} -{" "}
                {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
              </h4>

              {loadingLessons ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading lessons...
                </div>
              ) : availableLessons.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {availableLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <Checkbox
                        checked={lesson.selected}
                        onCheckedChange={() => toggleLessonSelection(lesson.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {format(lesson.date, "MMM d, yyyy")} -{" "}
                          {lesson.duration} minutes
                        </p>
                        {lesson.notes && (
                          <p className="text-xs text-muted-foreground">
                            {lesson.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        $
                        {(((hourlyRate / 60) * lesson.duration) / 100).toFixed(
                          2
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No scheduled lessons found for this month.
                </div>
              )}
            </div>
          </>
        )}

        {/* Invoice Items */}
        <Separator />
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-foreground">Invoice Items</h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addCustomItem}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Custom Item
            </Button>
          </div>

          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-4 items-end p-4 bg-muted/20 rounded-lg"
                >
                  <div className="col-span-12 md:col-span-4">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      className="mt-1"
                      required
                    />
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "quantity",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="mt-1"
                      required
                    />
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <Label>Rate</Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3 w-3" />
                      <Input
                        type="number"
                        step="0.01"
                        value={item.rateDisplay}
                        onChange={(e) =>
                          updateItem(item.id, "rateDisplay", e.target.value)
                        }
                        className="pl-8"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-span-3 md:col-span-2">
                    <Label>Amount</Label>
                    <p className="mt-1 px-3 py-2 bg-muted text-sm">
                      ${(item.amount / 100).toFixed(2)}
                    </p>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex justify-end">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex justify-between items-center min-w-[200px]">
                    <span className="font-semibold">Total:</span>
                    <span className="font-semibold text-lg">
                      ${(calculateTotal() / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No items added. Select lessons above or add custom items.
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes for this invoice..."
            className="mt-2"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || items.length === 0}>
            {isLoading ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
