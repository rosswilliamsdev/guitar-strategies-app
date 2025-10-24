"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { log } from "@/lib/logger";

interface InviteStudentFormProps {
  teacherId: string;
  teacherName: string;
}

export function InviteStudentForm({ teacherId, teacherName }: InviteStudentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [instrument, setInstrument] = useState("guitar");
  const [skillLevel, setSkillLevel] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "PROFESSIONAL">("BEGINNER");
  const [goals, setGoals] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      log.info('Inviting student...', {
        name,
        email,
        teacherId,
        instrument,
        skillLevel
      });

      const response = await fetch('/api/students/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          teacherId,
          instrument,
          skillLevel,
          goals: goals.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          parentEmail: parentEmail.trim() || undefined,
        }),
      });

      const data = await response.json();

      log.info('Student invite response', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create student account');
      }

      setSuccess(`Student account created successfully! ${data.student.name} can now log in with the provided credentials.`);

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setInstrument("guitar");
      setSkillLevel("BEGINNER");
      setGoals("");
      setPhoneNumber("");
      setParentEmail("");

      // Redirect to students list after 2 seconds
      setTimeout(() => {
        router.push('/students');
        router.refresh();
      }, 2000);
    } catch (error: any) {
      log.error('Error inviting student', {
        error: error.message,
        stack: error.stack
      });
      setError(error.message || "Failed to create student account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 mb-6 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-700">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Student Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
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
                  placeholder="student@example.com"
                  className="mt-2"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be used for login
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="password">Temporary Password *</Label>
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a temporary password"
                className="mt-2"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 8 characters. Share this password securely with the student.
              </p>
            </div>
          </div>

          {/* Learning Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Learning Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instrument">Instrument</Label>
                <Input
                  id="instrument"
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  placeholder="Guitar"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select value={skillLevel} onValueChange={(value: any) => setSkillLevel(value)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="goals">Learning Goals (Optional)</Label>
              <Textarea
                id="goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="What does the student want to achieve?"
                rows={3}
                className="mt-2"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="parentEmail">Parent/Guardian Email (Optional)</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For students under 18
                </p>
              </div>
            </div>
          </div>

          {/* Teacher Assignment Info */}
          <div className="bg-turquoise-50 border border-turquoise-200 rounded-lg p-4">
            <p className="text-sm text-turquoise-900">
              <strong>Assigned Teacher:</strong> {teacherName}
            </p>
            <p className="text-xs text-turquoise-700 mt-1">
              This student will be automatically assigned to you
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Link href="/students">
              <Button type="button" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>

            <Button type="submit" disabled={isLoading}>
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? "Creating Account..." : "Create Student Account"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
