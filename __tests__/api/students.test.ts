/**
 * @fileoverview Integration tests for /api/students endpoints
 *
 * Tests authentication, authorization, and data isolation for student
 * management API routes. Ensures teachers only see their assigned students.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  mockTeacherSession,
  mockStudentSession,
  mockTeacherProfile,
  mockStudentProfile,
  createMockRequest,
} from '../setup/test-helpers';

// Mock getServerSession from next-auth (must be defined inline in factory)
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}));

// Get reference to mocked getServerSession after mock is set up
const { getServerSession: mockGetServerSession } = await import('next-auth');

// Create mock Prisma client in the factory function
vi.mock('@/lib/db', () => ({
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
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Get reference to mocked prisma after mock is set up
const { prisma: mockPrisma } = await import('@/lib/db');

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
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  apiLog: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock API wrapper
vi.mock('@/lib/api-wrapper', () => ({
  withApiMiddleware: vi.fn((handler: unknown) => handler),
}));

// Import route handler after mocks are set up
import { GET } from '@/app/api/students/route';

describe('GET /api/students', () => {
  const otherStudentProfile = {
    ...mockStudentProfile,
    id: 'other-student-id',
    userId: 'other-student-user-id',
    teacherId: 'other-teacher-id',
    user: {
      id: 'other-student-user-id',
      email: 'other@example.com',
      name: 'Other Student',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/students');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('teacher only sees their assigned students', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    // Return only students assigned to this teacher
    mockPrisma.studentProfile.findMany.mockResolvedValue([mockStudentProfile]);
    mockPrisma.studentProfile.count.mockResolvedValue(1);

    const request = createMockRequest('http://localhost:3000/api/students');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe(mockStudentProfile.id);
    expect(data.data[0].teacherId).toBe(mockTeacherProfile.id);

    // Verify query filters by teacher ID
    expect(mockPrisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherId: mockTeacherProfile.id,
          isActive: true,
        }),
      })
    );
  });

  it('teacher does not see students from other teachers', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    // Return empty array (no students belong to this teacher)
    mockPrisma.studentProfile.findMany.mockResolvedValue([]);
    mockPrisma.studentProfile.count.mockResolvedValue(0);

    const request = createMockRequest('http://localhost:3000/api/students');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveLength(0);

    // Should still query with teacher ID filter
    expect(mockPrisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teacherId: mockTeacherProfile.id,
        }),
      })
    );
  });

  it('returns 404 when teacher profile is not found', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(null);

    const request = createMockRequest('http://localhost:3000/api/students');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Teacher profile not found');
  });

  it('admin can see students with teacher filter', async () => {
    const adminSession = {
      ...mockTeacherSession,
      user: {
        ...mockTeacherSession.user,
        role: 'ADMIN' as const,
      },
    };

    mockGetServerSession.mockResolvedValue(adminSession);
    mockPrisma.studentProfile.findMany.mockResolvedValue([
      mockStudentProfile,
      otherStudentProfile,
    ]);
    mockPrisma.studentProfile.count.mockResolvedValue(2);

    const request = createMockRequest(
      'http://localhost:3000/api/students?teacherId=teacher-profile-id'
    );
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveLength(2);

    // Verify query includes teacherId filter from query params
    expect(mockPrisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          teacherId: 'teacher-profile-id',
        }),
      })
    );
  });

  it('admin can see all students without filter', async () => {
    const adminSession = {
      ...mockTeacherSession,
      user: {
        ...mockTeacherSession.user,
        role: 'ADMIN' as const,
      },
    };

    mockGetServerSession.mockResolvedValue(adminSession);
    mockPrisma.studentProfile.findMany.mockResolvedValue([
      mockStudentProfile,
      otherStudentProfile,
    ]);
    mockPrisma.studentProfile.count.mockResolvedValue(2);

    const request = createMockRequest('http://localhost:3000/api/students');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveLength(2);

    // Verify query only filters by isActive, no teacher filter
    expect(mockPrisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
        }),
      })
    );
  });

  it('returns empty array when teacher has no students', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    mockPrisma.studentProfile.findMany.mockResolvedValue([]);
    mockPrisma.studentProfile.count.mockResolvedValue(0);

    const request = createMockRequest('http://localhost:3000/api/students');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toEqual([]);
    expect(data.pagination.total).toBe(0);
  });

  it('includes user details with each student profile', async () => {
    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    mockPrisma.studentProfile.findMany.mockResolvedValue([mockStudentProfile]);
    mockPrisma.studentProfile.count.mockResolvedValue(1);

    const request = createMockRequest('http://localhost:3000/api/students');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data[0].user).toBeDefined();
    expect(data.data[0].user.id).toBe(mockStudentProfile.user.id);
    expect(data.data[0].user.email).toBe(mockStudentProfile.user.email);
    expect(data.data[0].user.name).toBe(mockStudentProfile.user.name);

    // Verify include clause includes user data
    expect(mockPrisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          user: expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              name: true,
              email: true,
            }),
          }),
        }),
      })
    );
  });

  it('respects pagination parameters', async () => {
    const { getPaginationParams, getPrismaOffsetPagination } = await import('@/lib/pagination');

    (getPaginationParams as ReturnType<typeof vi.fn>).mockReturnValue({
      page: 2,
      limit: 10,
    });
    (getPrismaOffsetPagination as ReturnType<typeof vi.fn>).mockReturnValue({
      skip: 10,
      take: 10,
    });

    mockGetServerSession.mockResolvedValue(mockTeacherSession);
    mockPrisma.teacherProfile.findUnique.mockResolvedValue(mockTeacherProfile);
    mockPrisma.studentProfile.findMany.mockResolvedValue([mockStudentProfile]);
    mockPrisma.studentProfile.count.mockResolvedValue(15);

    const request = createMockRequest('http://localhost:3000/api/students?page=2&limit=10');
    const response = await GET(request as NextRequest);

    expect(response.status).toBe(200);

    // Verify pagination was applied to query
    expect(mockPrisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });
});
