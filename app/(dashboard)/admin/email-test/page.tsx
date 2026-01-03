"use client";

import EmailTestInterface from "@/components/admin/email-test-interface";

export default function EmailManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Manage Emails
          </h1>
          <p className="text-muted-foreground">
            Test the email notification system.
          </p>
        </div>
      </div>

      <EmailTestInterface />
    </div>
  );
}
