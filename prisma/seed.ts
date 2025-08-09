// ========================================
// FILE: prisma/seed.ts (Database Seed Script)
// ========================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Admin user configuration
  const adminEmail = 'admin@guitarstrategies.com';
  const adminPassword = 'admin123';
  const adminName = 'System Administrator';

  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', adminEmail);
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password: admin123');
      return;
    }

    // Hash the password (same salt rounds as auth.ts)
    console.log('🔐 Hashing admin password...');
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: 'ADMIN'
      }
    });

    console.log('🎉 Admin user created successfully!');
    console.log('📧 Email:', adminUser.email);
    console.log('🔑 Password: admin123');
    console.log('👑 Role:', adminUser.role);
    console.log('🆔 ID:', adminUser.id);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });