"use client";

import { ThreadListPrimitive } from "@assistant-ui/react";
import { PlusIcon, FolderOpen } from "lucide-react";

export function HeaderActions({
  onShowDrive,
}: {
  onShowDrive?: () => void;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold">OpenCoDesk</h1>
      </div>
      <div className="flex items-center gap-1.5">
        {onShowDrive && (
          <button
            type="button"
            onClick={onShowDrive}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <FolderOpen className="size-3.5" />
            Show Drive
          </button>
        )}
        <ThreadListPrimitive.New asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <PlusIcon className="size-3.5" />
            New Chat
          </button>
        </ThreadListPrimitive.New>
      </div>
    </header>
  );
}
