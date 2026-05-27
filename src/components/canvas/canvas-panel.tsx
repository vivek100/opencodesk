"use client";

import { useState } from "react";
import { Globe, FolderOpen } from "lucide-react";
import { BrowserTab } from "./browser-tab";
import { FilesTab } from "./files-tab";
import { ErrorBoundary } from "@/components/error-boundary";
import { cn } from "@/lib/utils";

export type CanvasTab = "browser" | "files";

export function CanvasPanel({
  activeTab,
  onTabChange,
  browserStatus,
  previewUrl,
  browserError,
  requestedFilePath,
  onFilePathHandled,
}: {
  activeTab: CanvasTab;
  onTabChange: (tab: CanvasTab) => void;
  browserStatus: "empty" | "loading" | "ready" | "error";
  previewUrl: string | null;
  browserError: string | null;
  requestedFilePath?: string | null;
  onFilePathHandled?: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      {/* Tab bar */}
      <div className="flex h-10 shrink-0 items-center gap-1 border-b bg-background px-2">
        <TabButton
          active={activeTab === "browser"}
          onClick={() => onTabChange("browser")}
          icon={<Globe className="size-3.5" />}
          label="Browser"
        />
        <TabButton
          active={activeTab === "files"}
          onClick={() => onTabChange("files")}
          icon={<FolderOpen className="size-3.5" />}
          label="Files"
        />
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1">
        {activeTab === "browser" && (
          <ErrorBoundary fallbackLabel="Browser preview failed to load">
            <BrowserTab
              status={browserStatus}
              previewUrl={previewUrl}
              error={browserError}
            />
          </ErrorBoundary>
        )}
        {activeTab === "files" && (
          <ErrorBoundary fallbackLabel="File tree failed to load">
            <FilesTab
              requestedFilePath={requestedFilePath}
              onFilePathHandled={onFilePathHandled}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
