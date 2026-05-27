import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const threads = sqliteTable(
  "threads",
  {
    id: text("id").primaryKey(),
    title: text("title"),
    status: text("status", { enum: ["regular", "archived"] })
      .notNull()
      .default("regular"),
    sandboxId: text("sandbox_id"),
    driveId: text("drive_id").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("threads_updated_idx").on(t.updatedAt)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    format: text("format").notNull(),
    content: text("content", { mode: "json" }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("messages_thread_idx").on(t.threadId)],
);
