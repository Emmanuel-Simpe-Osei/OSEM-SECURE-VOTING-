import NextAuth, { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

// Extend the built-in session and JWT types
declare module "next-auth" {
  interface Session {
    student_id?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    student_id?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email?.endsWith("@upsamail.edu.gh")) {
        return false;
      }
      return true;
    },

    async jwt({ token, profile }) {
      if (profile?.email) {
        token.student_id = profile.email.split("@")[0];
      }
      return token;
    },

    async session({ session, token }) {
      session.student_id = token.student_id;
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
