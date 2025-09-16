import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { Toaster } from '@/components/ui/toaster';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { DashboardLayoutProvider } from './dashboard-layout-provider';
import { MobileNavProvider } from './mobile-nav-provider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect unauthenticated users to login
  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardLayoutProvider user={session.user}>
      {/* Loading indicator with shimmer animation - outside all containers for full width */}
      <LoadingIndicator />

      <div className="min-h-screen bg-muted/20 relative">
        <div className="print:hidden">
          <MobileNavProvider user={session.user}>
            {children}
          </MobileNavProvider>
        </div>

        <Toaster />
      </div>
    </DashboardLayoutProvider>
  );
}