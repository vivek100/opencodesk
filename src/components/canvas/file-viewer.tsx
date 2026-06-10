"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { StreamdownMarkdownContent } from "@/components/markdown/streamdown-markdown-content";

type FileViewerProps = {
  path: string;
  content: string | null;
  isLoading: boolean;
};

const IMAGE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".ico",
  ".svg",
]);
const PDF_EXTS = new Set([".pdf"]);
const MARKDOWN_EXTS = new Set([".md", ".mdx"]);
const CSV_EXTS = new Set([".csv", ".tsv"]);
const EXCEL_EXTS = new Set([".xlsx", ".xls"]);
const WORD_EXTS = new Set([".docx"]);
const CODE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".css",
  ".scss",
  ".html",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".sh",
  ".bash",
  ".sql",
  ".rs",
  ".go",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".lua",
  ".r",
  ".xml",
  ".graphql",
  ".prisma",
  ".env",
  ".dockerfile",
  ".tf",
  ".hcl",
  ".ini",
  ".conf",
  ".cfg",
  ".txt",
  ".log",
  ".gitignore",
  ".dockerignore",
]);

function getExtension(path: string): string {
  const name = path.split("/").pop() ?? "";
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return name.slice(dotIndex).toLowerCase();
}

function getFileType(
  path: string,
): "image" | "pdf" | "markdown" | "csv" | "excel" | "word" | "code" | "text" {
  const ext = getExtension(path);
  if (IMAGE_EXTS.has(ext)) return "image";
  if (PDF_EXTS.has(ext)) return "pdf";
  if (MARKDOWN_EXTS.has(ext)) return "markdown";
  if (CSV_EXTS.has(ext)) return "csv";
  if (EXCEL_EXTS.has(ext)) return "excel";
  if (WORD_EXTS.has(ext)) return "word";
  if (CODE_EXTS.has(ext)) return "code";
  return "text";
}

export function FileViewer({ path, content, isLoading }: FileViewerProps) {
  const fileType = useMemo(() => getFileType(path), [path]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 text-muted-foreground text-sm">
        <Loader2 className="size-3 animate-spin" />
        Loading...
      </div>
    );
  }

  switch (fileType) {
    case "image":
      return <ImageViewer path={path} />;
    case "pdf":
      return <PdfViewer path={path} />;
    case "markdown":
      return <MarkdownViewer content={content} />;
    case "csv":
      return <CsvViewer content={content} />;
    case "excel":
      return <ExcelViewer path={path} />;
    case "word":
      return <WordViewer path={path} />;
    case "code":
      return <CodeViewer content={content} path={path} />;
    default:
      return (
        <pre className="whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed">
          {content}
        </pre>
      );
  }
}

function ImageViewer({ path }: { path: string }) {
  const src = `/api/files/content?path=${encodeURIComponent(path)}&mode=binary`;
  return (
    <div className="flex h-full items-center justify-center p-4">
      <img
        src={src}
        alt={path.split("/").pop() ?? ""}
        className="max-h-full max-w-full object-contain rounded"
      />
    </div>
  );
}

function PdfViewer({ path }: { path: string }) {
  const src = `/api/files/content?path=${encodeURIComponent(path)}&mode=binary`;
  return <iframe src={src} className="h-full w-full" title="PDF Preview" />;
}

function MarkdownViewer({ content }: { content: string | null }) {
  if (!content) {
    return (
      <pre className="whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed">
        {content}
      </pre>
    );
  }

  return <StreamdownMarkdownContent content={content} />;
}

function CsvViewer({ content }: { content: string | null }) {
  const [rows, setRows] = useState<string[][] | null>(null);

  useEffect(() => {
    if (!content) return;
    import("papaparse").then((Papa) => {
      const result = Papa.default.parse<string[]>(content, {
        skipEmptyLines: true,
      });
      setRows(result.data);
    });
  }, [content]);

  if (!rows) {
    return (
      <pre className="whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed">
        {content}
      </pre>
    );
  }

  const [header, ...body] = rows;

  return (
    <div className="overflow-auto p-2">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="border border-border bg-muted/50 px-2 py-1 text-left font-medium"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="hover:bg-muted/30">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-border px-2 py-1">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExcelViewer({ path }: { path: string }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/files/content?path=${encodeURIComponent(path)}&mode=binary`,
        );
        if (!res.ok) {
          setError(`Failed to load: ${res.statusText}`);
          return;
        }
        const buffer = await res.arrayBuffer();
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buffer, { type: "array" });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
          header: 1,
        });
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Excel");
      }
    };
    load();
  }, [path]);

  if (error) {
    return (
      <div className="p-3 text-destructive text-sm">{error}</div>
    );
  }

  if (!rows) {
    return (
      <div className="flex items-center gap-2 p-3 text-muted-foreground text-sm">
        <Loader2 className="size-3 animate-spin" />
        Loading spreadsheet...
      </div>
    );
  }

  const [header, ...body] = rows;

  return (
    <div className="overflow-auto p-2">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {header?.map((cell, i) => (
              <th
                key={i}
                className="border border-border bg-muted/50 px-2 py-1 text-left font-medium"
              >
                {String(cell ?? "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="hover:bg-muted/30">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-border px-2 py-1">
                  {String(cell ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WordViewer({ path }: { path: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/files/content?path=${encodeURIComponent(path)}&mode=binary`,
        );
        if (!res.ok) {
          setError(`Failed to load: ${res.statusText}`);
          return;
        }
        const buffer = await res.arrayBuffer();
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        setHtml(result.value);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Word document");
      }
    };
    load();
  }, [path]);

  if (error) {
    return <div className="p-3 text-destructive text-sm">{error}</div>;
  }

  if (!html) {
    return (
      <div className="flex items-center gap-2 p-3 text-muted-foreground text-sm">
        <Loader2 className="size-3 animate-spin" />
        Loading document...
      </div>
    );
  }

  return (
    <div
      className="prose prose-sm prose-invert max-w-none p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function CodeViewer({
  content,
  path,
}: {
  content: string | null;
  path: string;
}) {
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const language = useMemo(() => {
    const ext = getExtension(path);
    const langMap: Record<string, string> = {
      ".ts": "typescript",
      ".tsx": "tsx",
      ".js": "javascript",
      ".jsx": "jsx",
      ".py": "python",
      ".css": "css",
      ".scss": "scss",
      ".html": "html",
      ".json": "json",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".toml": "toml",
      ".sh": "bash",
      ".bash": "bash",
      ".sql": "sql",
      ".rs": "rust",
      ".go": "go",
      ".java": "java",
      ".c": "c",
      ".cpp": "cpp",
      ".h": "c",
      ".rb": "ruby",
      ".php": "php",
      ".swift": "swift",
      ".kt": "kotlin",
      ".lua": "lua",
      ".r": "r",
      ".xml": "xml",
      ".graphql": "graphql",
      ".prisma": "prisma",
      ".dockerfile": "dockerfile",
      ".tf": "hcl",
      ".hcl": "hcl",
      ".md": "markdown",
    };
    return langMap[ext] || "text";
  }, [path]);

  useEffect(() => {
    if (!content) return;

    import("shiki")
      .then(async (shiki) => {
        const highlighter = await shiki.createHighlighter({
          themes: ["github-dark"],
          langs: [language],
        });
        const html = highlighter.codeToHtml(content, {
          lang: language,
          theme: "github-dark",
        });
        setHighlighted(html);
        highlighter.dispose();
      })
      .catch(() => {
        setHighlighted(null);
      });
  }, [content, language]);

  if (highlighted) {
    return (
      <div
        className="overflow-auto p-3 text-xs leading-relaxed [&_pre]:!bg-transparent [&_code]:!bg-transparent"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }

  return (
    <pre className="whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed">
      {content}
    </pre>
  );
}
