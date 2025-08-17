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
 * - Prisma adapter for database sessions
 * - JWT strategy for session handling
 * - Credentials provider for email/password authentication
 * - Custom callbacks for role-based access and profile data
 * 
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

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

        if (!user || !user.password) {
          return null;
        }

        // Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    /**
     * JWT callback - runs whenever a JWT is created, updated, or accessed.
     * Adds user role to the token for session use.
     * 
     * @param token - The JWT token
     * @param user - User object (only available on signin)
     * @returns Updated token
     */
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    
    /**
     * Session callback - runs whenever a session is accessed.
     * Enriches session with user ID, role, and profile information.
     * 
     * @param session - The session object
     * @param token - The JWT token
     * @returns Enhanced session with profile data
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        
        // Fetch current profile information for the session
        const userWithProfiles = await prisma.user.findUnique({
          where: { id: token.sub! },
          include: {
            teacherProfile: true,
            studentProfile: true,
          },
        });
        
        if (userWithProfiles) {
          session.user.teacherProfile = userWithProfiles.teacherProfile;
          session.user.studentProfile = userWithProfiles.studentProfile;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/error",
  },
};