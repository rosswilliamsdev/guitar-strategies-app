'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import type { StripeConnectData } from '@/types';

interface StripeConnectSetupProps {
  stripeData: StripeConnectData | null;
  onSetupConnect: () => void;
  isLoading?: boolean;
}

export function StripeConnectSetup({ 
  stripeData, 
  onSetupConnect, 
  isLoading = false 
}: StripeConnectSetupProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onSetupConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  if (!stripeData || !stripeData.accountId) {
    // No Stripe account connected yet
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Set Up Payments
            </h3>
            <p className="text-sm text-muted-foreground">
              Connect your Stripe account to receive payments from students
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Why Connect Stripe?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Receive secure payments directly from students</li>
                <li>• Automatic monthly billing based on completed lessons</li>
                <li>• Track all your earnings in one place</li>
                <li>• Professional payment processing and receipts</li>
              </ul>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleConnect}
          disabled={isConnecting || isLoading}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isConnecting ? 'Connecting...' : 'Connect Stripe Account'}
        </Button>
      </Card>
    );
  }

  // Stripe account exists, show status
  const getStatusBadge = () => {
    if (stripeData.onboardingComplete) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Setup Incomplete
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-8 w-8 text-primary" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Stripe Payment Account
            </h3>
            <p className="text-sm text-muted-foreground">
              Account ID: {stripeData.accountId}
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${
            stripeData.chargesEnabled ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          <span className="text-sm text-muted-foreground">
            Charges {stripeData.chargesEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${
            stripeData.payoutsEnabled ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          <span className="text-sm text-muted-foreground">
            Payouts {stripeData.payoutsEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {!stripeData.onboardingComplete && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900 mb-1">
                Complete Your Setup
              </h4>
              <p className="text-sm text-orange-800">
                Finish setting up your Stripe account to start receiving payments.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        {!stripeData.onboardingComplete && (
          <Button 
            onClick={handleConnect}
            disabled={isConnecting || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isConnecting ? 'Loading...' : 'Complete Setup'}
          </Button>
        )}
        
        <Button 
          variant="secondary"
          onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
          className="flex items-center space-x-2"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Stripe Dashboard</span>
        </Button>
      </div>
    </Card>
  );
}