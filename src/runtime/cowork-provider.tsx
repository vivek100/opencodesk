"use client";

import { type ReactNode, useEffect } from "react";
import {
  AssistantRuntimeProvider,
  Suggestions,
  useAui,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { threadListAdapter } from "@/lib/thread-adapter";
import { createDriveAttachmentAdapter } from "@/lib/attachment-adapter";

const starterSuggestions = [
  {
    title: "Analyze uploaded sales CSV",
    label: "Create an executive summary",
    prompt:
      "Analyze the uploaded sales CSV in the workspace and create an executive summary with the top revenue drivers, risks, and recommended next actions. Save the report to outputs and show it when complete.",
  },
  {
    title: "Revenue by region",
    label: "Summarize region and product revenue",
    prompt:
      "Use the files in the workspace to calculate revenue by region and product, create a CSV summary in outputs, and show the summary when complete.",
  },
  {
    title: "Quarterly report",
    label: "Create charts and a markdown report",
    prompt:
      "Create charts and a concise markdown report from the workspace data. Put scripts in the work folder and final artifacts in outputs.",
  },
  {
    title: "Find anomalies",
    label: "Inspect data quality and discounts",
    prompt:
      "Inspect the workspace data for anomalies, missing values, and unusual discounts. Save findings and a cleaned dataset in outputs.",
  },
];

export function CoworkProvider({ children }: { children: ReactNode }) {
  const aui = useAui({
    suggestions: Suggestions(starterSuggestions),
  });
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useCoworkChatRuntime,
    adapter: threadListAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} aui={aui}>
      <ThreadIdSync />
      {children}
    </AssistantRuntimeProvider>
  );
}

/**
 * Module-level store for the current thread ID so the attachment adapter
 * can construct session-scoped upload paths.
 */
let _currentThreadId: string | undefined;
export function getCurrentThreadId() {
  return _currentThreadId;
}

function ThreadIdSync() {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  useEffect(() => {
    _currentThreadId = remoteId ?? undefined;
  }, [remoteId]);
  return null;
}

function useCoworkChatRuntime() {
  return useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
    adapters: {
      attachments: createDriveAttachmentAdapter(getCurrentThreadId),
    },
  });
}
