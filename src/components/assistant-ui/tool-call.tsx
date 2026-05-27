"use client";

import { cn } from "@/lib/utils";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LoaderIcon,
  MonitorIcon,
  PlayIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

function getToolDisplay(
  toolName: string,
  args: Record<string, unknown>,
  isRunning: boolean,
): { icon: LucideIcon; label: string; detail: string } {
  switch (toolName) {
    case "provisionSandbox":
      return {
        icon: PlayIcon,
        label: isRunning ? "Provisioning sandbox" : "Sandbox ready",
        detail: "",
      };
    case "exec": {
      const command = (args as { command?: string })?.command ?? "";
      const preview =
        command.length > 60 ? `${command.slice(0, 57)}...` : command;
      return {
        icon: TerminalIcon,
        label: isRunning ? "Running" : "Ran",
        detail: preview,
      };
    }
    case "refreshCanvas":
      return {
        icon: MonitorIcon,
        label: isRunning ? "Fetching preview" : "Preview ready",
        detail: "",
      };
    default:
      return {
        icon: TerminalIcon,
        label: isRunning ? "Running" : "Completed",
        detail: toolName,
      };
  }
}

function ToolStatusIcon({
  status,
  FallbackIcon,
}: {
  status: { type: string } | undefined;
  FallbackIcon: LucideIcon;
}): ReactNode {
  switch (status?.type) {
    case "running":
      return <LoaderIcon className="size-3 animate-spin" />;
    case "complete":
      return <CheckIcon className="size-3 text-emerald-500" />;
    default:
      return <FallbackIcon className="size-3" />;
  }
}

function useToolDuration(isRunning: boolean): number | null {
  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    } else if (!isRunning && startTimeRef.current !== null) {
      setDuration(Date.now() - startTimeRef.current);
    }
  }, [isRunning]);

  return duration;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ToolPayload({
  label,
  value,
}: {
  label: string;
  value: unknown;
}): ReactNode {
  return (
    <div>
      <p className="mb-1 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wide">
        {label}
      </p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-md bg-background/40 p-2 text-muted-foreground oc-scrollbar">
        {formatPayload(value)}
      </pre>
    </div>
  );
}

function formatPayload(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ToolCall({
  toolName,
  args,
  result,
  status,
}: ToolCallMessagePartProps): ReactNode {
  const isRunning = status?.type === "running";
  const { icon, label, detail } = getToolDisplay(toolName, args, isRunning);
  const duration = useToolDuration(isRunning);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-1.5 rounded-lg border border-border/60 bg-muted/30 text-xs">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          "flex w-full items-center gap-2 px-2.5 py-1.5 text-muted-foreground",
          isRunning && "animate-pulse",
        )}
      >
        <ToolStatusIcon status={status} FallbackIcon={icon} />
        <span className="flex-1 truncate text-left">
          {label} {detail}
        </span>
        {duration !== null && (
          <span className="text-muted-foreground/60">
            {formatDuration(duration)}
          </span>
        )}
        {expanded ? (
          <ChevronUpIcon className="size-3 text-muted-foreground/50" />
        ) : (
          <ChevronDownIcon className="size-3 text-muted-foreground/50" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 border-border/60 border-t px-2.5 py-2">
          <ToolPayload label="Input" value={args} />
          {result !== undefined && (
            <ToolPayload label="Output" value={result} />
          )}
        </div>
      )}
    </div>
  );
}
