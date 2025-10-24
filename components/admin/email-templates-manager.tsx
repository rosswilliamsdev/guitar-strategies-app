"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Save, Plus, Eye, Code } from "lucide-react";
import { log } from "@/lib/logger";

const EMAIL_TYPES = [
  { value: 'STUDENT_WELCOME', label: 'Student Welcome', description: 'Sent when a teacher invites a new student' },
  { value: 'LESSON_BOOKING', label: 'Lesson Booking', description: 'Sent when a lesson is booked' },
  { value: 'LESSON_CANCELLATION', label: 'Lesson Cancellation', description: 'Sent when a lesson is cancelled' },
  { value: 'LESSON_REMINDER', label: 'Lesson Reminder', description: 'Sent 24 hours before a lesson' },
  { value: 'INVOICE_GENERATED', label: 'Invoice Generated', description: 'Sent when a new invoice is created' },
  { value: 'INVOICE_OVERDUE', label: 'Invoice Overdue', description: 'Sent for overdue invoices' },
  { value: 'CHECKLIST_COMPLETION', label: 'Checklist Completion', description: 'Sent when a checklist is completed' },
  { value: 'SYSTEM_UPDATES', label: 'System Updates', description: 'System announcements and updates' },
];

const TEMPLATE_VARIABLES = {
  STUDENT_WELCOME: ['{{studentName}}', '{{studentEmail}}', '{{temporaryPassword}}', '{{teacherName}}', '{{loginUrl}}'],
  LESSON_BOOKING: ['{{studentName}}', '{{teacherName}}', '{{lessonDate}}', '{{lessonTime}}', '{{duration}}'],
  LESSON_CANCELLATION: ['{{studentName}}', '{{teacherName}}', '{{lessonDate}}', '{{lessonTime}}'],
  LESSON_REMINDER: ['{{studentName}}', '{{lessonDate}}', '{{lessonTime}}', '{{teacherName}}'],
  INVOICE_GENERATED: ['{{studentName}}', '{{invoiceNumber}}', '{{amount}}', '{{dueDate}}'],
  INVOICE_OVERDUE: ['{{studentName}}', '{{invoiceNumber}}', '{{amount}}', '{{daysPastDue}}'],
  CHECKLIST_COMPLETION: ['{{studentName}}', '{{checklistName}}', '{{teacherName}}'],
  SYSTEM_UPDATES: ['{{recipientName}}', '{{updateMessage}}'],
};

interface EmailTemplate {
  id: string;
  type: string;
  subject: string;
  htmlBody: string;
  variables: string;
  description: string | null;
  isActive: boolean;
}

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isPreview, setIsPreview] = useState(false);

  // Form state
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setSubject(selectedTemplate.subject);
      setHtmlBody(selectedTemplate.htmlBody);
      setDescription(selectedTemplate.description || "");
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/email-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates || []);
      }
    } catch (error) {
      log.error('Error loading templates', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/email-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          htmlBody,
          description,
          isActive: selectedTemplate.isActive
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }

      setSuccess('Template saved successfully!');
      await loadTemplates();
    } catch (error: any) {
      setError(error.message || 'Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (type: string) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const emailType = EMAIL_TYPES.find(t => t.value === type);
      const variables = TEMPLATE_VARIABLES[type as keyof typeof TEMPLATE_VARIABLES] || [];

      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subject: `${emailType?.label} - Subject`,
          htmlBody: '<p>Template HTML goes here</p>',
          variables,
          description: emailType?.description || ''
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create template');
      }

      setSuccess('Template created successfully!');
      await loadTemplates();
    } catch (error: any) {
      setError(error.message || 'Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };

  const availableTypes = EMAIL_TYPES.filter(
    type => !templates.some(t => t.type === type.value)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Template List */}
      <Card className="p-6 lg:col-span-1">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Email Templates</h3>
          {availableTypes.length > 0 && (
            <Select onValueChange={handleCreate}>
              <SelectTrigger>
                <Plus className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Create New Template" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          {templates.map(template => {
            const emailType = EMAIL_TYPES.find(t => t.value === template.type);
            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'bg-turquoise-50 border-turquoise-500'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                <div className="font-medium">{emailType?.label || template.type}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {template.description || emailType?.description}
                </div>
              </button>
            );
          })}
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No templates yet. Create one using the dropdown above.
            </p>
          )}
        </div>
      </Card>

      {/* Template Editor */}
      <Card className="p-6 lg:col-span-2">
        {selectedTemplate ? (
          <div className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-700">{success}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {EMAIL_TYPES.find(t => t.value === selectedTemplate.type)?.label || selectedTemplate.type}
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreview(!isPreview)}
                  >
                    {isPreview ? <Code className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {isPreview ? 'Edit' : 'Preview'}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-2"
                    placeholder="Email subject line"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Internal)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-2"
                    placeholder="Template description"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="htmlBody">Email Body (HTML)</Label>
                    <div className="text-xs text-muted-foreground">
                      Available variables: {TEMPLATE_VARIABLES[selectedTemplate.type as keyof typeof TEMPLATE_VARIABLES]?.join(', ')}
                    </div>
                  </div>

                  {isPreview ? (
                    <div
                      className="border rounded-lg p-4 min-h-[400px] bg-white"
                      dangerouslySetInnerHTML={{ __html: htmlBody }}
                    />
                  ) : (
                    <Textarea
                      id="htmlBody"
                      value={htmlBody}
                      onChange={(e) => setHtmlBody(e.target.value)}
                      className="mt-2 font-mono text-sm"
                      rows={20}
                      placeholder="<html>...</html>"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>Select a template to edit</p>
          </div>
        )}
      </Card>
    </div>
  );
}
