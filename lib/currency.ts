// Currency formatting utilities (client-safe)

// Helper function to format amounts (Stripe uses cents)
export const formatCurrency = (amountInCents: number, currency = 'usd'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
};

// Helper function to convert dollars to cents for Stripe
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

// Helper function to convert cents to dollars
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};