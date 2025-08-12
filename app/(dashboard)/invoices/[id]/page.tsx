import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InvoiceTemplate } from '@/components/invoices/invoice-template';

interface InvoicePageProps {
  params: { id: string };
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    notFound();
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
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
  const isTeacher = session.user.role === 'TEACHER' && invoice.teacherId === session.user.teacherProfile?.id;
  const isStudent = session.user.role === 'STUDENT' && invoice.studentId === session.user.studentProfile?.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isTeacher && !isStudent && !isAdmin) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <InvoiceTemplate invoice={invoice as any} showActions={isTeacher} />
    </div>
  );
}

export async function generateMetadata({ params }: InvoicePageProps) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    select: {
      invoiceNumber: true,
      student: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    return {
      title: 'Invoice Not Found',
    };
  }

  return {
    title: `${invoice.invoiceNumber} - ${invoice.student.user.name} | Guitar Strategies`,
    description: `Invoice ${invoice.invoiceNumber} for ${invoice.student.user.name}`,
  };
}