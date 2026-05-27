/**
 * First-run setup script for OpenCoDesk.
 *
 * Creates the shared Blaxel Drive and dedicated filesystem sandbox,
 * then persists their names to .env.local.
 *
 * Usage: npm run setup
 *
 * Requires BL_WORKSPACE and BL_API_KEY to be set in .env.local already.
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { resolve } from "path";

const ENV_FILE = resolve(process.cwd(), ".env.local");
const DRIVE_NAME = "opencodesk-drive";
const FS_SANDBOX_NAME = "opencodesk-fs";
const FS_SANDBOX_IMAGE = "blaxel/node:latest";
const MOUNT_PATH = "/workspace";

function loadEnv(): Record<string, string> {
  if (!existsSync(ENV_FILE)) return {};
  const content = readFileSync(ENV_FILE, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return env;
}

function setEnvVar(key: string, value: string) {
  if (!existsSync(ENV_FILE)) {
    writeFileSync(ENV_FILE, `${key}=${value}\n`, "utf-8");
    return;
  }

  const content = readFileSync(ENV_FILE, "utf-8");
  const lines = content.split("\n");
  let found = false;

  const updated = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (found) {
    writeFileSync(ENV_FILE, updated.join("\n"), "utf-8");
  } else {
    appendFileSync(ENV_FILE, `\n${key}=${value}\n`, "utf-8");
  }
}

async function main() {
  console.log("🔧 OpenCoDesk — First-run setup\n");

  const env = loadEnv();

  if (!env.BL_API_KEY || !env.BL_WORKSPACE) {
    console.error(
      "❌ BL_API_KEY and BL_WORKSPACE must be set in .env.local before running setup.",
    );
    console.error("   Copy .env.example to .env.local and fill in your Blaxel credentials.");
    process.exit(1);
  }

  // Set env vars for Blaxel SDK
  process.env.BL_API_KEY = env.BL_API_KEY;
  process.env.BL_WORKSPACE = env.BL_WORKSPACE;

  const { DriveInstance, SandboxInstance } = await import("@blaxel/core");
  const region = env.BL_REGION ?? "us-was-1";

  // 1. Create shared drive
  if (env.BL_DRIVE_ID) {
    console.log(`✓ Drive already configured: ${env.BL_DRIVE_ID}`);
  } else {
    console.log(`  Creating drive "${DRIVE_NAME}" in ${region}...`);
    const drive = await DriveInstance.createIfNotExists({
      name: DRIVE_NAME,
      region,
    });
    setEnvVar("BL_DRIVE_ID", drive.name);
    console.log(`✓ Drive created: ${drive.name}`);
  }

  const driveId = env.BL_DRIVE_ID ?? DRIVE_NAME;

  // 2. Create dedicated filesystem sandbox
  if (env.BL_FS_SANDBOX) {
    console.log(`✓ Filesystem sandbox already configured: ${env.BL_FS_SANDBOX}`);
  } else {
    console.log(`  Creating filesystem sandbox "${FS_SANDBOX_NAME}" in ${region}...`);
    const sb = await SandboxInstance.createIfNotExists({
      name: FS_SANDBOX_NAME,
      image: FS_SANDBOX_IMAGE,
      region,
      memory: 512,
    });
    // Mount the drive to the sandbox
    await sb.drives.mount({
      driveName: driveId,
      mountPath: MOUNT_PATH,
      drivePath: "/",
    });
    setEnvVar("BL_FS_SANDBOX", sb.metadata.name);
    console.log(`✓ Filesystem sandbox created: ${sb.metadata.name}`);
  }

  // 3. Initialize workspace structure and clean legacy flat files
  const fsSandboxName = env.BL_FS_SANDBOX ?? FS_SANDBOX_NAME;
  console.log("  Initializing workspace structure...");
  const fsSb = await SandboxInstance.get(fsSandboxName);

  // Create the top-level directories
  await fsSb.process.exec({ command: "mkdir -p /workspace/sessions /workspace/memory/projects /workspace/memory/entities" });

  // Remove legacy flat files at /workspace root (keep only sessions/ and memory/)
  await fsSb.process.exec({
    command: "find /workspace -maxdepth 1 -not -name sessions -not -name memory -not -path /workspace -delete 2>/dev/null || true",
  });

  console.log("✓ Workspace structure initialized (legacy files cleaned)");

  // 4. Seed memory files
  const { MEMORY_SEED } = await import("../src/lib/memory-seed");
  console.log("  Seeding memory files...");
  for (const [filename, content] of Object.entries(MEMORY_SEED)) {
    await fsSb.process.exec({
      command: `test -f /workspace/memory/${filename} || cat > /workspace/memory/${filename} << 'SEED_EOF'\n${content}\nSEED_EOF`,
    });
  }
  console.log("✓ Memory files seeded (AGENTS.md, index.md, log.md, user.md)");

  console.log("\n✅ Setup complete! You can now run: npm run dev\n");
  console.log("   The agent's exec sandboxes will also mount the same drive at /workspace.");
}

main().catch((err) => {
  console.error("❌ Setup failed:", err.message ?? err);
  process.exit(1);
});
