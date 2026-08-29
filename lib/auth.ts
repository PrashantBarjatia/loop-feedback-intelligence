// Central auth configuration + small helper functions used by every API route.
// This is the file that answers: "who is calling, and what are they allowed to do?"
import { AuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { Role } from "@prisma/client";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
        } as any;
      },
    }),
  ],
  callbacks: {
    // Runs whenever a JWT is created/updated. We copy role + workspaceId onto the
    // token so we don't have to hit the database on every single request.
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.workspaceId = (user as any).workspaceId;
      }
      return token;
    },
    // Runs whenever the session is read (e.g. useSession(), getServerSession()).
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.workspaceId = token.workspaceId;
      return session;
    },
  },
};

/** Get the current session on the server (API routes, Server Components). */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new ApiError(401, "Not authenticated");
  }
  return session;
}

/**
 * Enforce role server-side. This is the actual security boundary — the UI
 * hiding a button is not enough (see brief section C2, acceptance criterion 3).
 */
export function requireRole(session: Awaited<ReturnType<typeof requireSession>>, allowed: Role[]) {
  if (!allowed.includes(session.user.role)) {
    throw new ApiError(403, "You do not have permission to do this");
  }
}

/** Small typed error so API routes can throw and have one place turn it into a Response. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
