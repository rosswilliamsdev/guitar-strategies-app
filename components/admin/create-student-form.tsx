"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import Link from "next/link";
import { log } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

interface CreateStudentFormProps {
  currentTeacherId: string;
}

export function CreateStudentForm({
  currentTeacherId,
}: CreateStudentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    teacherId: currentTeacherId,
    instrument: "guitar",
    goals: "",
    parentEmail: "",
    phoneNumber: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    if (!formData.name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }
    if (!formData.email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      setErrors({ password: "Password must be at least 6 characters" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          teacherId: formData.teacherId,
          instrument: formData.instrument.trim(),
          goals: formData.goals.trim() || undefined,
          parentEmail: formData.parentEmail.trim() || undefined,
          phoneNumber: formData.phoneNumber.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create student");
      }

      const result = await response.json();
      const createdStudentId = result.studentProfileId;

      // If checkbox was checked, send invitation email
      if (sendInvite && createdStudentId) {
        try {
          const inviteResponse = await fetch(
            `/api/students/${createdStudentId}/send-invite`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (inviteResponse.ok) {
            toast({
              title: "Success",
              description: `Student added. Invitation email sent to ${formData.email.trim()}`,
            });
          } else {
            // Student created but email failed
            toast({
              title: "Student Created",
              description:
                "Student account created successfully, but failed to send invitation email. You can resend it from the student details page.",
              variant: "destructive",
            });
          }
        } catch (emailError) {
          log.error("Error sending invitation email:", {
            error:
              emailError instanceof Error
                ? emailError.message
                : String(emailError),
            stack: emailError instanceof Error ? emailError.stack : undefined,
          });
          toast({
            title: "Student Created",
            description:
              "Student account created successfully, but failed to send invitation email. You can resend it from the student details page.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Student account created successfully",
        });
      }

      router.push("/admin/students");
    } catch (error) {
      log.error("Error creating student:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      setErrors({
        submit:
          error instanceof Error ? error.message : "Failed to create student",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/students">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <UserPlus className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Create New Student Account</h2>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {errors.submit}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground border-b pb-2">
            Basic Information
          </h3>

          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Alex Smith"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="e.g., alex@example.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="At least 6 characters"
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="sendInvite"
              checked={sendInvite}
              onCheckedChange={(checked) => setSendInvite(checked === true)}
              disabled={!formData.email.trim()}
            />
            <Label
              htmlFor="sendInvite"
              className={`cursor-pointer ${
                !formData.email.trim() ? "text-muted-foreground" : ""
              }`}
            >
              Send invitation email to student
            </Label>
          </div>
          {!formData.email.trim() && (
            <p className="text-xs text-muted-foreground">
              Enter an email address to enable invitation email
            </p>
          )}
        </div>

        {/* Student Details */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground border-b pb-2">
            Student Details
          </h3>

          <div>
            <Label htmlFor="instrument">Instrument</Label>
            <Input
              id="instrument"
              value={formData.instrument}
              onChange={(e) =>
                setFormData({ ...formData, instrument: e.target.value })
              }
              placeholder="Guitar"
            />
          </div>

          <div>
            <Label htmlFor="goals">Goals (Optional)</Label>
            <Textarea
              id="goals"
              value={formData.goals}
              onChange={(e) =>
                setFormData({ ...formData, goals: e.target.value })
              }
              placeholder="What would you like to learn or achieve?"
              rows={3}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground border-b pb-2">
            Contact Information (Optional)
          </h3>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="parentEmail">Parent/Guardian Email</Label>
              <Input
                id="parentEmail"
                type="email"
                value={formData.parentEmail}
                onChange={(e) =>
                  setFormData({ ...formData, parentEmail: e.target.value })
                }
                placeholder="parent@example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                For minor students
              </p>
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href="/admin/students">
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="primary" type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Creating..." : "Create Student"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
