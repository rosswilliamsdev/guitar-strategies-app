"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { TeacherValidationResult, SetupStep } from "@/lib/teacher-validation";
import { log } from '@/lib/logger';

interface ProfileValidationAlertProps {
  teacherId: string;
}

export function ProfileValidationAlert({ teacherId }: ProfileValidationAlertProps) {
  const [validation, setValidation] = useState<TeacherValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchValidation();
  }, [teacherId]);

  const fetchValidation = async () => {
    try {
      const response = await fetch(`/api/teacher/validate/${teacherId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setValidation(data);
      } else {
        // Handle error response - create a default validation object
        log.error('Failed to fetch validation, status:', {
        error: response.status instanceof Error ? response.status.message : String(response.status),
        stack: response.status instanceof Error ? response.status.stack : undefined
      });
        setValidation({
          isComplete: false,
          missingFields: [],
          warnings: [],
          errors: ["Failed to validate teacher profile"],
          profileCompleteness: 0,
          canAcceptBookings: false,
          setupSteps: [],
        });
      }
    } catch (error) {
      log.error('Failed to fetch validation:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Set error state
      setValidation({
        isComplete: false,
        missingFields: [],
        warnings: [],
        errors: ["Failed to validate teacher profile"],
        profileCompleteness: 0,
        canAcceptBookings: false,
        setupSteps: [],
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !validation || dismissed) {
    return null;
  }

  // Don't show alert if profile is complete
  if (validation.isComplete && validation.canAcceptBookings) {
    return null;
  }

  const urgentSteps = validation.setupSteps.filter(s => s.required && !s.isComplete);
  const hasErrors = validation.errors.length > 0;

  return (
    <Card className={`p-4 mb-6 border-2 ${hasErrors ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {hasErrors ? (
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          ) : (
            <Info className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          )}
          
          <div className="flex-1">
            <h3 className={`font-semibold text-sm ${hasErrors ? 'text-red-900' : 'text-yellow-900'}`}>
              {hasErrors 
                ? "Action Required: Complete Your Profile to Accept Bookings" 
                : "Profile Setup Incomplete"}
            </h3>
            
            <p className={`text-sm mt-1 ${hasErrors ? 'text-red-700' : 'text-yellow-700'}`}>
              Your profile is {validation.profileCompleteness}% complete. 
              {!validation.canAcceptBookings && " Students cannot book lessons until you complete the required steps."}
            </p>

            {/* Progress Bar */}
            <div className="mt-3 mb-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    validation.profileCompleteness === 100 
                      ? 'bg-green-600' 
                      : validation.profileCompleteness >= 60 
                      ? 'bg-yellow-600' 
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${validation.profileCompleteness}%` }}
                />
              </div>
            </div>

            {/* Show errors if any */}
            {hasErrors && validation.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {validation.errors.slice(0, expanded ? undefined : 2).map((error, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="text-red-600 text-xs mt-0.5">•</span>
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                ))}
                {!expanded && validation.errors.length > 2 && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Show {validation.errors.length - 2} more issues...
                  </button>
                )}
              </div>
            )}

            {/* Setup Steps */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                Setup Checklist:
              </p>
              
              <div className="space-y-2">
                {validation.setupSteps
                  .filter(step => step.required)
                  .map((step) => (
                    <div key={step.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {step.isComplete ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-400" />
                        )}
                        <span className={`text-sm ${step.isComplete ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                          {step.title}
                        </span>
                      </div>
                      
                      {!step.isComplete && step.href && (
                        <Link href={step.href}>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                          >
                            Complete
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Warnings (optional items) */}
            {validation.warnings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-yellow-300">
                <p className="text-xs font-medium text-gray-600 mb-1">Recommendations:</p>
                {validation.warnings.slice(0, 2).map((warning, idx) => (
                  <div key={idx} className="text-xs text-gray-600">
                    • {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-4 flex items-center space-x-3">
              {urgentSteps.length > 0 && urgentSteps[0].href && (
                <Link href={urgentSteps[0].href}>
                  <Button 
                    size="sm" 
                    variant={hasErrors ? "primary" : "secondary"}
                    className="text-xs"
                  >
                    Complete Setup
                  </Button>
                </Link>
              )}
              
              <button
                onClick={() => setDismissed(true)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Dismiss for now
              </button>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

// Compact version for sidebar or header
export function ProfileValidationBadge({ teacherId }: ProfileValidationAlertProps) {
  const [validation, setValidation] = useState<TeacherValidationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchValidation();
  }, [teacherId]);

  const fetchValidation = async () => {
    try {
      const response = await fetch(`/api/teacher/validate/${teacherId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setValidation(data);
      }
    } catch (error) {
      log.error('Failed to fetch validation:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !validation) {
    return null;
  }

  if (validation.canAcceptBookings) {
    return (
      <div className="flex items-center space-x-1 text-xs text-green-600">
        <CheckCircle className="h-3 w-3" />
        <span>Profile Complete</span>
      </div>
    );
  }

  const urgentCount = validation.setupSteps.filter(s => s.required && !s.isComplete).length;

  return (
    <Link href="/settings" className="block">
      <div className="flex items-center space-x-1 text-xs text-yellow-600 hover:text-yellow-700">
        <AlertCircle className="h-3 w-3" />
        <span>{urgentCount} setup {urgentCount === 1 ? 'step' : 'steps'} remaining</span>
      </div>
    </Link>
  );
}