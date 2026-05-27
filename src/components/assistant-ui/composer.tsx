"use client";

import { Button } from "@/components/ui/button";
import {
  AuiIf,
  ComposerPrimitive,
  useThreadComposerAttachment,
  useAttachmentRuntime,
} from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, PaperclipIcon, SquareIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AssistantComposer({
  className,
  placeholder = "Ask your agent...",
}: {
  className?: string;
  placeholder?: string;
} = {}): ReactNode {
  return (
    <ComposerPrimitive.Root className={cn("pb-0.5", className)}>
      <div className="rounded-xl border border-border bg-background focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20">
        <ComposerPrimitive.Attachments
          components={{ Attachment: ComposerAttachmentItem }}
        />
        <ComposerPrimitive.Input asChild>
          <textarea
            placeholder={placeholder}
            className="field-sizing-content max-h-32 w-full resize-none bg-transparent px-3 pt-2.5 pb-2 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none"
            rows={1}
          />
        </ComposerPrimitive.Input>
        <div className="flex items-center justify-between px-1.5 pb-1.5">
          <ComposerPrimitive.AddAttachment asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg"
            >
              <PaperclipIcon className="size-4" />
            </Button>
          </ComposerPrimitive.AddAttachment>
          <AssistantComposerAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function AssistantComposerAction(): ReactNode {
  return (
    <>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button size="icon" className="size-7 rounded-lg">
            <ArrowUpIcon className="size-4" />
          </Button>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 rounded-lg"
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </>
  );
}

function ComposerAttachmentItem(): ReactNode {
  const attachment = useThreadComposerAttachment((a) => a);
  const runtime = useAttachmentRuntime();

  return (
    <div className="mx-2 mt-2 flex items-center gap-2 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-sm">
      <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate text-xs">{attachment.name}</span>
      {attachment.status.type === "running" && (
        <span className="shrink-0 text-xs text-muted-foreground">
          Uploading...
        </span>
      )}
      <button
        type="button"
        onClick={() => runtime.remove()}
        className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-sm hover:bg-muted"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );
}
