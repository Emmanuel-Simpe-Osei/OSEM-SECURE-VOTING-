import { cookies } from "next/headers";
import { SessionOptions, getIronSession } from "iron-session";

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
  session_verified?: boolean;
}

export interface AdminSession {
  admin_id: string;
  email: string;
  role: string;
  session_id: string;
}

const studentSessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "osem_vote_session",
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 4,
  },
};

const adminSessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "osem_admin_session",
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 8,
  },
};

export async function getStudentSession() {
  const session = await getIronSession<StudentSession>(
    await cookies(),
    studentSessionOptions,
  );
  return session;
}

export async function getAdminSession() {
  const session = await getIronSession<AdminSession>(
    await cookies(),
    adminSessionOptions,
  );
  return session;
}
