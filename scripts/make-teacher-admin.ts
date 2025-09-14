#!/usr/bin/env tsx

import { prisma } from '../lib/db';
import { log } from '../lib/logger';

async function makeTeacherAdmin() {
  try {
    log.info('Making test teacher an admin...');

    // First find the teacher
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@guitarstrategies.com' },
      include: { teacherProfile: true }
    });

    if (!teacher || !teacher.teacherProfile) {
      log.error('Teacher not found');
      return;
    }

    // Update the teacher profile
    const updatedProfile = await prisma.teacherProfile.update({
      where: { id: teacher.teacherProfile.id },
      data: { isAdmin: true },
      include: { user: true }
    });

    log.info('✅ Teacher admin privileges granted:', {
      email: updatedProfile.user.email,
      isAdmin: updatedProfile.isAdmin
    });

  } catch (error) {
    log.error('Error making teacher admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeTeacherAdmin();