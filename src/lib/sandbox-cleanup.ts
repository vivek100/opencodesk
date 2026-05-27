/**
 * Sandbox TTL cleanup.
 *
 * Queries threads where `updated_at < now - TTL_DAYS` and `sandbox_id IS NOT NULL`,
 * deletes those exec sandboxes via the Blaxel API, and nulls out `sandbox_id`.
 *
 * Runs on app boot and every 6 hours via setInterval.
 */

import { db } from "./db/client";
import { threads } from "./db/schema";
import { and, isNotNull, lt, eq } from "drizzle-orm";

const TTL_DAYS = Number(process.env.SANDBOX_TTL_DAYS ?? 2);
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cleanupStarted = false;

export async function cleanupStaleSandboxes(): Promise<{
  checked: number;
  deleted: number;
  errors: string[];
}> {
  const cutoff = new Date(
    Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const staleThreads = await db
    .select({ id: threads.id, sandboxId: threads.sandboxId })
    .from(threads)
    .where(and(isNotNull(threads.sandboxId), lt(threads.updatedAt, cutoff)));

  if (staleThreads.length === 0) {
    return { checked: 0, deleted: 0, errors: [] };
  }

  let SandboxInstance: any;
  try {
    const mod = await import("@blaxel/core");
    SandboxInstance = mod.SandboxInstance;
  } catch {
    return {
      checked: staleThreads.length,
      deleted: 0,
      errors: ["@blaxel/core not available — skipping sandbox cleanup"],
    };
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const thread of staleThreads) {
    try {
      await SandboxInstance.delete(thread.sandboxId!);
      deleted++;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      // Sandbox may already be gone — treat 404 as success
      if (msg.includes("404") || msg.includes("not found")) {
        deleted++;
      } else {
        errors.push(`Failed to delete sandbox ${thread.sandboxId}: ${msg}`);
      }
    }

    // Null out sandbox_id regardless (best-effort cleanup)
    await db
      .update(threads)
      .set({ sandboxId: null })
      .where(eq(threads.id, thread.id));
  }

  console.log(
    `[sandbox-cleanup] Checked ${staleThreads.length} stale threads, deleted ${deleted} sandboxes` +
      (errors.length ? `, ${errors.length} errors` : ""),
  );

  return { checked: staleThreads.length, deleted, errors };
}

/**
 * Start the periodic cleanup. Safe to call multiple times — only runs once.
 */
export function startSandboxCleanup(): void {
  if (cleanupStarted) return;
  cleanupStarted = true;

  // Run immediately on boot (fire-and-forget)
  cleanupStaleSandboxes().catch((err) =>
    console.error("[sandbox-cleanup] Boot cleanup failed:", err),
  );

  // Schedule periodic cleanup
  setInterval(() => {
    cleanupStaleSandboxes().catch((err) =>
      console.error("[sandbox-cleanup] Periodic cleanup failed:", err),
    );
  }, CLEANUP_INTERVAL_MS);
}
