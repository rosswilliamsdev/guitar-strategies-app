// ========================================
// FILE: middleware.ts (Route Protection)
// ========================================
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin-only routes
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Teacher-only routes
    if (
      pathname.startsWith("/students") ||
      pathname.startsWith("/invoices") ||
      pathname.startsWith("/library") ||
      pathname.startsWith("/new-lesson")
    ) {
      if (token?.role !== "TEACHER" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Student-specific restrictions (if any)
    if (pathname.startsWith("/dashboard/teacher")) {
      if (token?.role !== "TEACHER" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if (pathname.startsWith("/dashboard/student")) {
      if (token?.role !== "STUDENT" && token?.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // API route protection
    if (pathname.startsWith("/api/admin")) {
      if (token?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
      }
    }

    if (pathname.startsWith("/api/teacher")) {
      if (token?.role !== "TEACHER" && token?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Teacher access required" },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes that don't require authentication
        if (
          pathname === "/" ||
          pathname.startsWith("/auth") ||
          pathname === "/login" ||
          pathname === "/register" ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/favicon.ico") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/cron")
        ) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
