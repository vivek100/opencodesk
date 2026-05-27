"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";

function toAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

export function Canvas({
  status,
  previewUrl,
  error,
}: {
  status: "empty" | "loading" | "ready" | "error";
  previewUrl: string | null;
  error: string | null;
}) {
  const [iframeVersion, setIframeVersion] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const resolvedPreviewUrl = toAbsoluteUrl(previewUrl);
  const canRefresh = !!resolvedPreviewUrl && status === "ready";
  const iframeKey = resolvedPreviewUrl
    ? `${resolvedPreviewUrl}-${iframeVersion}`
    : "empty";

  useEffect(() => {
    setIsPreviewLoading(!!resolvedPreviewUrl);
  }, [resolvedPreviewUrl]);

  const handleRefreshPreview = useCallback(() => {
    setIsPreviewLoading(true);
    setIframeVersion((v) => v + 1);
  }, []);

  return (
    <div className="relative h-full overflow-hidden bg-muted/20">
      {resolvedPreviewUrl && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-md border bg-background/90 p-1 shadow-sm backdrop-blur">
          <a
            href={resolvedPreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-7 items-center justify-center rounded-sm hover:bg-muted"
          >
            <ExternalLink className="size-3.5" />
            <span className="sr-only">Open preview</span>
          </a>
          {canRefresh && (
            <button
              type="button"
              disabled={isPreviewLoading}
              onClick={handleRefreshPreview}
              className="inline-flex size-7 items-center justify-center rounded-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw
                className={
                  isPreviewLoading ? "size-3.5 animate-spin" : "size-3.5"
                }
              />
              <span className="sr-only">Refresh preview</span>
            </button>
          )}
        </div>
      )}

      {resolvedPreviewUrl ? (
        <>
          {isPreviewLoading && (
            <div className="absolute inset-0 z-5 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-muted-foreground text-sm shadow-sm">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading preview...</span>
              </div>
            </div>
          )}
          <iframe
            key={iframeKey}
            title="Sandbox preview"
            src={resolvedPreviewUrl}
            onLoad={() => setIsPreviewLoading(false)}
            className="h-full w-full border-0 bg-white"
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <div className="max-w-md">
            <p className="font-medium text-sm">
              {status === "error" ? "Preview unavailable" : "Waiting for preview"}
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              {error ??
                "The preview will appear after the agent finishes preparing the app."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
