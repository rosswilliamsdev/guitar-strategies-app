"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Save, Key, User, GraduationCap, Phone, Mail } from "lucide-react";
import { studentProfileSchema, passwordChangeSchema } from "@/lib/validations";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { EmailPreferences, type EmailPreference } from "@/components/settings/email-preferences";

interface StudentSettingsFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  studentProfile: {
    id: string;
    goals?: string;
    phoneNumber?: string;
    parentEmail?: string;
    teacher: {
      user: {
        name: string;
        email: string;
      };
    };
  };
  emailPreferences?: EmailPreference[];
}


export function StudentSettingsForm({ user, studentProfile, emailPreferences = [] }: StudentSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'email'>('profile');

  // Profile form state
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [goals, setGoals] = useState(studentProfile.goals || "");
  const [phoneNumber, setPhoneNumber] = useState(studentProfile.phoneNumber || "");
  const [parentEmail, setParentEmail] = useState(studentProfile.parentEmail || "");

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
        goals: goals || undefined,
        phoneNumber: phoneNumber || undefined,
        parentEmail: parentEmail || undefined,
      };

      const validatedData = studentProfileSchema.parse(formData);

      const response = await fetch('/api/settings/student', {
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
        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'email'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>Email Preferences</span>
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
        <div className="space-y-6">
          {/* Teacher Information */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Your Teacher</h3>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium text-foreground">{studentProfile.teacher.user.name}</p>
              <p className="text-sm text-muted-foreground">{studentProfile.teacher.user.email}</p>
              <Badge variant="secondary" className="mt-2">Current Teacher</Badge>
            </div>
          </Card>

          {/* Profile Form */}
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

              <Separator />

              {/* Student-Specific Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* Parent Email */}
              <div>
                <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For students under 18, provide a parent or guardian email for lesson updates
                </p>
              </div>

              {/* Goals */}
              <div>
                <Label htmlFor="goals">Learning Goals</Label>
                <Textarea
                  id="goals"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="What are your musical goals and aspirations?"
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Share your musical goals to help your teacher customize lessons
                </p>
              </div>

              {/* Submit */}
              <Button type="submit" disabled={isLoading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Profile Changes"}
              </Button>
            </form>
          </Card>
        </div>
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