"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, UserPlus } from "lucide-react";
import Link from "next/link";

export function CreateTeacherForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    bio: "",
    hourlyRate: "",
    venmoHandle: "",
    paypalEmail: "",
    zelleEmail: "",
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
      const response = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          bio: formData.bio.trim() || undefined,
          hourlyRate: formData.hourlyRate ? parseInt(formData.hourlyRate) * 100 : undefined, // Convert to cents
          venmoHandle: formData.venmoHandle.trim() || undefined,
          paypalEmail: formData.paypalEmail.trim() || undefined,
          zelleEmail: formData.zelleEmail.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create teacher");
      }

      router.push("/admin/teachers");
    } catch (error) {
      console.error("Error creating teacher:", error);
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to create teacher",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/teachers">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <UserPlus className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Create New Teacher Account</h2>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {errors.submit}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground border-b pb-2">Basic Information</h3>
          
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sarah Johnson"
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
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g., sarah@example.com"
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
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="At least 6 characters"
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground border-b pb-2">Profile Information</h3>
          
          <div>
            <Label htmlFor="bio">Bio (Optional)</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Brief description of teaching experience and style"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate (Optional)</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                placeholder="60"
                min="1"
                max="500"
              />
              <p className="text-xs text-muted-foreground mt-1">Amount in dollars per hour</p>
            </div>

          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground border-b pb-2">Payment Methods (Optional)</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="venmoHandle">Venmo Handle</Label>
              <Input
                id="venmoHandle"
                value={formData.venmoHandle}
                onChange={(e) => setFormData({ ...formData, venmoHandle: e.target.value })}
                placeholder="@username"
              />
            </div>

            <div>
              <Label htmlFor="paypalEmail">PayPal Email</Label>
              <Input
                id="paypalEmail"
                type="email"
                value={formData.paypalEmail}
                onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
                placeholder="paypal@example.com"
              />
            </div>

            <div>
              <Label htmlFor="zelleEmail">Zelle Email or Phone</Label>
              <Input
                id="zelleEmail"
                value={formData.zelleEmail}
                onChange={(e) => setFormData({ ...formData, zelleEmail: e.target.value })}
                placeholder="zelle@example.com or (555) 123-4567"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href="/admin/teachers">
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="primary" type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Creating..." : "Create Teacher"}
          </Button>
        </div>
      </form>
    </Card>
  );
}