/**
 * @fileoverview NextAuth.js configuration for Guitar Strategies application.
 * Handles authentication with credentials provider and Prisma adapter.
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";

/**
 * NextAuth.js configuration options.
 *
 * Configures authentication with:
 * - JWT strategy for session handling
 * - Credentials provider for email/password authentication
 * - Custom callbacks for role-based access and profile data
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      /**
       * Authorize user credentials against the database.
       * 
       * @param credentials - User credentials from login form
       * @returns User object if authentication successful, null otherwise
       */
      async authorize(credentials) {
        console.log('🔐 Authorization attempt:', {
          email: credentials?.email,
          hasPassword: !!credentials?.password
        });

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        try {
          // Find user with associated profiles
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            include: {
              teacherProfile: true,
              studentProfile: true,
            }
          });

          console.log('👤 User lookup result:', {
            found: !!user,
            email: user?.email,
            role: user?.role,
            hasPassword: !!user?.password
          });

          if (!user || !user.password) {
            console.log('❌ User not found or no password');
            return null;
          }

          // Verify password using bcrypt
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          console.log('🔑 Password validation:', { isValid: isPasswordValid });

          if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return null;
          }

          const authResult = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            teacherProfile: user.teacherProfile,
            studentProfile: user.studentProfile,
          };

          console.log('✅ Authorization successful:', {
            id: authResult.id,
            email: authResult.email,
            role: authResult.role
          });

          return authResult;
        } catch (error) {
          console.error('💥 Authorization error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    /**
     * JWT callback - runs whenever a JWT is created, updated, or accessed.
     * Adds user role and profile data to the token for session use.
     */
    async jwt({ token, user, trigger }) {
      console.log('🎫 JWT Callback:', {
        trigger,
        hasUser: !!user,
        tokenSub: token.sub,
        tokenRole: token.role
      });

      if (user) {
        console.log('🆕 Adding user data to token:', {
          id: user.id,
          role: user.role,
          hasTeacherProfile: !!user.teacherProfile,
          hasStudentProfile: !!user.studentProfile
        });
        token.role = user.role;
        token.teacherProfile = user.teacherProfile;
        token.studentProfile = user.studentProfile;
      }

      console.log('🎫 JWT token result:', {
        sub: token.sub,
        role: token.role,
        email: token.email
      });

      return token;
    },

    /**
     * Session callback - runs whenever a session is accessed with JWT strategy.
     * Enriches session with user role and profile information from token.
     */
    async session({ session, token }) {
      console.log('📋 Session Callback:', {
        hasToken: !!token,
        tokenSub: token.sub,
        tokenRole: token.role,
        sessionUserEmail: session.user?.email
      });

      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.teacherProfile = token.teacherProfile;
        session.user.studentProfile = token.studentProfile;

        console.log('📋 Session enriched:', {
          id: session.user.id,
          role: session.user.role,
          email: session.user.email
        });
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/error",
  },
};