// ========================================
// FILE: middleware.ts (Route Protection & Security)
// ========================================
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applySecurityHeaders, defaultSecurityConfig } from "@/lib/security-headers";
// import { getCSRFToken, addCSRFCookie, checkCSRF } from "@/lib/csrf"; // Temporarily disabled for Edge Runtime compatibility

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
    // Note: Using console.warn in middleware since Winston doesn't work in Edge Runtime
    console.warn(`⚠️ Request size limit exceeded: ${pathname} (${Math.round(size / 1024)}KB > ${Math.round(limit / 1024)}KB)`);
    
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
  async function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    console.log('Middleware check:', {
      pathname,
      hasToken: !!token,
      tokenRole: token?.role
    });

    // Check request size limits first (security check)
    const sizeCheck = checkRequestSizeLimit(req);
    if (sizeCheck) {
      return sizeCheck;
    }

    // TODO: Re-enable CSRF protection after fixing Edge Runtime compatibility
    // Check CSRF protection for API routes
    // if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    //   const method = req.method || 'GET';
    //   if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    //     const isValidCSRF = await checkCSRF(req);
    //     if (!isValidCSRF) {
    //       console.warn(`CSRF token validation failed for ${pathname}`);
    //       return NextResponse.json(
    //         { error: 'Invalid security token. Please refresh and try again.' },
    //         { status: 403 }
    //       );
    //     }
    //   }
    // }

    // Admin routes (allow both ADMIN and TEACHER - teachers will be checked for isAdmin flag in the route)
    if (pathname.startsWith("/admin")) {
      if (token?.role !== "ADMIN" && token?.role !== "TEACHER") {
        const response = NextResponse.redirect(new URL("/dashboard", req.url));
        return applySecurityHeaders(response, defaultSecurityConfig);
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
        const response = NextResponse.redirect(new URL("/dashboard", req.url));
        return applySecurityHeaders(response, defaultSecurityConfig);
      }
    }

    // Student-specific restrictions (if any)
    if (pathname.startsWith("/dashboard/teacher")) {
      if (token?.role !== "TEACHER" && token?.role !== "ADMIN") {
        const response = NextResponse.redirect(new URL("/dashboard", req.url));
        return applySecurityHeaders(response, defaultSecurityConfig);
      }
    }

    if (pathname.startsWith("/dashboard/student")) {
      if (token?.role !== "STUDENT" && token?.role !== "ADMIN") {
        const response = NextResponse.redirect(new URL("/dashboard", req.url));
        return applySecurityHeaders(response, defaultSecurityConfig);
      }
    }

    // API route protection (allow both ADMIN and TEACHER - teachers will be checked for isAdmin flag in the route)
    if (pathname.startsWith("/api/admin")) {
      if (token?.role !== "ADMIN" && token?.role !== "TEACHER") {
        const response = NextResponse.json(
          { error: "Admin access required" },
          { status: 403 }
        );
        return applySecurityHeaders(response, defaultSecurityConfig);
      }
    }

    if (pathname.startsWith("/api/teacher")) {
      if (token?.role !== "TEACHER" && token?.role !== "ADMIN") {
        const response = NextResponse.json(
          { error: "Teacher access required" },
          { status: 403 }
        );
        return applySecurityHeaders(response, defaultSecurityConfig);
      }
    }

    // Create response and apply security headers
    let response = NextResponse.next();

    // TODO: Re-enable CSRF token generation after fixing Edge Runtime compatibility
    // Generate and attach CSRF token for authenticated users
    // if (token && !pathname.startsWith('/api/')) {
    //   const csrfToken = await getCSRFToken(req);
    //   if (csrfToken) {
    //     addCSRFCookie(response, csrfToken);
    //   }
    // }

    return applySecurityHeaders(response, defaultSecurityConfig);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        console.log('Middleware authorized check:', {
          pathname: req.nextUrl.pathname,
          hasToken: !!token,
          tokenRole: token?.role
        });
        const { pathname } = req.nextUrl;

        // Public routes that don't require authentication
        if (
          pathname === "/" ||
          pathname.startsWith("/auth") ||
          pathname === "/login" ||
          pathname === "/register" ||
          pathname.startsWith("/_next") ||
          pathname.startsWith("/.well-known") ||
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
