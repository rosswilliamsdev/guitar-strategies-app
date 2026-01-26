/**
 * Test script for family account authentication
 * Run with: npx tsx scripts/test-family-auth.ts
 */

import { prisma } from "../lib/db";
import bcrypt from "bcrypt";

async function testFamilyAccountSetup() {
  console.log("\n🧪 Testing Family Account Setup\n");
  console.log("=".repeat(60));

  try {
    // Test 1: Verify INDIVIDUAL account
    console.log("\n📝 Test 1: INDIVIDUAL Account");
    console.log("-".repeat(60));
    const individualStudent = await prisma.user.findUnique({
      where: { email: "student@guitarstrategies.com" },
      include: { studentProfiles: true },
    });

    if (individualStudent) {
      console.log("✅ User found:", individualStudent.email);
      console.log("   Account Type:", individualStudent.accountType);
      console.log("   Role:", individualStudent.role);
      console.log("   Student Profiles:", individualStudent.studentProfiles.length);

      if (individualStudent.studentProfiles.length === 1) {
        console.log("   ✅ Has exactly 1 student profile (correct for INDIVIDUAL)");
        console.log("   Profile ID:", individualStudent.studentProfiles[0].id);
      } else {
        console.log("   ❌ Expected 1 profile, found:", individualStudent.studentProfiles.length);
      }
    } else {
      console.log("❌ Individual student not found");
    }

    // Test 2: Verify FAMILY account
    console.log("\n📝 Test 2: FAMILY Account");
    console.log("-".repeat(60));
    const familyAccount = await prisma.user.findUnique({
      where: { email: "parent@guitarstrategies.com" },
      include: { studentProfiles: true },
    });

    if (familyAccount) {
      console.log("✅ User found:", familyAccount.email);
      console.log("   Account Type:", familyAccount.accountType);
      console.log("   Role:", familyAccount.role);
      console.log("   Student Profiles:", familyAccount.studentProfiles.length);

      if (familyAccount.studentProfiles.length === 2) {
        console.log("   ✅ Has exactly 2 student profiles (correct for FAMILY)");
        familyAccount.studentProfiles.forEach((profile, index) => {
          console.log(`\n   Child ${index + 1}:`);
          console.log(`     Profile ID: ${profile.id}`);
          console.log(`     Goals: ${profile.goals?.substring(0, 50)}...`);
          console.log(`     Instrument: ${profile.instrument}`);
        });
      } else {
        console.log("   ❌ Expected 2 profiles, found:", familyAccount.studentProfiles.length);
      }
    } else {
      console.log("❌ Family account not found");
    }

    // Test 3: Verify password authentication
    console.log("\n📝 Test 3: Password Authentication");
    console.log("-".repeat(60));
    if (familyAccount && familyAccount.password) {
      const isValid = await bcrypt.compare("admin123", familyAccount.password);
      console.log("   Password validation:", isValid ? "✅ PASS" : "❌ FAIL");
    }

    // Test 4: Verify database constraint removal
    console.log("\n📝 Test 4: Database Schema Validation");
    console.log("-".repeat(60));
    const studentProfilesWithSameUser = await prisma.studentProfile.groupBy({
      by: ['userId'],
      _count: { userId: true },
      having: {
        userId: {
          _count: {
            gt: 1
          }
        }
      }
    });

    if (studentProfilesWithSameUser.length > 0) {
      console.log("✅ Found users with multiple student profiles:");
      for (const group of studentProfilesWithSameUser) {
        const user = await prisma.user.findUnique({
          where: { id: group.userId },
          select: { email: true, accountType: true }
        });
        console.log(`   ${user?.email}: ${group._count.userId} profiles (${user?.accountType})`);
      }
    } else {
      console.log("⚠️  No users with multiple profiles found");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests completed\n");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testFamilyAccountSetup();
