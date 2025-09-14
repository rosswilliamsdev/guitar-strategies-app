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
  { label: "Library", href: "/library", roles: ["TEACHER"] },
  {
    label: "Recommendations",
    href: "/recommendations",
    roles: ["TEACHER", "STUDENT"],
  },
  { label: "Students", href: "/students", roles: ["TEACHER"] },

  { label: "Schedule", href: "/schedule", roles: ["TEACHER"] },
  { label: "Invoices", href: "/invoices", roles: ["TEACHER"] },
  { label: "Manage Teachers", href: "/admin/teachers", roles: ["ADMIN"] },
  { label: "Manage Students", href: "/admin/students", roles: ["ADMIN"] },
  { label: "Manage Lessons", href: "/admin/lessons", roles: ["ADMIN"] },
  { label: "Platform Activity", href: "/admin/activity", roles: ["ADMIN"] },
  {
    label: "Background Jobs",
    href: "/admin/background-jobs",
    roles: ["ADMIN"],
  },
  { label: "Manage Emails", href: "/admin/email-test", roles: ["ADMIN"] },
  { label: "Settings", href: "/admin/settings", roles: ["ADMIN"] },
  { label: "Settings", href: "/settings", roles: ["TEACHER", "STUDENT"] },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  // Check if user is a teacher-admin (teacher with admin privileges)
  const isTeacherAdmin = user.role === 'TEACHER' && user.teacherProfile?.isAdmin === true;

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
        return item.roles.includes('TEACHER');
      } else if (currentViewMode === "admin") {
        return item.roles.includes('ADMIN');
      }
    }

    // Regular role filtering (for non-teacher-admins or when context unavailable)
    return item.roles.includes(user.role);
  });

  return (
    <aside className="w-64 bg-background border-r border-border min-h-screen">
      <div className="p-6">
        <Link
          href="/dashboard"
          className="text-xl font-semibold text-black"
        >
          Guitar Strategies
        </Link>
      </div>

      <nav className="px-4 space-y-2">
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-turquoise-100 text-black font-medium"
                : "text-black hover:bg-muted hover:text-black"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t border-border">
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
  );
}
