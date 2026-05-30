import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const email = process.env.OPOS_SMOKE_EMAIL || "codex-smoke@local.test";
const now = new Date().toISOString();
const expires = new Date(Date.now() + 20 * 60 * 1000).toISOString();
const sessionToken = crypto.randomBytes(32).toString("hex");
const sessionHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");
const smokeScript = path.join(rootDir, "scripts", "smoke-cloud-dashboard.mjs");

function sqlString(value) {
  return String(value ?? "").replaceAll("'", "''");
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      stdio: options.stdio || "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

const setupSql = [
  `INSERT INTO cloud_users (email, name, role, status, client_ids_json, created_at, updated_at) VALUES ('${sqlString(email)}', 'Codex Smoke Test', 'read', 'active', NULL, '${sqlString(now)}', '${sqlString(now)}') ON CONFLICT(email) DO UPDATE SET role = 'read', status = 'active', updated_at = '${sqlString(now)}'`,
  `INSERT OR REPLACE INTO cloud_sessions (user_id, session_hash, expires_at, created_at, last_seen_at) SELECT id, '${sessionHash}', '${sqlString(expires)}', '${sqlString(now)}', NULL FROM cloud_users WHERE email = '${sqlString(email)}'`
].join("; ");

const cleanupSql = [
  `DELETE FROM cloud_sessions WHERE session_hash = '${sessionHash}'`,
  `DELETE FROM cloud_users WHERE email = '${sqlString(email)}'`
].join("; ");

let smokeFailed = null;

try {
  await run(process.execPath, [wranglerBin, "d1", "execute", "OPOS_DB", "--remote", "--command", setupSql], { stdio: "pipe" });
  await run(process.execPath, [smokeScript], { env: { OPOS_SMOKE_SESSION: sessionToken } });
} catch (error) {
  smokeFailed = error;
} finally {
  try {
    await run(process.execPath, [wranglerBin, "d1", "execute", "OPOS_DB", "--remote", "--command", cleanupSql], { stdio: "pipe" });
  } catch (cleanupError) {
    console.error(`Smoke cleanup failed: ${cleanupError.message}`);
    if (!smokeFailed) smokeFailed = cleanupError;
  }
}

if (smokeFailed) {
  console.error(smokeFailed.message);
  process.exit(1);
}
