"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User } from "next-auth";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useViewMode } from "@/app/(dashboard)/dashboard/view-mode-context";

interface DashboardSidebarProps {
  user: User;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },

  { label: "Lessons", href: "/lessons", roles: ["TEACHER", "STUDENT"] },
  { label: "Checklists", href: "/curriculums", roles: ["TEACHER", "STUDENT"] },
  { label: "Library", href: "/library", roles: ["TEACHER", "STUDENT"] },
  {
    label: "Recommendations",
    href: "/recommendations",
    roles: ["TEACHER", "STUDENT"],
  },
  { label: "Students", href: "/students", roles: ["TEACHER"] },

  { label: "Schedule", href: "/schedule", roles: ["TEACHER"] },
  { label: "Invoices", href: "/invoices", roles: ["TEACHER"] },

  // TODO: Re-enable when admin and teacher roles are separate
  // { label: "Manage Teachers", href: "/admin/teachers", roles: ["ADMIN"] },
  { label: "Manage Students", href: "/admin/students", roles: ["ADMIN"] },
  // { label: "Manage Lessons", href: "/admin/lessons", roles: ["ADMIN"] },

  { label: "Platform Activity", href: "/admin/activity", roles: ["ADMIN"] },
  { label: "Manage Emails", href: "/admin/email-test", roles: ["ADMIN"] },
  { label: "Settings", href: "/admin/settings", roles: ["ADMIN"] },
  { label: "Settings", href: "/settings", roles: ["TEACHER", "STUDENT"] },
];

export function DashboardSidebar({
  user,
  isOpen = false,
  onClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  // Check if user is a teacher-admin (teacher with admin privileges)
  const isTeacherAdmin =
    user.role === "TEACHER" && user.teacherProfile?.isAdmin === true;

  // Try to get view mode context (only available for teacher-admins)
  let currentViewMode: "teacher" | "admin" | null = null;
  try {
    if (isTeacherAdmin) {
      const { viewMode } = useViewMode();
      currentViewMode = viewMode;
    }
  } catch {
    // Context not available, use default logic
  }

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true; // No role restriction

    // For teacher-admins with view mode context, show items based on current view
    if (isTeacherAdmin && currentViewMode) {
      if (currentViewMode === "teacher") {
        return item.roles.includes("TEACHER");
      } else if (currentViewMode === "admin") {
        return item.roles.includes("ADMIN");
      }
    }

    // Regular role filtering (for non-teacher-admins or when context unavailable)
    return item.roles.includes(user.role);
  });

  // Handle navigation clicks (close mobile menu)
  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 overflow-y-auto"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "bg-background border-r border-border transition-all duration-300 ease-in-out shadow-recessed bg-gradient-to-t from-gray-200 to-gray-50",
          // Desktop: always visible, fixed width, min-height for full page
          "lg:w-64 lg:translate-x-0 lg:min-h-screen",
          // Mobile: slide in/out from left, fixed position with max height and scroll
          "fixed inset-y-0 left-0 z-50 w-64 lg:relative",
          "flex flex-col max-h-screen lg:max-h-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-between items-center p-4 mb-4 border-b border-border flex-shrink-0 mx-auto">
          <Link
            href="/dashboard"
            className="text-xl font-semibold text-black"
            onClick={handleNavClick}
          >
            <img
              src="/GS_logo_noBG.png"
              alt="Guitar Strategies Logo"
              width={100}
              height={80}
            />
          </Link>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:block p-4 flex-shrink-0 mx-auto">
          <Link
            href="/dashboard"
            className="text-xl font-semibold text-black"
            onClick={handleNavClick}
          >
            <img
              src="/GS_logo_noBG.png"
              alt="Guitar Strategies Logo"
              width={100}
              height={80}
            />
          </Link>
        </div>

        {/* Scrollable navigation area */}
        <nav className="px-4 space-y-2 overflow-y-auto flex-1 lg:flex-none lg:overflow-visible lg:pb-20">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-turquoise-100 text-black font-medium shadow-md"
                  : "text-black hover:bg-muted hover:text-black",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom section - fixed on mobile, absolute on desktop */}
        <div className="p-4 border-t border-border shadow-sm flex-shrink-0 lg:absolute lg:bottom-0 lg:w-64 mt-5">
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start text-black hover:text-black"
              onClick={() =>
                signOut({
                  callbackUrl: "/login",
                  redirect: true,
                })
              }
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
