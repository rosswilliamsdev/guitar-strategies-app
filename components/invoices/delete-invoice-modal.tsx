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
import { AlertTriangle } from 'lucide-react';
import { log, invoiceLog } from '@/lib/logger';

interface DeleteInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  invoiceNumber: string;
  studentName: string;
  isPaid?: boolean;
}

export function DeleteInvoiceModal({
  isOpen,
  onClose,
  onConfirm,
  invoiceNumber,
  studentName,
  isPaid = false,
}: DeleteInvoiceModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      log.error('Error deleting invoice:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Delete Invoice
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Are you sure you want to delete invoice <strong>{invoiceNumber}</strong> for{' '}
              <strong>{studentName}</strong>?
            </p>
            {isPaid && (
              <p className="text-xs text-red-600 mt-2">
                <strong>Warning:</strong> This invoice has been marked as paid. Deleting it will remove all payment records.
              </p>
            )}
            <p className="text-xs text-red-600 mt-2">
              This action cannot be undone and will permanently remove the invoice and all its items.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
            variant={'destructive'}
              onClick={handleDelete}
              disabled={isDeleting}
              
            >
              {isDeleting ? 'Deleting...' : 'Delete Invoice'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}