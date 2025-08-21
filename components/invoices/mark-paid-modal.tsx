'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, CreditCard } from 'lucide-react';

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: string, paymentNotes?: string) => Promise<void>;
  invoiceNumber: string;
  studentName: string;
  amount: number;
}

export function MarkPaidModal({
  isOpen,
  onClose,
  onConfirm,
  invoiceNumber,
  studentName,
  amount,
}: MarkPaidModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [customMethod, setCustomMethod] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const method = paymentMethod === 'other' ? customMethod : paymentMethod;
    
    if (!method) {
      return;
    }

    setIsProcessing(true);
    
    try {
      await onConfirm(method, paymentNotes || undefined);
      handleClose();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setPaymentMethod('');
    setCustomMethod('');
    setPaymentNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            Mark Invoice as Paid
          </DialogTitle>
          <DialogDescription>
            Record payment for invoice {invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">{studentName}</p>
                <p className="text-xs text-muted-foreground">Invoice {invoiceNumber}</p>
              </div>
              <p className="text-lg font-semibold">${(amount / 100).toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Venmo">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Venmo
                  </div>
                </SelectItem>
                <SelectItem value="PayPal">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    PayPal
                  </div>
                </SelectItem>
                <SelectItem value="Zelle">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Zelle
                  </div>
                </SelectItem>
                <SelectItem value="Cash">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Cash
                  </div>
                </SelectItem>
                <SelectItem value="Check">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Check
                  </div>
                </SelectItem>
                <SelectItem value="other">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Other
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="custom-method">Specify Payment Method *</Label>
              <Input
                id="custom-method"
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                placeholder="e.g., Bank Transfer, Apple Pay"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Payment Notes (Optional)</Label>
            <Textarea
              id="payment-notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Reference number, check number, or any other notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!paymentMethod || isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? 'Processing...' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}