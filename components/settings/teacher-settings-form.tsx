"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Save, Key, User, DollarSign, Calendar, Clock, ExternalLink, CheckCircle } from "lucide-react";
import { teacherProfileSchema, passwordChangeSchema } from "@/lib/validations";
import { validateCalendlyUrl, getCalendlyExamples } from "@/lib/calendly";
import { getTimezoneGroups, getCurrentTimezone, getTimezoneDisplayName } from "@/lib/timezones";

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
    calendlyUrl?: string;
    timezone?: string;
    phoneNumber?: string;
    venmoHandle?: string;
    paypalEmail?: string;
    zelleEmail?: string;
  };
}

export function TeacherSettingsForm({ user, teacherProfile }: TeacherSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile form state
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(teacherProfile.bio || "");
  const [hourlyRate, setHourlyRate] = useState(teacherProfile.hourlyRate ? (teacherProfile.hourlyRate / 100).toString() : "");
  const [calendlyUrl, setCalendlyUrl] = useState(teacherProfile.calendlyUrl || "");
  const [timezone, setTimezone] = useState(teacherProfile.timezone || getCurrentTimezone());
  const [phoneNumber, setPhoneNumber] = useState(teacherProfile.phoneNumber || "");
  
  // Payment method fields
  const [venmoHandle, setVenmoHandle] = useState(teacherProfile.venmoHandle || "");
  const [paypalEmail, setPaypalEmail] = useState(teacherProfile.paypalEmail || "");
  const [zelleEmail, setZelleEmail] = useState(teacherProfile.zelleEmail || "");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Calendly validation state
  const [calendlyValidation, setCalendlyValidation] = useState<{
    isValid: boolean;
    error?: string;
    cleanUrl?: string;
  }>({ isValid: true });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate form data
      const formData = {
        name,
        email,
        bio: bio || undefined,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        calendlyUrl: calendlyUrl || undefined,
        timezone: timezone || undefined,
        phoneNumber: phoneNumber || undefined,
        venmoHandle: venmoHandle || undefined,
        paypalEmail: paypalEmail || undefined,
        zelleEmail: zelleEmail || undefined,
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
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'profile'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile Information</span>
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'password'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Change Password</span>
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
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <div className="relative mt-2">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="10"
                    max="500"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="60.00"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your teaching rate per hour
                </p>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <div className="mt-2">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select timezone">
                          {getTimezoneDisplayName(timezone)}
                        </SelectValue>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(getTimezoneGroups()).map(([group, timezones]) => (
                        <div key={group}>
                          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                            {group}
                          </div>
                          {timezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value} className="pl-6">
                              {tz.label}
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your timezone affects lesson scheduling and calendar display
                </p>
              </div>
            </div>

            <Separator />

            {/* Calendly Integration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="calendlyUrl">Calendly URL</Label>
                {calendlyUrl && calendlyValidation.isValid && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">Valid</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="calendlyUrl"
                    type="url"
                    value={calendlyUrl}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCalendlyUrl(value);
                      
                      // Validate on change
                      const validation = validateCalendlyUrl(value);
                      setCalendlyValidation(validation);
                      
                      // If valid and has a clean URL, update to clean version
                      if (validation.isValid && validation.cleanUrl && validation.cleanUrl !== value) {
                        setTimeout(() => setCalendlyUrl(validation.cleanUrl!), 500);
                      }
                    }}
                    placeholder="https://calendly.com/yourname"
                    className={`pl-10 pr-12 ${
                      calendlyValidation.error 
                        ? 'border-red-300 focus:border-red-300 focus:ring-red-200' 
                        : calendlyUrl && calendlyValidation.isValid
                        ? 'border-green-300 focus:border-green-300 focus:ring-green-200'
                        : ''
                    }`}
                  />
                  {calendlyUrl && calendlyValidation.isValid && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(calendlyUrl, '_blank')}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {calendlyValidation.error && (
                  <div className="flex items-start space-x-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <span>{calendlyValidation.error}</span>
                  </div>
                )}

                {!calendlyUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Calendly Integration</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      Connect your Calendly account to let students book lessons directly.
                    </p>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Example formats:</p>
                      <ul className="space-y-1 ml-4">
                        {getCalendlyExamples().map((example, i) => (
                          <li key={i} className="font-mono text-xs">• {example}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Students will use this link to book lessons with you directly through Calendly
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
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
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
    </div>
  );
}