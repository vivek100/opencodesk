import { db } from "@/lib/db/client";
import { threads } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/migrate";
import { desc } from "drizzle-orm";
import { generateId } from "ai";

const DRIVE_ID = process.env.BL_DRIVE_ID ?? "opencodesk-drive";

/** GET /api/threads — list all threads, newest first */
export async function GET() {
  await ensureSchema();

  const rows = await db
    .select()
    .from(threads)
    .orderBy(desc(threads.updatedAt));

  return Response.json(rows);
}

/** POST /api/threads — create a new thread, return { id } */
export async function POST() {
  await ensureSchema();

  const id = generateId();
  const now = new Date().toISOString();

  await db.insert(threads).values({
    id,
    driveId: DRIVE_ID,
    createdAt: now,
    updatedAt: now,
  });

  return Response.json({ id });
}
