import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import { mkdirSync } from "fs";
import { dirname } from "path";

const url = process.env.DATABASE_URL ?? "file:./data/local.db";

// Ensure the directory exists for local file databases
if (url.startsWith("file:")) {
  const filePath = url.replace("file:", "");
  mkdirSync(dirname(filePath), { recursive: true });
}

const client = createClient({
  url,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
