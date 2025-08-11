'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import { DollarSign, Users, Clock, CheckCircle } from 'lucide-react';
import type { TeacherPaymentSummary } from '@/types';

interface PaymentSummaryCardProps {
  summary: TeacherPaymentSummary;
  onRequestPayment: (studentId: string, studentName: string, amount: number) => void;
}

export function PaymentSummaryCard({ summary, onRequestPayment }: PaymentSummaryCardProps) {
  const monthName = new Date(summary.month + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-xl font-semibold text-primary">
                {formatCurrency(summary.totalEarnings)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Students</p>
              <p className="text-xl font-semibold text-blue-600">
                {summary.paymentCount}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-semibold text-orange-600">
                {summary.pendingPayments}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-xl font-semibold text-green-600">
                {summary.completedPayments}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Student Payment Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {monthName} Student Payments
        </h3>

        {summary.students.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No lessons completed this month yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {summary.students.map((student) => (
              <div
                key={student.studentId}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-foreground">
                      {student.studentName}
                    </h4>
                    <Badge 
                      variant={student.status === 'COMPLETED' ? 'default' : 'secondary'}
                      className={
                        student.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : student.status === 'PENDING'
                          ? 'bg-orange-100 text-orange-800 border-orange-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }
                    >
                      {student.status.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.lessonsCount} lesson{student.lessonsCount !== 1 ? 's' : ''} completed
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(student.amount)}
                    </p>
                  </div>
                  
                  {student.status === 'PENDING' && (
                    <Button
                      size="sm"
                      onClick={() => onRequestPayment(
                        student.studentId,
                        student.studentName,
                        student.amount
                      )}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Request Payment
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}