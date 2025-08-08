'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User } from 'next-auth';

interface DashboardSidebarProps {
  user: User;
}

interface NavItem {
  label: string;
  href: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Lessons', href: '/lessons' },
  { label: 'Students', href: '/students', roles: ['TEACHER'] },
  { label: 'Library', href: '/library' },
  { label: 'Recommendations', href: '/recommendations' },
  { label: 'Schedule', href: '/schedule', roles: ['TEACHER'] },
  { label: 'Payments', href: '/payments', roles: ['TEACHER'] },
  { label: 'Settings', href: '/settings' },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(user.role)
  );

  return (
    <aside className="w-64 bg-white border-r min-h-screen">
      <div className="p-6">
        <Link href="/dashboard" className="text-display-sm font-display text-brand-black">
          Guitar Strategies
        </Link>
      </div>

      <nav className="px-4 space-y-2">
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-ui rounded-button transition-colors',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-brand-turquoise/10 text-brand-black font-medium'
                : 'text-brand-gray hover:bg-gray-100 hover:text-brand-black'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t">
        <div className="text-ui-caption text-brand-gray">
          Signed in as {user.name}
        </div>
        <div className="text-ui-caption text-brand-gray/60">
          {user.role.toLowerCase()}
        </div>
      </div>
    </aside>
  );
}