/**
 * Blaxel cloud sandbox provisioning.
 *
 * Provides a minimal wrapper around @blaxel/core to:
 * - Provision (or resume) a sandbox for a session
 * - Execute shell commands in the sandbox
 * - Fetch the live preview URL
 *
 * Required env vars:
 *   BL_WORKSPACE=<your-blaxel-workspace>
 *   BL_API_KEY=<your-api-key>
 *
 * Optional:
 *   BL_SANDBOX_TEMPLATE=<image-name>   (defaults to blaxel/node:latest)
 *   BL_REGION=<region>                 (defaults to us-was-1 for Agent Drive)
 *
 * @blaxel/core 0.2.87+ auto-retries transient failures for fs read/list/write
 * and drives.list. App-level retries here are kept only for process.exec
 * (retrying exec could double-run commands) and provisioning APIs.
 */

import blaxelCorePackage from "@blaxel/core/package.json";

const MAX_RETRIES = 3;
const DEFAULT_REGION = "us-was-1";
const WORKSPACE_MOUNT_PATH = "/workspace";

type RetryContext = {
  operation?: string;
  sandboxName?: string;
  driveName?: string;
  region?: string;
};

export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: unknown }).cause;
    return [err.message, errorMessage(cause)].filter(Boolean).join(" ");
  }

  if (err && typeof err === "object") {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  return String(err ?? "");
}

function errorDetails(err: unknown) {
  const typed = err as {
    message?: unknown;
    cause?: { message?: unknown; code?: unknown };
    response?: { data?: unknown; body?: unknown; status?: unknown };
    body?: unknown;
    data?: unknown;
    code?: unknown;
    status_code?: unknown;
    status?: unknown;
  };

  return {
    message: typed?.message,
    causeMessage: typed?.cause?.message,
    causeCode: typed?.cause?.code,
    code: typed?.code,
    status: typed?.status ?? typed?.status_code ?? typed?.response?.status,
    responseBody: typed?.response?.data ?? typed?.response?.body ?? typed?.body ?? typed?.data,
    error: err,
  };
}

function logRetryExhausted(context: RetryContext | undefined, err: unknown) {
  console.error("[blaxel/retry-exhausted]", {
    packageVersion: blaxelCorePackage.version,
    operation: context?.operation,
    sandboxName: context?.sandboxName,
    driveName: context?.driveName,
    region: context?.region,
    timestamp: new Date().toISOString(),
    error: errorDetails(err),
  });
}

async function retryTransient<T>(
  fn: () => Promise<T>,
  context?: RetryContext,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = errorMessage(err);
      const isTransient =
        msg.includes("fetch failed") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("EAI_AGAIN") ||
        msg.includes("socket hang up") ||
        msg.toLowerCase().includes("timeout");
      if (isTransient && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (isTransient) logRetryExhausted(context, err);
      throw err;
    }
  }
  logRetryExhausted(context, lastError);
  throw lastError;
}

/** Retries shell exec only — Blaxel does not auto-retry process.exec. */
const withExecRetry = retryTransient;

/** Retries sandbox/drive provisioning APIs not covered by SDK self-heal. */
const withProvisioningRetry = retryTransient;

async function waitUntilReachable(sb: any, maxWaitMs = 120_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await sb.process.exec({
        command: "true",
        waitForCompletion: true,
        workingDir: "/",
      });
      return;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const msg =
    lastError instanceof Error ? errorMessage(lastError) : String(lastError);
  throw new Error(`Sandbox not reachable after ${maxWaitMs}ms: ${msg}`);
}

async function ensureDriveMounted(
  sb: any,
  driveName: string,
  context: RetryContext,
) {
  const mounts = await sb.drives.list();
  const alreadyMounted = mounts.some(
    (mount: any) =>
      mount?.driveName === driveName && mount?.mountPath === WORKSPACE_MOUNT_PATH,
  );

  if (alreadyMounted) return mounts;

  await withProvisioningRetry(
    () =>
      sb.drives.mount({
        driveName,
        mountPath: WORKSPACE_MOUNT_PATH,
        drivePath: "/",
      }),
    { ...context, operation: "drives.mount" },
  );
  return sb.drives.list();
}

async function resolveDrive(DriveInstance: any, driveName: string, regionHint: string) {
  try {
    return await withProvisioningRetry<any>(
      () => DriveInstance.get(driveName),
      { operation: "drive.get", driveName, region: regionHint },
    );
  } catch (err: any) {
    const status = err?.status ?? err?.status_code ?? err?.response?.status;
    const code = err?.code;
    if (status !== 404 && code !== 404 && code !== "DRIVE_NOT_FOUND") {
      throw err;
    }
  }

  return withProvisioningRetry<any>(
    () =>
      DriveInstance.createIfNotExists({
        name: driveName,
        region: regionHint,
        displayName: "OpenCoDesk Agent Drive",
        labels: { app: "opencodesk" },
      }),
    { operation: "drive.createIfNotExists", driveName, region: regionHint },
  );
}

function logProvisionFailure(context: {
  sandboxName: string;
  driveName?: string;
  region?: string;
  err: unknown;
}) {
  console.error("[sandbox/provision]", {
    packageVersion: blaxelCorePackage.version,
    sandboxName: context.sandboxName,
    driveName: context.driveName,
    region: context.region,
    timestamp: new Date().toISOString(),
    error: errorDetails(context.err),
  });
}

export function toSandboxName(sessionId: string): string {
  const safe = sessionId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `cowork-${safe}`.slice(0, 40).replace(/-+$/g, "");
}

// --- Public Types ---

export type SandboxExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type SandboxExec = (
  command: string,
  cwd?: string,
) => Promise<SandboxExecResult>;

export type ProvisionedSandbox = {
  exec: SandboxExec;
  previewUrl: string;
};

// --- Public API ---

export async function provisionSandbox(
  sessionId: string,
): Promise<ProvisionedSandbox> {
  let SandboxInstance: any;
  let DriveInstance: any;
  try {
    const mod = await import("@blaxel/core");
    SandboxInstance = mod.SandboxInstance;
    DriveInstance = mod.DriveInstance;
  } catch {
    throw new Error(
      "Missing @blaxel/core. Ensure BL_WORKSPACE and BL_API_KEY are set in .env",
    );
  }

  const sandboxName = toSandboxName(sessionId);

  const driveName = process.env.BL_DRIVE_ID;
  const regionHint = process.env.BL_REGION ?? DEFAULT_REGION;
  let region = regionHint;

  try {
    if (!driveName) {
      throw new Error("BL_DRIVE_ID must be set to the Blaxel Drive resource name.");
    }

    const drive = await resolveDrive(DriveInstance, driveName, regionHint);
    region = drive.region ?? drive.spec?.region ?? regionHint;

    const sb = await withProvisioningRetry<any>(() =>
      SandboxInstance.createIfNotExists({
        name: sandboxName,
        image: process.env.BL_SANDBOX_TEMPLATE ?? "blaxel/node:latest",
        region,
        memory: 4096,
        ports: [{ name: "preview", target: 3000, protocol: "HTTP" }],
      }),
      { operation: "sandbox.createIfNotExists", sandboxName, driveName, region },
    );

    await ensureDriveMounted(sb, driveName, { sandboxName, driveName, region });

    await waitUntilReachable(sb);
    await withExecRetry(() =>
      sb.process.exec({
        command: `mkdir -p ${WORKSPACE_MOUNT_PATH}`,
        waitForCompletion: true,
        workingDir: "/",
      }),
      { operation: "sandbox.mkdirWorkspace", sandboxName, driveName, region },
    );

    const preview = await withProvisioningRetry<any>(() =>
      sb.previews.createIfNotExists({
        metadata: { name: "preview" },
        spec: { port: 3000, public: true },
      }),
      { operation: "sandbox.preview.createIfNotExists", sandboxName, driveName, region },
    );
    const previewUrl = preview.spec?.url as string;

    const exec: SandboxExec = async (command: string, cwd = "/workspace") => {
      const result: any = await withExecRetry(() =>
        sb.process.exec({ command, waitForCompletion: true, workingDir: cwd }),
        { operation: "sandbox.exec", sandboxName, driveName, region },
      );
      return {
        stdout: String(result?.stdout ?? ""),
        stderr: String(result?.stderr ?? ""),
        exitCode: result?.exitCode ?? 0,
      };
    };

    return { exec, previewUrl };
  } catch (err) {
    logProvisionFailure({ sandboxName, driveName, region, err });
    throw err;
  }
}

export async function fetchPreviewUrl(sessionId: string): Promise<string> {
  const { SandboxInstance } = await import("@blaxel/core");
  const sb = await SandboxInstance.get(toSandboxName(sessionId));
  const preview = await withProvisioningRetry<any>(() =>
    sb.previews.createIfNotExists({
      metadata: { name: "preview" },
      spec: { port: 3000, public: true },
    }),
    {
      operation: "sandbox.preview.createIfNotExists",
      sandboxName: toSandboxName(sessionId),
      driveName: process.env.BL_DRIVE_ID,
      region: process.env.BL_REGION,
    },
  );
  return preview.spec?.url as string;
}
