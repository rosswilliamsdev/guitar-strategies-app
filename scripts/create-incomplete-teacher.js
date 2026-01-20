const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function createIncompleteTeacher() {
  try {
    // Create a teacher with minimal profile (missing many required fields)
    const hashedPassword = await bcrypt.hash("test123", 10);

    const teacher = await prisma.user.create({
      data: {
        email: "incomplete.teacher@guitarstrategies.com",
        name: "Incomplete Teacher",
        password: hashedPassword,
        role: "TEACHER",
        teacherProfile: {
          create: {
            // Only basic fields, missing:
            // - bio (too short)
            // - hourlyRate (not set)
            // - payment methods (none)
            // - lesson settings (none)
            // - availability (none)
            bio: "Short",
            timezone: "America/Chicago",
            isActive: true,
          },
        },
      },
      include: {
        teacherProfile: true,
      },
    });

    console.log("✅ Created incomplete teacher profile:");
    console.log("Email: incomplete.teacher@guitarstrategies.com");
    console.log("Password: test123");
    console.log("Teacher ID:", teacher.teacherProfile.id);
    console.log("\nMissing:");
    console.log("- Proper bio (current is too short)");
    console.log("- Hourly rate");
    console.log("- Payment methods (Venmo/PayPal/Zelle)");
    console.log("- Lesson settings");
    console.log("- Weekly availability");
    console.log("\nLog in with this account to test the validation system!");
  } catch (error) {
    console.error("Error creating incomplete teacher:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createIncompleteTeacher();
