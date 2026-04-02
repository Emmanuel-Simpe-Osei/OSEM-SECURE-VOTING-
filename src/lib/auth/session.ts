import { cookies } from "next/headers";
import { SessionOptions, getIronSession } from "iron-session";

// Extend NextAuth session type to include student_id
declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      student_id?: string;
    };
  }
}

// Validate session secret at startup
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32",
  );
}

export interface StudentSession {
  student_id: string;
  election_id: string;
  session_id: string;
  created_at: string;
}

export interface AdminSession {
  admin_id: string;
  email: string;
  role: string;
  session_id: string;
}

const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "osem_vote_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 4,
  },
};

export async function getStudentSession() {
  const session = await getIronSession<StudentSession>(
    await cookies(),
    sessionOptions,
  );
  return session;
}

export async function getAdminSession() {
  const session = await getIronSession<AdminSession>(
    await cookies(),
    sessionOptions,
  );
  return session;
}
