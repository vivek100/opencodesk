import { db } from "@/lib/db/client";
import { threads } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/migrate";
import { eq } from "drizzle-orm";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

/** POST /api/threads/[id]/title — generate a title from messages */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await ensureSchema();

  const { messages } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>;
  };

  // Take the first few messages to generate a title
  const context = messages
    .slice(0, 4)
    .map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`)
    .join("\n");

  const { text: title } = await generateText({
    model: openai("gpt-5.4-nano"),
    system:
      "Generate a short title (3-6 words) for this conversation. Return only the title, no quotes or punctuation.",
    prompt: context,
    maxOutputTokens: 20,
  });

  // Persist the title
  await db
    .update(threads)
    .set({ title: title.trim(), updatedAt: new Date().toISOString() })
    .where(eq(threads.id, id));

  return Response.json({ title: title.trim() });
}
