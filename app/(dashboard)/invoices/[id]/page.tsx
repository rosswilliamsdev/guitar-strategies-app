import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InvoiceTemplate } from '@/components/invoices/invoice-template';

type InvoiceWithRelations = {
  id: string;
  invoiceNumber: string;
  status: string;
  createdAt: Date;
  dueDate: Date;
  month: string;
  subtotal: number;
  total: number;
  paidAt: Date | null;
  paymentMethod: string | null;
  paymentNotes: string | null;
  customFullName: string | null;
  customEmail: string | null;
  teacher: {
    user: {
      name: string;
      email: string;
    };
    phoneNumber: string | null;
    venmoHandle: string | null;
    paypalEmail: string | null;
    zelleEmail: string | null;
  };
  student: {
    user: {
      name: string;
      email: string;
    };
    phoneNumber: string | null;
  } | null;
  items: Array<{
    id: string;
    description: string;
    lessonDate: Date | null;
    quantity: number;
    rate: number;
    amount: number;
  }>;
};

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    notFound();
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
  const isTeacher = session.user.role === 'TEACHER' && invoice.teacherId === session.user.teacherProfile?.id;
  const isStudent = session.user.role === 'STUDENT' && invoice.studentId && invoice.studentId === session.user.studentProfile?.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isTeacher && !isStudent && !isAdmin) {
    notFound();
  }

  // Convert null values to undefined for compatibility with InvoiceData interface
  const invoiceData = {
    ...invoice,
    paidAt: invoice.paidAt ?? undefined,
    paymentMethod: invoice.paymentMethod ?? undefined,
    paymentNotes: invoice.paymentNotes ?? undefined,
    customFullName: invoice.customFullName ?? undefined,
    customEmail: invoice.customEmail ?? undefined,
    items: invoice.items.map((item: any) => ({
      id: item.id,
      description: item.description,
      lessonDate: item.lessonDate ?? undefined,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    })),
    teacher: {
      ...invoice.teacher,
      phoneNumber: invoice.teacher.phoneNumber ?? undefined,
      venmoHandle: invoice.teacher.venmoHandle ?? undefined,
      paypalEmail: invoice.teacher.paypalEmail ?? undefined,
      zelleEmail: invoice.teacher.zelleEmail ?? undefined,
    },
    student: invoice.student ? {
      ...invoice.student,
      phoneNumber: invoice.student.phoneNumber ?? undefined,
      parentEmail: invoice.student.parentEmail ?? undefined,
    } : undefined,
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <InvoiceTemplate invoice={invoiceData} showActions={isTeacher} />
    </div>
  );
}

export async function generateMetadata({ params }: InvoicePageProps) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      invoiceNumber: true,
      customFullName: true,
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

  const studentName = invoice.student ? invoice.student.user.name : invoice.customFullName;
  
  return {
    title: `${invoice.invoiceNumber} - ${studentName} | Guitar Strategies`,
    description: `Invoice ${invoice.invoiceNumber} for ${studentName}`,
  };
}