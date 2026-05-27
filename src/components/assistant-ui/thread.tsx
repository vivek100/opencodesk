"use client";

import {
  AuiIf,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AssistantMessage,
  UserMessage,
} from "@/components/assistant-ui/messages";
import { AssistantComposer } from "@/components/assistant-ui/composer";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { ArrowDownIcon, PlusIcon } from "lucide-react";

type AssistantThreadProps = {
  welcome?: ReactNode;
  composer?: ReactNode;
  onNewThread?: () => void;
  AssistantMessageComponent?: ComponentType;
  UserMessageComponent?: ComponentType;
};

export function Thread({
  welcome,
  composer = <AssistantComposer />,
  onNewThread,
  AssistantMessageComponent = AssistantMessage,
  UserMessageComponent = UserMessage,
}: AssistantThreadProps = {}): ReactNode {
  return (
    <ThreadPrimitive.Root className="@container flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <AdaptiveThreadViewport>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <div className="flex min-h-full flex-1 flex-col">
              {welcome ?? <ThreadWelcome composer={composer} />}
            </div>
          </AuiIf>

          <AuiIf condition={(s) => !s.thread.isEmpty}>
            <div
              className="flex flex-col gap-6 px-1.5 pb-6"
              data-slot="thread-messages"
            >
              <ThreadPrimitive.Messages>
                {({ message }) => {
                  if (message.role === "user") return <UserMessageComponent />;
                  if (message.role === "assistant")
                    return <AssistantMessageComponent />;
                  return null;
                }}
              </ThreadPrimitive.Messages>
            </div>

            <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto flex flex-col overflow-visible rounded-t-xl bg-background pb-4">
              <ThreadScrollToBottom />
              {composer}
            </ThreadPrimitive.ViewportFooter>
          </AuiIf>
        </div>
      </AdaptiveThreadViewport>

      {onNewThread && (
        <div className="flex items-center justify-between px-3 py-1.5">
          <button
            type="button"
            onClick={onNewThread}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
          >
            <PlusIcon className="size-3.5" />
            <span>New thread</span>
          </button>
        </div>
      )}
    </ThreadPrimitive.Root>
  );
}

function AdaptiveThreadViewport({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const messageCount = useAuiState((s) => s.thread.messages.length);
  const isRunning = useAuiState((s) => s.thread.isRunning);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const updateOverflow = () => {
      const nextOverflow = element.scrollHeight > element.clientHeight + 1;
      setIsOverflowing((current) =>
        current === nextOverflow ? current : nextOverflow,
      );
    };

    updateOverflow();

    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(element);

    const animationFrame = requestAnimationFrame(updateOverflow);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [messageCount, isRunning]);

  return (
    <ThreadPrimitive.Viewport
      ref={viewportRef}
      turnAnchor="bottom"
      autoScroll
      scrollToBottomOnRunStart
      scrollToBottomOnInitialize={!isOverflowing}
      scrollToBottomOnThreadSwitch={!isOverflowing}
      className="oc-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto scroll-smooth px-4 pt-4 [scrollbar-gutter:stable]"
    >
      {children}
    </ThreadPrimitive.Viewport>
  );
}

function ThreadScrollToBottom(): ReactNode {
  return (
    <ThreadPrimitive.ScrollToBottom
      render={
        <TooltipIconButton
          tooltip="Scroll to bottom"
          variant="outline"
          className="absolute -top-12 z-10 self-center rounded-full border-border bg-background p-4 hover:bg-muted disabled:invisible"
        />
      }
    >
      <ArrowDownIcon />
    </ThreadPrimitive.ScrollToBottom>
  );
}

function ThreadWelcome({
  composer,
}: {
  composer?: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-1 flex-col justify-center py-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <div className="px-1">
          <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
            OpenCoDesk
          </h1>
          <p className="mt-2 text-muted-foreground text-sm md:text-base">
            Upload files to a shared drive, run analysis across chats, and keep every output where your agent can find it again.
          </p>
        </div>

        {composer}

        <div className="grid gap-2 md:grid-cols-2">
          <ThreadPrimitive.Suggestions>
            {() => <ThreadSuggestion />}
          </ThreadPrimitive.Suggestions>
        </div>
      </div>
    </div>
  );
}

function ThreadSuggestion(): ReactNode {
  return (
    <SuggestionPrimitive.Trigger
      send
      className="flex min-h-20 w-full flex-col items-start justify-start rounded-lg border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <SuggestionPrimitive.Title className="font-medium leading-5" />
      <SuggestionPrimitive.Description className="mt-1 text-muted-foreground text-xs leading-4 empty:hidden" />
    </SuggestionPrimitive.Trigger>
  );
}
