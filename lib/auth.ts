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
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      /**
       * Authorize user credentials against the database.
       *
       * @param credentials - User credentials from login form
       * @returns User object if authentication successful, null otherwise
       */
      async authorize(credentials) {
        authLog.info("Authorization attempt", {
          email: credentials?.email,
          hasPassword: !!credentials?.password,
        });

        if (!credentials?.email || !credentials?.password) {
          authLog.warn("Missing credentials for login attempt");
          return null;
        }

        try {
          // Find user with associated profiles
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
            include: {
              teacherProfile: true,
              studentProfiles: true,
            },
          });

          authLog.info("User lookup completed", {
            found: !!user,
            email: user?.email,
            role: user?.role,
            accountType: user?.accountType,
            studentProfilesCount: user?.studentProfiles?.length || 0,
            hasPassword: !!user?.password,
          });

          if (!user || !user.password) {
            authLog.warn("User not found or no password", {
              email: credentials.email,
            });
            return null;
          }

          // Verify password using bcrypt
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          authLog.info("Password validation completed", {
            isValid: isPasswordValid,
            email: credentials.email,
          });

          if (!isPasswordValid) {
            authLog.warn("Invalid password provided", {
              email: credentials.email,
            });
            return null;
          }

          const authResult = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            accountType: user.accountType,
            teacherProfile: user.teacherProfile,
            studentProfiles: user.studentProfiles,
            isAdmin:
              user.role === "ADMIN" || user.teacherProfile?.isAdmin || false,
          };

          authLog.info("Authorization successful", {
            id: authResult.id,
            email: authResult.email,
            role: authResult.role,
            accountType: authResult.accountType,
            studentProfilesCount: authResult.studentProfiles?.length || 0,
            isAdmin: authResult.isAdmin,
          });

          return authResult;
        } catch (error) {
          authLog.error("Authorization error", {
            error: error instanceof Error ? error.message : String(error),
            email: credentials.email,
          });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    /**
     * JWT callback - runs whenever a JWT is created, updated, or accessed.
     * Adds user role and profile data to the token for session use.
     */
    async jwt({ token, user, trigger }) {
      authLog.info("JWT callback triggered", {
        trigger,
        hasUser: !!user,
        tokenSub: token.sub,
        tokenRole: token.role,
      });

      if (user) {
        authLog.info("Adding user data to JWT token", {
          id: user.id,
          role: user.role,
          accountType: user.accountType,
          hasTeacherProfile: !!user.teacherProfile,
          studentProfilesCount: user.studentProfiles?.length || 0,
          isAdmin: user.isAdmin,
        });
        token.role = user.role;
        token.accountType = user.accountType;
        token.teacherProfile = user.teacherProfile;
        token.studentProfiles = user.studentProfiles;
        token.isAdmin = user.isAdmin;

        // Auto-set activeStudentProfileId for INDIVIDUAL accounts
        if (user.accountType === 'INDIVIDUAL' && user.studentProfiles && user.studentProfiles.length === 1) {
          token.activeStudentProfileId = user.studentProfiles[0].id;
          authLog.info("Auto-set activeStudentProfileId for INDIVIDUAL account", {
            activeStudentProfileId: token.activeStudentProfileId,
          });
        }
      }

      authLog.info("JWT token prepared", {
        sub: token.sub,
        role: token.role,
        email: token.email || undefined,
      });

      return token;
    },

    /**
     * Session callback - runs whenever a session is accessed with JWT strategy.
     * Enriches session with user role and profile information from token.
     */
    async session({ session, token }) {
      authLog.info("Session callback triggered", {
        hasToken: !!token,
        tokenSub: token.sub,
        tokenRole: token.role,
        sessionUserEmail: session.user?.email,
      });

      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.accountType = token.accountType;
        session.user.teacherProfile = token.teacherProfile;
        session.user.studentProfiles = token.studentProfiles;
        session.user.activeStudentProfileId = token.activeStudentProfileId;
        session.user.isAdmin = token.isAdmin;

        authLog.info("Session enriched with user data", {
          id: session.user.id,
          role: session.user.role,
          accountType: session.user.accountType,
          email: session.user.email,
          studentProfilesCount: session.user.studentProfiles?.length || 0,
          activeStudentProfileId: session.user.activeStudentProfileId,
          isAdmin: session.user.isAdmin,
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
