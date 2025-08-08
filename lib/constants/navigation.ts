export const NAVIGATION = {
  main: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Lessons', href: '/lessons' },
    { label: 'Students', href: '/students', roles: ['TEACHER'] },
    { label: 'Library', href: '/library' },
    { label: 'Recommendations', href: '/recommendations' },
    { label: 'Schedule', href: '/schedule', roles: ['TEACHER'] },
    { label: 'Payments', href: '/payments', roles: ['TEACHER'] },
    { label: 'Settings', href: '/settings' },
  ],
  auth: [
    { label: 'Sign In', href: '/login' },
    { label: 'Sign Up', href: '/register' },
  ],
  admin: [
    { label: 'Admin Dashboard', href: '/admin' },
    { label: 'User Management', href: '/admin/users' },
    { label: 'System Settings', href: '/admin/system' },
    { label: 'Analytics', href: '/admin/analytics' },
  ],
} as const;