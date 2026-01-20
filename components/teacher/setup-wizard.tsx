"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  Circle,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  DollarSign,
  Calendar,
  Clock,
  CreditCard,
  User,
} from "lucide-react";
import { TeacherValidationResult, SetupStep } from "@/lib/teacher-validation";
import { WeeklyScheduleGrid } from "@/components/teacher/WeeklyScheduleGrid";
import { LessonSettingsForm } from "@/components/teacher/LessonSettingsForm";
import { log, emailLog, invoiceLog, schedulerLog } from "@/lib/logger";

interface TeacherSetupWizardProps {
  teacherId: string;
  initialValidation?: TeacherValidationResult;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export function TeacherSetupWizard({
  teacherId,
  initialValidation,
}: TeacherSetupWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [validation, setValidation] = useState<TeacherValidationResult | null>(
    initialValidation || null
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [profileData, setProfileData] = useState({
    bio: "",
    hourlyRate: "",
    phoneNumber: "",
    timezone: "America/Chicago",
  });

  const [paymentData, setPaymentData] = useState({
    venmoHandle: "",
    paypalEmail: "",
    zelleEmail: "",
  });

  useEffect(() => {
    if (!initialValidation) {
      fetchValidation();
    }
    fetchCurrentData();
  }, []);

  const fetchValidation = async () => {
    try {
      const response = await fetch(`/api/teacher/validate/${teacherId}`);
      if (response.ok) {
        const data = await response.json();
        setValidation(data);
      }
    } catch (error) {
      log.error("Failed to fetch validation:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  const fetchCurrentData = async () => {
    try {
      const response = await fetch("/api/settings/teacher");
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          bio: data.bio || "",
          hourlyRate: data.hourlyRate ? (data.hourlyRate / 100).toString() : "",
          phoneNumber: data.phoneNumber || "",
          timezone: data.timezone || "America/Chicago",
        });
        setPaymentData({
          venmoHandle: data.venmoHandle || "",
          paypalEmail: data.paypalEmail || "",
          zelleEmail: data.zelleEmail || "",
        });
      }
    } catch (error) {
      log.error("Failed to fetch current data:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/teacher", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileData,
          hourlyRate: parseFloat(profileData.hourlyRate) * 100, // Convert to cents
        }),
      });

      if (response.ok) {
        await fetchValidation();
        return true;
      }
      return false;
    } catch (error) {
      log.error("Failed to save profile:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const savePaymentMethods = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/teacher", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        await fetchValidation();
        return true;
      }
      return false;
    } catch (error) {
      log.error("Failed to save payment methods:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    // Save current step data
    let success = true;
    if (currentStep === 0) {
      success = await saveProfile();
    } else if (currentStep === 1) {
      success = await savePaymentMethods();
    }

    if (success && currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    // Final validation check
    await fetchValidation();
    router.push("/dashboard");
  };

  const wizardSteps: WizardStep[] = [
    {
      id: "profile",
      title: "Basic Profile",
      description: "Tell students about yourself",
      icon: <User className="h-5 w-5" />,
      component: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={profileData.bio}
              onChange={(e) =>
                setProfileData({ ...profileData, bio: e.target.value })
              }
              placeholder="Tell students about your teaching experience, style, and what they can expect from lessons with you..."
              className="mt-1 min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              A detailed bio helps students choose you as their teacher
            </p>
          </div>

          <div>
            <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="hourlyRate"
                type="number"
                value={profileData.hourlyRate}
                onChange={(e) =>
                  setProfileData({ ...profileData, hourlyRate: e.target.value })
                }
                placeholder="60"
                className="pl-9"
                min="10"
                step="5"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Your standard hourly rate for lessons
            </p>
          </div>

          <div>
            <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={profileData.phoneNumber}
              onChange={(e) =>
                setProfileData({ ...profileData, phoneNumber: e.target.value })
              }
              placeholder="(555) 123-4567"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              For emergency contact only
            </p>
          </div>

          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <select
              id="timezone"
              value={profileData.timezone}
              onChange={(e) =>
                setProfileData({ ...profileData, timezone: e.target.value })
              }
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Phoenix">Arizona Time</option>
              <option value="Pacific/Honolulu">Hawaii Time</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: "payment",
      title: "Payment Methods",
      description: "How students will pay you",
      icon: <CreditCard className="h-5 w-5" />,
      component: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Add at least one payment method so it can be included on invoices.
              Students will pay you directly through these platforms.
            </p>
          </div>

          <div>
            <Label htmlFor="venmoHandle">Venmo Username</Label>
            <Input
              id="venmoHandle"
              value={paymentData.venmoHandle}
              onChange={(e) =>
                setPaymentData({ ...paymentData, venmoHandle: e.target.value })
              }
              placeholder="@your-venmo-username"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="paypalEmail">PayPal Email</Label>
            <Input
              id="paypalEmail"
              type="email"
              value={paymentData.paypalEmail}
              onChange={(e) =>
                setPaymentData({ ...paymentData, paypalEmail: e.target.value })
              }
              placeholder="your-email@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="zelleEmail">Zelle Email or Phone</Label>
            <Input
              id="zelleEmail"
              value={paymentData.zelleEmail}
              onChange={(e) =>
                setPaymentData({ ...paymentData, zelleEmail: e.target.value })
              }
              placeholder="email@example.com or (555) 123-4567"
              className="mt-1"
            />
          </div>

          {!paymentData.venmoHandle &&
            !paymentData.paypalEmail &&
            !paymentData.zelleEmail && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Please add at least one payment method to continue
                  </p>
                </div>
              </div>
            )}
        </div>
      ),
    },
    {
      id: "lessonSettings",
      title: "Lesson Settings",
      description: "Configure lesson durations and pricing",
      icon: <Clock className="h-5 w-5" />,
      component: (
        <div>
          <LessonSettingsForm />
        </div>
      ),
    },
    {
      id: "availability",
      title: "Weekly Availability",
      description: "Set your teaching schedule",
      icon: <Calendar className="h-5 w-5" />,
      component: (
        <div>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Click and drag on the calendar below to set your available
              teaching hours. Students will only be able to book lessons during
              these times.
            </p>
          </div>
          <WeeklyScheduleGrid />
        </div>
      ),
    },
  ];

  const currentWizardStep = wizardSteps[currentStep];
  const isLastStep = currentStep === wizardSteps.length - 1;

  // Check if current step is complete
  const isStepComplete = () => {
    if (!validation) return false;
    const step = validation.setupSteps.find(
      (s) => s.id === currentWizardStep.id
    );
    return step?.isComplete || false;
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {wizardSteps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => setCurrentStep(index)}
              disabled={saving}
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                index === currentStep
                  ? "border-primary bg-primary text-white"
                  : index < currentStep || isStepComplete()
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-gray-300 bg-white text-gray-400"
              }`}
            >
              {index < currentStep ||
              (index === currentStep && isStepComplete()) ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </button>
            {index < wizardSteps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-colors ${
                  index < currentStep ? "bg-green-600" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Current Step */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {currentWizardStep.icon}
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {currentWizardStep.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentWizardStep.description}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-[300px]">{currentWizardStep.component}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStep === 0 || saving}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleComplete}
              disabled={saving || !validation?.canAcceptBookings}
            >
              Complete Setup
              <CheckCircle className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={saving}>
              {saving ? "Saving..." : "Save & Continue"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </Card>

      {/* Validation Summary */}
      {validation && validation.errors.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900 mb-2">
                Please fix the following issues:
              </h3>
              <ul className="space-y-1">
                {validation.errors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
