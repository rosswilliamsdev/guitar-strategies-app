export const USER_ROLES = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = keyof typeof USER_ROLES;

export const ROLE_COLORS = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
} as const;

export const ROLE_PERMISSIONS = {
  STUDENT: {
    canViewOwnLessons: true,
    canViewOwnRecommendations: true,
    canAccessLibrary: true,
    canManageLessons: false,
    canManageStudents: false,
    canManagePayments: false,
  },
  TEACHER: {
    canViewOwnLessons: true,
    canViewOwnRecommendations: true,
    canAccessLibrary: true,
    canManageLessons: true,
    canManageStudents: true,
    canManagePayments: true,
    canScheduleLessons: true,
    canUploadFiles: true,
  },
  ADMIN: {
    canViewAllLessons: true,
    canViewAllRecommendations: true,
    canAccessLibrary: true,
    canManageLessons: true,
    canManageStudents: true,
    canManagePayments: true,
    canScheduleLessons: true,
    canUploadFiles: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canManageSystem: true,
  },
} as const;