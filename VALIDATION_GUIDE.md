# API Validation Implementation Guide

This guide explains how to use the comprehensive validation system implemented for the Guitar Strategies application.

## Overview

The validation system provides:
- **Automatic request validation** using Zod schemas
- **Consistent error responses** across all endpoints
- **Type-safe request handling** with TypeScript
- **Built-in middleware integration** with authentication and rate limiting

## Key Components

### 1. Validation Schemas (`lib/validations.ts`)
Comprehensive Zod schemas for all data types:
```typescript
export const createStudentSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  teacherId: z.string().uuid(),
  // ... more fields
});
```

### 2. API Wrapper with Validation (`lib/api-wrapper.ts`)
Enhanced middleware that handles validation automatically:
```typescript
export const withAdminValidation = (handler: RouteHandler, bodySchema: ZodSchema) =>
  withApiMiddleware(handler, {
    requireAuth: true,
    requireRole: 'ADMIN',
    bodySchema,
    rateLimit: 'API'
  });
```

### 3. Consistent Error Responses (`lib/api-responses.ts`)
Standardized error response utilities:
```typescript
export function createValidationErrorResponse(error: ZodError): NextResponse
export function createConflictResponse(message: string): NextResponse
export function handleApiError(error: unknown): NextResponse
```

### 4. Type-Safe Request Utilities (`lib/validated-request.ts`)
Helper functions for accessing validated data:
```typescript
export function getValidatedBody<T>(request: NextRequest, schema?: ZodSchema<T>): T
export function getValidatedQuery<T>(request: NextRequest, schema?: ZodSchema<T>): T
```

## Usage Examples

### Simple Validation Wrapper

```typescript
// Before: Manual validation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = createStudentSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // ... rest of handler
}

// After: Automatic validation
export const POST = withAdminValidation(async (request) => {
  const validatedData = getValidatedBody(request, createStudentSchema);

  // Data is already validated and type-safe
  return createSuccessResponse(result, 'Student created successfully', 201);
}, createStudentSchema);
```

### Advanced Validation with Query Parameters

```typescript
import { withValidation } from '@/lib/api-wrapper';
import { paginationSchema, searchSchema } from '@/lib/validations';

async function handleGET(request: NextRequest) {
  const queryData = getValidatedQuery(request, paginationSchema);
  const { page, limit, search } = queryData!; // Type-safe and validated

  // Use validated data
  const results = await fetchPaginatedData(page, limit, search);
  return createSuccessResponse(results);
}

export const GET = withValidation(handleGET, {
  querySchema: paginationSchema.extend({
    search: z.string().optional()
  })
});
```

### Custom Validation Logic

```typescript
import { validateRequestBody, ValidationError } from '@/lib/validated-request';

export async function POST(request: NextRequest) {
  try {
    // Manual validation with custom error handling
    const data = await validateRequestBody(request, customSchema);

    // Custom business logic validation
    if (data.email === data.parentEmail) {
      throw new ValidationError('Parent email must be different from student email');
    }

    return createSuccessResponse(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }
    return handleApiError(error);
  }
}
```

## Migration Strategy

### For Existing Endpoints

1. **Add validation schema**:
```typescript
import { createStudentSchema } from '@/lib/validations';
```

2. **Replace manual validation**:
```typescript
// Before
const { name, email } = await request.json();

// After
const validatedData = getValidatedBody(request, createStudentSchema);
const { name, email } = validatedData!;
```

3. **Update error responses**:
```typescript
// Before
return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

// After
return createValidationErrorResponse(validationError);
```

4. **Use wrapper middleware**:
```typescript
// Before
export const POST = withRateLimit(handler, 'API');

// After
export const POST = withAdminValidation(handler, createStudentSchema);
```

### For New Endpoints

Use the validation wrappers from the start:

```typescript
import { withTeacherValidation } from '@/lib/api-wrapper';
import { createLessonSchema } from '@/lib/validations';
import { createSuccessResponse, handleApiError } from '@/lib/api-responses';

async function handlePOST(request: NextRequest) {
  try {
    const lessonData = getValidatedBody(request, createLessonSchema);

    // Business logic with validated, type-safe data
    const lesson = await createLesson(lessonData!);

    return createSuccessResponse(lesson, 'Lesson created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export const POST = withTeacherValidation(handlePOST, createLessonSchema);
```

## Common Validation Patterns

### ID Parameters
```typescript
import { idParamSchema } from '@/lib/validations';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const validation = idParamSchema.safeParse({ id });

  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }
  // ... use validated ID
}
```

### Date Ranges
```typescript
import { dateRangeSchema } from '@/lib/validations';

const querySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: "Start date must be before end date",
});
```

### File Uploads
```typescript
import { fileUploadSchema } from '@/lib/validations';

export const POST = withValidation(async (request) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  const validation = fileUploadSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type
  });

  if (!validation.success) {
    return createValidationErrorResponse(validation.error);
  }
  // ... process file
}, { skipCSRF: true }); // File uploads often need CSRF skip
```

## Error Response Format

All validation errors follow a consistent format:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address",
      "code": "invalid_string"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "code": "too_small"
    }
  ],
  "timestamp": "2023-09-24T12:00:00.000Z"
}
```

Success responses:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2023-09-24T12:00:00.000Z"
}
```

## Best Practices

1. **Always use validation wrappers** for new endpoints
2. **Create specific schemas** for different operations (create vs update)
3. **Include business logic validation** in addition to data validation
4. **Use type-safe helpers** to access validated data
5. **Provide clear error messages** in schemas
6. **Test validation logic** thoroughly
7. **Document validation requirements** in API documentation

## Available Validation Schemas

The application includes comprehensive schemas for:

- **Authentication**: `loginSchema`, `registerSchema`, `passwordChangeSchema`
- **Profiles**: `teacherProfileSchema`, `studentProfileSchema`
- **Lessons**: `createLessonSchema`, `updateLessonSchema`, `lessonFiltersSchema`
- **Library**: `createLibraryItemSchema`, `libraryFiltersSchema`
- **Recommendations**: `createRecommendationSchema`, `updateRecommendationSchema`
- **Invoices**: `createInvoiceSchema`, `invoiceFiltersSchema`
- **Scheduling**: `availabilitySchema`, `bookingSchema`, `timeSlotSchema`
- **Admin Operations**: `createStudentSchema`, `createTeacherSchema`, `bulkDeleteSchema`
- **Common Types**: `paginationSchema`, `searchSchema`, `dateRangeSchema`

This validation system ensures data integrity, provides better error messages, and makes the API more reliable and secure.