import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { Toaster } from 'react-hot-toast';

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
    <div className="min-h-screen bg-muted/20">
      <div className="flex">
        <div data-sidebar className="print:hidden">
          <DashboardSidebar user={session.user} />
        </div>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#0a0a0a',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#14b8b3',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </div>
  );
}