import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { DashboardLayoutProvider } from './dashboard-layout-provider';

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
      <div className="min-h-screen bg-muted/20 relative">
        {/* Loading indicator with shimmer animation */}
        <LoadingIndicator />

        <div className="flex">
          <div data-sidebar className="print:hidden">
            <DashboardSidebar user={session.user} />
          </div>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
        <Toaster />
      </div>
    </DashboardLayoutProvider>
  );
}