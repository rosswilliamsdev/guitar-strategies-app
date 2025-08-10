'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { User } from 'next-auth';

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  if (!user) {
    return null;
  }

  return (
    <header className="border-b border-border bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Welcome back, {user.name}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {user.role.toLowerCase()} Dashboard
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/settings">
            <Button variant="secondary" size="sm">
              Settings
            </Button>
          </Link>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}