/**
 * Custom AttachmentAdapter that uploads files to the Blaxel Drive
 * via POST /api/upload on send.
 *
 * Flow:
 *   add()  — user picks a file → create PendingAttachment (file held locally)
 *   send() — user sends message → upload to /api/upload → CompleteAttachment with text part
 *   remove() — user removes attachment before sending → no-op
 */

import type { AttachmentAdapter } from "@assistant-ui/core";
import type {
  PendingAttachment,
  CompleteAttachment,
  Attachment,
} from "@assistant-ui/core";

let nextId = 0;

export function createDriveAttachmentAdapter(
  getThreadId: () => string | undefined,
): AttachmentAdapter {
  return {
    accept: "*",

    async add({ file }: { file: File }): Promise<PendingAttachment> {
      return {
        id: `upload-${++nextId}-${Date.now()}`,
        type: "file",
        name: file.name,
        contentType: file.type || "application/octet-stream",
        file,
        status: { type: "requires-action", reason: "composer-send" },
      };
    },

    async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
      const threadId = getThreadId();
      const uploadPath = threadId
        ? `/workspace/sessions/${threadId}/uploads`
        : "/workspace";

      const formData = new FormData();
      formData.append("file", attachment.file);
      formData.append("path", uploadPath);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `Upload failed: ${res.status}`);
      }

      const data = await res.json();
      const uploaded = data.uploaded?.[0];
      const filePath = uploaded?.path ?? `${uploadPath}/${attachment.name}`;

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("drive-upload-complete"));
      }

      return {
        id: attachment.id,
        type: "file",
        name: attachment.name,
        contentType: attachment.contentType,
        status: { type: "complete" },
        content: [
          {
            type: "text",
            text: `[Uploaded file: ${filePath}]`,
          },
        ],
      };
    },

    async remove(_attachment: Attachment): Promise<void> {},
  };
}
