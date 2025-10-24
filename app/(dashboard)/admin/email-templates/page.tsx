import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { EmailTemplatesManager } from '@/components/admin/email-templates-manager';

export const metadata = {
  title: 'Email Templates',
  description: 'Manage system email templates',
};

export default async function EmailTemplatesPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Email Templates</h1>
        <p className="text-muted-foreground">
          Customize system email templates sent to students and teachers
        </p>
      </div>

      <EmailTemplatesManager />
    </div>
  );
}
