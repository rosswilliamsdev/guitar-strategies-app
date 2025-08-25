'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Send, DollarSign, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import type { InvoiceSummary, PaymentMethodInfo } from '@/types';

export function InvoiceDashboard() {
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch invoice summary and payment methods
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch payment methods
        const profileResponse = await fetch('/api/teacher/profile');
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setPaymentMethods(profileData.paymentMethods);
        }

        // Mock invoice data for now
        const mockSummary: InvoiceSummary = {
          month: currentMonth,
          totalEarnings: 24000, // $240.00
          invoiceCount: 4,
          pendingInvoices: 1,
          paidInvoices: 2,
          overdueInvoices: 1,
          students: [
            {
              studentId: '1',
              studentName: 'John Doe',
              amount: 6000,
              lessonsCount: 2,
              status: 'PAID',
              invoiceId: 'INV-2025-001',
              dueDate: new Date('2025-01-15'),
            },
            {
              studentId: '2', 
              studentName: 'Jane Smith',
              amount: 12000,
              lessonsCount: 4,
              status: 'PENDING',
              invoiceId: 'INV-2025-002',
              dueDate: new Date('2025-01-20'),
            },
          ],
        };
        
        setInvoiceSummary(mockSummary);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentMonth]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success" className="flex items-center space-x-1">
          <CheckCircle className="h-3 w-3" />
          <span>Paid</span>
        </Badge>;
      case 'PENDING':
        return <Badge variant="warning" className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Pending</span>
        </Badge>;
      case 'OVERDUE':
        return <Badge variant="error" className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Overdue</span>
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-4 h-20 bg-muted">
                <div></div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Invoices & Payments</h1>
          <p className="text-muted-foreground mt-2">
            Manage invoices and track payments from students
          </p>
        </div>
        <Link href="/invoices/new">
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      {invoiceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-semibold">
                  ${(invoiceSummary.totalEarnings / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-semibold">{invoiceSummary.invoiceCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-semibold">{invoiceSummary.paidInvoices}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold">{invoiceSummary.pendingInvoices}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Student Invoices */}
      {invoiceSummary && invoiceSummary.students.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Invoices</h3>
            <Link href="/invoices">
              <Button variant="secondary" size="sm">View All</Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {invoiceSummary.students.map((student) => (
              <div key={student.studentId} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <h4 className="font-medium">{student.studentName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {student.invoiceId} • {student.lessonsCount} lessons
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold">${(student.amount / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Due {format(student.dueDate, 'MMM d')}
                    </p>
                  </div>
                  {getStatusBadge(student.status)}
                  <Button variant="secondary" size="sm">
                    <Send className="h-3 w-3 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Payment Methods */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">Payment Methods</h3>
          </div>
          <Link href="/settings">
            <Button variant="secondary" size="sm">
              {paymentMethods && (paymentMethods.venmoHandle || paymentMethods.paypalEmail || paymentMethods.zelleEmail) 
                ? 'Edit Methods' 
                : 'Set Up Methods'
              }
            </Button>
          </Link>
        </div>
        
        {paymentMethods && (paymentMethods.venmoHandle || paymentMethods.paypalEmail || paymentMethods.zelleEmail) ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Your payment methods that will be included on invoices:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {paymentMethods.venmoHandle && (
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm">Venmo</p>
                    <p className="text-sm text-muted-foreground">@{paymentMethods.venmoHandle}</p>
                  </div>
                </div>
              )}
              
              {paymentMethods.paypalEmail && (
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm">PayPal</p>
                    <p className="text-sm text-muted-foreground">{paymentMethods.paypalEmail}</p>
                  </div>
                </div>
              )}
              
              {paymentMethods.zelleEmail && (
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm">Zelle</p>
                    <p className="text-sm text-muted-foreground">{paymentMethods.zelleEmail}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900 mb-1">Payment Methods Configured</h4>
                  <p className="text-sm text-green-800">
                    These payment options will be automatically included on all invoices you generate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-900 mb-2">Set Up Payment Methods</h4>
            <div className="text-sm text-orange-800 space-y-1 mb-3">
              <p>• Add your Venmo username (@yourname)</p>
              <p>• Add your PayPal email address</p>
              <p>• Add your Zelle email or phone number</p>
              <p>• Students can pay you directly using their preferred method</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}