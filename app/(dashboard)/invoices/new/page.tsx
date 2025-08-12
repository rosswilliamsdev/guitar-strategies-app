import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InvoiceForm } from '@/components/invoices/invoice-form';

interface NewInvoicePageProps {
  searchParams: { studentId?: string; month?: string };
}

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  if (!session.user.teacherProfile?.id) {
    redirect('/settings');
  }

  // Get teacher's students
  const students = await prisma.studentProfile.findMany({
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
  });

  if (students.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Create New Invoice</h1>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h3 className="font-medium text-orange-900 mb-2">No Students Found</h3>
            <p className="text-orange-800 mb-4">
              You need to have students assigned to you before you can create invoices.
            </p>
            <p className="text-sm text-orange-700">
              Students can be added through the admin panel or by registering with your teacher ID.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Create New Invoice</h1>
        <p className="text-muted-foreground mt-2">
          Generate an invoice for completed lessons
        </p>
      </div>

      <InvoiceForm 
        teacherId={session.user.teacherProfile.id}
        students={students}
        defaultStudentId={searchParams.studentId}
        defaultMonth={searchParams.month}
      />
    </div>
  );
}

export const metadata = {
  title: 'Create Invoice | Guitar Strategies',
  description: 'Create a new invoice for completed guitar lessons',
};