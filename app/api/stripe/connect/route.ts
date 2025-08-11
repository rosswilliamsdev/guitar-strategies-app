import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createConnectAccount, createConnectAccountLink, getConnectAccount } from '@/lib/stripe';

// GET /api/stripe/connect - Get Stripe Connect account status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    if (!teacherProfile.stripeAccountId) {
      return NextResponse.json({ 
        connected: false,
        accountId: null,
        onboardingComplete: false,
      });
    }

    // Get account details from Stripe
    const account = await getConnectAccount(teacherProfile.stripeAccountId);

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingComplete: account.charges_enabled && account.payouts_enabled,
    });
  } catch (error) {
    console.error('Error fetching Stripe Connect status:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Stripe Connect status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/stripe/connect - Create or get Stripe Connect account
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      include: { user: true }
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 });
    }

    const { action, refreshUrl, returnUrl } = await request.json();

    if (action === 'create_account') {
      // Create new Stripe Connect account
      const account = await createConnectAccount(
        teacherProfile.user.email,
        teacherProfile.user.name
      );

      // Save account ID to teacher profile
      await prisma.teacherProfile.update({
        where: { id: teacherProfile.id },
        data: { stripeAccountId: account.id }
      });

      // Create onboarding link
      const accountLink = await createConnectAccountLink(
        account.id,
        refreshUrl,
        returnUrl
      );

      return NextResponse.json({
        accountId: account.id,
        onboardingUrl: accountLink.url,
      });
    }

    if (action === 'create_onboarding_link' && teacherProfile.stripeAccountId) {
      // Create new onboarding link for existing account
      const accountLink = await createConnectAccountLink(
        teacherProfile.stripeAccountId,
        refreshUrl,
        returnUrl
      );

      return NextResponse.json({
        accountId: teacherProfile.stripeAccountId,
        onboardingUrl: accountLink.url,
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action or missing account' 
    }, { status: 400 });
  } catch (error) {
    console.error('Error with Stripe Connect:', error);
    return NextResponse.json({ 
      error: 'Failed to setup Stripe Connect',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}