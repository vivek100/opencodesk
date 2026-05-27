import { db } from "@/lib/db/client";
import { threads } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/migrate";
import { eq } from "drizzle-orm";

/** GET /api/threads/[id] — fetch single thread metadata */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await ensureSchema();

  const [thread] = await db
    .select()
    .from(threads)
    .where(eq(threads.id, id));

  if (!thread) return new Response(null, { status: 404 });
  return Response.json(thread);
}

/** PATCH /api/threads/[id] — update title or status */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await ensureSchema();

  const body = (await req.json()) as {
    title?: string;
    status?: "regular" | "archived";
    sandboxId?: string;
  };

  await db
    .update(threads)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(threads.id, id));

  return new Response(null, { status: 204 });
}

/** DELETE /api/threads/[id] — delete thread (messages cascade) */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await ensureSchema();

  await db.delete(threads).where(eq(threads.id, id));
  return new Response(null, { status: 204 });
}
