"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  DollarSign,
  User as UserIcon,
} from "lucide-react";
import type { StudentProfile, User, Invoice, InvoiceItem } from "@/types";
import { log } from "@/lib/logger";

interface InvoiceEditFormProps {
  invoice: Invoice & {
    student: (StudentProfile & { user: User }) | null;
    items: InvoiceItem[];
  };
  teacherId: string;
  students: (StudentProfile & { user: User })[];
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

export function InvoiceEditForm({
  invoice,
  teacherId,
  students,
}: InvoiceEditFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Initialize form state from invoice
  const [selectedStudentId, setSelectedStudentId] = useState(
    invoice.studentId || "custom"
  );
  const [selectedMonth, setSelectedMonth] = useState(invoice.month);
  const [dueDate, setDueDate] = useState(
    format(new Date(invoice.dueDate), "yyyy-MM-dd")
  );

  // Custom invoice fields
  const [customFullName, setCustomFullName] = useState(
    invoice.customFullName || ""
  );
  const [customEmail, setCustomEmail] = useState(invoice.customEmail || "");

  // Initialize items from existing invoice
  const [items, setItems] = useState<InvoiceItemForm[]>(
    invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      lessonId: item.lessonId || undefined,
      lessonDate: item.lessonDate ? new Date(item.lessonDate) : undefined,
      quantity: item.quantity,
      rate: item.rate,
      rateDisplay: (item.rate / 100).toFixed(2),
      amount: item.amount,
    }))
  );

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
        log.error("Error loading teacher rate:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    };

    loadTeacherRate();
  }, []);

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

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Parse dueDate as local date to avoid timezone shifts
      const [year, month, day] = dueDate.split("-");
      const localDueDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );

      const requestBody: any = {
        month: selectedMonth,
        dueDate: localDueDate,
        items: items.map((item) => ({
          id: item.id.startsWith("custom-") ? undefined : item.id, // Don't send temp IDs
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          lessonDate: item.lessonDate,
          lessonId: item.lessonId,
        })),
      };

      // Add either studentId or custom invoice fields
      if (selectedStudentId === "custom") {
        requestBody.customFullName = customFullName;
        requestBody.customEmail = customEmail;
        requestBody.studentId = null;
      } else {
        requestBody.studentId = selectedStudentId;
        requestBody.customFullName = null;
        requestBody.customEmail = null;
      }

      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update invoice");
      }

      const { invoice: updatedInvoice } = await response.json();

      // Redirect to the updated invoice
      router.push(`/invoices/${updatedInvoice.id}`);
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
          Edit Invoice: {invoice.invoiceNumber}
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
                  <span className="font-medium">
                    Custom Invoice (Non-System Student)
                  </span>
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
              No items added. Add custom items to continue.
            </div>
          )}
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
            {isLoading ? "Updating..." : "Update Invoice"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
