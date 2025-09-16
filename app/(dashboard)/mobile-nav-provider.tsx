'use client';

import { User } from 'next-auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { useMobileNav } from '@/hooks/use-mobile-nav';

interface MobileNavProviderProps {
  user: User;
  children: React.ReactNode;
}

export function MobileNavProvider({ user, children }: MobileNavProviderProps) {
  const { isOpen, toggle, close } = useMobileNav();

  return (
    <>
      <MobileHeader isOpen={isOpen} onToggle={toggle} />

      <div className="flex">
        <DashboardSidebar
          user={user}
          isOpen={isOpen}
          onClose={close}
        />

        <main className={`flex-1 transition-all duration-300 ease-in-out lg:p-6 ${
          // On mobile, add padding when sidebar is closed
          isOpen ? 'p-4' : 'p-4 lg:p-6'
        }`}>
          {children}
        </main>
      </div>
    </>
  );
}