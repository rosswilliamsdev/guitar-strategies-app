/**
 * @fileoverview Test helpers for API integration tests
 *
 * Provides mock functions for NextAuth sessions and Prisma database operations.
 * Allows tests to simulate authenticated/unauthenticated requests and database responses.
 */

import { Session } from 'next-auth';
import { vi } from 'vitest';

/**
 * Mock teacher profile for testing
 */
export const mockTeacherProfile = {
  id: 'teacher-profile-id',
  userId: 'teacher-user-id',
  bio: 'Experienced guitar teacher',
  hourlyRate: 6000,
  isActive: true,
  venmoHandle: '@testteacher',
  paypalEmail: 'teacher@paypal.com',
  zelleEmail: null,
  timezone: 'America/Chicago',
  phoneNumber: '555-0100',
  profileImageUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isAdmin: true,
};

/**
 * Mock student profile for testing
 */
export const mockStudentProfile = {
  id: 'student-profile-id',
  userId: 'student-user-id',
  teacherId: 'teacher-profile-id',
  joinedAt: new Date('2025-01-01'),
  goals: 'Learn to play guitar',
  instrument: 'guitar',
  phoneNumber: '555-0123',
  parentEmail: null,
  emergencyContact: null,
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  emailOnInvoice: true,
  emailOnLessonComplete: true,
  emailOnLessonReminder: true,
  user: {
    id: 'student-user-id',
    email: 'student@example.com',
    name: 'Test Student',
  },
};

/**
 * Mock teacher session for testing
 */
export const mockTeacherSession: Session = {
  user: {
    id: 'teacher-user-id',
    email: 'teacher@example.com',
    name: 'Test Teacher',
    role: 'TEACHER',
    teacherProfile: mockTeacherProfile,
    isAdmin: true,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

/**
 * Mock student session for testing
 */
export const mockStudentSession: Session = {
  user: {
    id: 'student-user-id',
    email: 'student@example.com',
    name: 'Test Student',
    role: 'STUDENT',
    studentProfile: mockStudentProfile,
    isAdmin: false,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * Mock database responses for lessons
 */
export const mockLesson = {
  id: 'lesson-id-123',
  teacherId: 'teacher-profile-id',
  studentId: 'student-profile-id',
  date: new Date('2025-03-20T10:00:00Z'),
  duration: 30,
  notes: '<p>Great progress on chord changes</p>',
  homework: 'Practice G to C transitions',
  progress: 'Improved rhythm accuracy',
  status: 'COMPLETED' as const,
  focusAreas: 'Chord transitions,Rhythm',
  songsPracticed: 'Wonderwall',
  nextSteps: 'Work on barre chords',
  studentRating: 5,
  teacherRating: 4,
  createdAt: new Date('2025-03-20T10:30:00Z'),
  updatedAt: new Date('2025-03-20T10:30:00Z'),
  isRecurring: false,
  price: 3000,
  recurringId: null,
  recurringSlotId: null,
  timezone: 'America/Chicago',
  checklistItems: null,
  version: 1,
  student: {
    id: 'student-profile-id',
    userId: 'student-user-id',
    user: {
      id: 'student-user-id',
      email: 'student@example.com',
      name: 'Test Student',
    },
  },
  teacher: {
    id: 'teacher-profile-id',
    userId: 'teacher-user-id',
    user: {
      id: 'teacher-user-id',
      email: 'teacher@example.com',
      name: 'Test Teacher',
    },
  },
  attachments: [],
  links: [],
};

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Request {
  const method = options?.method || 'GET';
  const headers = new Headers(options?.headers || {});

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return new Request(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Mock getServerSession to return a specific session
 */
export function mockGetServerSession(session: Session | null) {
  return vi.fn().mockResolvedValue(session);
}

/**
 * Create mock Prisma client with common database operations
 */
export function createMockPrisma() {
  return {
    lesson: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    teacherProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    studentProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}
