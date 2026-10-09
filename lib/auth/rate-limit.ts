import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
export async function rateLimit(identifier: string, max = 8, seconds = 900) {
  const key = createHash("sha256").update(identifier).digest("hex");
  return db.$transaction(async (tx) => {
    const now = new Date();
    const row = await tx.rateLimit.upsert({
      where: { key },
      create: {
        key,
        count: 1,
        expiresAt: new Date(now.getTime() + seconds * 1000),
      },
      update: { count: { increment: 1 } },
    });
    if (row.expiresAt < now) {
      await tx.rateLimit.update({
        where: { key },
        data: { count: 1, expiresAt: new Date(now.getTime() + seconds * 1000) },
      });
      return true;
    }
    return row.count <= max;
  });
}
