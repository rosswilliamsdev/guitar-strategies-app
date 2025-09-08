"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Trophy, X } from "lucide-react";
import { fireAchievementConfetti } from "@/lib/confetti";

interface ConfettiModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklistTitle: string;
  completedItems: number;
  totalItems: number;
}

export function ConfettiModal({ 
  isOpen, 
  onClose, 
  checklistTitle, 
  completedItems, 
  totalItems 
}: ConfettiModalProps) {
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay badge animation slightly for dramatic effect
      const timer = setTimeout(() => {
        setShowBadge(true);
        fireAchievementConfetti();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowBadge(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const encouragingMessages = [
    "Outstanding work! Your dedication is paying off! 🎸",
    "Amazing! You've mastered another milestone! 🌟", 
    "Incredible progress! Keep up the fantastic work! 🎵",
    "Fantastic! You're becoming a better musician every day! 🎶",
    "Brilliant! Your practice routine is really showing results! ✨",
    "Excellent! You've conquered another challenge! 🏆",
    "Superb! Your musical journey continues to impress! 🎼"
  ];

  const randomMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full p-6 text-center relative animate-in fade-in-0 zoom-in-95 duration-300">
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-4 right-4 h-8 w-8 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Achievement Badge */}
        <div className="mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white transform transition-all duration-500 ${
            showBadge ? 'scale-100 rotate-0' : 'scale-0 rotate-45'
          }`}>
            <Trophy className="h-10 w-10" />
          </div>
          {showBadge && (
            <div className="mt-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 delay-300">
              <span className="inline-block bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent text-sm font-semibold">
                CHECKLIST MASTER
              </span>
            </div>
          )}
        </div>

        {/* Success Content */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Checklist Complete!</h2>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-foreground">
              &ldquo;{checklistTitle}&rdquo;
            </h3>
            <p className="text-sm text-muted-foreground">
              {completedItems} of {totalItems} items completed
            </p>
          </div>

          <div className="p-4 bg-turquoise-50 rounded-lg border border-turquoise-200">
            <p className="text-sm text-turquoise-800 font-medium">
              {randomMessage}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6">
          <Button variant="primary" onClick={onClose} className="w-full">
            Continue Learning!
          </Button>
        </div>
      </Card>
    </div>
  );
}