"use client";

import {
  RuntimeAdapterProvider,
  useAui,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { useMemo, type ReactNode } from "react";

export const threadListAdapter: RemoteThreadListAdapter = {
  async list() {
    const rows = await fetch("/api/threads").then((r) => r.json());
    return {
      threads: rows.map((t: Record<string, unknown>) => ({
        status: t.status as string,
        remoteId: t.id as string,
        title: (t.title as string) ?? undefined,
      })),
    };
  },

  async initialize() {
    const { id } = await fetch("/api/threads", { method: "POST" }).then((r) =>
      r.json(),
    );
    return { remoteId: id, externalId: id };
  },

  async rename(remoteId: string, title: string) {
    await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    });
  },

  async archive(remoteId: string) {
    await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" }),
    });
  },

  async unarchive(remoteId: string) {
    await fetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "regular" }),
    });
  },

  async delete(remoteId: string) {
    await fetch(`/api/threads/${remoteId}`, { method: "DELETE" });
  },

  async fetch(remoteId: string) {
    const t = await fetch(`/api/threads/${remoteId}`).then((r) => r.json());
    return {
      status: t.status as "regular" | "archived",
      remoteId: t.id as string,
      title: (t.title as string) ?? undefined,
    };
  },

  async generateTitle(remoteId, messages) {
    return createAssistantStream(async (controller) => {
      const { title } = await fetch(`/api/threads/${remoteId}/title`, {
        method: "POST",
        body: JSON.stringify({ messages }),
      }).then((r) => r.json());
      controller.appendText(title);
    });
  },

  unstable_Provider({ children }: { children?: ReactNode }) {
    const aui = useAui();
    const history = useMemo<ThreadHistoryAdapter>(
      () => ({
        async load() {
          return { messages: [] };
        },
        async append() {},
        withFormat: (fmt) => ({
          async load() {
            const { remoteId } = aui.threadListItem().getState();
            if (!remoteId) return { messages: [] };
            const rows = await fetch(
              `/api/threads/${remoteId}/messages`,
            ).then((r) => r.json());
            return {
              messages: rows.map((row: Record<string, unknown>) =>
                fmt.decode({
                  id: row.id as string,
                  parent_id: row.parentId as string | null,
                  format: row.format as string,
                  content: row.content as any,
                }),
              ),
            };
          },
          async append(item) {
            const { remoteId } = await aui.threadListItem().initialize();
            await fetch(`/api/threads/${remoteId}/messages`, {
              method: "POST",
              body: JSON.stringify({
                id: fmt.getId(item.message),
                parent_id: item.parentId,
                format: fmt.format,
                content: fmt.encode(item),
              }),
            });
          },
        }),
      }),
      [aui],
    );
    return (
      <RuntimeAdapterProvider adapters={{ history }}>
        {children}
      </RuntimeAdapterProvider>
    );
  },
};
