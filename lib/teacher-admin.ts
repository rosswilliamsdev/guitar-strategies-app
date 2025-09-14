/**
 * @fileoverview Teacher Admin utilities for handling dual teacher-admin roles.
 *
 * This module provides helper functions for identifying and managing teacher-admin
 * users who have both teaching and administrative capabilities.
 */

import { Session } from "next-auth";
import { Role, TeacherProfile } from "@prisma/client";

/**
 * Check if a user has admin privileges
 * Either they're an ADMIN role or a TEACHER with isAdmin = true
 */
export function hasAdminAccess(session: Session | null): boolean {
  if (!session?.user) return false;

  const { role, teacherProfile } = session.user;

  // Traditional admin role
  if (role === 'ADMIN') return true;

  // Teacher with admin privileges
  if (role === 'TEACHER' && teacherProfile?.isAdmin) return true;

  return false;
}

/**
 * Check if a user has teacher access
 * Either they're a TEACHER role or an ADMIN (admins can act as teachers)
 */
export function hasTeacherAccess(session: Session | null): boolean {
  if (!session?.user) return false;

  const { role } = session.user;

  return role === 'TEACHER' || role === 'ADMIN';
}

/**
 * Check if a user is a teacher-admin (teacher with admin privileges)
 */
export function isTeacherAdmin(session: Session | null): boolean {
  if (!session?.user) return false;

  const { role, teacherProfile } = session.user;

  return role === 'TEACHER' && teacherProfile?.isAdmin === true;
}

/**
 * Get the user's effective role for UI purposes
 * Returns 'TEACHER_ADMIN' for teachers with admin privileges
 */
export function getEffectiveRole(session: Session | null): Role | 'TEACHER_ADMIN' | null {
  if (!session?.user) return null;

  const { role, teacherProfile } = session.user;

  if (role === 'TEACHER' && teacherProfile?.isAdmin) {
    return 'TEACHER_ADMIN';
  }

  return role;
}

/**
 * Check if a user can access admin routes
 * This is the function to use in middleware and route protection
 */
export function canAccessAdminRoutes(session: Session | null): boolean {
  return hasAdminAccess(session);
}

/**
 * Check if a user can access teacher routes
 * This is the function to use in middleware and route protection
 */
export function canAccessTeacherRoutes(session: Session | null): boolean {
  return hasTeacherAccess(session);
}

/**
 * Get display name for the user's role
 */
export function getRoleDisplayName(session: Session | null): string {
  if (!session?.user) return 'Guest';

  const effectiveRole = getEffectiveRole(session);

  switch (effectiveRole) {
    case 'ADMIN': return 'Admin';
    case 'TEACHER': return 'Teacher';
    case 'TEACHER_ADMIN': return 'Teacher Admin';
    case 'STUDENT': return 'Student';
    default: return 'User';
  }
}