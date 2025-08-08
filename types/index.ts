/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  User as PrismaUser,
  TeacherProfile as PrismaTeacherProfile,
  StudentProfile as PrismaStudentProfile,
  Lesson as PrismaLesson,
  LibraryItem as PrismaLibraryItem,
  Recommendation as PrismaRecommendation,
  Payment as PrismaPayment,
  Role,
  LessonStatus,
  RecommendationCategory,
  PaymentStatus,
  SkillLevel,
  LibraryCategory,
} from "@prisma/client";

// ========================================
// Base Types from Prisma
// ========================================
export type {
  Role,
  LessonStatus,
  RecommendationCategory,
  PaymentStatus,
  SkillLevel,
  LibraryCategory,
};

// ========================================
// Extended User Types
// ========================================
export type User = PrismaUser & {
  teacherProfile?: TeacherProfile;
  studentProfile?: StudentProfile;
};

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

export type StudentProfile = PrismaStudentProfile & {
  user?: PrismaUser;
  teacher?: TeacherProfile;
  lessons?: Lesson[];
  _count?: {
    lessons: number;
    payments: number;
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
// Library Types
// ========================================
export type LibraryItem = PrismaLibraryItem & {
  teacher?: TeacherProfile;
};

export interface CreateLibraryItemData {
  title: string;
  description?: string;
  category: LibraryCategory;
  difficulty?: SkillLevel;
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

// ========================================
// Payment Types
// ========================================
export type Payment = PrismaPayment & {
  teacher?: TeacherProfile;
  student?: StudentProfile;
};

export interface CreatePaymentData {
  studentId: string;
  amount: number;
  month: string;
  description?: string;
  lessonsIncluded?: number;
}

export interface PaymentSummary {
  totalAmount: number;
  completedPayments: number;
  pendingPayments: number;
  monthlyBreakdown: Array<{
    month: string;
    amount: number;
    status: PaymentStatus;
    lessonsCount: number;
  }>;
}

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
    skillLevel: SkillLevel;
    joinedDate: Date;
    totalPracticeTime: number;
    completedAssignments: number;
  };
  upcomingPayments: Payment[];
}

export interface LessonStats {
  totalLessons: number;
  averageDuration: number;
  averageRating: number;
  skillProgression: Array<{
    date: Date;
    skillLevel: SkillLevel;
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
  calendlyUrl?: string;
  // Student-specific fields
  teacherId?: string;
  skillLevel?: SkillLevel;
  goals?: string;
  phoneNumber?: string;
  parentEmail?: string;
}

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  bio?: string;
  hourlyRate?: number;
  calendlyUrl?: string;
  skillLevel?: SkillLevel;
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
  difficulty?: SkillLevel;
  isPublic?: boolean;
  teacherId?: string;
  tags?: string[];
  search?: string;
}

export interface StudentFilters {
  teacherId?: string;
  skillLevel?: SkillLevel;
  isActive?: boolean;
  joinedAfter?: Date;
  search?: string;
}

export interface PaymentFilters {
  teacherId?: string;
  studentId?: string;
  status?: PaymentStatus;
  month?: string;
  amountRange?: {
    min?: number;
    max?: number;
  };
}

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
// Calendly Integration Types
// ========================================
export interface CalendlyEvent {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  event_type: string;
  location?: {
    type: string;
    location?: string;
  };
  invitees: Array<{
    email: string;
    name: string;
  }>;
}

export interface CalendlySettings {
  url: string;
  eventType: string;
  duration: number;
  timezone: string;
  prefillData?: {
    email?: string;
    name?: string;
    notes?: string;
  };
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
