import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { Toaster } from '@/components/ui/toaster';

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
    <div className="min-h-screen bg-muted/20 relative">
      {/* Gradient border across the top of viewport */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-turquoise-300 via-turquoise-500 to-turquoise-600 z-50" />
      
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
  );
}