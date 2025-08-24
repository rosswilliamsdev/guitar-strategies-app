"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Calendar,
  Clock,
  RefreshCw,
  User,
  DollarSign,
  CalendarDays,
  ChevronRight,
  Sparkles,
  Bell,
} from "lucide-react";
import { format, addWeeks } from "date-fns";

interface Lesson {
  id: string;
  date: string;
  duration: number;
  price?: number;
  status: string;
}

interface RecurringSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  duration: number;
  perLessonPrice?: number;
}

interface BookingSuccessModalProps {
  open: boolean;
  onClose: () => void;
  bookingType: "single" | "recurring";
  teacherName: string;
  lesson?: Lesson;
  recurringSlot?: RecurringSlot;
  lessons?: Lesson[];
}

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function BookingSuccessModal({
  open,
  onClose,
  bookingType,
  teacherName,
  lesson,
  recurringSlot,
  lessons = [],
}: BookingSuccessModalProps) {
  const router = useRouter();

  const handleViewLessons = () => {
    onClose();
    router.push("/lessons");
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getTotalValue = () => {
    if (bookingType === "single" && lesson?.price) {
      return formatPrice(lesson.price);
    }
    if (bookingType === "recurring" && recurringSlot?.perLessonPrice) {
      const weeklyValue = recurringSlot.perLessonPrice; // This is already the per-lesson price, which equals weekly for once-per-week lessons
      const monthlyValue = weeklyValue * 4; // 4 weeks per month average
      return `${formatPrice(weeklyValue)}/week (~${formatPrice(
        monthlyValue
      )}/month)`;
    }
    return null;
  };

  const getNextLessonDate = () => {
    if (bookingType === "single" && lesson) {
      return new Date(lesson.date);
    }
    if (bookingType === "recurring" && lessons.length > 0) {
      return new Date(lessons[0].date);
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl">
                {bookingType === "single"
                  ? "Time Reserved!"
                  : "Weekly Time Reserved!"}
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
                Your{" "}
                {bookingType === "single" ? "time" : "recurring weekly time"}{" "}
                with {teacherName} has been successfully reserved
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Booking Summary Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">
                  {bookingType === "single"
                    ? "Your Reserved Time"
                    : "Your Weekly Time Slot"}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Teacher */}
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Teacher</p>
                    <p className="font-medium">{teacherName}</p>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">
                      {bookingType === "single"
                        ? `${lesson?.duration || 30} minutes`
                        : `${recurringSlot?.duration || 30} minutes per week`}
                    </p>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {bookingType === "single"
                        ? "Date & Time"
                        : "Weekly Schedule"}
                    </p>
                    <p className="font-medium">
                      {bookingType === "single" && lesson
                        ? format(
                            new Date(lesson.date),
                            "EEE, MMM d 'at' h:mm a"
                          )
                        : recurringSlot &&
                          `Every ${dayNames[recurringSlot.dayOfWeek]} at ${
                            recurringSlot.startTime
                          }`}
                    </p>
                  </div>
                </div>

                {/* Value */}
                {getTotalValue() && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Investment
                      </p>
                      <p className="font-medium">{getTotalValue()}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recurring Lessons Created */}
          {bookingType === "recurring" && lessons.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Your Reserved Times</h4>
                </div>
                <div className="space-y-2">
                  {lessons.slice(0, 4).map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(new Date(lesson.date), "EEEE, MMMM d")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(lesson.date), "h:mm a")} •{" "}
                            {lesson.duration} minutes
                          </p>
                        </div>
                      </div>
                      {index === 0 && (
                        <Badge
                          variant="secondary"
                          className="text-green-600 border-green-600"
                        >
                          Next Session
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* What's Next Section */}
          <Separator />
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              What Happens Next?
            </h4>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">
                  You'll receive a confirmation email with all the details
                </p>
              </div>
              <div className="flex items-start gap-3">
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">
                  {bookingType === "single"
                    ? "This time is reserved for you - payment is due whether you attend or cancel"
                    : "Your weekly time slot is now protected and reserved exclusively for you"}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm">
                  {getNextLessonDate() &&
                    `Your ${
                      bookingType === "recurring" ? "first" : ""
                    } session is on ${format(
                      getNextLessonDate()!,
                      "EEEE, MMMM d 'at' h:mm a"
                    )}`}
                </p>
              </div>
              {bookingType === "recurring" && (
                <div className="flex items-start gap-3">
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm">
                    Monthly payments ensure your time remains reserved -
                    cancellations don't affect payment
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={handleViewLessons}
              className="bg-primary hover:bg-primary/90"
            >
              View My Lessons
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
