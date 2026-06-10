"use client";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { cn } from "@/lib/utils";
import { streamdownMarkdownComponents } from "./streamdown-components";

export function StreamdownMarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("aui-md-assistant overflow-auto p-4", className)}>
      <Streamdown
        mode="static"
        isAnimating={false}
        parseIncompleteMarkdown={false}
        plugins={{ code }}
        shikiTheme={["github-light", "github-dark"]}
        components={streamdownMarkdownComponents}
      >
        {content}
      </Streamdown>
    </div>
  );
}
