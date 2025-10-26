"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Mail, Bell, DollarSign, Trophy, AlertTriangle, Info } from "lucide-react";

export type EmailPreference = {
  id: string;
  type: string;
  enabled: boolean;
};

interface EmailPreferencesProps {
  preferences: EmailPreference[];
  onUpdate: (preferences: EmailPreference[]) => Promise<boolean>;
}

const EMAIL_TYPES = [
  {
    type: 'LESSON_BOOKING',
    label: 'Lesson Booking Confirmations',
    description: 'Receive confirmations when lessons are booked',
    icon: Bell,
    category: 'Lessons'
  },
  {
    type: 'LESSON_CANCELLATION',
    label: 'Lesson Cancellations',
    description: 'Get notified when lessons are cancelled',
    icon: AlertTriangle,
    category: 'Lessons'
  },
  {
    type: 'LESSON_COMPLETED',
    label: 'Lesson Summaries',
    description: 'Receive an email with lesson notes, homework, and progress after each lesson',
    icon: Mail,
    category: 'Lessons'
  },
  {
    type: 'LESSON_REMINDER',
    label: 'Lesson Reminders',
    description: 'Receive reminders 24 hours before your lessons',
    icon: Bell,
    category: 'Lessons'
  },
  {
    type: 'INVOICE_GENERATED',
    label: 'New Invoices',
    description: 'Get notified when new invoices are generated',
    icon: DollarSign,
    category: 'Billing'
  },
  {
    type: 'INVOICE_OVERDUE',
    label: 'Overdue Invoice Reminders',
    description: 'Receive reminders for unpaid invoices',
    icon: DollarSign,
    category: 'Billing'
  },
  {
    type: 'CHECKLIST_COMPLETION',
    label: 'Achievement Celebrations',
    description: 'Get congratulatory emails when you complete checklists',
    icon: Trophy,
    category: 'Progress'
  },
  {
    type: 'SYSTEM_UPDATES',
    label: 'System Announcements',
    description: 'Receive important platform updates and announcements',
    icon: Info,
    category: 'System'
  }
] as const;

export function EmailPreferences({ preferences, onUpdate }: EmailPreferencesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when preferences prop changes
  useEffect(() => {
    console.log('[Email Preferences] useEffect triggered, syncing preferences:', preferences);
    setLocalPreferences(preferences);
    setHasChanges(false);
  }, [preferences]);

  const handleToggle = (type: string, enabled: boolean) => {
    console.log('[Email Preferences] Toggle clicked:', { type, enabled, currentPrefs: localPreferences });
    const updated = localPreferences.map(pref =>
      pref.type === type ? { ...pref, enabled } : pref
    );
    console.log('[Email Preferences] Updated prefs:', updated);
    setLocalPreferences(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const success = await onUpdate(localPreferences);
      if (success) {
        setHasChanges(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getPreferenceEnabled = (type: string) => {
    return localPreferences.find(p => p.type === type)?.enabled ?? true;
  };

  const groupedTypes = EMAIL_TYPES.reduce((acc, emailType) => {
    if (!acc[emailType.category]) {
      acc[emailType.category] = [];
    }
    acc[emailType.category].push(emailType);
    return acc;
  }, {} as Record<string, typeof EMAIL_TYPES[number][]>);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Email Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Choose which email notifications you'd like to receive
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedTypes).map(([category, types]) => (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
            </div>
            
            <div className="space-y-4">
              {types.map((emailType) => {
                const Icon = emailType.icon;
                const enabled = getPreferenceEnabled(emailType.type);
                console.log('[Email Preferences] Rendering switch:', { type: emailType.type, enabled, localPreferences });

                return (
                  <div key={emailType.type} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <Label htmlFor={emailType.type} className="text-sm font-medium cursor-pointer">
                          {emailType.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {emailType.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={emailType.type}
                      checked={enabled}
                      onCheckedChange={(checked) => handleToggle(emailType.type, checked)}
                    />
                  </div>
                );
              })}
            </div>
            
            {category !== 'System' && <Separator className="mt-6" />}
          </div>
        ))}
      </div>

      {hasChanges && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              You have unsaved changes to your email preferences
            </p>
            <Button 
              onClick={handleSave}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}