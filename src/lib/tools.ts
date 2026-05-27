/**
 * Sandbox tools for the chat API route.
 *
 * Provides tools to the LLM:
 * - provisionSandbox: create/resume a cloud sandbox with session-scoped folders
 * - exec: run shell commands in the sandbox
 * - showBrowser: fetch the preview URL and display the browser tab
 * - showFile: display a specific file in the files tab
 */

import { tool, zodSchema } from "ai";
import z from "zod";
import {
  provisionSandbox,
  fetchPreviewUrl,
  toSandboxName,
  errorMessage,
  type SandboxExec,
} from "./sandbox";
import { db } from "./db/client";
import { threads } from "./db/schema";
import { eq } from "drizzle-orm";
import { MEMORY_SEED } from "./memory-seed";

export function createSandboxTools({ sessionId }: { sessionId?: string }) {
  let sandboxExec: SandboxExec | null = null;

  return {
    provisionSandbox: tool({
      description:
        "Provision (or resume) the cloud sandbox for this session. Call this once before using exec. Creates session-scoped workspace folders and initializes memory.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!sessionId) {
          return { error: "No sessionId provided in the request body." };
        }
        try {
          const sandbox = await provisionSandbox(sessionId);
          sandboxExec = sandbox.exec;

          const sandboxName = toSandboxName(sessionId);
          await db
            .update(threads)
            .set({ sandboxId: sandboxName, updatedAt: new Date().toISOString() })
            .where(eq(threads.id, sessionId));

          // Create session-scoped workspace folders
          const sessionDir = `/workspace/sessions/${sessionId}`;
          await sandboxExec(
            `mkdir -p ${sessionDir}/uploads ${sessionDir}/outputs ${sessionDir}/work /workspace/memory/projects /workspace/memory/entities`,
          );

          // Seed memory files if they don't exist
          for (const [filename, content] of Object.entries(MEMORY_SEED)) {
            await sandboxExec(
              `test -f /workspace/memory/${filename} || cat > /workspace/memory/${filename} << 'SEED_EOF'\n${content}\nSEED_EOF`,
            );
          }

          return {
            status: "ready",
            sessionDir,
            workingDir: "/workspace",
            previewUrl: sandbox.previewUrl,
          };
        } catch (err) {
          return {
            error: errorMessage(err),
          };
        }
      },
    }),

    exec: tool({
      description:
        "Run a shell command in the live sandbox. Use this to read/write files, install deps, start servers, etc.",
      inputSchema: zodSchema(
        z.object({
          command: z.string().describe("Shell command to run."),
          cwd: z
            .string()
            .optional()
            .describe("Working directory (default: /workspace)."),
        }),
      ),
      execute: async ({ command, cwd }) => {
        if (!sandboxExec) {
          return { error: "Call provisionSandbox first." };
        }
        return sandboxExec(command, cwd);
      },
    }),

    showBrowser: tool({
      description:
        "Show the live browser preview to the user. Call only after a dev server is running on port 3000 and readiness has been confirmed.",
      inputSchema: zodSchema(z.object({})),
      execute: async () => {
        if (!sessionId) return { error: "No sessionId in request." };
        try {
          const url = await fetchPreviewUrl(sessionId);
          return { url };
        } catch (err) {
          return {
            error: errorMessage(err),
          };
        }
      },
    }),

    showFile: tool({
      description:
        "Show a specific file to the user in the Files tab. Call after creating or updating a user-facing artifact. Prefer showing files from the outputs folder.",
      inputSchema: zodSchema(
        z.object({
          path: z
            .string()
            .describe(
              "Absolute path to the file under /workspace to display.",
            ),
        }),
      ),
      execute: async ({ path }) => {
        if (!path.startsWith("/workspace")) {
          return { error: "Path must be under /workspace." };
        }
        return { path };
      },
    }),
  };
}
