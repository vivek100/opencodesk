"use client";

import { StreamdownTextPrimitive } from "@assistant-ui/react-streamdown";
import { code } from "@streamdown/code";
import { memo } from "react";
import { streamdownMarkdownComponents } from "@/components/markdown/streamdown-components";

const MarkdownTextImpl = () => {
  return (
    <StreamdownTextPrimitive
      plugins={{ code }}
      shikiTheme={["github-light", "github-dark"]}
      containerClassName="aui-md-assistant"
      components={streamdownMarkdownComponents}
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
