import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiLog, dbLog, invoiceLog } from "@/lib/logger";
import { withApiMiddleware } from "@/lib/api-wrapper";

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check authorization - teachers can see their own invoices, students can see invoices for them
    const isTeacher =
      session.user.role === "TEACHER" &&
      invoice.teacherId === session.user.teacherProfile?.id;

    // For students: use activeStudentProfileId (auto-set for INDIVIDUAL, manually set for FAMILY)
    const isStudent =
      session.user.role === "STUDENT" &&
      session.user.activeStudentProfileId &&
      invoice.studentId === session.user.activeStudentProfileId;

    const isAdmin = session.user.role === "ADMIN";

    if (!isTeacher && !isStudent && !isAdmin) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    apiLog.error("Error fetching invoice:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handlePUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Access denied. Teachers only." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: id },
      include: { items: true },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existingInvoice.teacherId !== session.user.teacherProfile?.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: any = {};

    // Handle status updates (for marking as paid)
    if (body.status) {
      updateData.status = body.status;

      if (body.status === "PAID" && !existingInvoice.paidAt) {
        updateData.paidAt = new Date();
      }
    }

    if (body.paymentMethod) {
      updateData.paymentMethod = body.paymentMethod;
    }

    if (body.paymentNotes) {
      updateData.paymentNotes = body.paymentNotes;
    }

    // Handle full invoice updates (from edit form)
    if (body.items) {
      // Only allow full updates for PENDING invoices
      if (existingInvoice.status !== "PENDING") {
        return NextResponse.json(
          { error: "Can only edit PENDING invoices" },
          { status: 400 }
        );
      }

      // Update invoice fields
      if (body.month) updateData.month = body.month;
      if (body.dueDate) updateData.dueDate = new Date(body.dueDate);

      // Handle student vs custom invoice
      if (body.studentId !== undefined && body.studentId !== null) {
        // Regular student invoice
        updateData.studentId = body.studentId;
        updateData.customFullName = null;
        updateData.customEmail = null;
      } else if (body.customFullName && body.customEmail) {
        // Custom invoice (non-system student)
        updateData.studentId = null;
        updateData.customFullName = body.customFullName;
        updateData.customEmail = body.customEmail;
      }

      // Calculate totals from items
      const subtotal = body.items.reduce(
        (sum: number, item: any) => sum + item.amount,
        0
      );
      updateData.subtotal = subtotal;
      updateData.total = subtotal;

      // Delete all existing items and create new ones
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Create new items
      for (const item of body.items) {
        await prisma.invoiceItem.create({
          data: {
            invoiceId: id,
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
            lessonDate: item.lessonDate ? new Date(item.lessonDate) : null,
            lessonId: item.lessonId || null,
          },
        });
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id: id },
      data: updateData,
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

    return NextResponse.json({ invoice });
  } catch (error) {
    apiLog.error("Error updating invoice:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Access denied. Teachers only." },
        { status: 403 }
      );
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id: id },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existingInvoice.teacherId !== session.user.teacherProfile?.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Allow deletion of any invoice that belongs to the teacher
    // No status restriction - teachers can delete any of their invoices

    await prisma.invoice.delete({
      where: { id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLog.error("Error deleting invoice:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export handlers directly (middleware temporarily disabled for Next.js 15 compatibility)
export const GET = handleGET;
export const PUT = handlePUT;
export const DELETE = handleDELETE;
