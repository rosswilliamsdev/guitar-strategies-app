import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function verifyPassword() {
  const user = await prisma.user.findUnique({
    where: { email: 'rossw.dev@gmail.com' }
  });

  if (!user || !user.password) {
    console.log('User or password not found');
    return;
  }

  const isValid = await bcrypt.compare('student123', user.password);
  console.log('Password "student123" is valid:', isValid);

  await prisma.$disconnect();
}

verifyPassword();
