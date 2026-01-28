'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileSwitcher } from '@/components/auth/profile-switcher';

interface MobileHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function MobileHeader({ isOpen, onToggle }: MobileHeaderProps) {
  return (
    <header className="lg:hidden sticky top-1 z-40 bg-background border-b border-border px-4 py-3 flex items-center justify-between gap-2">
      <Link
        href="/dashboard"
        className="text-lg font-semibold text-black"
      >
        Guitar Strategies
      </Link>

      <div className="flex items-center gap-2">
        <ProfileSwitcher />

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-2"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>
    </header>
  );
}