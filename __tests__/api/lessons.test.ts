/**
 * @fileoverview Integration tests for /api/lessons endpoints
 *
 * Tests authentication, authorization, validation, and data isolation
 * for lesson management API routes.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  mockTeacherSession,
  mockStudentSession,
  mockLesson,
  mockTeacherProfile,
  mockStudentProfile,
  createMockRequest,
} from '../setup/test-helpers';

// Mock getServerSession from next-auth (must be defined inline in factory)
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}));

// Mock Next.js cache functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Get reference to mocked getServerSession after mock is set up
import { getServerSession } from 'next-auth';
const mockGetServerSession = vi.mocked(getServerSession);

// Create mock Prisma client in the factory function
vi.mock('@/lib/db', () => {
  return {
    prisma: {
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
    },
  };
});

// Get reference to mocked prisma after mock is set up
const dbModule = await import('@/lib/db');
// Apply vi.mocked to individual prisma methods for proper typing
const mockPrisma = {
  lesson: vi.mocked(dbModule.prisma.lesson),
  teacherProfile: vi.mocked(dbModule.prisma.teacherProfile),
  studentProfile: vi.mocked(dbModule.prisma.studentProfile),
  user: vi.mocked(dbModule.prisma.user),
};

// Mock cache functions
vi.mock('@/lib/cache', () => ({
  createCachedResponse: vi.fn((data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  ),
  generateETag: vi.fn(() => 'test-etag'),
  isCacheValid: vi.fn(() => false),
  createNotModifiedResponse: vi.fn(() => new Response(null, { status: 304 })),
  CacheKeys: {
    teacherLessons: vi.fn(() => 'teacher-lessons-key'),
    studentLessons: vi.fn(() => 'student-lessons-key'),
  },
  lessonCache: {
    set: vi.fn(),
    get: vi.fn(),
  },
  getCachedData: vi.fn(async (key: string, fetcher: () => Promise<unknown>) => fetcher()),
  CACHE_DURATIONS: {
    DYNAMIC_SHORT: 60,
  },
  invalidateLessonCache: vi.fn(),
}));

// Mock pagination functions
vi.mock('@/lib/pagination', () => ({
  getPaginationParams: vi.fn(() => ({ page: 1, limit: 20 })),
  getPrismaOffsetPagination: vi.fn(() => ({ skip: 0, take: 20 })),
  createPaginatedResponse: vi.fn(async (data: unknown[]) => ({
    data,
    pagination: {
      page: 1,
      limit: 20,
      total: data.length,
      totalPages: 1,
    },
  })),
  addPaginationHeaders: vi.fn(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLog: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  log: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock sanitize functions
vi.mock('@/lib/sanitize', () => ({
  sanitizeRichText: vi.fn((text: string) => text),
  sanitizePlainText: vi.fn((text: string) => text),
}));

// Mock request validation
vi.mock('@/lib/request-validation', () => ({
  validateJsonSize: vi.fn(() => null),
}));

// Import route handlers after mocks are set up
import { GET, POST } from '@/app/api/lessons/route';
import { GET as GET_BY_ID, DELETE } from '@/app/api/lessons/[id]/route';

describe('GET /api/lessons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/lessons');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns lessons for authenticated teacher', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    mockPrisma.lesson.findMany.mockResolvedValue([mockLesson]);
    mockPrisma.lesson.count.mockResolvedValue(1);

    const request = createMockRequest('http://localhost:3000/api/lessons');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe(mockLesson.id);
    expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherId: mockTeacherProfile.id,
        }),
      })
    );
  });

  it('returns only student\'s own lessons for authenticated student', async () => {
    mockGetServerSession.mockResolvedValue(mockStudentSession);
    mockPrisma.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
    mockPrisma.lesson.findMany.mockResolvedValue([mockLesson]);
    mockPrisma.lesson.count.mockResolvedValue(1);

    const request = createMockRequest('http://localhost:3000/api/lessons');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveLength(1);
    expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: mockStudentProfile.id,
        }),
      })
    );
  });

  it('returns 404 when teacher profile is not found', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/lessons');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Teacher profile not found');
  });
});

describe('POST /api/lessons', () => {
  const validLessonData = {
    studentId: 'student-profile-id',
    date: '2025-03-20T10:00:00Z',
    duration: 30,
    notes: '<p>Great progress on chord changes</p>',
    homework: 'Practice G to C transitions',
    status: 'COMPLETED',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/lessons', {
      method: 'POST',
      body: validLessonData,
    });
    const response = await POST(request as NextRequest);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 401 when user is not a teacher', async () => {
    mockGetServerSession.mockResolvedValue(mockStudentSession);

    const request = createMockRequest('http://localhost:3000/api/lessons', {
      method: 'POST',
      body: validLessonData,
    });
    const response = await POST(request as NextRequest);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('creates lesson with valid data and returns 201', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    mockPrisma.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
    mockPrisma.lesson.create.mockResolvedValue(mockLesson);

    const request = createMockRequest('http://localhost:3000/api/lessons', {
      method: 'POST',
      body: validLessonData,
    });
    const response = await POST(request as NextRequest);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.lesson).toBeDefined();
    expect(data.lesson.id).toBe(mockLesson.id);
    expect(mockPrisma.lesson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teacherId: mockTeacherProfile.id,
          studentId: validLessonData.studentId,
          duration: validLessonData.duration,
        }),
      })
    );
  });

  it('returns 400 with validation errors for invalid data', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);

    const invalidData = {
      studentId: '', // Invalid: empty string
      date: 'invalid-date', // Invalid: not a valid date
      duration: 5, // Invalid: below minimum (15 minutes)
    };

    const request = createMockRequest('http://localhost:3000/api/lessons', {
      method: 'POST',
      body: invalidData,
    });
    const response = await POST(request as NextRequest);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
    // Zod validation errors should be present
    expect(typeof data.error).toBe('string');
  });

  it('returns 404 when student not found or not assigned to teacher', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    mockPrisma.studentProfile.findUnique.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/lessons', {
      method: 'POST',
      body: validLessonData,
    });
    const response = await POST(request as NextRequest);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Student not found or not assigned to you');
  });

  it('returns 404 when teacher profile is not found', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/lessons', {
      method: 'POST',
      body: validLessonData,
    });
    const response = await POST(request as NextRequest);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Teacher profile not found');
  });
});

describe('GET /api/lessons/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/lessons/lesson-id-123');
    const params = Promise.resolve({ id: 'lesson-id-123' });
    const response = await GET_BY_ID(request as NextRequest, { params });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when lesson does not exist', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    mockPrisma.lesson.findFirst.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/lessons/non-existent-id');
    const params = Promise.resolve({ id: 'non-existent-id' });
    const response = await GET_BY_ID(request as NextRequest, { params });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Lesson not found');
  });

  it('returns lesson when teacher owns it', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    mockPrisma.lesson.findFirst.mockResolvedValue(mockLesson);

    const request = createMockRequest('http://localhost:3000/api/lessons/lesson-id-123');
    const params = Promise.resolve({ id: 'lesson-id-123' });
    const response = await GET_BY_ID(request as NextRequest, { params });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.lesson.id).toBe(mockLesson.id);
    expect(mockPrisma.lesson.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'lesson-id-123',
          teacherId: mockTeacherProfile.id,
        }),
      })
    );
  });

  it('returns lesson when student owns it', async () => {
    mockGetServerSession.mockResolvedValue(mockStudentSession);
    mockPrisma.studentProfile.findUnique.mockResolvedValue(mockStudentProfile);
    mockPrisma.lesson.findFirst.mockResolvedValue(mockLesson);

    const request = createMockRequest('http://localhost:3000/api/lessons/lesson-id-123');
    const params = Promise.resolve({ id: 'lesson-id-123' });
    const response = await GET_BY_ID(request as NextRequest, { params });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.lesson.id).toBe(mockLesson.id);
    expect(mockPrisma.lesson.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'lesson-id-123',
          studentId: mockStudentProfile.id,
        }),
      })
    );
  });
});

describe('DELETE /api/lessons/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/lessons/lesson-id-123', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'lesson-id-123' });
    const response = await DELETE(request as NextRequest, { params });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when deleting non-existent lesson', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.lesson.findUnique.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/lessons/non-existent-id', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'non-existent-id' });
    const response = await DELETE(request as NextRequest, { params });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Lesson not found');
  });

  it('successfully cancels lesson when user has access', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.lesson.findUnique.mockResolvedValue({
      ...mockLesson,
      status: 'SCHEDULED',
    });
    mockPrisma.lesson.update.mockResolvedValue({
      ...mockLesson,
      status: 'CANCELLED',
    });

    const request = createMockRequest('http://localhost:3000/api/lessons/lesson-id-123', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'lesson-id-123' });
    const response = await DELETE(request as NextRequest, { params });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Lesson cancelled successfully');
    expect(mockPrisma.lesson.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lesson-id-123' },
        data: { status: 'CANCELLED' },
      })
    );
  });

  it('returns 400 when trying to cancel already cancelled lesson', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.lesson.findUnique.mockResolvedValue({
      ...mockLesson,
      status: 'CANCELLED',
    });

    const request = createMockRequest('http://localhost:3000/api/lessons/lesson-id-123', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'lesson-id-123' });
    const response = await DELETE(request as NextRequest, { params });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Lesson already cancelled');
  });

  it('returns 403 when user does not have access to lesson', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    // Return lesson that belongs to a different teacher (with included relations)
    mockPrisma.lesson.findUnique.mockResolvedValue({
      ...mockLesson,
      teacher: {
        userId: 'different-teacher-user-id',
      },
      student: {
        userId: 'different-student-user-id',
      },
    } as any);

    const request = createMockRequest('http://localhost:3000/api/lessons/lesson-id-123', {
      method: 'DELETE',
    });
    const params = Promise.resolve({ id: 'lesson-id-123' });
    const response = await DELETE(request as NextRequest, { params });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });
});
