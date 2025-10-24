'use client';

import { useState } from 'react';
import EmailTestInterface from '@/components/admin/email-test-interface';
import { EmailTemplatesManager } from '@/components/admin/email-templates-manager';
import { cn } from '@/lib/utils';

export default function EmailManagementPage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'test'>('templates');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Manage Emails</h1>
          <p className="text-muted-foreground">
            Customize email templates and test the email notification system.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === 'templates'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Email Templates
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={cn(
              "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
              activeTab === 'test'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Test Emails
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === 'templates' && <EmailTemplatesManager />}
        {activeTab === 'test' && <EmailTestInterface />}
      </div>
    </div>
  );
}