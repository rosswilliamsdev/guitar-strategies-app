"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronDown, User, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function ProfileSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Only show for FAMILY accounts
  if (!session?.user || session.user.accountType !== "FAMILY") {
    return null;
  }

  const { studentProfiles, activeStudentProfileId } = session.user;

  if (!studentProfiles || studentProfiles.length === 0) {
    return null;
  }

  const activeProfile = studentProfiles.find(
    (p) => p.id === activeStudentProfileId
  );

  const handleSwitchProfile = async (profileId: string) => {
    if (profileId === activeStudentProfileId || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      // Verify via API
      const response = await fetch("/api/auth/select-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileId }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch profile");
      }

      // Update session
      await update({ activeStudentProfileId: profileId });

      // Refresh page to update data
      router.refresh();
    } catch (error) {
      console.error("Error switching profile:", error);
      alert("Failed to switch profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 min-w-[140px]"
          disabled={isLoading}
        >
          <User className="h-4 w-4" />
          <span className="text-sm truncate max-w-[80px]">
            {activeProfile ? "Profile" : "Select Profile"}
          </span>
          <ChevronDown className="h-4 w-4 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {studentProfiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => handleSwitchProfile(profile.id)}
            disabled={isLoading}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium">Student Profile</span>
              {profile.goals && (
                <span className="text-xs text-muted-foreground truncate">
                  {profile.goals.substring(0, 30)}...
                </span>
              )}
            </div>
            {profile.id === activeStudentProfileId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
