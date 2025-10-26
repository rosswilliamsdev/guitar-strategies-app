import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withApiMiddleware } from '@/lib/api-wrapper';
import { log } from '@/lib/logger';
import {
  createSuccessResponse,
  createNotFoundResponse,
  handleApiError
} from '@/lib/api-responses';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/email-templates/[id]
 * Get a specific email template
 */
async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return createNotFoundResponse('Email template');
    }

    return createSuccessResponse({ template });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/email-templates/[id]
 * Update an email template
 */
async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { subject, htmlBody, variables, description, isActive } = body;

    log.info('Updating email template', { id });

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        subject,
        htmlBody,
        variables: typeof variables === 'string' ? variables : JSON.stringify(variables),
        description,
        isActive
      }
    });

    log.info('Email template updated', {
      id: template.id,
      type: template.type
    });

    return createSuccessResponse(
      { template },
      'Email template updated successfully'
    );
  } catch (error) {
    log.error('Error updating email template', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/email-templates/[id]
 * Delete an email template
 */
async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    log.info('Deleting email template', { id });

    await prisma.emailTemplate.delete({
      where: { id }
    });

    log.info('Email template deleted', { id });

    return createSuccessResponse(
      null,
      'Email template deleted successfully'
    );
  } catch (error) {
    log.error('Error deleting email template', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return handleApiError(error);
  }
}

// Create wrappers that match the expected signature
async function wrappedGET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleGET(request, context);
}

async function wrappedPUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handlePUT(request, context);
}

async function wrappedDELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handleDELETE(request, context);
}

// Export with Next.js 15 handler signature (params as second argument)
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Check auth manually since withApiMiddleware doesn't support params
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/lib/auth');
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && !session.user.teacherProfile?.isAdmin)) {
    return createNotFoundResponse('Resource');
  }

  return handleGET(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/lib/auth');
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && !session.user.teacherProfile?.isAdmin)) {
    return createNotFoundResponse('Resource');
  }

  return handlePUT(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { getServerSession } = await import('next-auth');
  const { authOptions } = await import('@/lib/auth');
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && !session.user.teacherProfile?.isAdmin)) {
    return createNotFoundResponse('Resource');
  }

  return handleDELETE(request, context);
}
