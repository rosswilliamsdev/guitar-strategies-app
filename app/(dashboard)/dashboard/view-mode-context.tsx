"use client";

import { createContext, useContext, ReactNode } from "react";

type ViewMode = "teacher" | "admin";

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isTeacherAdmin: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

interface ViewModeProviderProps {
  children: ReactNode;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isTeacherAdmin: boolean;
}

export function ViewModeProvider({ children, viewMode, setViewMode, isTeacherAdmin }: ViewModeProviderProps) {
  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, isTeacherAdmin }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}