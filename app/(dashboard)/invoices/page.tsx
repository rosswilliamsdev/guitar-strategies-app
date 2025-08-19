import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { format } from 'date-fns';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Eye } from 'lucide-react';
import { InvoiceFilters } from '@/components/invoices/invoice-filters';
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

  // Build where clause for lessons
  const lessonWhere: any = {
    teacherId: session.user.teacherProfile.id,
    status: 'SCHEDULED', // Only show scheduled lessons
  };

  if (searchParams.student) {
    lessonWhere.studentId = searchParams.student;
  }

  if (searchParams.month) {
    const [year, month] = searchParams.month.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    
    lessonWhere.date = {
      gte: startDate,
      lte: endDate,
    };
  }

  // Get lessons and total count
  const [lessons, total, students] = await Promise.all([
    prisma.lesson.findMany({
      where: lessonWhere,
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
      },
      orderBy: {
        date: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lesson.count({ where: lessonWhere }),
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
          <h1 className="text-3xl font-semibold text-foreground">Lessons for Invoicing</h1>
          <p className="text-muted-foreground mt-2">
            View scheduled lessons to create invoices for billing
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

      {/* Lessons List */}
      {lessons.length > 0 ? (
        <div className="space-y-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-foreground">
                        Guitar Lesson
                      </h3>
                      <Badge variant="secondary">
                        {lesson.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lesson.student.user.name} • {format(lesson.date, 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      ${((session.user.teacherProfile?.hourlyRate || 6000) / 100 * (lesson.duration / 60)).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lesson.duration} minutes
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link href={`/lessons/${lesson.id}`}>
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
          <h3 className="font-medium text-foreground mb-2">No Lessons Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchParams.student || searchParams.month
              ? 'No scheduled lessons match your current filters.'
              : 'You don\'t have any scheduled lessons yet.'}
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