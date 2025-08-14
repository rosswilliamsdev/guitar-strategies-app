// ========================================
// FILE: lib/validations.ts (Zod Schemas)
// ========================================
import { z } from "zod";
import {
  Role,
  LessonStatus,
  RecommendationCategory,
  InvoiceStatus,
  LibraryCategory,
  CurriculumCategory,
  ProgressStatus,
  SlotStatus,
  SubscriptionStatus,
  BillingStatus,
} from "@prisma/client";

// ========================================
// Auth Schemas
// ========================================
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
    role: z.nativeEnum(Role),
    // Teacher-specific fields
    bio: z.string().optional(),
    hourlyRate: z.number().min(10).max(500).optional(),
    timezone: z.string().default("America/New_York"),
    // Student-specific fields
    teacherId: z.string().optional(),
    goals: z.string().optional(),
    phoneNumber: z.string().optional(),
    parentEmail: z.string().email().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
  });

// ========================================
// Profile Schemas
// ========================================
// Define timezoneSchema early as it's used by other schemas
export const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: "Invalid timezone" }
);

export const teacherProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  hourlyRate: z
    .number()
    .min(10, "Hourly rate must be at least $10")
    .max(500, "Hourly rate must be less than $500")
    .optional(),
  timezone: timezoneSchema,
  phoneNumber: z.string().optional(),
  // Payment method fields for invoice generation
  venmoHandle: z.string().optional(),
  paypalEmail: z.string().optional().refine(val => !val || val.includes('@'), "Please enter a valid PayPal email"),
  zelleEmail: z.string().optional(),
});

export const studentProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  goals: z
    .string()
    .max(500, "Goals must be less than 500 characters")
    .optional(),
  phoneNumber: z.string().optional(),
  parentEmail: z
    .string()
    .email("Please enter a valid email address")
    .optional(),
});

// ========================================
// Lesson Schemas
// ========================================
export const createLessonSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  date: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => new Date(val)),
  duration: z
    .number()
    .min(15, "Lesson must be at least 15 minutes")
    .max(180, "Lesson cannot exceed 3 hours")
    .default(30),
  notes: z
    .string()
    .max(5000, "Notes must be less than 5000 characters")
    .optional(),
  homework: z
    .string()
    .max(500, "Homework must be less than 500 characters")
    .optional(),
  progress: z
    .string()
    .max(500, "Progress notes must be less than 500 characters")
    .optional(),
  focusAreas: z.array(z.string()).optional(),
  songsPracticed: z.array(z.string()).optional(),
  nextSteps: z
    .string()
    .max(300, "Next steps must be less than 300 characters")
    .optional(),
  status: z.nativeEnum(LessonStatus).default("COMPLETED"),
  studentRating: z.number().min(1).max(5).optional(),
  teacherRating: z.number().min(1).max(5).optional(),
});

export const updateLessonSchema = createLessonSchema.partial().extend({
  id: z.string().min(1, "Lesson ID is required"),
});

export const lessonFiltersSchema = z.object({
  studentId: z.string().optional(),
  teacherId: z.string().optional(),
  status: z.nativeEnum(LessonStatus).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  duration: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
});

// ========================================
// Library Schemas
// ========================================
export const createLibraryItemSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  category: z.nativeEnum(LibraryCategory),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
});

export const updateLibraryItemSchema = createLibraryItemSchema
  .partial()
  .extend({
    id: z.string().min(1, "Library item ID is required"),
  });

export const libraryFiltersSchema = z.object({
  category: z.nativeEnum(LibraryCategory).optional(),
  isPublic: z.boolean().optional(),
  teacherId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
});

// ========================================
// Recommendation Schemas
// ========================================
export const createRecommendationSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be less than 100 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(1000, "Description must be less than 1000 characters"),
  link: z.string().url("Please enter a valid URL").optional(),
  category: z.nativeEnum(RecommendationCategory),
  price: z.string().max(50, "Price must be less than 50 characters").optional(),
  priority: z.number().min(1).max(5).default(1),
});

export const updateRecommendationSchema = createRecommendationSchema
  .partial()
  .extend({
    id: z.string().min(1, "Recommendation ID is required"),
  });

// ========================================
// Invoice Schemas
// ========================================
export const createInvoiceSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  dueDate: z.date(),
  lessons: z.array(z.object({
    lessonId: z.string(),
    description: z.string(),
    rate: z.number().min(0),
    duration: z.number().min(1), // minutes
  })),
});

export const updateInvoiceSchema = z.object({
  id: z.string().min(1, "Invoice ID is required"),
  status: z.nativeEnum(InvoiceStatus).optional(),
  paymentMethod: z.string().optional(),
  paymentNotes: z.string().optional(),
  paidAt: z.date().optional(),
});

export const invoiceFiltersSchema = z.object({
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  month: z.string().optional(),
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional(),
});

// ========================================
// File Upload Schemas
// ========================================
export const fileUploadSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileSize: z
    .number()
    .max(10 * 1024 * 1024, "File size must be less than 10MB"),
  fileType: z
    .string()
    .refine(
      (type) =>
        ["application/pdf", "image/jpeg", "image/png", "image/gif"].includes(
          type
        ),
      "Only PDF, JPEG, PNG, and GIF files are allowed"
    ),
});

// ========================================
// Search & Pagination Schemas
// ========================================
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const searchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  filters: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

// ========================================
// Teacher Scheduling Schemas
// ========================================
export const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0-6 (Sunday-Saturday)
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  isActive: z.boolean().default(true),
});

export const weeklyAvailabilitySchema = z.array(availabilitySchema).refine(
  (slots) => {
    // Check for overlapping slots on the same day
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slots[i].dayOfWeek === slots[j].dayOfWeek) {
          const start1 = timeToMinutes(slots[i].startTime);
          const end1 = timeToMinutes(slots[i].endTime);
          const start2 = timeToMinutes(slots[j].startTime);
          const end2 = timeToMinutes(slots[j].endTime);
          
          if ((start1 < end2 && end1 > start2)) {
            return false;
          }
        }
      }
    }
    return true;
  },
  { message: "Availability slots cannot overlap on the same day" }
);

export const blockedTimeSchema = z.object({
  startTime: z.date(),
  endTime: z.date(),
  reason: z.string().max(200).optional(),
  timezone: z.string(),
}).refine(
  (data) => data.endTime > data.startTime,
  { message: "End time must be after start time", path: ["endTime"] }
);

export const lessonSettingsSchema = z.object({
  allows30Min: z.boolean(),
  allows60Min: z.boolean(),
  price30Min: z.number().min(0),
  price60Min: z.number().min(0),
  advanceBookingDays: z.number().min(1).max(90),
}).refine(
  (data) => data.allows30Min || data.allows60Min,
  { message: "At least one lesson duration must be enabled" }
);

export const bookingSchema = z.object({
  teacherId: z.string().min(1, "Teacher is required"),
  studentId: z.string().min(1, "Student is required"),
  date: z.date(),
  duration: z.literal(30).or(z.literal(60)),
  timezone: z.string(),
  isRecurring: z.boolean().default(false),
  recurringWeeks: z.number().min(2).max(52).optional(),
});

export const cancellationSchema = z.object({
  lessonId: z.string().min(1, "Lesson ID is required"),
  reason: z.string().max(500).optional(),
});

// Export timezoneSchema (already defined earlier in the file)

export const timeSlotSchema = z.object({
  start: z.date(),
  end: z.date(),
  duration: z.literal(30).or(z.literal(60)),
  price: z.number().min(0),
  available: z.boolean(),
});

// Helper function for time validation
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// ========================================
// API Response Schemas
// ========================================
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const paginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

// ========================================
// Curriculum Schemas
// ========================================
export const createCurriculumSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  isPublished: z.boolean().default(false),
});

export const updateCurriculumSchema = createCurriculumSchema.partial().extend({
  id: z.string().min(1, "Curriculum ID is required"),
});

export const createCurriculumSectionSchema = z.object({
  curriculumId: z.string().min(1, "Curriculum ID is required"),
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  category: z.nativeEnum(CurriculumCategory),
  sortOrder: z.number().min(0).default(0),
});

export const updateCurriculumSectionSchema = createCurriculumSectionSchema
  .partial()
  .extend({
    id: z.string().min(1, "Section ID is required"),
  });

export const createCurriculumItemSchema = z.object({
  sectionId: z.string().min(1, "Section ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  sortOrder: z.number().min(0).default(0),
  difficulty: z.number().min(1).max(10).optional(),
  estimatedMinutes: z.number().min(1).max(300).optional(),
  resourceUrl: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCurriculumItemSchema = createCurriculumItemSchema
  .partial()
  .extend({
    id: z.string().min(1, "Item ID is required"),
  });

export const updateProgressSchema = z.object({
  curriculumId: z.string().min(1, "Curriculum ID is required"),
  itemId: z.string().min(1, "Item ID is required"),
  status: z.nativeEnum(ProgressStatus),
  studentNotes: z.string().max(500).optional(),
});

export const teacherProgressUpdateSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  curriculumId: z.string().min(1, "Curriculum ID is required"),
  itemId: z.string().min(1, "Item ID is required"),
  status: z.nativeEnum(ProgressStatus),
  teacherNotes: z.string().max(500).optional(),
});

// ========================================
// Student Checklist Schemas
// ========================================
export const createStudentChecklistSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
});

export const updateStudentChecklistSchema = createStudentChecklistSchema
  .partial()
  .extend({
    id: z.string().min(1, "Checklist ID is required"),
    isActive: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  });

export const createStudentChecklistItemSchema = z.object({
  checklistId: z.string().min(1, "Checklist ID is required"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.date().optional(),
  notes: z.string().max(2000).optional(),
  resourceUrl: z.string().url().optional(),
  estimatedMinutes: z.number().min(1).max(300).optional(),
});

export const updateStudentChecklistItemSchema = createStudentChecklistItemSchema
  .partial()
  .extend({
    id: z.string().min(1, "Item ID is required"),
    isCompleted: z.boolean().optional(),
    completedAt: z.date().optional(),
  });

export const toggleChecklistItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  isCompleted: z.boolean(),
});

// ========================================
// Utility Validation Functions
// ========================================
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  // At least 8 characters, one uppercase, one lowercase, one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}


export function validateMonthFormat(month: string): boolean {
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(month)) return false;

  const [year, monthNum] = month.split("-").map(Number);
  return year >= 2020 && year <= 2030 && monthNum >= 1 && monthNum <= 12;
}

// ========================================
// Error Handling Schemas
// ========================================
export const zodErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const validationErrorSchema = z.object({
  success: z.literal(false),
  errors: z.array(zodErrorSchema),
  message: z.string().default("Validation failed"),
});

// Type exports for use in components
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreateLessonData = z.infer<typeof createLessonSchema>;
export type UpdateLessonData = z.infer<typeof updateLessonSchema>;
export type CreateLibraryItemData = z.infer<typeof createLibraryItemSchema>;
export type CreateRecommendationData = z.infer<
  typeof createRecommendationSchema
>;
export type CreateInvoiceData = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceData = z.infer<typeof updateInvoiceSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type CreateCurriculumData = z.infer<typeof createCurriculumSchema>;
export type UpdateCurriculumData = z.infer<typeof updateCurriculumSchema>;
export type CreateCurriculumSectionData = z.infer<typeof createCurriculumSectionSchema>;
export type CreateCurriculumItemData = z.infer<typeof createCurriculumItemSchema>;
export type UpdateProgressData = z.infer<typeof updateProgressSchema>;

// ========================================
// Recurring Monthly Slot Schemas
// ========================================
export const createSlotBookingSchema = z.object({
  teacherId: z.string().min(1, "Teacher is required"),
  dayOfWeek: z.number().min(0).max(6, "Day of week must be 0-6 (Sunday-Saturday)"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  duration: z.literal(30).or(z.literal(60)),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
});

export const updateSlotSchema = z.object({
  slotId: z.string().min(1, "Slot ID is required"),
  status: z.nativeEnum(SlotStatus).optional(),
  monthlyRate: z.number().min(0).optional(),
});

export const cancelSlotSchema = z.object({
  slotId: z.string().min(1, "Slot ID is required"),
  cancelDate: z.date(),
  reason: z.string().max(500).optional(),
  refundAmount: z.number().min(0).optional(),
});

export const slotSubscriptionSchema = z.object({
  slotId: z.string().min(1, "Slot ID is required"),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
  monthlyRate: z.number().min(0),
  status: z.nativeEnum(SubscriptionStatus).default('ACTIVE'),
});

export const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  endMonth: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
});

export const monthlyBillingSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  expectedLessons: z.number().min(0),
  actualLessons: z.number().min(0).default(0),
  ratePerLesson: z.number().min(0),
  totalAmount: z.number().min(0),
  status: z.nativeEnum(BillingStatus).default('PENDING'),
});

export const updateBillingSchema = z.object({
  billingId: z.string().min(1, "Billing ID is required"),
  actualLessons: z.number().min(0).optional(),
  status: z.nativeEnum(BillingStatus).optional(),
  paymentMethod: z.string().max(50).optional(),
  paidAt: z.date().optional(),
});

export const slotAvailabilitySchema = z.object({
  teacherId: z.string().min(1, "Teacher ID is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
});

export const monthlySlotSummarySchema = z.object({
  teacherId: z.string().min(1, "Teacher ID is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
});

// Validation for monthly billing calculation
export const billingCalculationSchema = z.object({
  slotId: z.string().min(1, "Slot ID is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
}).refine(async (data) => {
  // Custom validation to ensure the month is not in the past
  const [year, monthNum] = data.month.split("-").map(Number);
  const monthDate = new Date(year, monthNum - 1, 1);
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  
  return monthDate >= currentMonth;
}, {
  message: "Cannot calculate billing for past months",
  path: ["month"]
});

// Export additional type definitions for recurring slots
export type CreateSlotBookingData = z.infer<typeof createSlotBookingSchema>;
export type UpdateSlotData = z.infer<typeof updateSlotSchema>;
export type CancelSlotData = z.infer<typeof cancelSlotSchema>;
export type SlotSubscriptionData = z.infer<typeof slotSubscriptionSchema>;
export type UpdateSubscriptionData = z.infer<typeof updateSubscriptionSchema>;
export type MonthlyBillingData = z.infer<typeof monthlyBillingSchema>;
export type UpdateBillingData = z.infer<typeof updateBillingSchema>;
export type SlotAvailabilityParams = z.infer<typeof slotAvailabilitySchema>;
export type MonthlySlotSummaryParams = z.infer<typeof monthlySlotSummarySchema>;
