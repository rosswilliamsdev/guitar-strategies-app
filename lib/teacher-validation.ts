/**
 * Teacher Profile Validation System
 * 
 * This module provides comprehensive validation for teacher profiles to ensure
 * they have all required settings configured before they can accept bookings.
 * Prevents issues like empty availability that would break the scheduling system.
 */

import { prisma } from "@/lib/db";
import { TeacherProfile, TeacherLessonSettings, TeacherAvailability } from "@prisma/client";
import { log, dbLog } from '@/lib/logger';

export interface TeacherValidationResult {
  isComplete: boolean;
  missingFields: string[];
  warnings: string[];
  errors: string[];
  profileCompleteness: number; // Percentage 0-100
  canAcceptBookings: boolean;
  setupSteps: SetupStep[];
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  required: boolean;
  href?: string; // Link to settings page
}

/**
 * Validates a teacher's profile and settings for completeness
 */
export async function validateTeacherProfile(teacherId: string): Promise<TeacherValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFields: string[] = [];
  const setupSteps: SetupStep[] = [];

  try {
    // Fetch teacher profile with all related settings
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: {
        lessonSettings: true,
        availability: true,
      },
    });

    if (!teacherProfile) {
      errors.push("Teacher profile not found");
      return {
        isComplete: false,
        missingFields: ["profile"],
        warnings,
        errors,
        profileCompleteness: 0,
        canAcceptBookings: false,
        setupSteps: [],
      };
    }

    // Step 1: Basic Profile Information
    const profileStep: SetupStep = {
      id: "profile",
      title: "Basic Profile",
      description: "Complete your basic profile information",
      isComplete: true,
      required: true,
      href: "/settings",
    };

    if (!teacherProfile.bio || teacherProfile.bio.trim().length < 10) {
      missingFields.push("bio");
      profileStep.isComplete = false;
      warnings.push("Your bio is too short. Students prefer teachers with detailed bios.");
    }

    if (!teacherProfile.timezone) {
      missingFields.push("timezone");
      profileStep.isComplete = false;
      errors.push("Timezone is required for scheduling");
    }

    setupSteps.push(profileStep);

    // Step 2: Contact Information
    const contactStep: SetupStep = {
      id: "contact",
      title: "Contact Information",
      description: "Add your contact details",
      isComplete: true,
      required: false,
      href: "/settings",
    };

    if (!teacherProfile.phoneNumber) {
      warnings.push("Phone number is recommended for emergency contact");
      contactStep.isComplete = false;
    }

    setupSteps.push(contactStep);

    // Step 3: Payment Methods
    const paymentStep: SetupStep = {
      id: "payment",
      title: "Payment Methods",
      description: "Set up at least one payment method for invoicing",
      isComplete: false,
      required: true,
      href: "/settings",
    };

    const hasPaymentMethod = 
      teacherProfile.venmoHandle || 
      teacherProfile.paypalEmail || 
      teacherProfile.zelleEmail;

    if (!hasPaymentMethod) {
      missingFields.push("paymentMethod");
      errors.push("At least one payment method (Venmo, PayPal, or Zelle) is required");
    } else {
      paymentStep.isComplete = true;
    }

    setupSteps.push(paymentStep);

    // Step 4: Lesson Settings
    const lessonSettingsStep: SetupStep = {
      id: "lessonSettings",
      title: "Lesson Settings",
      description: "Configure lesson durations and pricing",
      isComplete: false,
      required: true,
      href: "/settings?tab=scheduling",
    };

    if (!teacherProfile.lessonSettings) {
      missingFields.push("lessonSettings");
      errors.push("Lesson settings are required for student bookings");
    } else {
      const settings = teacherProfile.lessonSettings;
      lessonSettingsStep.isComplete = true;

      // Validate lesson settings
      if (!settings.allows30Min && !settings.allows60Min) {
        errors.push("At least one lesson duration must be enabled");
        lessonSettingsStep.isComplete = false;
      }

      if (settings.allows30Min && (!settings.price30Min || settings.price30Min < 1000)) {
        errors.push("30-minute lesson price must be at least $10");
        lessonSettingsStep.isComplete = false;
      }

      if (settings.allows60Min && (!settings.price60Min || settings.price60Min < 2000)) {
        errors.push("60-minute lesson price must be at least $20");
        lessonSettingsStep.isComplete = false;
      }

      if (settings.advanceBookingDays < 1 || settings.advanceBookingDays > 90) {
        warnings.push("Advance booking days should be between 1 and 90");
      }
    }

    setupSteps.push(lessonSettingsStep);

    // Step 5: Weekly Availability
    const availabilityStep: SetupStep = {
      id: "availability",
      title: "Weekly Availability",
      description: "Set your available teaching hours",
      isComplete: false,
      required: true,
      href: "/settings?tab=scheduling",
    };

    if (!teacherProfile.availability || teacherProfile.availability.length === 0) {
      missingFields.push("availability");
      errors.push("Weekly availability must be configured for students to book lessons");
    } else {
      // Check if at least one active availability slot exists
      const activeSlots = teacherProfile.availability.filter(slot => slot.isActive);
      if (activeSlots.length === 0) {
        errors.push("No active availability slots found. Please enable at least one time slot.");
      } else {
        availabilityStep.isComplete = true;

        // Validate availability slots
        for (const slot of activeSlots) {
          const startTime = timeToMinutes(slot.startTime);
          const endTime = timeToMinutes(slot.endTime);
          
          if (endTime <= startTime) {
            errors.push(`Invalid time slot on day ${getDayName(slot.dayOfWeek)}: end time must be after start time`);
            availabilityStep.isComplete = false;
          }

          if (endTime - startTime < 30) {
            errors.push(`Time slot on ${getDayName(slot.dayOfWeek)} is less than 30 minutes`);
            availabilityStep.isComplete = false;
          }
        }

        // Check for reasonable availability
        const totalMinutesPerWeek = activeSlots.reduce((total, slot) => {
          const minutes = timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime);
          return total + minutes;
        }, 0);

        if (totalMinutesPerWeek < 120) { // Less than 2 hours per week
          warnings.push("You have less than 2 hours of availability per week. Consider adding more time slots.");
        }
      }
    }

    setupSteps.push(availabilityStep);

    // Calculate profile completeness
    const totalSteps = setupSteps.filter(s => s.required).length;
    const completedSteps = setupSteps.filter(s => s.required && s.isComplete).length;
    const profileCompleteness = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // Determine if teacher can accept bookings
    const requiredStepsComplete = setupSteps.filter(s => s.required).every(s => s.isComplete);
    const canAcceptBookings = requiredStepsComplete && errors.length === 0;

    return {
      isComplete: missingFields.length === 0 && errors.length === 0,
      missingFields,
      warnings,
      errors,
      profileCompleteness,
      canAcceptBookings,
      setupSteps,
    };
  } catch (error) {
    log.error('Error validating teacher profile:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    errors.push("Failed to validate teacher profile");
    return {
      isComplete: false,
      missingFields,
      warnings,
      errors,
      profileCompleteness: 0,
      canAcceptBookings: false,
      setupSteps,
    };
  }
}

/**
 * Quick check to see if a teacher can accept bookings
 */
export async function canTeacherAcceptBookings(teacherId: string): Promise<boolean> {
  try {
    const result = await prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: {
        timezone: true,
        venmoHandle: true,
        paypalEmail: true,
        zelleEmail: true,
        lessonSettings: {
          select: {
            allows30Min: true,
            allows60Min: true,
            price30Min: true,
            price60Min: true,
          },
        },
        availability: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!result) return false;

    // Check basic requirements
    const hasTimezone = !!result.timezone;
    const hasPaymentMethod = !!(result.venmoHandle || result.paypalEmail || result.zelleEmail);
    const hasLessonSettings = !!result.lessonSettings;
    const hasValidLessonSettings = hasLessonSettings && result.lessonSettings &&
      (result.lessonSettings.allows30Min || result.lessonSettings.allows60Min);
    const hasAvailability = result.availability.length > 0;

    return !!(
      hasTimezone &&
      hasPaymentMethod &&
      hasValidLessonSettings &&
      hasAvailability
    );
  } catch (error) {
    log.error('Error checking teacher booking capability:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return false;
  }
}

/**
 * Get a summary of missing requirements for a teacher
 */
export async function getTeacherSetupSummary(teacherId: string): Promise<{
  isReady: boolean;
  completionPercentage: number;
  nextSteps: string[];
}> {
  const validation = await validateTeacherProfile(teacherId);
  
  const nextSteps = validation.setupSteps
    .filter(step => step.required && !step.isComplete)
    .map(step => step.title);

  return {
    isReady: validation.canAcceptBookings,
    completionPercentage: validation.profileCompleteness,
    nextSteps,
  };
}

// Helper functions
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || `Day ${dayOfWeek}`;
}

