"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuiState } from "@assistant-ui/react";
import {
  ChevronRight,
  ChevronDown,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  RefreshCw,
  Loader2,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileViewer } from "./file-viewer";

type FileEntry = {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  lastModified: string;
};

type TreeNode = FileEntry & {
  children?: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
};

export function FilesTab({
  requestedFilePath,
  onFilePathHandled,
}: {
  requestedFilePath?: string | null;
  onFilePathHandled?: () => void;
}) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const hasLoaded = useRef(false);

  // Track exec tool calls to know when to refresh the tree
  const execCount = useAuiState((state) => {
    const messages = state.thread.messages ?? [];
    let count = 0;
    for (const m of messages) {
      for (const p of m.content as any[]) {
        if (p?.type === "tool-call" && p?.toolName === "exec" && p?.result != null) {
          count++;
        }
      }
    }
    return count;
  });

  const fetchDirectory = useCallback(
    async (path: string): Promise<TreeNode[]> => {
      const res = await fetch(
        `/api/files?path=${encodeURIComponent(path)}`,
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.entries as FileEntry[])
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((entry) => ({
          ...entry,
          isExpanded: false,
        }));
    },
    [],
  );

  const loadRoot = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const entries = await fetchDirectory("/workspace");
      setTree(entries);
      hasLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setIsLoading(false);
    }
  }, [fetchDirectory]);

  // Refresh root lazily after each exec call completes (debounced)
  useEffect(() => {
    if (execCount === 0) return;
    // Small delay so the filesystem has time to sync
    const timer = setTimeout(() => {
      refreshExpandedFolders();
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execCount]);

  // Refresh only expanded folders (lazy incremental update)
  const refreshExpandedFolders = useCallback(async () => {
    const refreshNode = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
      const updated: TreeNode[] = [];
      for (const node of nodes) {
        if (node.isDirectory && node.isExpanded && node.children) {
          const freshChildren = await fetchDirectory(node.path);
          // Preserve expanded state of child folders
          const merged = freshChildren.map((fresh) => {
            const existing = node.children?.find((c) => c.path === fresh.path);
            if (existing?.isDirectory && existing.isExpanded) {
              return { ...fresh, isExpanded: true, children: existing.children };
            }
            return fresh;
          });
          const recursed = await refreshNode(merged);
          updated.push({ ...node, children: recursed });
        } else {
          updated.push(node);
        }
      }
      return updated;
    };

    // Refresh root level
    const freshRoot = await fetchDirectory("/workspace");
    const mergedRoot = freshRoot.map((fresh) => {
      const existing = tree.find((n) => n.path === fresh.path);
      if (existing?.isDirectory && existing.isExpanded) {
        return { ...fresh, isExpanded: true, children: existing.children };
      }
      return fresh;
    });
    const final = await refreshNode(mergedRoot);
    setTree(final);
  }, [fetchDirectory, tree]);

  // Refresh after file upload via composer attachment
  useEffect(() => {
    const handler = () => {
      setTimeout(() => refreshExpandedFolders(), 800);
    };
    window.addEventListener("drive-upload-complete", handler);
    return () => window.removeEventListener("drive-upload-complete", handler);
  }, [refreshExpandedFolders]);

  // Initial load
  useEffect(() => {
    if (!hasLoaded.current) loadRoot();
  }, [loadRoot]);

  // Handle externally requested file path (from showFile tool)
  useEffect(() => {
    if (!requestedFilePath) return;

    const revealAndSelect = async (targetPath: string) => {
      // Ensure root is loaded
      if (!hasLoaded.current) {
        await loadRoot();
      }

      // Build list of ancestor directories to expand
      const parts = targetPath
        .replace(/^\/workspace\/?/, "")
        .split("/")
        .filter(Boolean);
      let currentPath = "/workspace";

      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = `${currentPath}/${parts[i]}`;
        const dirPath = currentPath;
        const children = await fetchDirectory(dirPath);
        setTree((prev) =>
          updateNode(prev, dirPath, (node) => ({
            ...node,
            children,
            isExpanded: true,
            isLoading: false,
          })),
        );
      }

      // Select and load the file
      handleFileClick(targetPath);
      onFilePathHandled?.();
    };

    revealAndSelect(requestedFilePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedFilePath]);

  const toggleFolder = useCallback(
    async (path: string) => {
      setTree((prev) => updateNode(prev, path, (node) => {
        if (node.isExpanded) {
          return { ...node, isExpanded: false };
        }
        return { ...node, isExpanded: true, isLoading: true };
      }));

      const children = await fetchDirectory(path);
      setTree((prev) => updateNode(prev, path, (node) => ({
        ...node,
        children,
        isLoading: false,
        isExpanded: true,
      })));
    },
    [fetchDirectory],
  );

  const handleFileClick = useCallback(
    async (path: string) => {
      setSelectedFile(path);
      setFileLoading(true);
      setFileContent(null);
      try {
        const res = await fetch(
          `/api/files/content?path=${encodeURIComponent(path)}`,
        );
        if (!res.ok) {
          setFileContent(`Error: ${res.statusText}`);
          return;
        }
        const text = await res.text();
        setFileContent(text);
      } catch {
        setFileContent("Error: Failed to load file");
      } finally {
        setFileLoading(false);
      }
    },
    [],
  );

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-destructive text-sm">{error}</p>
        <button
          type="button"
          onClick={loadRoot}
          className="text-muted-foreground text-xs hover:text-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-2">
        <span className="text-muted-foreground text-xs">/workspace</span>
        <button
          type="button"
          onClick={loadRoot}
          disabled={isLoading}
          className="inline-flex size-6 items-center justify-center rounded-sm hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* File tree */}
        <div className="w-56 shrink-0 overflow-y-auto border-r p-1">
          {isLoading && tree.length === 0 ? (
            <div className="flex flex-col gap-1 py-2 px-1">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-1.5 px-1 py-0.5" style={{ paddingLeft: `${(i % 3 > 0 ? 12 : 0) + 4}px` }}>
                  <div className="size-3 shrink-0 animate-pulse rounded-sm bg-muted" />
                  <div className="size-3.5 shrink-0 animate-pulse rounded-sm bg-muted" />
                  <div className="h-3 animate-pulse rounded bg-muted" style={{ width: `${60 + (i * 17) % 50}px` }} />
                </div>
              ))}
            </div>
          ) : tree.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-xs">
              No files yet
            </p>
          ) : (
            <FileTree
              nodes={tree}
              depth={0}
              selectedPath={selectedFile}
              onToggleFolder={toggleFolder}
              onFileClick={handleFileClick}
            />
          )}
        </div>

        {/* File viewer */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {selectedFile ? (
            <div className="flex h-full flex-col">
              <div className="flex h-8 shrink-0 items-center justify-between border-b px-3">
                <span className="truncate text-xs font-mono">
                  {selectedFile.replace("/workspace/", "")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileContent(null);
                  }}
                  className="inline-flex size-5 items-center justify-center rounded-sm hover:bg-muted"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <FileViewer
                  path={selectedFile}
                  content={fileContent}
                  isLoading={fileLoading}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              Select a file to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileTree({
  nodes,
  depth,
  selectedPath,
  onToggleFolder,
  onFileClick,
}: {
  nodes: TreeNode[];
  depth: number;
  selectedPath: string | null;
  onToggleFolder: (path: string) => void;
  onFileClick: (path: string) => void;
}) {
  return (
    <div>
      {nodes.map((node) => (
        <div key={node.path}>
          <button
            type="button"
            onClick={() =>
              node.isDirectory
                ? onToggleFolder(node.path)
                : onFileClick(node.path)
            }
            className={cn(
              "flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left text-xs hover:bg-muted",
              selectedPath === node.path && "bg-muted",
            )}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
          >
            {node.isDirectory ? (
              <>
                {node.isLoading ? (
                  <Loader2 className="size-3 shrink-0 animate-spin" />
                ) : node.isExpanded ? (
                  <ChevronDown className="size-3 shrink-0" />
                ) : (
                  <ChevronRight className="size-3 shrink-0" />
                )}
                {node.isExpanded ? (
                  <FolderOpenIcon className="size-3.5 shrink-0 text-blue-400" />
                ) : (
                  <FolderIcon className="size-3.5 shrink-0 text-blue-400" />
                )}
              </>
            ) : (
              <>
                <span className="size-3 shrink-0" />
                <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
              </>
            )}
            <span className="min-w-0 truncate">{node.name}</span>
          </button>
          {node.isDirectory && node.isExpanded && node.children && (
            <FileTree
              nodes={node.children}
              depth={depth + 1}
              selectedPath={selectedPath}
              onToggleFolder={onToggleFolder}
              onFileClick={onFileClick}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** Immutably update a node in the tree by path */
function updateNode(
  nodes: TreeNode[],
  path: string,
  updater: (node: TreeNode) => TreeNode,
): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === path) return updater(node);
    if (node.children && path.startsWith(node.path + "/")) {
      return { ...node, children: updateNode(node.children, path, updater) };
    }
    return node;
  });
}
