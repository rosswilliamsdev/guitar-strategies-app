import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Stripe publishable key for client-side
export const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;

// Check if we're in development mode (using test keys)
export const isDevelopment = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || 
                             process.env.NODE_ENV === 'development';

// Re-export currency utilities for convenience
export { formatCurrency, dollarsToCents, centsToDollars } from '@/lib/currency';

// Stripe Connect helpers
export const createConnectAccount = async (email: string, teacherName: string) => {
  return await stripe.accounts.create({
    type: 'express',
    email: email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    individual: {
      first_name: teacherName.split(' ')[0],
      last_name: teacherName.split(' ').slice(1).join(' ') || teacherName.split(' ')[0],
      email: email,
    },
  });
};

export const createConnectAccountLink = async (accountId: string, refreshUrl: string, returnUrl: string) => {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
};

export const getConnectAccount = async (accountId: string) => {
  return await stripe.accounts.retrieve(accountId);
};