import { db } from "@/lib/db/client";
import { threads, messages } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/migrate";
import { asc, eq } from "drizzle-orm";

/** GET /api/threads/[id]/messages — list messages for a thread */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await ensureSchema();

  // Verify thread exists
  const [thread] = await db
    .select()
    .from(threads)
    .where(eq(threads.id, id));

  if (!thread) return new Response(null, { status: 404 });

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.threadId, id))
    .orderBy(asc(messages.createdAt));

  return Response.json(rows);
}

/** POST /api/threads/[id]/messages — append a message */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await ensureSchema();

  const body = (await req.json()) as {
    id: string;
    parent_id: string | null;
    format: string;
    content: unknown;
  };

  await db.insert(messages).values({
    id: body.id,
    threadId: id,
    parentId: body.parent_id,
    format: body.format,
    content: body.content,
    createdAt: new Date().toISOString(),
  });

  // Touch the thread's updatedAt
  await db
    .update(threads)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(threads.id, id));

  return new Response(null, { status: 204 });
}
