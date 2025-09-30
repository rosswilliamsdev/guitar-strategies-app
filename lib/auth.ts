/**
 * @fileoverview NextAuth.js configuration for Guitar Strategies application.
 * Handles authentication with credentials provider and Prisma adapter.
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import { authLog } from "@/lib/logger";

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
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
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
        authLog.info('Authorization attempt', {
          email: credentials?.email,
          hasPassword: !!credentials?.password
        });

        if (!credentials?.email || !credentials?.password) {
          authLog.warn('Missing credentials for login attempt');
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

          authLog.info('User lookup completed', {
            found: !!user,
            email: user?.email,
            role: user?.role,
            hasPassword: !!user?.password
          });

          if (!user || !user.password) {
            authLog.warn('User not found or no password', { email: credentials.email });
            return null;
          }

          // Verify password using bcrypt
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          authLog.info('Password validation completed', { isValid: isPasswordValid, email: credentials.email });

          if (!isPasswordValid) {
            authLog.warn('Invalid password provided', { email: credentials.email });
            return null;
          }

          const authResult = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            teacherProfile: user.teacherProfile,
            studentProfile: user.studentProfile,
            isAdmin: user.role === 'ADMIN' || (user.teacherProfile?.isAdmin || false),
            isOrgFounder: user.teacherProfile?.isOrgFounder || false,
          };

          authLog.info('Authorization successful', {
            id: authResult.id,
            email: authResult.email,
            role: authResult.role,
            isAdmin: authResult.isAdmin
          });

          return authResult;
        } catch (error) {
          authLog.error('Authorization error', {
            error: error instanceof Error ? error.message : String(error),
            email: credentials.email
          });
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
      authLog.info('JWT callback triggered', {
        trigger,
        hasUser: !!user,
        tokenSub: token.sub,
        tokenRole: token.role
      });

      if (user) {
        authLog.info('Adding user data to JWT token', {
          id: user.id,
          role: user.role,
          hasTeacherProfile: !!user.teacherProfile,
          hasStudentProfile: !!user.studentProfile,
          isAdmin: user.isAdmin
        });
        token.role = user.role;
        token.teacherProfile = user.teacherProfile;
        token.studentProfile = user.studentProfile;
        token.isAdmin = user.isAdmin;
        token.isOrgFounder = user.isOrgFounder;
      }

      authLog.info('JWT token prepared', {
        sub: token.sub,
        role: token.role,
        email: token.email || undefined
      });

      return token;
    },

    /**
     * Session callback - runs whenever a session is accessed with JWT strategy.
     * Enriches session with user role and profile information from token.
     */
    async session({ session, token }) {
      authLog.info('Session callback triggered', {
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
        session.user.isAdmin = token.isAdmin;
        session.user.isOrgFounder = token.isOrgFounder;

        authLog.info('Session enriched with user data', {
          id: session.user.id,
          role: session.user.role,
          email: session.user.email,
          isAdmin: session.user.isAdmin
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