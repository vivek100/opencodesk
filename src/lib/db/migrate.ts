import { db } from "./client";
import { sql } from "drizzle-orm";

let migrated = false;

/**
 * Ensure tables exist. Runs once per process lifetime.
 * Uses CREATE TABLE IF NOT EXISTS so it's safe to call repeatedly.
 */
export async function ensureSchema() {
  if (migrated) return;

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      title TEXT,
      status TEXT NOT NULL DEFAULT 'regular',
      sandbox_id TEXT,
      drive_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE INDEX IF NOT EXISTS threads_updated_idx ON threads(updated_at DESC)
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      parent_id TEXT,
      format TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages(thread_id)
  `);

  // Enable foreign keys (off by default in SQLite)
  await db.run(sql`PRAGMA foreign_keys = ON`);

  migrated = true;
}
