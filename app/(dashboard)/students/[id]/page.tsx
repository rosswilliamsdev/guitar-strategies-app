import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { StudentProfile } from '@/components/students/student-profile';

interface StudentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: StudentPageProps) {
  const { id } = await params;
  // TODO: Fetch student details for metadata
  return {
    title: `Student Profile`,
    description: 'View student details and progress',
  };
}

export default async function StudentPage({ params }: StudentPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'TEACHER') {
    redirect('/login');
  }

  // TODO: Verify teacher has access to this student
  // const student = await getStudentById(id, session.user.id);
  // if (!student) {
  //   notFound();
  // }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display-xl font-display text-brand-black mb-2">
          Student Profile
        </h1>
        <p className="text-body text-brand-gray">
          View student progress, lessons, and contact information.
        </p>
      </div>

      <StudentProfile
        studentId={id}
        teacherId={session.user.id}
      />
    </div>
  );
}