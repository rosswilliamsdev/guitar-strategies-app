"use client";

import { useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { User } from "next-auth";
import { ViewModeProvider } from "./dashboard/view-mode-context";

interface DashboardLayoutProviderProps {
  children: ReactNode;
  user: User;
}

export function DashboardLayoutProvider({ children, user }: DashboardLayoutProviderProps) {
  const [viewMode, setViewMode] = useState<"teacher" | "admin">("teacher");
  const pathname = usePathname();

  // Check if user is a teacher-admin (teacher with admin privileges)
  const isTeacherAdmin = user.role === 'TEACHER' && user.teacherProfile?.isAdmin === true;

  // Load saved view preference from localStorage (only for teacher-admins)
  // Also check URL path to determine view mode
  useEffect(() => {
    if (isTeacherAdmin) {
      // Check if we're on an admin page
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.startsWith('/admin/')) {
          setViewMode("admin");
          return;
        }
      }

      // Otherwise load from localStorage
      const savedView = localStorage.getItem("dashboardView");
      if (savedView === "admin" || savedView === "teacher") {
        setViewMode(savedView);
      }
    }
  }, [isTeacherAdmin]);

  // Monitor pathname changes to automatically switch view mode
  useEffect(() => {
    if (isTeacherAdmin) {
      if (pathname.startsWith('/admin/')) {
        setViewMode("admin");
      } else if (!pathname.startsWith('/admin/') && pathname !== '/dashboard') {
        // For teacher pages, switch to teacher view
        setViewMode("teacher");
      }
      // For dashboard, keep the current view mode to preserve user choice
    }
  }, [pathname, isTeacherAdmin, setViewMode]);

  // Save view preference to localStorage (only for teacher-admins)
  useEffect(() => {
    if (isTeacherAdmin) {
      localStorage.setItem("dashboardView", viewMode);
    }
  }, [viewMode, isTeacherAdmin]);

  // Only provide context for teacher-admins
  if (isTeacherAdmin) {
    return (
      <ViewModeProvider viewMode={viewMode} setViewMode={setViewMode} isTeacherAdmin={true}>
        {children}
      </ViewModeProvider>
    );
  }

  // For non-teacher-admins, render children without context
  return <>{children}</>;
}