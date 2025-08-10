// ========================================
// FILE: lib/validations.ts (Zod Schemas)
// ========================================
import { z } from "zod";
import {
  Role,
  LessonStatus,
  RecommendationCategory,
  PaymentStatus,
  SkillLevel,
  LibraryCategory,
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
    calendlyUrl: z.string().url("Please enter a valid Calendly URL").optional(),
    // Student-specific fields
    teacherId: z.string().optional(),
    skillLevel: z.nativeEnum(SkillLevel).optional(),
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
export const teacherProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  hourlyRate: z
    .number()
    .min(10, "Hourly rate must be at least $10")
    .max(500, "Hourly rate must be less than $500")
    .optional(),
  calendlyUrl: z.string().url("Please enter a valid Calendly URL").optional(),
  timezone: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const studentProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  skillLevel: z.nativeEnum(SkillLevel),
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
  date: z.string().datetime().or(z.date()).transform((val) => new Date(val)),
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
  status: z.nativeEnum(LessonStatus).default('COMPLETED'),
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
  difficulty: z.nativeEnum(SkillLevel).optional(),
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
  difficulty: z.nativeEnum(SkillLevel).optional(),
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
// Payment Schemas
// ========================================
export const createPaymentSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  lessonsIncluded: z.number().min(0).default(0),
});

export const paymentFiltersSchema = z.object({
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  month: z.string().optional(),
  amountRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
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
// Calendly Integration Schemas
// ========================================
export const calendlySettingsSchema = z.object({
  url: z.string().min(1, "Calendly URL is required").refine((val) => {
    try {
      const url = new URL(val);
      return url.hostname.includes('calendly.com');
    } catch {
      return false;
    }
  }, "Please enter a valid Calendly URL"),
  eventType: z.string().min(1, "Event type is required"),
  duration: z.number().min(15).max(180),
  timezone: z.string().min(1, "Timezone is required"),
});

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

export function validateCalendlyUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === "calendly.com" ||
      urlObj.hostname.endsWith(".calendly.com")
    );
  } catch {
    return false;
  }
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
export type CreatePaymentData = z.infer<typeof createPaymentSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
