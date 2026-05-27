/**
 * GET /api/files?path=/workspace
 * Lists files via the dedicated filesystem sandbox.
 * Both the agent's exec sandbox and this sandbox share the same Blaxel Drive,
 * so files written by the agent appear here.
 */

import { errorMessage, withRetry } from "@/lib/sandbox";

const FS_SANDBOX = process.env.BL_FS_SANDBOX;

export async function GET(req: Request) {
  if (!FS_SANDBOX) {
    return Response.json(
      { error: "BL_FS_SANDBOX env var not configured" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "/workspace";

  try {
    const { SandboxInstance } = await import("@blaxel/core");
    const retryContext = {
      sandboxName: FS_SANDBOX,
      driveName: process.env.BL_DRIVE_ID,
      region: process.env.BL_REGION,
    };
    const sb = await withRetry<any>(
      () => SandboxInstance.get(FS_SANDBOX),
      { ...retryContext, operation: "fsSandbox.get" },
    );
    const dir = await withRetry<any>(
      () => sb.fs.ls(path),
      { ...retryContext, operation: "fs.ls" },
    );

    const fileEntries = (dir.files ?? []).map((f: any) => ({
      name: f.name as string,
      path: f.path as string,
      size: (f.size as number) ?? 0,
      isDirectory: (f.permissions as string)?.startsWith("d") ?? false,
      lastModified: (f.lastModified as string) ?? "",
    }));

    const dirEntries = (dir.subdirectories ?? []).map((d: any) => ({
      name: d.name as string,
      path: d.path as string,
      size: 0,
      isDirectory: true,
      lastModified: "",
    }));

    const entries = [...dirEntries, ...fileEntries];

    return Response.json({ path: dir.path, entries });
  } catch (err) {
    const message = errorMessage(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
