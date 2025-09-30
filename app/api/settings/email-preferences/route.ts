import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiLog, dbLog } from '@/lib/logger';
import { z } from 'zod';

const emailPreferencesSchema = z.object({
  preferences: z.array(z.object({
    id: z.string().optional(),
    type: z.enum([
      'LESSON_BOOKING',
      'LESSON_CANCELLATION', 
      'LESSON_REMINDER',
      'INVOICE_GENERATED',
      'INVOICE_OVERDUE',
      'CHECKLIST_COMPLETION',
      'SYSTEM_UPDATES'
    ]),
    enabled: z.boolean()
  }))
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      apiLog.warn('Unauthorized email preferences access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.emailPreference.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        type: true,
        enabled: true
      },
      orderBy: { type: 'asc' }
    });

    apiLog.info('Email preferences retrieved', {
      userId: session.user.id,
      preferenceCount: preferences.length
    });

    return NextResponse.json({ preferences });

  } catch (error) {
    apiLog.error('Error fetching email preferences:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to fetch email preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      apiLog.warn('Unauthorized email preferences update attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = emailPreferencesSchema.parse(body);

    // Update or create email preferences
    const updatePromises = validatedData.preferences.map(async (pref) => {
      return prisma.emailPreference.upsert({
        where: {
          userId_type: {
            userId: session.user.id,
            type: pref.type as any
          }
        },
        update: {
          enabled: pref.enabled
        },
        create: {
          userId: session.user.id,
          type: pref.type as any,
          enabled: pref.enabled
        }
      });
    });

    await Promise.all(updatePromises);

    apiLog.info('Email preferences updated', {
      userId: session.user.id,
      updatedPreferences: validatedData.preferences.length
    });

    dbLog.info('Email preferences transaction completed', {
      userId: session.user.id,
      updates: validatedData.preferences.length
    });

    return NextResponse.json({ 
      message: 'Email preferences updated successfully',
      updatedCount: validatedData.preferences.length 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      apiLog.warn('Invalid email preferences data:', {
        errors: error.issues
      });
      return NextResponse.json(
        { error: 'Invalid data provided', details: error.issues },
        { status: 400 }
      );
    }

    apiLog.error('Error updating email preferences:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to update email preferences' },
      { status: 500 }
    );
  }
}