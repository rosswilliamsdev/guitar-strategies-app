#!/usr/bin/env tsx

import { prisma } from '../lib/db';
import { log } from '../lib/logger';

async function generateRecentActivity() {
  try {
    log.info('Generating recent activity for admin dashboard...');

    // Get the test teacher and student
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@guitarstrategies.com' },
      include: { teacherProfile: true }
    });

    const student = await prisma.user.findUnique({
      where: { email: 'student@guitarstrategies.com' },
      include: { studentProfile: true }
    });

    if (!teacher || !student || !teacher.teacherProfile || !student.studentProfile) {
      log.error('Test users not found. Please run npm run seed first.');
      return;
    }

    const now = new Date();
    const activities = [];

    // Create some recent completed lessons
    for (let i = 0; i < 5; i++) {
      const lessonDate = new Date(now);
      lessonDate.setHours(lessonDate.getHours() - (i * 12)); // Space them out over the last 2.5 days

      const lesson = await prisma.lesson.create({
        data: {
          teacherId: teacher.teacherProfile.id,
          studentId: student.studentProfile.id,
          date: lessonDate,
          duration: 30,
          status: 'COMPLETED',
          notes: `<p>Great progress in lesson ${i + 1}! Worked on scales and chord progressions.</p>`,
          homework: `Practice the G major scale for 15 minutes daily.`,
          progress: `Student is improving steadily with chord transitions.`
        }
      });
      activities.push(`Created lesson: ${lesson.id} at ${lessonDate.toISOString()}`);
    }

    // Create a recent invoice
    const invoice = await prisma.invoice.create({
      data: {
        teacherId: teacher.teacherProfile.id,
        studentId: student.studentProfile.id,
        invoiceNumber: `INV-2025-TEST-${Date.now()}`,
        month: '2025-09',
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        status: 'PENDING',
        subtotal: 24000, // $240
        total: 24000,
        items: {
          create: [
            {
              description: 'Guitar Lesson - Sep 10, 2025',
              quantity: 1,
              rate: 6000,
              amount: 6000,
              lessonDate: new Date()
            },
            {
              description: 'Guitar Lesson - Sep 12, 2025',
              quantity: 1,
              rate: 6000,
              amount: 6000,
              lessonDate: new Date()
            },
            {
              description: 'Guitar Lesson - Sep 14, 2025',
              quantity: 1,
              rate: 6000,
              amount: 6000,
              lessonDate: new Date()
            },
            {
              description: 'Guitar Lesson - Sep 16, 2025',
              quantity: 1,
              rate: 6000,
              amount: 6000,
              lessonDate: new Date()
            }
          ]
        }
      }
    });
    activities.push(`Created invoice: ${invoice.invoiceNumber}`);

    // Create a new test student user
    const newStudent = await prisma.user.create({
      data: {
        email: `teststudent${Date.now()}@example.com`,
        password: '$2b$10$K7L1OJ0TfcBAf2ij3k0Nt.qKyOI6KqDZeHPSSjnLJ6LOajWEP/Gly', // "student123"
        name: 'New Test Student',
        role: 'STUDENT',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    });
    activities.push(`Created new student user: ${newStudent.email}`);

    // Create student profile for the new student
    await prisma.studentProfile.create({
      data: {
        userId: newStudent.id,
        teacherId: teacher.teacherProfile.id,
        goals: 'Learn to play guitar',
        instrument: 'guitar',
        isActive: true,
        joinedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    });

    log.info('Successfully generated recent activity:', activities);
    log.info('\nRefresh your admin dashboard to see the new activity!');

  } catch (error) {
    log.error('Error generating activity', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}

generateRecentActivity();