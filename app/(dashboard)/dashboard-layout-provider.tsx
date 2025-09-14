"use client";

import { useState, useEffect, ReactNode } from "react";
import { User } from "next-auth";
import { ViewModeProvider } from "./dashboard/view-mode-context";

interface DashboardLayoutProviderProps {
  children: ReactNode;
  user: User;
}

export function DashboardLayoutProvider({ children, user }: DashboardLayoutProviderProps) {
  const [viewMode, setViewMode] = useState<"teacher" | "admin">("teacher");

  // Check if user is a teacher-admin (teacher with admin privileges)
  const isTeacherAdmin = user.role === 'TEACHER' && user.teacherProfile?.isAdmin === true;

  // Load saved view preference from localStorage (only for teacher-admins)
  useEffect(() => {
    if (isTeacherAdmin) {
      const savedView = localStorage.getItem("dashboardView");
      if (savedView === "admin" || savedView === "teacher") {
        setViewMode(savedView);
      }
    }
  }, [isTeacherAdmin]);

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