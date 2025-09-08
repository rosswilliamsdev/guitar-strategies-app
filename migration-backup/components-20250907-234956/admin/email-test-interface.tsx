"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface TestResult {
  success: boolean;
  message: string;
  testType: string;
}

export default function EmailTestInterface() {
  const [email, setEmail] = useState("");
  const [testType, setTestType] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const testTypes = [
    { value: "basic", label: "Basic Test Email" },
    { value: "lesson-booking", label: "Lesson Booking Notification" },
    { value: "lesson-cancellation", label: "Lesson Cancellation Notification" },
    {
      value: "checklist-completion",
      label: "Checklist Completion Notification",
    },
    { value: "invoice-created", label: "Invoice Created Notification" },
    { value: "invoice-overdue", label: "Invoice Overdue Reminder" },
    { value: "invoice-paid", label: "Invoice Payment Confirmation" },
    { value: "invoice-upcoming", label: "Invoice Payment Due Soon" },
  ];

  const sendTestEmail = async () => {
    if (!email.trim()) {
      setResult({
        success: false,
        message: "Please enter an email address",
        testType,
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email.trim(),
          testType: testType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          testType: data.testType,
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to send test email",
          testType,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error: Could not send test email",
        testType,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Instructions */}
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-primary mt-1" />
          <div>
            <h3 className="font-semibold mb-2">Email Configuration Status</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Environment Variable:</strong> RESEND_API_KEY must be
                set in your .env file
              </p>
              <p>
                <strong>Current Value:</strong>{" "}
                {process.env.RESEND_API_KEY
                  ? "✅ Configured"
                  : "❌ Not configured"}
              </p>
              <p>To set up email notifications, you need to:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>
                  Sign up for a Resend account at{" "}
                  <a
                    href="https://resend.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    resend.com
                  </a>
                </li>
                <li>Get your API key from the Resend dashboard</li>
                <li>
                  Add{" "}
                  <code className="bg-muted px-1 rounded">
                    RESEND_API_KEY="re_your_key_here"
                  </code>{" "}
                  to your .env file
                </li>
                <li>Restart your development server</li>
              </ol>
            </div>
          </div>
        </div>
      </Card>

      {/* Test Email Form */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Send className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Send Test Email</h3>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="Enter email address to test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="test-type">Test Type</Label>
              <Select
                value={testType}
                onValueChange={setTestType}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {testTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={sendTestEmail}
              disabled={loading || !email.trim()}
              className="max-w-48"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Test Result */}
      {result && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 mt-1" />
            )}
            <div>
              <h3
                className={`font-semibold mb-2 ${
                  result.success ? "text-green-700" : "text-red-700"
                }`}
              >
                {result.success
                  ? "Email Sent Successfully!"
                  : "Email Failed to Send"}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {result.message}
              </p>
              {result.success && (
                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Test Type:</strong>{" "}
                    {testTypes.find((t) => t.value === result.testType)?.label}
                  </p>
                  <p>
                    <strong>Sent to:</strong> {email}
                  </p>
                  <p>
                    <strong>Time:</strong> {new Date().toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Email Features Overview */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Email Notification Features</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Lesson Notifications:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>
                • <strong>Lesson Bookings:</strong> Sent to students when they
                book single or recurring lessons
              </li>
              <li>
                • <strong>Lesson Cancellations:</strong> Sent to both students
                and teachers when lessons are cancelled
              </li>
              <li>
                • <strong>Checklist Completions:</strong> Sent to students when
                they complete a full checklist
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Invoice Notifications:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>
                • <strong>Invoice Created:</strong> Sent when a new invoice is
                generated for a student
              </li>
              <li>
                • <strong>Payment Due Soon:</strong> Reminder sent before
                invoice due date
              </li>
              <li>
                • <strong>Overdue Reminder:</strong> Sent when invoice payment
                is past due
              </li>
              <li>
                • <strong>Payment Confirmation:</strong> Sent when teacher marks
                invoice as paid
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
