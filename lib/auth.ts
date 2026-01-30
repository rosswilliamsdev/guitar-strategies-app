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
    updateAge: 0, // Allow session updates at any time (required for profile selection)
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === "production",
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
            user.password,
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
    async jwt({ token, user, trigger, session }) {
      authLog.info("JWT callback triggered", {
        trigger,
        hasUser: !!user,
        tokenSub: token.sub,
        tokenRole: token.role,
      });

      if (user) {
        // This runs on initial sign-in
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

        // Auto-set activeStudentProfileId for INDIVIDUAL accounts only
        // FAMILY accounts must select profile via /select-profile
        if (
          user.accountType === "INDIVIDUAL" &&
          user.studentProfiles &&
          user.studentProfiles.length === 1
        ) {
          try {
            token.activeStudentProfileId = user.studentProfiles[0].id;
            await prisma.user.update({
              where: { id: user.id },
              data: { activeStudentProfileId: user.studentProfiles[0].id },
            });
            authLog.info(
              "Auto-set and saved activeStudentProfileId for INDIVIDUAL account",
              {
                activeStudentProfileId: token.activeStudentProfileId,
              },
            );
          } catch (error) {
            authLog.error("Error auto-setting activeStudentProfileId", {
              error: error instanceof Error ? error.message : String(error),
              userId: user.id,
            });
          }
        } else if (user.accountType === "FAMILY") {
          // Clear activeStudentProfileId on login - force profile selection each time
          token.activeStudentProfileId = undefined;

          // Clear from database to ensure fresh selection
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { activeStudentProfileId: null },
            });
            authLog.info(
              "Cleared activeStudentProfileId for FAMILY account login",
              {
                userId: user.id,
                studentProfilesCount: user.studentProfiles?.length || 0,
              },
            );
          } catch (error) {
            authLog.error("Error clearing activeStudentProfileId", {
              error: error instanceof Error ? error.message : String(error),
              userId: user.id,
            });
          }
        }
      }

      // On subsequent requests (not initial login), ALWAYS check database for activeStudentProfileId
      // This ensures FAMILY accounts maintain their selected profile across all requests
      if (!user && token.sub && token.accountType === "FAMILY") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { activeStudentProfileId: true },
          });

          // Always sync token with database value (could be null or a profile ID)
          const previousProfileId = token.activeStudentProfileId;
          token.activeStudentProfileId = dbUser?.activeStudentProfileId || undefined;

          if (token.activeStudentProfileId !== previousProfileId) {
            authLog.info(
              "Updated activeStudentProfileId from database for FAMILY account",
              {
                previous: previousProfileId,
                current: token.activeStudentProfileId,
              },
            );
          }
        } catch (error) {
          authLog.error("Error loading activeStudentProfileId from database", {
            error: error instanceof Error ? error.message : String(error),
            userId: token.sub,
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

      if (!token) {
        authLog.warn("Session callback called without token");
        return session;
      }

      if (!session.user) {
        authLog.warn("Session callback called without session.user");
        return session;
      }

      try {
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
      } catch (error) {
        authLog.error("Error enriching session", {
          error: error instanceof Error ? error.message : String(error),
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
