'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Eye, 
  DollarSign, 
  CheckCircle, 
  Trash2, 
  CreditCard
} from 'lucide-react';
import { MarkPaidModal } from './mark-paid-modal';
import { DeleteInvoiceModal } from './delete-invoice-modal';
import type { InvoiceStatus } from '@/types';
import { log, invoiceLog } from '@/lib/logger';

interface InvoiceCardProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    month: string;
    dueDate: Date;
    status: InvoiceStatus;
    total: number;
    paidAt: Date | null;
    paymentMethod: string | null;
    paymentNotes: string | null;
    customFullName?: string | null;
    customEmail?: string | null;
    student?: {
      user: {
        name: string | null;
      };
    } | null;
    items: Array<{
      id: string;
      description: string;
    }>;
  };
  hourlyRate?: number;
}

export function InvoiceCard({ invoice, hourlyRate }: InvoiceCardProps) {
  const router = useRouter();
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Helper function to get status color
  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'SENT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'OVERDUE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'CANCELLED':
        return 'bg-neutral-50 text-neutral-700 border-neutral-200';
      default:
        return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  const handleMarkAsPaid = async (paymentMethod: string, paymentNotes?: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'PAID',
          paymentMethod,
          paymentNotes: paymentNotes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update invoice');
      }

      router.refresh();
    } catch (error) {
      log.error('Error marking invoice as paid:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete invoice');
      }

      router.refresh();
    } catch (error) {
      log.error('Error deleting invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  return (
    <>
      <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-foreground">
                {invoice.invoiceNumber}
              </h3>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {invoice.student ? invoice.student.user.name : invoice.customFullName} • {format(new Date(invoice.month + '-01'), 'MMMM yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">
              Due: {format(invoice.dueDate, 'MMM d, yyyy')} • {invoice.items.length} lesson{invoice.items.length !== 1 ? 's' : ''}
            </p>
            {invoice.paidAt && invoice.paymentMethod && (
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <CreditCard className="h-3 w-3 mr-1" />
                Paid via {invoice.paymentMethod} on {format(invoice.paidAt, 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <p className="font-semibold text-lg flex items-center">
              <DollarSign className="h-4 w-4" />
              {(invoice.total / 100).toFixed(2)}
            </p>
            {invoice.paidAt && (
              <p className="text-xs text-green-600">
                Paid {format(invoice.paidAt, 'MMM d')}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href={`/invoices/${invoice.id}`}>
              <Button variant="secondary" size="sm">
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </Link>
            
            {invoice.status !== 'PAID' && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowPayModal(true)}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Mark Paid
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Card>

      <MarkPaidModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        onConfirm={handleMarkAsPaid}
        invoiceNumber={invoice.invoiceNumber}
        studentName={invoice.student ? invoice.student.user.name || 'Unknown' : invoice.customFullName || 'Unknown'}
        amount={invoice.total}
      />

      <DeleteInvoiceModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        invoiceNumber={invoice.invoiceNumber}
        studentName={invoice.student ? invoice.student.user.name || 'Unknown' : invoice.customFullName || 'Unknown'}
        isPaid={invoice.status === 'PAID'}
      />
    </>
  );
}