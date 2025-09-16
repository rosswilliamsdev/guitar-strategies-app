import NextAuth from "next-auth";
import { Role, TeacherProfile, StudentProfile } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      teacherProfile?: TeacherProfile | null;
      studentProfile?: StudentProfile | null;
    };
  }

  interface User {
    role: Role;
    teacherProfile?: TeacherProfile | null;
    studentProfile?: StudentProfile | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    teacherProfile?: TeacherProfile | null;
    studentProfile?: StudentProfile | null;
  }
}