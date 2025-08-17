/**
 * @fileoverview Type definitions for Guitar Strategies application.
 * 
 * This file contains all TypeScript type definitions used throughout the application,
 * extending Prisma-generated types with additional properties and creating custom
 * interfaces for forms, API responses, and component props.
 * 
 * Key type categories:
 * - User and profile types (extended from Prisma)
 * - Lesson management types
 * - Invoice and payment types
 * - Library and recommendation types
 * - Scheduling and booking types
 * - Form and API response types
 * - UI component types
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  User as PrismaUser,
  TeacherProfile as PrismaTeacherProfile,
  StudentProfile as PrismaStudentProfile,
  Lesson as PrismaLesson,
  LibraryItem as PrismaLibraryItem,
  Recommendation as PrismaRecommendation,
  Invoice as PrismaInvoice,
  InvoiceItem as PrismaInvoiceItem,
  RecurringSlot as PrismaRecurringSlot,
  SlotSubscription as PrismaSlotSubscription,
  MonthlyBilling as PrismaMonthlyBilling,
  Role,
  LessonStatus,
  RecommendationCategory,
  InvoiceStatus,
  LibraryCategory,
  SlotStatus,
  SubscriptionStatus,
  BillingStatus,
} from "@prisma/client";

// ========================================
// Base Types from Prisma
// ========================================
export type {
  Role,
  LessonStatus,
  RecommendationCategory,
  InvoiceStatus,
  LibraryCategory,
  SlotStatus,
  SubscriptionStatus,
  BillingStatus,
};

// ========================================
// Extended User Types
// ========================================

/**
 * Extended User type that includes optional teacher and student profiles.
 * Extends the base Prisma User model with relationship data.
 */
export type User = PrismaUser & {
  teacherProfile?: TeacherProfile;
  studentProfile?: StudentProfile;
};

/**
 * Extended TeacherProfile type with related entities and count aggregations.
 * Used for teacher dashboard and profile management.
 */
export type TeacherProfile = PrismaTeacherProfile & {
  user?: PrismaUser;
  students?: StudentProfile[];
  lessons?: Lesson[];
  _count?: {
    students: number;
    lessons: number;
    libraryItems: number;
  };
};

/**
 * Extended StudentProfile type with related entities and count aggregations.
 * Used for student dashboard and progress tracking.
 */
export type StudentProfile = PrismaStudentProfile & {
  user?: PrismaUser;
  teacher?: TeacherProfile;
  lessons?: Lesson[];
  _count?: {
    lessons: number;
  };
};

// ========================================
// Lesson Types
// ========================================
export type Lesson = PrismaLesson & {
  teacher?: TeacherProfile;
  student?: StudentProfile;
};

export type LessonWithDetails = Lesson & {
  teacher: {
    id: string;
    user: {
      name: string;
    };
  };
  student: {
    id: string;
    user: {
      name: string;
    };
  };
};

export interface CreateLessonData {
  studentId: string;
  date: Date;
  duration: number;
  notes?: string;
  homework?: string;
  progress?: string;
  focusAreas?: string[];
  songsPracticed?: string[];
  nextSteps?: string;
  studentRating?: number;
  teacherRating?: number;
}

export interface UpdateLessonData extends Partial<CreateLessonData> {
  id: string;
}

// ========================================
// Invoice Types
// ========================================
export type Invoice = PrismaInvoice & {
  teacher: TeacherProfile;
  student: StudentProfile & { user: User };
  items: InvoiceItem[];
};

export type InvoiceItem = PrismaInvoiceItem & {
  lesson?: Lesson;
};

export interface InvoiceSummary {
  month: string;
  totalEarnings: number; // in cents
  invoiceCount: number;
  pendingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  students: Array<{
    studentId: string;
    studentName: string;
    amount: number;
    lessonsCount: number;
    status: InvoiceStatus;
    invoiceId: string;
    dueDate: Date;
  }>;
}

export interface PaymentMethodInfo {
  venmoHandle?: string;
  paypalEmail?: string;
  zelleEmail?: string;
}

// ========================================
// Library Types
// ========================================
export type LibraryItem = PrismaLibraryItem & {
  teacher?: TeacherProfile;
};

export interface CreateLibraryItemData {
  title: string;
  description?: string;
  category: LibraryCategory;
  tags?: string[];
  isPublic?: boolean;
}

export interface UploadedFile {
  file: File;
  url: string;
  fileName: string;
  fileSize: number;
}

// ========================================
// Recommendation Types
// ========================================
export type Recommendation = PrismaRecommendation & {
  teacher?: TeacherProfile;
};

export interface CreateRecommendationData {
  title: string;
  description: string;
  link?: string;
  category: RecommendationCategory;
  price?: string;
  priority?: number;
}

// Payment types removed - using simple invoice system instead

// ========================================
// Dashboard & Analytics Types
// ========================================
export interface TeacherDashboardData {
  totalStudents: number;
  totalLessons: number;
  totalEarnings: number;
  recentLessons: LessonWithDetails[];
  upcomingLessons: LessonWithDetails[];
  monthlyStats: {
    month: string;
    lessonsCount: number;
    earnings: number;
    newStudents: number;
  }[];
}

export interface StudentDashboardData {
  totalLessons: number;
  currentStreak: number;
  nextLesson?: LessonWithDetails;
  recentLessons: LessonWithDetails[];
  progressSummary: {
    joinedDate: Date;
    totalPracticeTime: number;
    completedAssignments: number;
  };
  upcomingPayments: any[];
}

export interface LessonStats {
  totalLessons: number;
  averageDuration: number;
  averageRating: number;
  skillProgression: Array<{
    date: Date;
    notes: string;
  }>;
  practiceFrequency: Array<{
    week: string;
    lessonsCount: number;
  }>;
}

// ========================================
// Form Types
// ========================================
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
  // Teacher-specific fields
  bio?: string;
  hourlyRate?: number;
  // Student-specific fields
  teacherId?: string;
  goals?: string;
  phoneNumber?: string;
  parentEmail?: string;
}

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  bio?: string;
  hourlyRate?: number;
  goals?: string;
  phoneNumber?: string;
  timezone?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ========================================
// API Response Types
// ========================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

// ========================================
// Navigation & UI Types
// ========================================
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string | number;
  children?: NavItem[];
  roles?: Role[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

// ========================================
// Filter & Search Types
// ========================================
export interface LessonFilters {
  studentId?: string;
  teacherId?: string;
  status?: LessonStatus;
  dateFrom?: Date;
  dateTo?: Date;
  duration?: {
    min?: number;
    max?: number;
  };
}

export interface LibraryFilters {
  category?: LibraryCategory;
  isPublic?: boolean;
  teacherId?: string;
  tags?: string[];
  search?: string;
}

export interface StudentFilters {
  teacherId?: string;
  isActive?: boolean;
  joinedAfter?: Date;
  search?: string;
}

// PaymentFilters removed - using invoice system instead

// ========================================
// Utility Types
// ========================================
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Generic ID type for better type safety
export type ID = string;

// Date range utility type
export interface DateRange {
  from: Date;
  to: Date;
}

// File upload types
export interface FileUploadConfig {
  maxSize: number; // in bytes
  allowedTypes: string[];
  maxFiles?: number;
}

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
}

// ========================================
// Component Props Types
// ========================================
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface FormState<T = any> extends LoadingState {
  data?: T;
  isDirty?: boolean;
  isValid?: boolean;
}

// ========================================
// Scheduling Types
// ========================================
export interface TimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  price: number; // in cents
  isAvailable: boolean;
  isRecurring?: boolean;
  timezone: string;
}

export interface RecurringBooking {
  frequency: 'WEEKLY' | 'BIWEEKLY';
  endDate?: Date;
  maxOccurrences?: number;
}

// ========================================
// Recurring Monthly Slot Types
// ========================================
export type RecurringSlot = PrismaRecurringSlot & {
  teacher?: TeacherProfile;
  student?: StudentProfile;
  subscriptions?: SlotSubscription[];
  lessons?: Lesson[];
};

export type SlotSubscription = PrismaSlotSubscription & {
  slot?: RecurringSlot;
  student?: StudentProfile;
  billingRecords?: MonthlyBilling[];
};

export type MonthlyBilling = PrismaMonthlyBilling & {
  subscription?: SlotSubscription;
  student?: StudentProfile;
  teacher?: TeacherProfile;
};

export interface SlotAvailability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "09:00"
  duration: 30 | 60; // minutes
  monthlyRate: number; // cents
  isAvailable: boolean;
  conflictReason?: string;
}

export interface CreateSlotBookingData {
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  duration: 30 | 60;
  startMonth: string; // "2025-01"
  endMonth?: string; // "2025-12" or null for ongoing
}

export interface SlotBookingResponse {
  success: boolean;
  slot?: RecurringSlot;
  subscription?: SlotSubscription;
  error?: string;
  conflictingSlots?: RecurringSlot[];
}

export interface MonthlySlotSummary {
  month: string; // "2025-01"
  slots: Array<{
    slotId: string;
    dayOfWeek: number;
    startTime: string;
    duration: number;
    studentName: string;
    expectedLessons: number;
    actualLessons: number;
    monthlyRate: number;
    status: SubscriptionStatus;
    billingStatus: BillingStatus;
  }>;
  totalRevenue: number; // cents
  totalExpectedLessons: number;
  totalActualLessons: number;
}

export interface SlotCancellationData {
  slotId: string;
  cancelDate: Date;
  reason?: string;
  refundAmount?: number; // cents
}

export interface MonthlyBillingCalculation {
  month: string;
  daysInMonth: number;
  occurrences: number; // how many times this slot occurs in the month
  ratePerLesson: number; // monthlyRate / occurrences
  totalAmount: number; // cents
}

// ========================================
// Stripe Integration Types
// ========================================
export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

// ========================================
// Email/Notification Types
// ========================================
export interface NotificationData {
  type:
    | "lesson_reminder"
    | "payment_due"
    | "lesson_cancelled"
    | "new_assignment";
  recipient: {
    email: string;
    name: string;
    role: Role;
  };
  data: Record<string, any>;
  scheduled_for?: Date;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
  variables: Record<string, string>;
}
