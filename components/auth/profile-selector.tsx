"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { StudentProfile } from "@prisma/client";
import { User } from "lucide-react";

interface ProfileSelectorProps {
  profiles: StudentProfile[];
}

export default function ProfileSelector({
  profiles,
}: ProfileSelectorProps) {
  const router = useRouter();
  const { update } = useSession();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSelectProfile = async (profileId: string) => {
    setIsLoading(profileId);

    try {
      // Verify the profile belongs to this user via API
      const response = await fetch("/api/auth/select-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to select profile");
      }

      // Update the session with the new activeStudentProfileId
      await update({ activeStudentProfileId: profileId });

      // Force a hard refresh to load the updated session
      window.location.href = "/dashboard";
      router.push('/dashboard')

    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to select profile. Please try again."
      );
      setIsLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {profiles.map((profile) => (
        <button
          key={profile.id}
          onClick={() => handleSelectProfile(profile.id)}
          disabled={isLoading !== null}
          className="group relative bg-white border-2 border-neutral-200 rounded-lg p-8 text-left hover:border-primary hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          {/* Icon */}
          <div className="mb-4">
            <div className="w-16 h-16 rounded-full bg-neutral-100 group-hover:bg-turquoise-50 flex items-center justify-center transition-colors">
              <User className="w-8 h-8 text-neutral-600 group-hover:text-primary transition-colors" />
            </div>
          </div>

          {/* Student Info */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2 group-hover:text-primary transition-colors">
              Student Profile
            </h3>

            {profile.goals && (
              <p className="text-sm text-neutral-600 line-clamp-3 mb-3">
                {profile.goals}
              </p>
            )}

            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-700">Instrument:</span>
                <span className="text-neutral-600 capitalize">{profile.instrument}</span>
              </div>
              {profile.phoneNumber && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-700">Phone:</span>
                  <span className="text-neutral-600">{profile.phoneNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <div className={`
              inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm
              ${isLoading === profile.id
                ? 'bg-neutral-200 text-neutral-600'
                : 'bg-primary text-white group-hover:bg-turquoise-600'
              }
              transition-colors
            `}>
              {isLoading === profile.id ? "Selecting..." : "Select Profile"}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
