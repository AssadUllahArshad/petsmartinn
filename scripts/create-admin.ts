import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
const db = new PrismaClient();
async function main() {
  const v = z
    .object({
      email: z.email(),
      password: z.string().min(12),
      name: z.string().min(2),
    })
    .parse({
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
      name: process.env.ADMIN_NAME || "Site owner",
    });
  await db.adminUser.create({
    data: {
      email: v.email.toLowerCase(),
      name: v.name,
      passwordHash: await hash(v.password, 12),
      role: "OWNER",
    },
  });
  console.log("Owner account created.");
}
main().finally(() => db.$disconnect());
