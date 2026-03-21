/**
 * Type definitions for test mocks to satisfy TypeScript compiler
 */

import { Mock } from 'vitest';

declare module 'next-auth' {
  export const getServerSession: Mock;
}

declare module '@/lib/db' {
  export const prisma: {
    lesson: {
      findMany: Mock;
      findFirst: Mock;
      findUnique: Mock;
      create: Mock;
      update: Mock;
      delete: Mock;
      count: Mock;
    };
    teacherProfile: {
      findUnique: Mock;
      findMany: Mock;
    };
    studentProfile: {
      findUnique: Mock;
      findMany: Mock;
      count: Mock;
    };
    user: {
      findUnique: Mock;
      create: Mock;
    };
  };
}
