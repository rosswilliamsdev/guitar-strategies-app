import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  sanitizeRichText,
  sanitizePlainText,
  sanitizeTitle,
  sanitizeEmail,
  sanitizeUrl,
  isSafeContent,
  stripHtml,
} from "@/lib/sanitize";
import { apiLog, emailLog } from '@/lib/logger';

/**
 * Test endpoint for XSS sanitization
 * GET /api/test/xss
 * 
 * Admin only - tests various XSS attack vectors and sanitization
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { testInput, type = "rich" } = body;

    if (!testInput) {
      return NextResponse.json(
        { error: "testInput is required" },
        { status: 400 }
      );
    }

    // Common XSS test vectors
    const xssTestVectors = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
      '<body onload="alert(\'XSS\')">',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<a href="javascript:alert(\'XSS\')">Click me</a>',
      '<input type="text" value="test" onfocus="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      '<div style="background:url(javascript:alert(\'XSS\'))">',
      '<object data="data:text/html,<script>alert(\'XSS\')</script>">',
    ];

    // Test the input
    let sanitized: string;
    let testResults: any = {
      original: testInput,
      type: type,
      isSafe: isSafeContent(testInput),
    };

    switch (type) {
      case "rich":
        sanitized = sanitizeRichText(testInput);
        testResults.sanitized = sanitized;
        testResults.stripped = stripHtml(sanitized);
        break;
      
      case "plain":
        sanitized = sanitizePlainText(testInput);
        testResults.sanitized = sanitized;
        break;
      
      case "title":
        sanitized = sanitizeTitle(testInput);
        testResults.sanitized = sanitized;
        break;
      
      case "email":
        sanitized = sanitizeEmail(testInput);
        testResults.sanitized = sanitized;
        testResults.isValidEmail = sanitized !== "";
        break;
      
      case "url":
        sanitized = sanitizeUrl(testInput);
        testResults.sanitized = sanitized;
        testResults.isValidUrl = sanitized !== "";
        break;
      
      case "batch":
        // Test all XSS vectors
        testResults.vectors = xssTestVectors.map(vector => ({
          input: vector,
          isSafe: isSafeContent(vector),
          sanitizedRich: sanitizeRichText(vector),
          sanitizedPlain: sanitizePlainText(vector),
        }));
        break;
      
      default:
        sanitized = sanitizePlainText(testInput);
        testResults.sanitized = sanitized;
    }

    // Check if sanitization removed content
    if (type !== "batch") {
      testResults.wasModified = testInput !== testResults.sanitized;
      testResults.lengthBefore = testInput.length;
      testResults.lengthAfter = testResults.sanitized?.length || 0;
      
      // Test if common XSS patterns were present
      testResults.detectedPatterns = {
        hadScript: /<script/i.test(testInput),
        hadEventHandler: /on\w+\s*=/i.test(testInput),
        hadJavascriptUrl: /javascript:/i.test(testInput),
        hadDataUrl: /data:text\/html/i.test(testInput),
        hadIframe: /<iframe/i.test(testInput),
      };
    }

    return NextResponse.json({
      success: true,
      message: "XSS sanitization test completed",
      results: testResults,
    });
  } catch (error) {
    apiLog.error('XSS test error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to show test documentation
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    endpoint: "/api/test/xss",
    method: "POST",
    description: "Test XSS sanitization functionality",
    requestBody: {
      testInput: "string - The input to test",
      type: "rich | plain | title | email | url | batch - Type of sanitization to test (default: rich)",
    },
    examples: {
      testScript: {
        testInput: '<script>alert("XSS")</script>Hello World',
        type: "rich",
      },
      testEmail: {
        testInput: "test@example.com<script>alert('XSS')</script>",
        type: "email",
      },
      testBatch: {
        testInput: "ignored",
        type: "batch",
      },
    },
    commonXssVectors: [
      '<script>alert("XSS")</script>',
      '<img src=x onerror="alert(\'XSS\')">',
      '<a href="javascript:alert(\'XSS\')">Click</a>',
      '"><script>alert("XSS")</script>',
    ],
  });
}