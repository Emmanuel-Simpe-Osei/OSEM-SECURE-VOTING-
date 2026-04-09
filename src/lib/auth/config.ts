import NextAuth, { NextAuthOptions, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session {
    student_id?: string;
    is_admin_login?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    student_id?: string;
    is_admin_login?: boolean;
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
    async signIn({ profile, account, user }) {
      const email = profile?.email || user?.email || "";

      // Admin login — allow any Google account through
      // Admin check happens in /api/admin/auth/complete-google
      if (account?.state && typeof account.state === "string") {
        try {
          const state = JSON.parse(decodeURIComponent(account.state));
          if (state?.admin === true) return true;
        } catch {}
      }

      // Student login — enforce domain restriction
      if (!email.endsWith("@upsamail.edu.gh")) {
        return false;
      }

      return true;
    },

    async jwt({ token, profile, account }) {
      if (profile?.email) {
        token.student_id = profile.email.split("@")[0];
      }
      // Flag admin login
      if (account?.state) {
        try {
          const state = JSON.parse(decodeURIComponent(account.state as string));
          if (state?.admin === true) {
            token.is_admin_login = true;
          }
        } catch {}
      }
      return token;
    },

    async session({ session, token }) {
      session.student_id = token.student_id;
      session.is_admin_login = token.is_admin_login;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const authConfig = authOptions;
export default NextAuth(authOptions);
