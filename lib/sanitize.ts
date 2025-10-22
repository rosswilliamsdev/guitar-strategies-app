/**
 * XSS Sanitization Utility
 *
 * This module provides secure HTML sanitization to prevent XSS attacks
 * while preserving safe HTML formatting for rich text content.
 *
 * Note: Server-side uses a lightweight regex-based approach to avoid
 * ES Module issues with DOMPurify/jsdom in serverless environments.
 */

// Lazy load DOMPurify only in browser environment
let DOMPurify: any = null;

if (typeof window !== 'undefined') {
  // Client-side: Use full DOMPurify
  import('dompurify').then(module => {
    DOMPurify = module.default;
  });
}

/**
 * Server-side regex-based HTML sanitization (fallback)
 * Removes dangerous tags and attributes without requiring DOM
 */
function serverSanitizeHtml(html: string, allowedTags: string[] = []): string {
  if (!html) return '';

  let sanitized = String(html);

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'style'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (except images)
  sanitized = sanitized.replace(/data:(?!image\/)/gi, '');

  // If no tags allowed, strip all HTML
  if (allowedTags.length === 0) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  return sanitized;
}

/**
 * Configuration for DOMPurify to allow safe HTML tags and attributes
 * while removing dangerous elements and scripts.
 */
const RICH_TEXT_CONFIG: any = {
  // Allowed HTML tags for rich text content
  ALLOWED_TAGS: [
    // Text formatting
    'b', 'i', 'em', 'strong', 'u', 's', 'strike', 'mark', 'code', 'pre',
    // Paragraphs and breaks
    'p', 'br', 'hr',
    // Lists
    'ul', 'ol', 'li',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Quotes and blocks
    'blockquote', 'q', 'cite',
    // Links (with restricted attributes)
    'a',
    // Tables (for structured content)
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
    // Semantic HTML
    'span', 'div',
    // Definition lists
    'dl', 'dt', 'dd',
  ],
  
  // Allowed attributes
  ALLOWED_ATTR: [
    // Links
    'href', 'title', 'target', 'rel',
    // Styling (limited)
    'class', 'style',
    // Tables
    'colspan', 'rowspan',
    // Accessibility
    'alt', 'aria-label', 'aria-describedby',
    // Data attributes (for Tiptap editor)
    'data-type', 'data-id', 'data-mention',
  ],
  
  // Allowed URI schemes
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|sms):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,

  // Keep safe styles
  KEEP_CONTENT: true,
  
  // Remove dangerous elements entirely (don't just empty them)
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange'],
};

/**
 * Strict configuration for plain text fields (no HTML allowed)
 */
const PLAIN_TEXT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/**
 * Configuration for titles and names (very limited formatting)
 */
const TITLE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/**
 * Sanitizes rich HTML content (for lesson notes, descriptions, etc.)
 * Preserves safe formatting while removing XSS vectors.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return '';

  // Use server-safe sanitization if DOMPurify not available (server-side)
  if (!DOMPurify || typeof window === 'undefined') {
    return serverSanitizeHtml(html, RICH_TEXT_CONFIG.ALLOWED_TAGS || []);
  }

  // Clean the HTML with DOMPurify (client-side)
  const clean = DOMPurify.sanitize(html, RICH_TEXT_CONFIG as any);

  // Additional security: Remove javascript: protocol from remaining links
  return String(clean).replace(/javascript:/gi, '');
}

/**
 * Sanitizes content to plain text only (removes all HTML)
 * Use for fields that should never contain HTML.
 */
export function sanitizePlainText(text: string | null | undefined): string {
  if (!text) return '';

  // Use server-safe sanitization if DOMPurify not available (server-side)
  if (!DOMPurify || typeof window === 'undefined') {
    return serverSanitizeHtml(text, []);
  }

  return String(DOMPurify.sanitize(text, PLAIN_TEXT_CONFIG as any));
}

/**
 * Sanitizes titles and names (allows very basic formatting only)
 */
export function sanitizeTitle(text: string | null | undefined): string {
  if (!text) return '';

  // Use server-safe sanitization if DOMPurify not available (server-side)
  if (!DOMPurify || typeof window === 'undefined') {
    return serverSanitizeHtml(text, TITLE_CONFIG.ALLOWED_TAGS || []);
  }

  return String(DOMPurify.sanitize(text, TITLE_CONFIG as any));
}

/**
 * Sanitizes user input for database storage
 * Applies appropriate sanitization based on field type.
 */
export interface SanitizeOptions {
  type: 'rich' | 'plain' | 'title';
  maxLength?: number;
  allowLinks?: boolean;
}

export function sanitizeInput(
  input: string | null | undefined,
  options: SanitizeOptions = { type: 'plain' }
): string {
  let sanitized: string;
  
  // Apply appropriate sanitization based on type
  switch (options.type) {
    case 'rich':
      sanitized = sanitizeRichText(input);
      break;
    case 'title':
      sanitized = sanitizeTitle(input);
      break;
    case 'plain':
    default:
      sanitized = sanitizePlainText(input);
      break;
  }
  
  // Remove links if not allowed (for rich text)
  if (options.type === 'rich' && options.allowLinks === false) {
    const tempConfig = { ...RICH_TEXT_CONFIG };
    tempConfig.ALLOWED_TAGS = tempConfig.ALLOWED_TAGS?.filter((tag: string) => tag !== 'a');
    if (DOMPurify && typeof window !== 'undefined') {
      sanitized = String(DOMPurify.sanitize(sanitized, tempConfig as any));
    } else {
      // Server-side: use regex to remove links
      sanitized = sanitized.replace(/<a\b[^<]*(?:(?!<\/a>)<[^<]*)*<\/a>/gi, '');
    }
  }
  
  // Enforce max length if specified
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }
  
  return sanitized;
}

/**
 * Validates and sanitizes an email address
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  
  // Remove any HTML tags
  const plain = sanitizePlainText(email);
  
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // Return sanitized email if valid, empty string otherwise
  return emailRegex.test(plain) ? plain : '';
}

/**
 * Sanitizes a URL
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Remove any HTML
  const plain = sanitizePlainText(url);
  
  // Check if it's a valid URL scheme
  try {
    const parsed = new URL(plain);
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return plain;
    }
  } catch {
    // If not a valid absolute URL, check if it's a relative path
    if (plain.startsWith('/') || plain.startsWith('./') || plain.startsWith('../')) {
      return plain;
    }
  }
  
  return '';
}

/**
 * Batch sanitize multiple fields in an object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<keyof T, SanitizeOptions>
): T {
  const sanitized = { ...obj };
  
  for (const [key, options] of Object.entries(schema)) {
    if (key in sanitized) {
      sanitized[key as keyof T] = sanitizeInput(sanitized[key as keyof T], options as SanitizeOptions) as any;
    }
  }
  
  return sanitized;
}

/**
 * Check if a string contains potentially dangerous content
 * Returns true if the content appears safe, false if suspicious
 */
export function isSafeContent(content: string): boolean {
  if (!content) return true;
  
  // Check for common XSS patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /data:text\/html/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /import\s*\(/i,
    /document\./i,
    /window\./i,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * Escape HTML special characters for display
 * Use when you want to display HTML as text, not render it
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, char => map[char] || char);
}

/**
 * Strip all HTML tags and return plain text
 * Useful for generating previews or excerpts
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  // Server-side fallback
  if (!DOMPurify || typeof window === 'undefined') {
    return serverSanitizeHtml(html, []);
  }

  // Use DOMPurify to strip all tags
  const stripped = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });

  // Decode HTML entities
  const textarea = typeof document !== 'undefined' ? document.createElement('textarea') : null;
  if (textarea) {
    textarea.innerHTML = stripped;
    return textarea.value;
  }

  return stripped;
}