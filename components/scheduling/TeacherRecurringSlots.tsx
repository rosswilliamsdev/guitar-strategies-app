"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Users,
  TrendingUp,
  Eye,
  X,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/design";
import { SlotStatus, BillingStatus } from "@/types";
import { getDayName, formatSlotTime } from "@/lib/slot-helpers";

interface SlotWithDetails {
  id: string;
  teacherId: string;
  studentId: string;
  dayOfWeek: number;
  startTime: string;
  duration: number;
  monthlyRate: number;
  status: SlotStatus;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date | null;
  student: {
    id: string;
    user: { name: string };
  };
  subscriptions: Array<{
    id: string;
    status: string;
    billingRecords: Array<{
      month: string;
      status: BillingStatus;
      totalAmount: number;
      actualLessons: number;
      expectedLessons: number;
    }>;
  }>;
}

interface TeacherRecurringSlotsProps {
  className?: string;
}

export function TeacherRecurringSlots({
  className,
}: TeacherRecurringSlotsProps) {
  const [slots, setSlots] = useState<SlotWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<SlotWithDetails | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [slotToCancel, setSlotToCancel] = useState<SlotWithDetails | null>(
    null
  );
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    loadRecurringSlots();
  }, []);

  const loadRecurringSlots = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/teacher/recurring-slots");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load recurring slots");
      }

      const data = await response.json();
      setSlots(data.data || []);
    } catch (error: any) {
      setError(error.message || "Failed to load recurring slots");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSlot = async () => {
    if (!slotToCancel) return;

    setCancelling(true);
    setError("");

    try {
      const response = await fetch(`/api/slots/${slotToCancel.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelDate: new Date(),
          reason: cancelReason || "Teacher cancelled recurring slot",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel slot");
      }

      // Refresh the slots list
      await loadRecurringSlots();

      // Reset state
      setShowCancelDialog(false);
      setSlotToCancel(null);
      setCancelReason("");
    } catch (error: any) {
      setError(error.message || "Failed to cancel slot");
    } finally {
      setCancelling(false);
    }
  };

  const openCancelDialog = (slot: SlotWithDetails) => {
    setSlotToCancel(slot);
    setShowCancelDialog(true);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  const getStatusBadge = (status: SlotStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "CANCELLED":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Cancelled
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Suspended
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBillingStatusBadge = (status: BillingStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Pending
          </Badge>
        );
      case "BILLED":
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Billed
          </Badge>
        );
      case "PAID":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "OVERDUE":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Overdue
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRecentBilling = (slot: SlotWithDetails) => {
    const activeSubscription = slot.subscriptions.find(
      (sub) => sub.status === "ACTIVE"
    );
    if (!activeSubscription) return null;

    const sortedBilling = activeSubscription.billingRecords.sort((a, b) =>
      b.month.localeCompare(a.month)
    );

    return sortedBilling[0] || null;
  };

  const calculateMonthlyRevenue = () => {
    return slots
      .filter((slot) => slot.status === "ACTIVE")
      .reduce((total, slot) => total + slot.monthlyRate, 0);
  };

  const getActiveStudentCount = () => {
    return slots.filter((slot) => slot.status === "ACTIVE").length;
  };

  // Group slots by day of week
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {} as Record<number, SlotWithDetails[]>);

  // Sort days Sunday to Saturday
  const sortedDays = Object.keys(slotsByDay)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">
                {getActiveStudentCount()}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Students
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">
                {formatPrice(calculateMonthlyRevenue())}
              </div>
              <div className="text-sm text-muted-foreground">
                Monthly Revenue
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{slots.length}</div>
              <div className="text-sm text-muted-foreground">Total Slots</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">My Recurring Slots</h2>
          <p className="text-muted-foreground">
            Manage your weekly recurring lesson slots
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadRecurringSlots}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Loading your recurring slots...
          </p>
        </div>
      ) : slots.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Recurring Slots</h3>
          <p className="text-muted-foreground">
            You don&apos;t have any recurring lesson slots booked yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((dayOfWeek) => {
            const daySlots = slotsByDay[dayOfWeek].sort((a, b) =>
              a.startTime.localeCompare(b.startTime)
            );

            return (
              <Card key={dayOfWeek} className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {getDayName(dayOfWeek)}s
                </h3>

                <div className="space-y-3">
                  {daySlots.map((slot) => {
                    const recentBilling = getRecentBilling(slot);

                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {formatSlotTime(slot.startTime, slot.duration)}
                            </span>
                            <Badge variant="secondary">
                              {slot.duration}min
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {slot.student.user.name}
                            </span>
                          </div>

                          {getStatusBadge(slot.status)}
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">
                              {formatPrice(slot.monthlyRate)}/month
                            </div>
                            {recentBilling && (
                              <div className="text-sm text-muted-foreground">
                                {format(
                                  new Date(recentBilling.month + "-01"),
                                  "MMM"
                                )}{" "}
                                - {getBillingStatusBadge(recentBilling.status)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedSlot(slot);
                                setShowDetails(true);
                              }}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Details
                            </Button>

                            {slot.status === "ACTIVE" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openCancelDialog(slot)}
                                className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Slot Details Modal */}
      {showDetails && selectedSlot && (
        <Card className="fixed inset-0 z-50 m-8 max-w-2xl mx-auto max-h-fit bg-white shadow-xl border overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Slot Details</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowDetails(false);
                  setSelectedSlot(null);
                }}
              >
                Close
              </Button>
            </div>

            {/* Slot Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Student:</span>
                <div className="font-medium">
                  {selectedSlot.student.user.name}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Day & Time:</span>
                <div className="font-medium">
                  {getDayName(selectedSlot.dayOfWeek)}s at{" "}
                  {formatSlotTime(
                    selectedSlot.startTime,
                    selectedSlot.duration
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <div className="font-medium">
                  {selectedSlot.duration} minutes
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Monthly Rate:</span>
                <div className="font-medium">
                  {formatPrice(selectedSlot.monthlyRate)}
                </div>
              </div>
            </div>

            {/* Billing History */}
            <div className="space-y-4">
              <h4 className="font-medium">Recent Billing</h4>
              {selectedSlot.subscriptions.map((subscription) => (
                <div key={subscription.id} className="space-y-2">
                  {subscription.billingRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No billing records yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {subscription.billingRecords
                        .sort((a, b) => b.month.localeCompare(a.month))
                        .slice(0, 6) // Show last 6 months
                        .map((billing) => (
                          <div
                            key={billing.month}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded"
                          >
                            <div>
                              <div className="font-medium">
                                {format(
                                  new Date(billing.month + "-01"),
                                  "MMMM yyyy"
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {billing.actualLessons} of{" "}
                                {billing.expectedLessons} lessons completed
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {formatPrice(billing.totalAmount)}
                              </div>
                              <div className="text-sm">
                                {getBillingStatusBadge(billing.status)}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Cancel Slot Confirmation Dialog */}
      {showCancelDialog && slotToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4 bg-white shadow-xl">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">
                    Cancel Recurring Slot
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="text-sm font-medium text-red-900">
                    {slotToCancel.student.user.name}
                  </div>
                  <div className="text-sm text-red-700">
                    {getDayName(slotToCancel.dayOfWeek)}s at{" "}
                    {formatSlotTime(
                      slotToCancel.startTime,
                      slotToCancel.duration
                    )}
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    This will cancel all future lessons and free up the time
                    slot
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancel-reason">Reason (optional)</Label>
                  <Input
                    id="cancel-reason"
                    placeholder="e.g., Student dropped out, schedule change..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowCancelDialog(false);
                    setSlotToCancel(null);
                    setCancelReason("");
                  }}
                  disabled={cancelling}
                  className="flex-1"
                >
                  Keep Slot
                </Button>
                <Button
                  onClick={handleCancelSlot}
                  disabled={cancelling}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {cancelling ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Slot
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
