import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { InvoiceFilters } from '@/components/invoices/invoice-filters';
import { InvoiceCard } from '@/components/invoices/invoice-card';
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

  // Build where clause for invoices
  const invoiceWhere: {
    teacherId: string;
    studentId?: string;
    status?: InvoiceStatus;
    month?: string;
  } = {
    teacherId: session.user.teacherProfile.id,
  };

  if (searchParams.student) {
    invoiceWhere.studentId = searchParams.student;
  }

  if (searchParams.status) {
    invoiceWhere.status = searchParams.status;
  }

  if (searchParams.month) {
    invoiceWhere.month = searchParams.month;
  }

  // Get invoices and total count
  const [invoices, total, students] = await Promise.all([
    prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        student: {
          include: {
            user: true,
          },
        },
        teacher: {
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
    prisma.invoice.count({ where: invoiceWhere }),
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
      <InvoiceFilters students={students} />

      {/* Invoices List */}
      {invoices.length > 0 ? (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <InvoiceCard 
              key={invoice.id} 
              invoice={invoice}
              hourlyRate={session.user.teacherProfile?.hourlyRate}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">No Invoices Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchParams.student || searchParams.month || searchParams.status
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
                variant={page === pageNum ? 'primary' : 'secondary'}
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