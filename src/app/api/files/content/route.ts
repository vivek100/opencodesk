/**
 * GET /api/files/content?path=/workspace/file.ts
 * GET /api/files/content?path=/workspace/image.png&mode=binary
 *
 * Reads file content via the dedicated filesystem sandbox.
 * Default mode returns text/plain. Binary mode returns raw bytes
 * with an appropriate Content-Type based on file extension.
 */

const FS_SANDBOX = process.env.BL_FS_SANDBOX;

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".zip": "application/zip",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};

function getMimeType(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

export async function GET(req: Request) {
  if (!FS_SANDBOX) {
    return Response.json(
      { error: "BL_FS_SANDBOX env var not configured" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path");
  const mode = url.searchParams.get("mode");

  if (!path) {
    return Response.json({ error: "path is required" }, { status: 400 });
  }

  try {
    const { SandboxInstance } = await import("@blaxel/core");
    const sb = await SandboxInstance.get(FS_SANDBOX);

    if (mode === "binary") {
      const blob = await sb.fs.readBinary(path);
      const arrayBuffer = await blob.arrayBuffer();
      const mimeType = getMimeType(path);
      return new Response(arrayBuffer, {
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "no-store",
        },
      });
    }

    const content = await sb.fs.read(path);
    return new Response(content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
