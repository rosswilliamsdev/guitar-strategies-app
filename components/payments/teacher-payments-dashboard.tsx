'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentSummaryCard } from './payment-summary-card';
import { StripeConnectSetup } from './stripe-connect-setup';
import { EarningsChart } from './earnings-chart';
import { ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import type { TeacherPaymentSummary, StripeConnectData } from '@/types';

interface EarningsData {
  month: string;
  earnings: number;
  lessonsCount: number;
}

export function TeacherPaymentsDashboard() {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [paymentSummary, setPaymentSummary] = useState<TeacherPaymentSummary | null>(null);
  const [stripeData, setStripeData] = useState<StripeConnectData | null>(null);
  const [earningsHistory, setEarningsHistory] = useState<EarningsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch payment summary
  const fetchPaymentSummary = async (month: string) => {
    try {
      setError('');
      const response = await fetch(`/api/payments?month=${month}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment summary');
      }
      
      const data = await response.json();
      setPaymentSummary(data.summary);
      
      // Update Stripe connection status if available
      if (data.stripeConnected !== undefined) {
        await fetchStripeStatus();
      }
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      setError('Failed to load payment data. Please try again.');
    }
  };

  // Fetch Stripe Connect status
  const fetchStripeStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect');
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.connected) {
        setStripeData(data);
      }
    } catch (error) {
      console.error('Error fetching Stripe status:', error);
    }
  };

  // Fetch earnings history
  const fetchEarningsHistory = async () => {
    try {
      const response = await fetch('/api/payments/history?months=6');
      if (!response.ok) return;
      
      const data = await response.json();
      setEarningsHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching earnings history:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchPaymentSummary(currentMonth),
        fetchStripeStatus(),
        fetchEarningsHistory(),
      ]);
      setIsLoading(false);
    };

    loadData();
  }, [currentMonth]);

  // Handle Stripe Connect setup
  const handleStripeConnect = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    try {
      const baseUrl = window.location.origin;
      const returnUrl = `${baseUrl}/payments?connected=true`;
      const refreshUrl = `${baseUrl}/payments?error=setup_failed`;

      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: stripeData?.accountId ? 'create_onboarding_link' : 'create_account',
          returnUrl,
          refreshUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to setup Stripe Connect');
      }

      const data = await response.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (error) {
      console.error('Error setting up Stripe Connect:', error);
      setError('Failed to setup payments. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle payment request (placeholder for now)
  const handleRequestPayment = async (studentId: string, studentName: string, amount: number) => {
    // TODO: Implement payment request functionality
    // This could open a modal for payment collection or send a payment link to student
    console.log('Request payment:', { studentId, studentName, amount });
    alert(`Payment request functionality coming soon!\n\nWould request ${amount/100} from ${studentName}`);
  };

  // Month navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentDate = new Date(currentMonth + '-01');
    const newDate = direction === 'prev' 
      ? subMonths(currentDate, 1)
      : addMonths(currentDate, 1);
    setCurrentMonth(format(newDate, 'yyyy-MM'));
  };

  const formatMonthDisplay = (monthStr: string) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const refresh = () => {
    fetchPaymentSummary(currentMonth);
    fetchEarningsHistory();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-4 h-20 bg-muted"></Card>
            ))}
          </div>
          <Card className="p-6 h-64 bg-muted"></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-2">
            Manage your earnings and payment settings
          </p>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={refresh}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Error</h4>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Connect Setup */}
      <StripeConnectSetup 
        stripeData={stripeData}
        onSetupConnect={handleStripeConnect}
        isLoading={isConnecting}
      />

      {/* Month Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h2 className="text-xl font-semibold text-foreground">
              {formatMonthDisplay(currentMonth)}
            </h2>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigateMonth('next')}
              disabled={currentMonth >= format(new Date(), 'yyyy-MM')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select value={currentMonth} onValueChange={setCurrentMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = subMonths(new Date(), i);
                const monthValue = format(date, 'yyyy-MM');
                return (
                  <SelectItem key={monthValue} value={monthValue}>
                    {formatMonthDisplay(monthValue)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Payment Summary */}
      {paymentSummary && (
        <PaymentSummaryCard 
          summary={paymentSummary}
          onRequestPayment={handleRequestPayment}
        />
      )}

      {/* Earnings Chart */}
      <EarningsChart 
        data={earningsHistory}
        isLoading={false}
      />
    </div>
  );
}