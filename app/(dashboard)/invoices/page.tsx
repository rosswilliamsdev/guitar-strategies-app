import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { format } from 'date-fns';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, FileText, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { InvoiceStatus } from '@/types';

interface InvoicesPageProps {
  searchParams: { 
    student?: string; 
    status?: InvoiceStatus; 
    month?: string;
    page?: string;
  };
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  if (!session.user.teacherProfile?.id) {
    redirect('/settings');
  }

  const page = parseInt(searchParams.page || '1');
  const limit = 10;

  // Build where clause
  const where: any = {
    teacherId: session.user.teacherProfile.id,
  };

  if (searchParams.student) {
    where.studentId = searchParams.student;
  }

  if (searchParams.status) {
    where.status = searchParams.status;
  }

  if (searchParams.month) {
    where.month = searchParams.month;
  }

  // Get invoices and total count
  const [invoices, total, students] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        student: {
          include: {
            user: true,
          },
        },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
    // Get students for filter dropdown
    prisma.studentProfile.findMany({
      where: {
        teacherId: session.user.teacherProfile.id,
        isActive: true,
      },
      include: {
        user: true,
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge variant="success" className="flex items-center space-x-1">
            <CheckCircle className="h-3 w-3" />
            <span>Paid</span>
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="warning" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        );
      case 'OVERDUE':
        return (
          <Badge variant="error" className="flex items-center space-x-1">
            <AlertCircle className="h-3 w-3" />
            <span>Overdue</span>
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track your student invoices
          </p>
        </div>
        <Link href="/invoices/new">
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Filters</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Select value={searchParams.student || 'all'}>
              <SelectTrigger>
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={searchParams.status || 'all'}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Input
              type="month"
              placeholder="Select month"
              value={searchParams.month || ''}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm">
              <Search className="h-3 w-3 mr-1" />
              Search
            </Button>
            <Button variant="ghost" size="sm">
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* Invoices List */}
      {invoices.length > 0 ? (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-foreground">
                        {invoice.invoiceNumber}
                      </h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {invoice.student.user.name} • {format(new Date(invoice.month + '-01'), 'MMMM yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="font-semibold text-lg">${(invoice.total / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Due {format(invoice.dueDate, 'MMM d, yyyy')}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">
                      {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
                    </p>
                    <Link href={`/invoices/${invoice.id}`}>
                      <Button variant="secondary" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">No Invoices Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchParams.student || searchParams.status || searchParams.month
              ? 'No invoices match your current filters.'
              : 'You haven\'t created any invoices yet.'}
          </p>
          <Link href="/invoices/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Invoice
            </Button>
          </Link>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Link
              key={pageNum}
              href={`/invoices?page=${pageNum}${searchParams.student ? `&student=${searchParams.student}` : ''}${searchParams.status ? `&status=${searchParams.status}` : ''}${searchParams.month ? `&month=${searchParams.month}` : ''}`}
            >
              <Button
                variant={page === pageNum ? 'default' : 'ghost'}
                size="sm"
              >
                {pageNum}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export const metadata = {
  title: 'Invoices | Guitar Strategies',
  description: 'Manage and track student invoices',
};