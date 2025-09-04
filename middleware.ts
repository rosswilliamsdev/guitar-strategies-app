// ========================================
// FILE: middleware.ts (Route Protection & Security)
// ========================================
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Request size limits (in bytes)
const LIMITS = {
  // General API requests (JSON payloads)
  DEFAULT: 1024 * 1024 * 1, // 1MB
  
  // File upload endpoints
  FILE_UPLOAD: 1024 * 1024 * 10, // 10MB (matches current library upload limit)
  
  // Rich text content (lesson notes, etc.)
  RICH_TEXT: 1024 * 50, // 50KB (enough for 5000 chars + HTML markup)
  
  // Form submissions
  FORM_DATA: 1024 * 100, // 100KB
} as const;

// Check request size limits
function checkRequestSizeLimit(req: NextRequest): NextResponse | null {
  const contentLength = req.headers.get('content-length');
  const { pathname, method } = req.nextUrl;
  
  // Only check POST, PUT, PATCH requests with content
  if (!['POST', 'PUT', 'PATCH'].includes(method) || !contentLength) {
    return null;
  }
  
  const size = parseInt(contentLength, 10);
  let limit = LIMITS.DEFAULT;
  
  // Set specific limits for different endpoints
  if (pathname.includes('/api/lessons/attachments') || 
      pathname.includes('/api/library')) {
    limit = LIMITS.FILE_UPLOAD;
  } else if (pathname.includes('/api/lessons') && 
             (pathname.includes('/notes') || method === 'POST' || method === 'PUT')) {
    limit = LIMITS.RICH_TEXT;
  } else if (pathname.includes('/api/settings') || 
             pathname.includes('/api/auth') ||
             pathname.includes('/api/admin')) {
    limit = LIMITS.FORM_DATA;
  }
  
  // Check if request exceeds limit
  if (size > limit) {
    console.warn(`Request size limit exceeded: ${size} bytes (limit: ${limit}) for ${pathname}`);
    
    return NextResponse.json(
      { 
        error: "Request too large",
        message: `Request size (${Math.round(size / 1024)}KB) exceeds limit (${Math.round(limit / 1024)}KB)`,
        limit: limit,
        size: size
      },
      { 
        status: 413,
        headers: {
          'Retry-After': '60', // Client can retry after 1 minute
        }
      }
    );
  }
  
  return null;
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    
    // Check request size limits first (security check)
    const sizeCheck = checkRequestSizeLimit(req);
    if (sizeCheck) {
      return sizeCheck;
    }

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
      pathname.startsWith("/new-lesson") ||
      pathname.startsWith("/scheduling")
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
          pathname.startsWith("/api/cron") ||
          pathname.startsWith("/api/health")
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
