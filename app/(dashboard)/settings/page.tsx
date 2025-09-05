import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { StudentSettingsForm } from '@/components/settings/student-settings-form';
import { TeacherSettingsForm } from '@/components/settings/teacher-settings-form';
import { Card } from '@/components/ui/card';
import { log, dbLog } from '@/lib/logger';

export const metadata = {
  title: 'Settings - Guitar Strategies',
  description: 'Manage your account settings and profile information',
};

async function getUserData(userId: string, role: string) {
  try {
    if (role === 'STUDENT') {
      const studentData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          studentProfile: {
            include: {
              teacher: {
                include: { user: true }
              }
            }
          }
        }
      });
      return studentData;
    } else if (role === 'TEACHER') {
      const teacherData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          teacherProfile: true
        }
      });
      return teacherData;
    }
    return null;
  } catch (error) {
    log.error('Error fetching user data:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    return null;
  }
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const userData = await getUserData(session.user.id, session.user.role);

  if (!userData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground">
            Unable to load your profile information. Please contact support.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and profile information
        </p>
      </div>

      {/* Settings Form */}
      {session.user.role === 'STUDENT' && userData.studentProfile ? (
        <StudentSettingsForm 
          user={userData}
          studentProfile={userData.studentProfile}
        />
      ) : session.user.role === 'TEACHER' && userData.teacherProfile ? (
        <TeacherSettingsForm 
          user={userData}
          teacherProfile={userData.teacherProfile}
        />
      ) : (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Profile Setup Required</h2>
          <p className="text-muted-foreground">
            Your profile needs to be set up before you can access settings.
          </p>
        </Card>
      )}
    </div>
  );
}