"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAuiState, type ToolCallMessagePart } from "@assistant-ui/react";
import type { CanvasTab } from "./canvas-panel";

type ToolResult = Record<string, unknown>;

function isToolCall(part: unknown, toolName: string): part is ToolCallMessagePart {
  return (
    !!part &&
    typeof part === "object" &&
    (part as ToolCallMessagePart).type === "tool-call" &&
    (part as ToolCallMessagePart).toolName === toolName
  );
}

function getResult(part: ToolCallMessagePart): ToolResult | null {
  const result = (part as ToolCallMessagePart & { result?: unknown }).result;
  return result && typeof result === "object"
    ? (result as ToolResult)
    : null;
}

function getToolCallId(part: ToolCallMessagePart): string {
  return (part as ToolCallMessagePart & { toolCallId?: string }).toolCallId ?? "";
}

export function CanvasObserver({
  onCanvasReady,
  onCanvasError,
  onSandboxReady,
  onTabChange,
  onShowFile,
}: {
  onCanvasReady: (url: string) => void;
  onCanvasError: (error: string) => void;
  onSandboxReady: () => void;
  onTabChange: (tab: CanvasTab) => void;
  onShowFile: (path: string) => void;
}) {
  const handledBrowserRef = useRef<string | null>(null);
  const handledProvisionRef = useRef<string | null>(null);
  const handledShowFileRef = useRef<string | null>(null);

  const latestBrowser = useAuiState((state) => {
    const messages = state.thread.messages ?? [];
    return messages
      .flatMap((message) => message.content.filter((p) => isToolCall(p, "showBrowser")))
      .at(-1);
  });

  const latestProvision = useAuiState((state) => {
    const messages = state.thread.messages ?? [];
    return messages
      .flatMap((message) => message.content.filter((p) => isToolCall(p, "provisionSandbox")))
      .at(-1);
  });

  const latestShowFile = useAuiState((state) => {
    const messages = state.thread.messages ?? [];
    return messages
      .flatMap((message) => message.content.filter((p) => isToolCall(p, "showFile")))
      .at(-1);
  });

  // Handle showBrowser → Browser tab
  const browserResult = useMemo(() => {
    if (!latestBrowser) return null;
    const payload = getResult(latestBrowser);
    if (!payload) return null;
    return { id: getToolCallId(latestBrowser), payload };
  }, [latestBrowser]);

  useEffect(() => {
    if (!browserResult) return;
    const { id, payload } = browserResult;
    const url = payload.url;
    const error = payload.error;
    const key = `${id}:${String(url ?? error ?? "")}`;
    if (handledBrowserRef.current === key) return;
    handledBrowserRef.current = key;

    if (typeof url === "string" && url.length > 0) {
      onCanvasReady(url);
      onTabChange("browser");
      return;
    }

    if (typeof error === "string" && error.length > 0) {
      onCanvasError(error);
    }
  }, [onCanvasError, onCanvasReady, onTabChange, browserResult]);

  // Handle provisionSandbox → Files tab
  const provisionResult = useMemo(() => {
    if (!latestProvision) return null;
    const payload = getResult(latestProvision);
    if (!payload) return null;
    return { id: getToolCallId(latestProvision), payload };
  }, [latestProvision]);

  useEffect(() => {
    if (!provisionResult) return;
    const { id, payload } = provisionResult;
    const key = `${id}:${payload.status ?? ""}`;
    if (handledProvisionRef.current === key) return;
    handledProvisionRef.current = key;

    if (payload.status === "ready") {
      onSandboxReady();
      onTabChange("files");
    }
  }, [onSandboxReady, onTabChange, provisionResult]);

  // Handle showFile → Files tab + open specific file
  const showFileResult = useMemo(() => {
    if (!latestShowFile) return null;
    const payload = getResult(latestShowFile);
    if (!payload) return null;
    return { id: getToolCallId(latestShowFile), payload };
  }, [latestShowFile]);

  useEffect(() => {
    if (!showFileResult) return;
    const { id, payload } = showFileResult;
    const filePath = payload.path;
    if (typeof filePath !== "string") return;
    const key = `${id}:${filePath}`;
    if (handledShowFileRef.current === key) return;
    handledShowFileRef.current = key;

    onShowFile(filePath);
    onTabChange("files");
  }, [onShowFile, onTabChange, showFileResult]);

  return null;
}
