import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const baseUrl = (process.env.OPOS_SMOKE_URL || "https://onpage.localblitz.io/").replace(/\/$/, "");
const localDashboardUrl = (process.env.OPOS_LOCAL_DASHBOARD_URL || "http://127.0.0.1:9191").replace(/\/$/, "");
const coraApiUrl = (process.env.OPOS_CORA_API_URL || "http://127.0.0.1:9090").replace(/\/$/, "");
const email = process.env.OPOS_PROFILE_VERIFY_EMAIL || "codex-profile-verify@local.test";
const now = new Date().toISOString();
const expires = new Date(Date.now() + 20 * 60 * 1000).toISOString();
const sessionToken = crypto.randomBytes(32).toString("hex");
const sessionHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");

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

async function coraProfiles() {
  const response = await fetch(`${coraApiUrl}/api/profiles`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Cora /api/profiles HTTP ${response.status}: ${data.error || JSON.stringify(data)}`);
  if (!Array.isArray(data.profiles)) throw new Error(`Unexpected Cora profile response: ${JSON.stringify(data)}`);
  return data;
}

async function createCommand(commandType, payload) {
  return await cloudFetch("/api/commands", {
    method: "POST",
    body: JSON.stringify({
      command_type: commandType,
      payload,
      created_by: "codex-profile-verifier",
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
    `INSERT INTO cloud_users (email, name, role, status, client_ids_json, created_at, updated_at) VALUES ('${sqlString(email)}', 'Codex Profile Verify', 'admin', 'active', NULL, '${sqlString(now)}', '${sqlString(now)}') ON CONFLICT(email) DO UPDATE SET role = 'admin', status = 'active', updated_at = '${sqlString(now)}'`,
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

async function queueAndProcess(commandType, payload) {
  const queued = await createCommand(commandType, payload);
  const pulled = await pullLocalCommands();
  return { queued: queued.command, pulled };
}

const steps = [];
let createdCloudProfile = false;
let profileId = null;

try {
  await setupSession();
  steps.push({ step: "temporary admin session", ok: true });

  const nativeBefore = await coraProfiles();
  const profileName = process.env.OPOS_PROFILE_VERIFY_NAME || nativeBefore.selected || nativeBefore.profiles[0];
  if (!profileName) throw new Error("Native Cora has no available profiles to verify without creating a new native profile.");
  steps.push({ step: "native Cora profile selected for verification", ok: true, profile_name: profileName, selected_before: nativeBefore.selected || "" });

  const createResult = await createCommand("create_profile", {
    execution_mode: "cloud",
    name: profileName,
    client: "Bridge verification",
    notes: "Created/reused by Cora profile bridge verification",
  });
  profileId = createResult.command?.result?.profile?.id || null;
  createdCloudProfile = !Boolean(createResult.command?.result?.duplicate);
  if (!profileId) throw new Error(`Cloud profile was not created/reused: ${JSON.stringify(createResult)}`);
  steps.push({ step: "cloud profile metadata created or reused", ok: true, profile_id: profileId, duplicate: !createdCloudProfile });

  const syncResult = await queueAndProcess("sync_cloud_to_local", {
    execution_mode: "local",
    tables: ["profiles"],
    dry_run: false,
    limit: 5000,
  });
  steps.push({
    step: "cloud profile metadata synced to local dashboard",
    ok: syncResult.pulled?.ok === true,
    processed: syncResult.pulled?.processed || 0,
    command_id: syncResult.queued?.id,
  });
  if (syncResult.pulled?.ok !== true) throw new Error(`Profile sync command failed: ${JSON.stringify(syncResult.pulled)}`);

  const applyResult = await queueAndProcess("apply_cora_profile", {
    execution_mode: "local",
    profile_id: profileId,
    profile_name: profileName,
  });
  steps.push({
    step: "local bridge apply profile command processed",
    ok: applyResult.pulled?.ok === true,
    processed: applyResult.pulled?.processed || 0,
    command_id: applyResult.queued?.id,
  });
  if (applyResult.pulled?.ok !== true) throw new Error(`Apply profile command failed: ${JSON.stringify(applyResult.pulled)}`);

  const nativeAfterApply = await coraProfiles();
  const selectedAfterApply = nativeAfterApply.selected === profileName;
  steps.push({ step: "native Cora selected profile matches applied profile", ok: selectedAfterApply, selected: nativeAfterApply.selected || "" });
  if (!selectedAfterApply) throw new Error(`Native Cora selected "${nativeAfterApply.selected || ""}" after apply, expected "${profileName}".`);

  const pushResult = await queueAndProcess("push_cora_profile", {
    execution_mode: "local",
    profile_id: profileId,
    profile_name: profileName,
  });
  steps.push({
    step: "local bridge push profile command processed",
    ok: pushResult.pulled?.ok === true,
    processed: pushResult.pulled?.processed || 0,
    command_id: pushResult.queued?.id,
  });
  if (pushResult.pulled?.ok !== true) throw new Error(`Push profile command failed: ${JSON.stringify(pushResult.pulled)}`);

  const nativeAfterPush = await coraProfiles();
  const profileStillExists = nativeAfterPush.profiles.includes(profileName);
  steps.push({ step: "native Cora profile list includes pushed profile", ok: profileStillExists });
  if (!profileStillExists) throw new Error(`Native Cora profile list does not include "${profileName}" after push.`);

  if (createdCloudProfile) {
    const archiveResult = await createCommand("archive_profile", {
      execution_mode: "cloud",
      profile_id: profileId,
    });
    steps.push({ step: "temporary cloud profile metadata archived", ok: true, command_id: archiveResult.command?.id || null });
  } else {
    steps.push({ step: "cloud profile metadata left unchanged", ok: true, reason: "existing profile was reused" });
  }

  console.log(JSON.stringify({ ok: true, profile_name: profileName, profile_id: profileId, steps }, null, 2));
} finally {
  if (createdCloudProfile && profileId) {
    try {
      await createCommand("archive_profile", {
        execution_mode: "cloud",
        profile_id: profileId,
      });
    } catch {
      // Best-effort cleanup; any primary failure is reported before finally.
    }
  }
  await cleanupSession().catch((error) => {
    console.error(`Temporary session cleanup failed: ${error.message}`);
  });
}
