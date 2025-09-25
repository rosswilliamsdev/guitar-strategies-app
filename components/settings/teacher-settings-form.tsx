"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Save, Key, User, Calendar, Clock, Settings2, CalendarDays, DollarSign, Mail } from "lucide-react";
import { teacherProfileSchema, passwordChangeSchema, timezoneSchema } from "@/lib/validations";
import { EmailPreferences, type EmailPreference } from "@/components/settings/email-preferences";
import { WeeklyScheduleGrid } from "@/components/teacher/WeeklyScheduleGrid";
import { BlockedTimeManager } from "@/components/teacher/BlockedTimeManager";
import { LessonSettingsForm } from "@/components/teacher/LessonSettingsForm";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { log, emailLog, invoiceLog } from '@/lib/logger';

// Common US timezones
const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "America/Phoenix", label: "Arizona Time (MST)" },
  { value: "UTC", label: "UTC" },
];

interface TeacherSettingsFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  teacherProfile: {
    id: string;
    bio?: string;
    hourlyRate?: number;
    timezone?: string;
    phoneNumber?: string;
    venmoHandle?: string;
    paypalEmail?: string;
    zelleEmail?: string;
  };
  emailPreferences?: EmailPreference[];
}

export function TeacherSettingsForm({ user, teacherProfile, emailPreferences = [] }: TeacherSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'profile' | 'availability' | 'lesson-settings' | 'blocked-time' | 'password' | 'email'>('profile');

  // Profile form state
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(teacherProfile.bio || "");
  const [timezone, setTimezone] = useState(teacherProfile.timezone || "America/New_York");
  const [phoneNumber, setPhoneNumber] = useState(teacherProfile.phoneNumber || "");
  
  // Payment method fields
  const [venmoHandle, setVenmoHandle] = useState(teacherProfile.venmoHandle || "");
  const [paypalEmail, setPaypalEmail] = useState(teacherProfile.paypalEmail || "");
  const [zelleEmail, setZelleEmail] = useState(teacherProfile.zelleEmail || "");

  // Load current profile data
  const loadProfileData = async () => {
    try {
      const response = await fetch('/api/settings/teacher', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setName(data.name || "");
        setEmail(data.email || "");
        setBio(data.bio || "");
        setTimezone(data.timezone || "America/New_York");
        setPhoneNumber(data.phoneNumber || "");
        setVenmoHandle(data.venmoHandle || "");
        setPaypalEmail(data.paypalEmail || "");
        setZelleEmail(data.zelleEmail || "");
      }
    } catch (error) {
      log.error('Error loading profile data:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Email preferences handler
  const handleEmailPreferencesUpdate = async (preferences: EmailPreference[]): Promise<boolean> => {
    try {
      const response = await fetch('/api/settings/email-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update email preferences');
      }

      setSuccess("Email preferences updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update email preferences");
      setTimeout(() => setError(""), 5000);
      return false;
    }
  };

  // Scheduling data state
  const [availability, setAvailability] = useState<any[]>([]);
  const [lessonSettings, setLessonSettings] = useState({
    allows30Min: true,
    allows60Min: true,
    price30Min: 3000,
    price60Min: 6000,
    advanceBookingDays: 21,
  });
  const [blockedTimes, setBlockedTimes] = useState<any[]>([]);
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  // Load profile data when component mounts
  useEffect(() => {
    loadProfileData();
  }, []);

  // Load scheduling data when availability-related tabs are selected
  useEffect(() => {
    if (activeTab === 'availability' || activeTab === 'lesson-settings' || activeTab === 'blocked-time') {
      loadSchedulingData();
    }
  }, [activeTab]);

  const loadSchedulingData = async () => {
    setSchedulingLoading(true);
    try {
      // Load availability
      const availabilityResponse = await fetch('/api/teacher/availability');
      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json();
        setAvailability(availabilityData.data?.availability || []);
      } else {
        const errorText = await availabilityResponse.text();
        log.error('Failed to load availability:', {
          status: availabilityResponse.status,
          error: errorText,
          statusText: availabilityResponse.statusText
        });
        setError('Failed to load availability data');
      }

      // Load lesson settings
      const settingsResponse = await fetch('/api/teacher/lesson-settings');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setLessonSettings(settingsData.settings);
      }

      // Load blocked times
      const blockedResponse = await fetch('/api/teacher/blocked-time');
      if (blockedResponse.ok) {
        const blockedData = await blockedResponse.json();
        setBlockedTimes(blockedData.blockedTimes || []);
      }
    } catch (error) {
      log.error('Error loading scheduling data:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleSaveAvailability = async (newAvailability: any[]) => {
    try {
      setSchedulingLoading(true);
      const response = await fetch('/api/teacher/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: newAvailability }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save availability');
      }

      const data = await response.json();
      setAvailability(data.data?.availability || []);
      setSuccess('Availability saved successfully!');
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to save availability');
      setSuccess('');
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleSaveLessonSettings = async (newSettings: any) => {
    try {
      setSchedulingLoading(true);
      const response = await fetch('/api/teacher/lesson-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lesson settings');
      }

      const data = await response.json();
      setLessonSettings(data.settings);
      setSuccess('Lesson settings saved successfully!');
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to save lesson settings');
      setSuccess('');
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleAddBlockedTime = async (blockedTime: any) => {
    try {
      setSchedulingLoading(true);
      const response = await fetch('/api/teacher/blocked-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockedTime),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add blocked time');
      }

      // Reload blocked times
      await loadSchedulingData();
      setSuccess('Blocked time added successfully!');
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to add blocked time');
      setSuccess('');
      throw error; // Re-throw so the component can handle it
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleRemoveBlockedTime = async (id: string) => {
    try {
      setSchedulingLoading(true);
      const response = await fetch(`/api/teacher/blocked-time/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove blocked time');
      }

      // Reload blocked times
      await loadSchedulingData();
      setSuccess('Blocked time removed successfully!');
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to remove blocked time');
      setSuccess('');
      throw error; // Re-throw so the component can handle it
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate form data - send empty strings as-is, let the schema transform them
      const formData = {
        name,
        email,
        bio: bio.trim() === "" ? null : bio,
        timezone,
        phoneNumber: phoneNumber.trim() === "" ? null : phoneNumber,
        venmoHandle: venmoHandle.trim() === "" ? null : venmoHandle,
        paypalEmail: paypalEmail.trim() === "" ? null : paypalEmail,
        zelleEmail: zelleEmail.trim() === "" ? null : zelleEmail,
      };

      const validatedData = teacherProfileSchema.parse(formData);

      const response = await fetch('/api/settings/teacher', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      setSuccess("Profile updated successfully!");
      // Reload the profile data to show updated values
      await loadProfileData();
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate form data
      const formData = {
        currentPassword,
        newPassword,
        confirmPassword,
      };

      const validatedData = passwordChangeSchema.parse(formData);

      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: validatedData.currentPassword,
          newPassword: validatedData.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update password');
      }

      setSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'profile'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('availability')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'availability'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">Availability</span>
        </button>
        <button
          onClick={() => setActiveTab('lesson-settings')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'lesson-settings'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Lessons</span>
        </button>
        <button
          onClick={() => setActiveTab('blocked-time')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'blocked-time'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Blocked Time</span>
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'password'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key className="h-4 w-4" />
          <span className="hidden sm:inline">Password</span>
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'email'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Email</span>
        </button>
      </div>

      {/* Messages */}
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

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <User className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Profile Information</h3>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(555) 123-4567"
                className="mt-2"
              />
            </div>

            <Separator />

            {/* Professional Information */}
            <div>
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your musical background and teaching experience"
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be displayed on your profile to potential students
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timezone">Timezone *</Label>
                <div className="mt-2">
                  <Select value={timezone} onValueChange={setTimezone} required>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select your timezone" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your timezone is important for accurate lesson scheduling
                </p>
              </div>
            </div>

            <Separator />

            {/* Payment Methods */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <DollarSign className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Payment Methods
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Add your payment info to include on invoices
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="venmoHandle">Venmo Username</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      id="venmoHandle"
                      value={venmoHandle}
                      onChange={(e) => setVenmoHandle(e.target.value)}
                      placeholder="yourname"
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your Venmo @username
                  </p>
                </div>

                <div>
                  <Label htmlFor="paypalEmail">PayPal Email</Label>
                  <Input
                    id="paypalEmail"
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email linked to PayPal account
                  </p>
                </div>

                <div>
                  <Label htmlFor="zelleEmail">Zelle Email/Phone</Label>
                  <Input
                    id="zelleEmail"
                    value={zelleEmail}
                    onChange={(e) => setZelleEmail(e.target.value)}
                    placeholder="email@example.com or phone"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email or phone number for Zelle
                  </p>
                </div>
              </div>

              {(!venmoHandle && !paypalEmail && !zelleEmail) && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-900 mb-2">
                    Add Payment Methods
                  </h4>
                  <p className="text-sm text-orange-800">
                    Add at least one payment method so students know how to pay you. 
                    These will be automatically included on your invoices.
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <Button type="submit" disabled={isLoading} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save Profile Changes"}
            </Button>
          </form>
        </Card>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <Label htmlFor="currentPassword">Current Password *</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="newPassword">New Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-2"
                required
              />
              <PasswordStrengthMeter password={newPassword} className="mt-2" />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2"
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              <Key className="h-4 w-4 mr-2" />
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Card>
      )}

      {/* Availability Tab */}
      {activeTab === 'availability' && (
        <Card className="p-6">
          <WeeklyScheduleGrid
            key={`availability-${availability?.length || 0}`}
            availability={availability || []}
            onSave={handleSaveAvailability}
            loading={schedulingLoading}
          />
        </Card>
      )}

      {/* Lesson Settings Tab */}
      {activeTab === 'lesson-settings' && (
        <Card className="p-6">
          <LessonSettingsForm
            settings={lessonSettings}
            onSave={handleSaveLessonSettings}
            loading={schedulingLoading}
          />
        </Card>
      )}

      {/* Blocked Time Tab */}
      {activeTab === 'blocked-time' && (
        <Card className="p-6">
          <BlockedTimeManager
            blockedTimes={blockedTimes}
            onAdd={handleAddBlockedTime}
            onRemove={handleRemoveBlockedTime}
            timezone={timezone}
            loading={schedulingLoading}
          />
        </Card>
      )}

      {/* Email Preferences Tab */}
      {activeTab === 'email' && (
        <EmailPreferences
          preferences={emailPreferences}
          onUpdate={handleEmailPreferencesUpdate}
        />
      )}
    </div>
  );
}