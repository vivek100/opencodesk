"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuiState } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { CanvasPanel, type CanvasTab } from "@/components/canvas/canvas-panel";
import { CanvasObserver } from "@/components/canvas/canvas-observer";
import { HeaderActions } from "./header-actions";
import { ErrorBoundary } from "@/components/error-boundary";
import { PanelRightOpen, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type BrowserState = {
  status: "empty" | "loading" | "ready" | "error";
  url: string | null;
  error: string | null;
};

export function Shell() {
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [mobileCanvasOpen, setMobileCanvasOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CanvasTab>("files");
  const [requestedFilePath, setRequestedFilePath] = useState<string | null>(
    null,
  );
  const [browser, setBrowser] = useState<BrowserState>({
    status: "empty",
    url: null,
    error: null,
  });

  // Collapse canvas and reset state when switching to a new empty thread
  const messageCount = useAuiState((s) => s.thread.messages.length);
  const threadId = useAuiState((s) => s.threadListItem?.remoteId);

  useEffect(() => {
    if (messageCount === 0) {
      setCanvasVisible(false);
      setActiveTab("files");
      setRequestedFilePath(null);
      setBrowser({ status: "empty", url: null, error: null });
    }
  }, [threadId, messageCount]);

  useEffect(() => {
    if (!canvasVisible) setMobileCanvasOpen(false);
  }, [canvasVisible]);

  const handleCanvasReady = useCallback((url: string) => {
    setBrowser({ status: "ready", url, error: null });
    setCanvasVisible(true);
  }, []);

  const handleCanvasError = useCallback((error: string) => {
    setBrowser({ status: "error", url: null, error });
    setCanvasVisible(true);
  }, []);

  const handleSandboxReady = useCallback(() => {
    setCanvasVisible(true);
  }, []);

  const handleTabChange = useCallback((tab: CanvasTab) => {
    setActiveTab(tab);
  }, []);

  const handleShowFile = useCallback((path: string) => {
    setRequestedFilePath(path);
    setCanvasVisible(true);
  }, []);

  const handleShowDrive = useCallback(() => {
    setCanvasVisible(true);
    setActiveTab("files");
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <CanvasObserver
        onCanvasReady={handleCanvasReady}
        onCanvasError={handleCanvasError}
        onSandboxReady={handleSandboxReady}
        onTabChange={handleTabChange}
        onShowFile={handleShowFile}
      />

      <HeaderActions onShowDrive={handleShowDrive} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section
          className={cn(
            "flex min-h-0 flex-col overflow-hidden",
            canvasVisible
              ? "w-full md:w-[40%] md:min-w-[320px] md:border-r"
              : "flex-1",
          )}
        >
          <ErrorBoundary fallbackLabel="Chat failed to load">
            <Thread />
          </ErrorBoundary>
        </section>

        {canvasVisible && (
          <main className="hidden min-w-0 flex-1 md:block">
            <ErrorBoundary fallbackLabel="Canvas failed to load">
              <CanvasPanel
                activeTab={activeTab}
                onTabChange={handleTabChange}
                browserStatus={browser.status}
                previewUrl={browser.url}
                browserError={browser.error}
                requestedFilePath={requestedFilePath}
                onFilePathHandled={() => setRequestedFilePath(null)}
              />
            </ErrorBoundary>
          </main>
        )}
      </div>

      {canvasVisible && mobileCanvasOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
            <span className="text-sm font-medium">Canvas</span>
            <button
              type="button"
              onClick={() => setMobileCanvasOpen(false)}
              className="inline-flex size-11 items-center justify-center rounded-md hover:bg-muted"
            >
              <XIcon className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <ErrorBoundary fallbackLabel="Canvas failed to load">
              <CanvasPanel
                activeTab={activeTab}
                onTabChange={handleTabChange}
                browserStatus={browser.status}
                previewUrl={browser.url}
                browserError={browser.error}
                requestedFilePath={requestedFilePath}
                onFilePathHandled={() => setRequestedFilePath(null)}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {canvasVisible && !mobileCanvasOpen && (
        <button
          type="button"
          onClick={() => setMobileCanvasOpen(true)}
          className="fixed bottom-4 right-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
        >
          <PanelRightOpen className="size-5" />
        </button>
      )}
    </div>
  );
}
