import NextAuth from "next-auth";
import { Role, TeacherProfile, StudentProfile, AccountType } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      accountType: AccountType;
      teacherProfile?: TeacherProfile | null;
      studentProfiles?: StudentProfile[];
      activeStudentProfileId?: string | null;
      isAdmin?: boolean;
    };
  }

  interface User {
    role: Role;
    accountType: AccountType;
    teacherProfile?: TeacherProfile | null;
    studentProfiles?: StudentProfile[];
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    accountType: AccountType;
    teacherProfile?: TeacherProfile | null;
    studentProfiles?: StudentProfile[];
    activeStudentProfileId?: string | null;
    isAdmin?: boolean;
  }
}