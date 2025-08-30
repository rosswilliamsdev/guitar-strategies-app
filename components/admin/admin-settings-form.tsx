"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Save, 
  RefreshCw, 
  Mail, 
  DollarSign, 
  Calendar,
  Settings,
  CheckCircle,
  XCircle
} from "lucide-react";

interface SystemSettings {
  // Invoice Configuration
  defaultInvoiceDueDays: number;
  latePaymentReminderDays: number;
  invoiceNumberFormat: string;
  
  // Email System Settings
  emailSenderName: string;
  emailSenderAddress: string;
  enableBookingConfirmations: boolean;
  enableInvoiceNotifications: boolean;
  enableReminderEmails: boolean;
  emailFooterText: string;
  
  // Lesson Defaults
  defaultLessonDuration30: boolean;
  defaultLessonDuration60: boolean;
  defaultAdvanceBookingDays: number;
  cancellationPolicyText: string;
}

export function AdminSettingsForm() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/admin/settings");
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch settings");
      }
      
      setSettings(result.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to save settings");
      }
      
      setSettings(result.settings);
      setSuccess("Settings saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading && !settings) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error && !settings) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span>Error loading settings: {error}</span>
          </div>
          <Button onClick={fetchSettings} variant="secondary" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}
      
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <XCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Invoice Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Invoice Configuration</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure default invoice settings and payment reminders
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="defaultInvoiceDueDays">Default Due Date (days after generation)</Label>
              <Input
                id="defaultInvoiceDueDays"
                type="number"
                min="1"
                max="90"
                value={settings.defaultInvoiceDueDays}
                onChange={(e) => updateSetting('defaultInvoiceDueDays', parseInt(e.target.value) || 14)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many days after invoice generation is payment due
              </p>
            </div>
            
            <div>
              <Label htmlFor="latePaymentReminderDays">Late Payment Reminder (days after due)</Label>
              <Input
                id="latePaymentReminderDays"
                type="number"
                min="1"
                max="30"
                value={settings.latePaymentReminderDays}
                onChange={(e) => updateSetting('latePaymentReminderDays', parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Days after due date to send overdue reminder
              </p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="invoiceNumberFormat">Invoice Number Format</Label>
            <Input
              id="invoiceNumberFormat"
              value={settings.invoiceNumberFormat}
              onChange={(e) => updateSetting('invoiceNumberFormat', e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {"{YEAR}"} and {"{NUMBER}"} placeholders. Example: INV-{"{YEAR}"}-{"{NUMBER}"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Email System Settings</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure email notifications and sender information
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emailSenderName">Sender Name</Label>
              <Input
                id="emailSenderName"
                value={settings.emailSenderName}
                onChange={(e) => updateSetting('emailSenderName', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="emailSenderAddress">Sender Email Address</Label>
              <Input
                id="emailSenderAddress"
                type="email"
                value={settings.emailSenderAddress}
                onChange={(e) => updateSetting('emailSenderAddress', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="emailFooterText">Email Footer Text</Label>
            <Textarea
              id="emailFooterText"
              value={settings.emailFooterText}
              onChange={(e) => updateSetting('emailFooterText', e.target.value)}
              rows={2}
            />
          </div>
          
          <div className="space-y-3">
            <Label className="text-sm font-medium">Email Notifications</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableBookingConfirmations"
                checked={settings.enableBookingConfirmations}
                onCheckedChange={(checked) => updateSetting('enableBookingConfirmations', checked)}
              />
              <Label htmlFor="enableBookingConfirmations" className="font-normal">
                Send booking confirmation emails
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableInvoiceNotifications"
                checked={settings.enableInvoiceNotifications}
                onCheckedChange={(checked) => updateSetting('enableInvoiceNotifications', checked)}
              />
              <Label htmlFor="enableInvoiceNotifications" className="font-normal">
                Send invoice notification emails
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableReminderEmails"
                checked={settings.enableReminderEmails}
                onCheckedChange={(checked) => updateSetting('enableReminderEmails', checked)}
              />
              <Label htmlFor="enableReminderEmails" className="font-normal">
                Send reminder and overdue emails
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Lesson Defaults</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure default lesson settings and policies
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Available Lesson Durations</Label>
            <div className="flex items-center space-x-6 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="defaultLessonDuration30"
                  checked={settings.defaultLessonDuration30}
                  onCheckedChange={(checked) => updateSetting('defaultLessonDuration30', checked)}
                />
                <Label htmlFor="defaultLessonDuration30" className="font-normal">
                  30-minute lessons
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="defaultLessonDuration60"
                  checked={settings.defaultLessonDuration60}
                  onCheckedChange={(checked) => updateSetting('defaultLessonDuration60', checked)}
                />
                <Label htmlFor="defaultLessonDuration60" className="font-normal">
                  60-minute lessons
                </Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              At least one duration must be enabled
            </p>
          </div>
          
          <div>
            <Label htmlFor="defaultAdvanceBookingDays">Default Advance Booking Window (days)</Label>
            <Input
              id="defaultAdvanceBookingDays"
              type="number"
              min="1"
              max="90"
              value={settings.defaultAdvanceBookingDays}
              onChange={(e) => updateSetting('defaultAdvanceBookingDays', parseInt(e.target.value) || 14)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              How far in advance students can book lessons by default
            </p>
          </div>
          
          <div>
            <Label htmlFor="cancellationPolicyText">Cancellation Policy Text</Label>
            <Textarea
              id="cancellationPolicyText"
              value={settings.cancellationPolicyText}
              onChange={(e) => updateSetting('cancellationPolicyText', e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This text will be displayed to users when booking or canceling lessons
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <Button onClick={fetchSettings} variant="secondary" disabled={loading}>
          {loading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Reset
        </Button>
        
        <Button onClick={saveSettings} disabled={saving} className="bg-primary hover:bg-primary/90">
          {saving ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}