import "server-only";
import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "./rate-limit";
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      name: "Administrator",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const input = z
          .object({ email: z.email(), password: z.string().min(1).max(200) })
          .safeParse(credentials);
        if (
          !input.success ||
          !process.env.DATABASE_URL ||
          !process.env.NEXTAUTH_SECRET
        )
          return null;
        const email = input.data.email.toLowerCase();
        if (!(await rateLimit("login:" + email))) return null;
        const user = await db.adminUser.findUnique({ where: { email } });
        if (
          !user?.active ||
          !(await compare(input.data.password, user.passwordHash))
        )
          return null;
        await db.auditLog.create({
          data: { adminId: user.id, action: "login", entity: "admin" },
        });
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.adminId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user)
        (session.user as typeof session.user & { id: string }).id = String(
          token.adminId,
        );
      return session;
    },
  },
};
export async function currentAdmin() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  const admin = await db.adminUser.findUnique({ where: { id } });
  return admin?.active ? admin : null;
}
export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) throw new Error("UNAUTHORIZED");
  return admin;
}
