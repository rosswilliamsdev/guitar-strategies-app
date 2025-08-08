import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

export async function DashboardHeader() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-sm text-gray-600 capitalize">
            {session.user.role.toLowerCase()} Dashboard
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