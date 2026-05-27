import type * as React from "react";
import {
  Sidebar,
  SidebarContent,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/thread-list";
import { ErrorBoundary } from "@/components/error-boundary";

export function ThreadListSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      {...props}
      collapsible="icon"
    >
      <SidebarContent className="p-0">
        <ErrorBoundary fallbackLabel="Thread list failed to load">
          <ThreadList />
        </ErrorBoundary>
      </SidebarContent>
    </Sidebar>
  );
}
