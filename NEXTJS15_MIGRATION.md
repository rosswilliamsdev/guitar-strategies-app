# Next.js 15 Migration Guide - Dynamic Route Parameters

## Overview

Next.js 15 introduces breaking changes to how dynamic route parameters (`params`) and search parameters (`searchParams`) are handled in page components. These are now asynchronous and must be awaited.

## Breaking Changes

### Before (Next.js 14)
```typescript
interface PageProps {
  params: {
    id: string;
  };
  searchParams: {
    query?: string;
  };
}

export default function Page({ params, searchParams }: PageProps) {
  // Direct access to params and searchParams
  const id = params.id;
  const query = searchParams.query;
  // ...
}
```

### After (Next.js 15)
```typescript
interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    query?: string;
  }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  // Must await params and searchParams
  const { id } = await params;
  const { query } = await searchParams;
  // ...
}
```

## Migration Steps

### 1. Update Interface Definitions

Change all page component interfaces to use Promise types:

```typescript
// Old
interface PageProps {
  params: { id: string };
}

// New
interface PageProps {
  params: Promise<{ id: string }>;
}
```

### 2. Make Page Components Async

All page components that use params or searchParams must be async:

```typescript
// Old
export default function Page({ params }: PageProps) { }

// New
export default async function Page({ params }: PageProps) { }
```

### 3. Await Parameters

At the beginning of the component, await the parameters:

```typescript
export default async function Page({ params }: PageProps) {
  const { id } = await params;
  // Now use id instead of params.id
}
```

### 4. Update generateMetadata Functions

The `generateMetadata` function also needs to handle Promise params:

```typescript
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Item ${id}`,
  };
}
```

## Files Requiring Updates

### API Routes with Dynamic Parameters
All API route handlers with dynamic segments also need to be updated:
- `/app/api/invoices/[id]/route.ts`
- `/app/api/lessons/[id]/route.ts`
- `/app/api/students/[id]/route.ts`
- `/app/api/admin/teachers/[id]/route.ts`
- And all other API routes with `[id]` or `[teacherId]` segments

### Page Components with Dynamic Routes
- `/app/(dashboard)/curriculums/[id]/page.tsx`
- `/app/(dashboard)/curriculums/[id]/edit/page.tsx`
- `/app/(dashboard)/curriculums/my/[id]/page.tsx`
- `/app/(dashboard)/curriculums/my/[id]/edit/page.tsx`
- `/app/(dashboard)/invoices/[id]/page.tsx`
- `/app/(dashboard)/lessons/[id]/page.tsx`
- `/app/(dashboard)/lessons/[id]/edit/page.tsx`
- `/app/(dashboard)/recommendations/[id]/edit/page.tsx`
- `/app/(dashboard)/students/[id]/page.tsx`

### Page Components with Search Parameters
- `/app/(auth)/error/page.tsx`

## Common Patterns

### Pattern 1: Simple Parameter Access
```typescript
// Before
const lesson = await getLessonById(params.id);

// After
const { id } = await params;
const lesson = await getLessonById(id);
```

### Pattern 2: Multiple Uses of params
```typescript
// Before
export default async function Page({ params }: PageProps) {
  const item1 = await getItem1(params.id);
  const item2 = await getItem2(params.id);
  return <div>{params.id}</div>;
}

// After
export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const item1 = await getItem1(id);
  const item2 = await getItem2(id);
  return <div>{id}</div>;
}
```

### Pattern 3: generateMetadata with Params
```typescript
// Before
export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Page ${params.id}`,
  };
}

// After
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return {
    title: `Page ${id}`,
  };
}
```

### Pattern 4: API Routes with Dynamic Parameters
```typescript
// Before
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const lesson = await getLessonById(params.id);
  // ...
}

// After
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lesson = await getLessonById(id);
  // ...
}
```

## Testing the Migration

1. **Build Test**: Run `npm run build` to check for type errors
2. **Runtime Test**: Start the dev server and test all dynamic routes
3. **Production Test**: Build and run production server with `npm run build && npm run start`

## Troubleshooting

### Error: "Type 'PageProps' does not satisfy the constraint 'PageProps'"
This means the params or searchParams are not wrapped in Promise.

### Error: "Cannot read properties of undefined"
This means you forgot to await the params or searchParams.

### Error: "Expected ',', got ';'"
Check the Promise type syntax - it should be `Promise<{ id: string }>` not `Promise<{ id: string; }>`.

## ESLint Configuration

To ignore ESLint errors during the migration, you can temporarily add to `next.config.js`:

```javascript
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ... rest of config
};
```

Remember to remove this after fixing all issues!

## References

- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15)
- [Next.js Dynamic Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)