import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const baseUrl = (process.env.OPOS_SMOKE_URL || "https://onpage.localblitz.io/").replace(/\/$/, "");
const localDashboardUrl = (process.env.OPOS_LOCAL_DASHBOARD_URL || "http://127.0.0.1:9191").replace(/\/$/, "");
const coraApiUrl = (process.env.OPOS_CORA_API_URL || "http://127.0.0.1:9090").replace(/\/$/, "");
const email = process.env.OPOS_BRIDGE_VERIFY_EMAIL || "codex-bridge-verify@local.test";
const now = new Date().toISOString();
const expires = new Date(Date.now() + 20 * 60 * 1000).toISOString();
const sessionToken = crypto.randomBytes(32).toString("hex");
const sessionHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");
const testDomain = process.env.OPOS_BRIDGE_TEST_DOMAIN || `codex-bridge-${Date.now()}.localtest`;

function sqlString(value) {
  return String(value ?? "").replaceAll("'", "''");
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const output = [];
    const child = spawn(command, args, {
      cwd: rootDir,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      stdio: options.stdio || "inherit",
    });
    if (options.stdio === "pipe") {
      child.stdout?.on("data", (chunk) => output.push(String(chunk)));
      child.stderr?.on("data", (chunk) => output.push(String(chunk)));
    }
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(output.join(""));
      else {
        const details = output.join("").replaceAll(sessionToken, "[session-token]");
        reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}${details ? `\n${details}` : ""}`));
      }
    });
  });
}

async function cloudFetch(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      cookie: `opos_session=${sessionToken}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${pathname} HTTP ${response.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

async function localFetch(pathname, options = {}) {
  const response = await fetch(`${localDashboardUrl}${pathname}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${pathname} HTTP ${response.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

async function coraDomains() {
  const response = await fetch(`${coraApiUrl}/api/domains`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Cora /api/domains HTTP ${response.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

async function createCommand(commandType, payload) {
  return await cloudFetch("/api/commands", {
    method: "POST",
    body: JSON.stringify({
      command_type: commandType,
      payload,
      created_by: "codex-bridge-verifier",
      force_duplicate: true,
    }),
  });
}

async function pullLocalCommands() {
  return await localFetch("/api/cloudflare/commands/pull", {
    method: "POST",
    body: JSON.stringify({ limit: 25 }),
  });
}

async function setupSession() {
  const setupSql = [
    `INSERT INTO cloud_users (email, name, role, status, client_ids_json, created_at, updated_at) VALUES ('${sqlString(email)}', 'Codex Bridge Verify', 'admin', 'active', NULL, '${sqlString(now)}', '${sqlString(now)}') ON CONFLICT(email) DO UPDATE SET role = 'admin', status = 'active', updated_at = '${sqlString(now)}'`,
    `INSERT OR REPLACE INTO cloud_sessions (user_id, session_hash, expires_at, created_at, last_seen_at) SELECT id, '${sessionHash}', '${sqlString(expires)}', '${sqlString(now)}', NULL FROM cloud_users WHERE email = '${sqlString(email)}'`,
  ].join("; ");
  await run(process.execPath, [wranglerBin, "d1", "execute", "OPOS_DB", "--remote", "--command", setupSql], { stdio: "pipe" });
}

async function cleanupSession() {
  const cleanupSql = [
    `DELETE FROM cloud_sessions WHERE session_hash = '${sessionHash}'`,
    `DELETE FROM cloud_users WHERE email = '${sqlString(email)}'`,
  ].join("; ");
  await run(process.execPath, [wranglerBin, "d1", "execute", "OPOS_DB", "--remote", "--command", cleanupSql], { stdio: "pipe" });
}

async function applyDomainLists() {
  const queued = await createCommand("apply_cora_domain_lists", {
    execution_mode: "local",
    scope: "all",
    sync_before_apply: true,
    limit: 5000,
  });
  const pulled = await pullLocalCommands();
  return { queued: queued.command, pulled };
}

let entryId = null;
let domainAppliedToNative = false;
const steps = [];

try {
  await setupSession();
  steps.push({ step: "temporary admin session", ok: true });

  const createResult = await createCommand("create_cora_domain_entry", {
    execution_mode: "cloud",
    list_type: "tracked",
    value: testDomain,
    notes: "Temporary bridge verification entry",
    scope: "global",
    project_id: null,
    profile_id: null,
  });
  entryId = createResult.command?.result?.entry?.id || null;
  if (!entryId) throw new Error("Cloud domain entry was not created.");
  steps.push({ step: "cloud tracked-domain row created", ok: true, entry_id: entryId });

  const applyResult = await applyDomainLists();
  steps.push({
    step: "local bridge apply command processed",
    ok: applyResult.pulled?.ok === true,
    processed: applyResult.pulled?.processed || 0,
    command_id: applyResult.queued?.id,
  });
  if (applyResult.pulled?.ok !== true) throw new Error(`Bridge apply failed: ${JSON.stringify(applyResult.pulled)}`);

  const domainsAfterApply = await coraDomains();
  const foundAfterApply = (domainsAfterApply.tracked || []).map(String).includes(testDomain);
  steps.push({ step: "native Cora tracked list includes test domain", ok: foundAfterApply });
  if (!foundAfterApply) throw new Error(`Native Cora did not include ${testDomain} after apply.`);
  domainAppliedToNative = true;

  await createCommand("archive_cora_domain_entry", {
    execution_mode: "cloud",
    entry_id: entryId,
  });
  steps.push({ step: "cloud tracked-domain row archived", ok: true, entry_id: entryId });

  const cleanupApply = await applyDomainLists();
  steps.push({
    step: "local bridge cleanup apply processed",
    ok: cleanupApply.pulled?.ok === true,
    processed: cleanupApply.pulled?.processed || 0,
    command_id: cleanupApply.queued?.id,
  });
  if (cleanupApply.pulled?.ok !== true) throw new Error(`Bridge cleanup apply failed: ${JSON.stringify(cleanupApply.pulled)}`);

  const domainsAfterCleanup = await coraDomains();
  const removedAfterCleanup = !(domainsAfterCleanup.tracked || []).map(String).includes(testDomain);
  steps.push({ step: "native Cora tracked list removed test domain", ok: removedAfterCleanup });
  if (!removedAfterCleanup) throw new Error(`Native Cora still includes ${testDomain} after cleanup.`);
  domainAppliedToNative = false;

  console.log(JSON.stringify({ ok: true, test_domain: testDomain, steps }, null, 2));
} finally {
  if (entryId) {
    try {
      await createCommand("archive_cora_domain_entry", {
        execution_mode: "cloud",
        entry_id: entryId,
      });
      if (domainAppliedToNative) await applyDomainLists();
    } catch {
      // Best-effort cleanup; earlier output captures the real failure if any.
    }
  }
  await cleanupSession().catch((error) => {
    console.error(`Temporary session cleanup failed: ${error.message}`);
  });
}
