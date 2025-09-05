import { PrismaClient } from "@prisma/client";
import { log, dbLog } from '@/lib/logger';

const prisma = new PrismaClient();

async function main() {
  log.info('🎸 Creating sample lessons...');

  // Find teacher and student
  const teacher = await prisma.user.findFirst({
    where: { role: "TEACHER" },
    include: { teacherProfile: true },
  });

  const student = await prisma.user.findFirst({
    where: { role: "STUDENT" },
    include: { studentProfile: true },
  });

  if (!teacher?.teacherProfile || !student?.studentProfile) {
    console.error("❌ Teacher or student not found. Run npm run seed first.");
    return;
  }

  // Create sample lessons
  const lessons = [
    {
      teacherId: teacher.teacherProfile.id,
      studentId: student.studentProfile.id,
      date: new Date("2025-01-10T14:00:00"),
      duration: 30,
      status: "COMPLETED" as const,
      notes: "<p>Great progress on chord transitions today! We worked on smoothly moving between G, C, and D chords. The student is showing improvement in finger placement and timing.</p>",
      homework: "Practice the G-C-D progression for 10 minutes daily. Focus on clean chord changes without pausing.",
    },
    {
      teacherId: teacher.teacherProfile.id,
      studentId: student.studentProfile.id,
      date: new Date("2025-01-15T14:00:00"),
      duration: 30,
      status: "COMPLETED" as const,
      notes: "<p>Introduced the A minor chord and worked on the strumming pattern for 'Wonderwall'. Student picked up the new chord quickly.</p>",
      homework: "Practice the Am chord shape and the down-down-up-up-down-up strumming pattern.",
    },
    {
      teacherId: teacher.teacherProfile.id,
      studentId: student.studentProfile.id,
      date: new Date("2025-01-20T14:00:00"),
      duration: 45,
      status: "COMPLETED" as const,
      notes: "<p>Extended lesson today. We covered the intro to 'Stairway to Heaven' and worked on fingerpicking technique. Student is progressing well with individual note clarity.</p>",
      homework: "Practice the fingerpicking pattern slowly, focusing on accuracy over speed.",
    },
    {
      teacherId: teacher.teacherProfile.id,
      studentId: student.studentProfile.id,
      date: new Date("2025-01-22T14:00:00"),
      duration: 30,
      status: "CANCELLED" as const,
      notes: "<p>Student was sick.</p>",
    },
    {
      teacherId: teacher.teacherProfile.id,
      studentId: student.studentProfile.id,
      date: new Date("2025-01-25T14:00:00"),
      duration: 30,
      status: "COMPLETED" as const,
      notes: "<p>Reviewed previous material and started learning the F chord. This is challenging but the student is determined. We practiced the simplified version first.</p>",
      homework: "Practice transitioning from C to F (simplified version) slowly. Don't worry about speed yet.",
    },
    {
      teacherId: teacher.teacherProfile.id,
      studentId: student.studentProfile.id,
      date: new Date("2025-02-01T14:00:00"),
      duration: 30,
      status: "SCHEDULED" as const,
      notes: null,
      homework: null,
    },
  ];

  for (const lesson of lessons) {
    await prisma.lesson.create({
      data: lesson,
    });
  }

  log.info('✅ Created ${lessons.length} sample lessons');
}

main()
  .catch((e) => {
    log.error('❌ Error creating lessons:', {
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });