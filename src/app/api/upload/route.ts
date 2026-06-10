/**
 * POST /api/upload
 * Accepts multipart form data with one or more files.
 * Writes each file to the shared Blaxel Drive via the dedicated FS sandbox.
 *
 * Form fields:
 *   file   — one or more File entries
 *   path   — (optional) destination directory, defaults to /workspace
 *
 * Limit: 25 MB per file.
 */

import { errorMessage } from "@/lib/sandbox";

const FS_SANDBOX = process.env.BL_FS_SANDBOX;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  if (!FS_SANDBOX) {
    return Response.json(
      { error: "BL_FS_SANDBOX env var not configured" },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json(
      { error: "Invalid multipart form data" },
      { status: 400 },
    );
  }

  const destDir = (formData.get("path") as string) || "/workspace";
  const files = formData.getAll("file").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return Response.json(
      { error: "No files provided. Use the 'file' form field." },
      { status: 400 },
    );
  }

  // Validate sizes
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File "${file.name}" exceeds 25 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
        { status: 413 },
      );
    }
  }

  try {
    const { SandboxInstance } = await import("@blaxel/core");
    const sb = await SandboxInstance.get(FS_SANDBOX);

    const uploaded: { name: string; path: string; size: number }[] = [];

    for (const file of files) {
      const filePath = `${destDir.replace(/\/+$/, "")}/${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await sb.fs.writeBinary(filePath, buffer);
      uploaded.push({ name: file.name, path: filePath, size: file.size });
    }

    return Response.json({ uploaded });
  } catch (err) {
    const message = errorMessage(err);
    console.error("[api/upload]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
