# Security Implementation Guide

This document outlines the security measures implemented in the Guitar Strategies application.

## 🛡️ CSRF Protection

### Overview
The application implements comprehensive CSRF (Cross-Site Request Forgery) protection using a double-submit cookie pattern.

### How it Works
1. **Token Generation**: Secure tokens are generated and stored in httpOnly cookies
2. **Token Validation**: State-changing operations require valid CSRF tokens
3. **Automatic Integration**: Middleware automatically validates tokens for protected routes

### Client-Side Usage

#### Automatic Integration
Most API calls will automatically include CSRF tokens when using our API client:

```typescript
import { api } from '@/lib/api-client';

// CSRF token automatically included
await api.post('/api/lessons', lessonData);
await api.put('/api/settings/teacher', profileData);
await api.delete('/api/lessons/123');
```

#### Manual Integration
For custom fetch calls:

```typescript
import { apiFetch } from '@/lib/api-client';

const response = await apiFetch('/api/custom-endpoint', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

#### React Hook
For React components with loading states:

```typescript
import { useApi } from '@/lib/api-client';

function MyComponent() {
  const { execute, loading, error } = useApi();

  const handleSubmit = async () => {
    const result = await execute(() => api.post('/api/data', formData));
    if (result) {
      // Success handling
    }
  };
}
```

### Server-Side Implementation

#### Using API Wrapper (Recommended)
```typescript
import { withApiMiddleware } from '@/lib/api-wrapper';

export const POST = withApiMiddleware(async (request) => {
  // CSRF protection automatically applied
  // Your handler logic here
}, {
  requireAuth: true,
  requireRole: 'TEACHER',
  rateLimit: 'API'
});
```

#### Manual CSRF Check
```typescript
import { withCSRFProtection } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  return withCSRFProtection(request, async () => {
    // Your protected handler logic
  });
}
```

#### Skipping CSRF (Special Cases)
```typescript
// For public endpoints or webhooks
export const POST = withApiMiddleware(handler, {
  skipCSRF: true,
  requireAuth: false
});
```

### Protected Operations
CSRF protection is automatically applied to:
- All `POST`, `PUT`, `PATCH`, `DELETE` requests
- Form submissions
- File uploads
- State-changing API operations

### Exempt Endpoints
- `/api/auth/*` - NextAuth handles its own CSRF
- `/api/webhook/*` - External webhooks use signature verification
- `/api/public/*` - Public read-only endpoints

## 🧼 Input Sanitization

### Overview
All user input is sanitized using DOMPurify to prevent XSS attacks while preserving safe formatting.

### Sanitization Types

#### Rich Text (Lesson Notes, Descriptions)
```typescript
import { sanitizeRichText } from '@/lib/sanitize';

const cleanHtml = sanitizeRichText(userInput);
// Allows: paragraphs, lists, basic formatting, safe links
// Blocks: scripts, iframes, event handlers, dangerous attributes
```

#### Plain Text (Names, Simple Fields)
```typescript
import { sanitizePlainText } from '@/lib/sanitize';

const cleanText = sanitizePlainText(userInput);
// Strips all HTML tags, returns plain text only
```

#### Titles (Limited Formatting)
```typescript
import { sanitizeTitle } from '@/lib/sanitize';

const cleanTitle = sanitizeTitle(userInput);
// Allows: bold, italic, emphasis only
```

#### Batch Sanitization
```typescript
import { sanitizeObject } from '@/lib/sanitize';

const cleanData = sanitizeObject(formData, {
  name: { type: 'title', maxLength: 100 },
  bio: { type: 'rich', allowLinks: true },
  notes: { type: 'rich', maxLength: 5000 },
  tags: { type: 'plain' }
});
```

### Allowed HTML Elements

#### Rich Text Configuration
- **Text Formatting**: `<b>`, `<i>`, `<strong>`, `<em>`, `<u>`, `<code>`
- **Structure**: `<p>`, `<br>`, `<hr>`, `<h1-h6>`, `<blockquote>`
- **Lists**: `<ul>`, `<ol>`, `<li>`, `<dl>`, `<dt>`, `<dd>`
- **Links**: `<a>` (with restricted attributes)
- **Tables**: `<table>`, `<tr>`, `<td>`, `<th>` (basic support)

#### Blocked Elements
- `<script>`, `<iframe>`, `<object>`, `<embed>`
- `<form>`, `<input>`, `<textarea>`, `<select>`
- Event handlers: `onclick`, `onerror`, `onload`, etc.
- JavaScript protocols: `javascript:`, `data:text/html`

### Security Validation

#### Content Safety Check
```typescript
import { isSafeContent } from '@/lib/sanitize';

if (!isSafeContent(userInput)) {
  // Reject potentially dangerous content
  throw new Error('Content contains unsafe elements');
}
```

#### Email Validation
```typescript
import { sanitizeEmail } from '@/lib/sanitize';

const cleanEmail = sanitizeEmail(userInput);
// Returns clean email or empty string if invalid
```

#### URL Validation
```typescript
import { sanitizeUrl } from '@/lib/sanitize';

const cleanUrl = sanitizeUrl(userInput);
// Validates protocol and returns safe URL or empty string
```

## 🔒 General Security Headers

Security headers are automatically applied via middleware:

- **CSP**: Content Security Policy to prevent XSS
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME type sniffing protection
- **Referrer-Policy**: Control referrer information
- **Permissions-Policy**: Limit browser features

## 🚨 Error Handling

### Security Error Responses
- **CSRF Failures**: HTTP 403 with token refresh instructions
- **XSS Attempts**: Content rejected with sanitization message
- **Rate Limiting**: HTTP 429 with retry-after headers
- **Authentication**: HTTP 401/403 with minimal information disclosure

### Logging
All security events are logged for monitoring:
- CSRF token validation failures
- Dangerous content detection
- Rate limit violations
- Authentication attempts

## 📝 Best Practices

### For Developers

1. **Always use the API wrapper** for new endpoints
2. **Validate and sanitize** all user input
3. **Use TypeScript** for type safety
4. **Test security measures** in development
5. **Follow principle of least privilege** for roles

### For Content Creation

1. **Use rich text editor** for formatted content
2. **Avoid copying HTML** from external sources
3. **Review content** before publishing
4. **Report security issues** promptly

### For Production

1. **Set proper environment variables**
2. **Enable HTTPS** in production
3. **Monitor security logs** regularly
4. **Keep dependencies updated**
5. **Run security audits** periodically

## 🔧 Configuration

### Environment Variables
```bash
# CSRF and security
NEXTAUTH_SECRET="your-production-secret"
NODE_ENV="production"

# Optional: Redis for token storage
REDIS_URL="redis://..."

# Rate limiting
RATE_LIMIT_REDIS_URL="redis://..." # Optional, falls back to memory
```

### Middleware Configuration
Security is automatically enabled via middleware for all routes. No additional configuration needed.

## 🧪 Testing

### Security Testing Commands
```bash
# Install dependencies
npm install

# Run security audit
npm audit

# Check for known vulnerabilities
npm audit --audit-level high

# Build and test
npm run build
npm run start
```

### Manual Testing
1. Try submitting forms without CSRF tokens
2. Attempt to inject JavaScript in rich text fields
3. Test with malformed HTML content
4. Verify rate limiting works correctly
5. Check that authentication is required for protected endpoints

This security implementation provides defense-in-depth protection against common web vulnerabilities while maintaining usability for legitimate users.