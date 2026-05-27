"use client";

import { CoworkProvider } from "@/runtime/cowork-provider";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";
import { ThreadListSidebar } from "./threadlist-sidebar";
import { Shell } from "./shell/shell";

export function CoworkApp() {
  return (
    <CoworkProvider>
      <SidebarProvider defaultOpen={false}>
        <ThreadListSidebar />
        <SidebarInset className="min-h-0 overflow-hidden">
          <Shell />
        </SidebarInset>
      </SidebarProvider>
    </CoworkProvider>
  );
}
