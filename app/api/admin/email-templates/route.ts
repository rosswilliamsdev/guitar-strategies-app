import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withApiMiddleware } from '@/lib/api-wrapper';
import { log } from '@/lib/logger';
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError
} from '@/lib/api-responses';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/email-templates
 * Get all email templates
 */
async function handleGET() {
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: {
        type: 'asc'
      }
    });

    return createSuccessResponse({templates});
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/email-templates
 * Create a new email template
 */
async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, subject, htmlBody, variables, description } = body;

    log.info('Creating email template', {
      type
    });

    const template = await prisma.emailTemplate.create({
      data: {
        type,
        subject,
        htmlBody,
        variables: JSON.stringify(variables),
        description,
        isActive: true
      }
    });

    log.info('Email template created', {
      id: template.id,
      type: template.type
    });

    return createSuccessResponse(
      { template },
      'Email template created successfully',
      201
    );
  } catch (error) {
    log.error('Error creating email template', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return handleApiError(error);
  }
}

// Export wrapped handlers
export const GET = withApiMiddleware(handleGET, {
  rateLimit: 'API',
  requireRole: 'ADMIN',
  skipCSRF: true
});

export const POST = withApiMiddleware(handlePOST, {
  rateLimit: 'API',
  requireRole: 'ADMIN',
  skipCSRF: true
});
