import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * Check if the current user has admin access
 * (either ADMIN role or TEACHER with admin flag)
 */
export async function hasAdminAccess(): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return false;
  }

  return session.user.role === "ADMIN" ||
    (session.user.role === "TEACHER" && session.user.teacherProfile?.isAdmin === true);
}

/**
 * Get current session and verify admin access
 * Returns null if no access
 */
export async function getAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  const hasAccess = session.user.role === "ADMIN" ||
    (session.user.role === "TEACHER" && session.user.teacherProfile?.isAdmin === true);

  return hasAccess ? session : null;
}