"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, Send, CheckCircle } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { log, emailLog, invoiceLog } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  status: string;
  createdAt: string | Date;
  dueDate: string | Date;
  month: string;
  subtotal: number;
  total: number;
  paidAt?: string | Date;
  paymentMethod?: string;
  paymentNotes?: string;
  customFullName?: string | null;
  customEmail?: string | null;
  teacher: {
    user: {
      name: string;
      email: string;
    };
    phoneNumber?: string;
    venmoHandle?: string;
    paypalEmail?: string;
    zelleEmail?: string;
  };
  student?: {
    user: {
      name: string;
      email: string;
    };
    phoneNumber?: string;
  } | null;
  items: Array<{
    id: string;
    description: string;
    lessonDate?: string | Date;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

interface InvoiceTemplateProps {
  invoice: InvoiceData;
  showActions?: boolean;
  compact?: boolean;
}

// Timezone-safe date formatters
const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  // Display in local timezone (CST/your timezone)
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatMonthYear = (monthString: string) => {
  // Parse "YYYY-MM" format to avoid timezone issues
  const [year, month] = monthString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
};

export function InvoiceTemplate({
  invoice,
  showActions = true,
  compact = false,
}: InvoiceTemplateProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownloadPDF = async () => {
    setIsLoading(true);
    try {
      const invoiceElement = document.querySelector(
        "[data-invoice-template]"
      ) as HTMLElement;

      if (!invoiceElement) {
        throw new Error("Invoice template not found");
      }

      // Hide action buttons before capturing
      const actionButtons = invoiceElement.querySelectorAll(".print\\:hidden");
      actionButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = "none";
      });

      // Generate canvas from the invoice element
      const canvas = await html2canvas(invoiceElement, {
        useCORS: true,
        allowTaint: true,
        background: "#ffffff",
        width: invoiceElement.scrollWidth,
        height: invoiceElement.scrollHeight,
      });

      // Restore action buttons
      actionButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = "";
      });

      // Create PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF("p", "mm", "a4");
      let position = 0;

      // Add first page
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight
        );
        heightLeft -= pageHeight;
      }

      // Download the PDF
      pdf.save(`${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      log.error("Error generating PDF:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fallback to print dialog if PDF generation fails
      window.print();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
      });
      const result = await response.json();

      if (response.ok) {
        alert(`Invoice sent successfully to ${result.recipient}`);
        // Refresh the page to update invoice status
        window.location.reload();
      } else {
        alert(result.error || "Failed to send invoice");
      }
    } catch (error) {
      log.error("Error sending invoice:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      alert("Failed to send invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const paymentMethods = {
    venmoHandle: invoice.teacher?.venmoHandle,
    paypalEmail: invoice.teacher?.paypalEmail,
    zelleEmail: invoice.teacher?.zelleEmail,
  };

  const hasPaymentMethods =
    paymentMethods.venmoHandle ||
    paymentMethods.paypalEmail ||
    paymentMethods.zelleEmail;

  return (
    <Card
      data-invoice-template
      className={`${
        compact ? "p-4" : "p-8"
      } bg-white print:shadow-none print:border-0`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Invoice</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            {invoice.invoiceNumber}
          </p>
        </div>

        <div className="text-right">
          {showActions && (
            <div className="flex items-center space-x-2 mt-4 print:hidden">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePrint}
                disabled={isLoading}
              >
                <FileText className="h-3 w-3 mr-1" />
                Print
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={isLoading}
              >
                <Download className="h-3 w-3 mr-1" />
                {isLoading ? "Generating..." : "PDF"}
              </Button>
              <Button
                size="sm"
                onClick={handleSendInvoice}
                disabled={isLoading}
              >
                <Send className="h-3 w-3 mr-1" />
                {isLoading ? "Sending..." : "Send"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* From (Teacher) */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">From:</h3>
          <div className="space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">
              {invoice.teacher?.user?.name}
            </p>
            <p>{invoice.teacher?.user?.email}</p>
            {invoice.teacher?.phoneNumber && (
              <p>{invoice.teacher.phoneNumber}</p>
            )}
          </div>
        </div>

        {/* To (Student or Custom) */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">To:</h3>
          <div className="space-y-1 text-muted-foreground">
            {invoice.student ? (
              <>
                <p className="font-medium text-foreground">
                  {invoice.student.user.name}
                </p>
                <p>{invoice.student.user.email}</p>
                {invoice.student.phoneNumber && (
                  <p>{invoice.student.phoneNumber}</p>
                )}
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">
                  {invoice.customFullName}
                </p>
                <p>{invoice.customEmail}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Invoice Date
          </p>
          <p className="text-foreground">{formatDate(invoice.createdAt)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Due Date</p>
          <p className="text-foreground">{formatDate(invoice.dueDate)}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Period</p>
          <p className="text-foreground">{formatMonthYear(invoice.month)}</p>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Line Items */}
      <div className="mb-8">
        <h3 className="font-semibold text-foreground mb-4">Lesson Details</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 text-sm font-medium text-muted-foreground">
                  Description
                </th>
                <th className="text-center py-3 text-sm font-medium text-muted-foreground">
                  Date
                </th>
                <th className="text-center py-3 text-sm font-medium text-muted-foreground">
                  Qty
                </th>
                <th className="text-right py-3 text-sm font-medium text-muted-foreground">
                  Rate
                </th>
                <th className="text-right py-3 text-sm font-medium text-muted-foreground">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: InvoiceData["items"][0], index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-border/50",
                    index % 2 === 1 && "bg-neutral-50/50"
                  )}
                >
                  <td className="py-3 text-foreground">{item.description}</td>
                  <td className="py-3 text-center text-muted-foreground">
                    {item.lessonDate && formatDate(item.lessonDate)}
                  </td>
                  <td className="py-3 text-center text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    ${(item.rate / 100).toFixed(2)}
                  </td>
                  <td className="py-3 text-right font-medium text-foreground">
                    ${(item.amount / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-full md:w-1/2 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">
              ${(invoice.subtotal / 100).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-lg font-semibold text-foreground">Total</span>
            <span className="text-lg font-semibold text-foreground">
              ${(invoice.total / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Payment Information */}
      {hasPaymentMethods && (
        <div className="mb-8">
          <h3 className="font-semibold text-foreground mb-4">
            Payment Methods
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You can pay using any of the following methods:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.venmoHandle && (
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-sm">Venmo</p>
                  <p className="text-sm text-muted-foreground">
                    @{paymentMethods.venmoHandle}
                  </p>
                </div>
              </div>
            )}

            {paymentMethods.paypalEmail && (
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-sm">PayPal</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethods.paypalEmail}
                  </p>
                </div>
              </div>
            )}

            {paymentMethods.zelleEmail && (
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-sm">Zelle</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethods.zelleEmail}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 mb-1">
                  Payment Methods Configured
                </h4>
                <p className="text-sm text-green-800">
                  These payment options will be automatically included on all
                  invoices you generate.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Status */}
      {invoice.status === "PAID" && invoice.paidAt && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">
                Payment Received - {formatDate(invoice.paidAt)}
              </p>
              {invoice.paymentMethod && (
                <p className="text-sm text-green-800">
                  Paid via {invoice.paymentMethod}
                  {invoice.paymentNotes && ` - ${invoice.paymentNotes}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>Thank you for your business!</p>
        <p className="mt-1">
          Questions? Contact {invoice.teacher?.user?.name} at{" "}
          {invoice.teacher?.user?.email}
        </p>
      </div>
    </Card>
  );
}
