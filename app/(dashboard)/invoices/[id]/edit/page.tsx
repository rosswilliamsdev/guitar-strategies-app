import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InvoiceEditForm } from '@/components/invoices/invoice-edit-form';

interface InvoiceEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceEditPage({ params }: InvoiceEditPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  if (!session.user.teacherProfile?.id) {
    redirect('/settings');
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      teacher: {
        include: {
          user: true,
        },
      },
      student: {
        include: {
          user: true,
        },
      },
      items: true,
    },
  });

  if (!invoice) {
    notFound();
  }

  // Check authorization
  if (invoice.teacherId !== session.user.teacherProfile.id) {
    notFound();
  }

  // Only allow editing PENDING invoices
  if (invoice.status !== 'PENDING') {
    redirect(`/invoices/${invoice.id}`);
  }

  // Get teacher's students for potential student change
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Edit Invoice</h1>
        <p className="text-muted-foreground mt-2">
          Update invoice details and line items
        </p>
      </div>

      <InvoiceEditForm
        invoice={invoice}
        teacherId={session.user.teacherProfile.id}
        students={students}
      />
    </div>
  );
}

export async function generateMetadata({ params }: InvoiceEditPageProps) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      invoiceNumber: true,
    },
  });

  if (!invoice) {
    return {
      title: 'Invoice Not Found',
    };
  }

  return {
    title: `Edit ${invoice.invoiceNumber} | Guitar Strategies`,
    description: `Edit invoice ${invoice.invoiceNumber}`,
  };
}
