import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const baseUrl = (process.env.OPOS_SMOKE_URL || "https://onpage.localblitz.io/").replace(/\/$/, "");
const localDashboardUrl = (process.env.OPOS_LOCAL_DASHBOARD_URL || "http://127.0.0.1:9191").replace(/\/$/, "");
const email = process.env.OPOS_REPORT_VERIFY_EMAIL || "codex-report-verify@local.test";
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

async function localGet(pathname) {
  const response = await fetch(`${localDashboardUrl}${pathname}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${pathname} HTTP ${response.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

async function publicStatus(pathname, method = "GET") {
  const response = await fetch(`${baseUrl}${pathname}`, { method });
  const contentType = response.headers.get("content-type") || "";
  const contentLength = Number(response.headers.get("content-length") || 0);
  return { status: response.status, contentType, contentLength, ok: response.ok };
}

async function createCommand(commandType, payload) {
  return await cloudFetch("/api/commands", {
    method: "POST",
    body: JSON.stringify({
      command_type: commandType,
      payload,
      created_by: "codex-report-verifier",
      force_duplicate: true,
    }),
  });
}

async function pullLocalCommands(limit = 25) {
  return await localFetch("/api/cloudflare/commands/pull", {
    method: "POST",
    body: JSON.stringify({ limit }),
  });
}

async function queueAndProcess(commandType, payload) {
  const queued = await createCommand(commandType, payload);
  const pulled = await pullLocalCommands();
  return { queued: queued.command, pulled };
}

async function setupSession() {
  const setupSql = [
    `INSERT INTO cloud_users (email, name, role, status, client_ids_json, created_at, updated_at) VALUES ('${sqlString(email)}', 'Codex Report Verify', 'admin', 'active', NULL, '${sqlString(now)}', '${sqlString(now)}') ON CONFLICT(email) DO UPDATE SET role = 'admin', status = 'active', updated_at = '${sqlString(now)}'`,
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

function chooseRun(runs) {
  const requestedRunId = Number(process.env.OPOS_REPORT_VERIFY_RUN_ID || 0);
  if (requestedRunId) return runs.find((run) => Number(run.id) === requestedRunId);
  return runs.find((run) => run.archive_path && Number(run.file_size || 0) > 0 && Number(run.result_count || 0) > 0) || runs[0];
}

const steps = [];

try {
  await setupSession();
  steps.push({ step: "temporary admin session", ok: true });

  const runsData = await localGet("/api/runs");
  const run = chooseRun(runsData.runs || []);
  if (!run?.id) throw new Error("No local Cora run is available for report artifact verification.");
  steps.push({ step: "selected local Cora run", ok: true, run_id: run.id, keyword: run.keyword || "", file_size: run.file_size || 0 });

  const title = process.env.OPOS_REPORT_VERIFY_TITLE || `Codex artifact verification ${Date.now()}`;
  const createResult = await createCommand("create_share_report", {
    execution_mode: "cloud",
    run_id: Number(run.id),
    level: process.env.OPOS_REPORT_VERIFY_LEVEL || "medium",
    title,
    notes: "Temporary report artifact verification.",
    ranking_snapshot_id: null,
    entity_set_id: null,
    optimization_target_ids: [],
  });
  const report = createResult.command?.result?.report || {};
  if (!report.id || !report.token) throw new Error(`Cloud report was not created: ${JSON.stringify(createResult)}`);
  steps.push({ step: "cloud report metadata created", ok: true, report_id: report.id, token: report.token });

  const syncReport = await queueAndProcess("sync_cloud_to_local", {
    execution_mode: "local",
    tables: ["share_reports"],
    dry_run: false,
    limit: 5000,
  });
  steps.push({
    step: "cloud report metadata synced to local dashboard",
    ok: syncReport.pulled?.ok === true,
    processed: syncReport.pulled?.processed || 0,
    command_id: syncReport.queued?.id,
  });
  if (syncReport.pulled?.ok !== true) throw new Error(`Report metadata sync failed: ${JSON.stringify(syncReport.pulled)}`);

  const artifactSync = await queueAndProcess("sync_report_artifacts", {
    execution_mode: "local",
    report_ids: [Number(report.id)],
    dry_run: false,
    force: true,
  });
  const artifactResult = artifactSync.pulled?.commands?.find((item) => item.command?.id === artifactSync.queued?.id)?.result?.artifacts || artifactSync.pulled?.commands?.at(-1)?.result?.artifacts || {};
  const uploaded = Number(artifactResult.uploaded || 0);
  const skipped = Number(artifactResult.skipped || 0);
  const failed = Number(artifactResult.failed || 0);
  steps.push({
    step: "local bridge uploaded report artifacts",
    ok: artifactSync.pulled?.ok === true && failed === 0 && uploaded + skipped >= 2,
    processed: artifactSync.pulled?.processed || 0,
    command_id: artifactSync.queued?.id,
    uploaded,
    skipped,
    failed,
  });
  if (artifactSync.pulled?.ok !== true || failed || uploaded + skipped < 2) {
    throw new Error(`Artifact sync failed or incomplete: ${JSON.stringify(artifactSync.pulled)}`);
  }

  const htmlStatus = await publicStatus(`/share/report/${encodeURIComponent(report.token)}`);
  const xlsxStatus = await publicStatus(`/share/report/${encodeURIComponent(report.token)}/download`, "HEAD");
  steps.push({ step: "public report URL opens", ok: htmlStatus.ok && /html/i.test(htmlStatus.contentType), status: htmlStatus.status, content_type: htmlStatus.contentType });
  if (!htmlStatus.ok || !/html/i.test(htmlStatus.contentType)) throw new Error(`Public report URL failed: ${JSON.stringify(htmlStatus)}`);
  steps.push({ step: "public XLSX download responds", ok: xlsxStatus.ok, status: xlsxStatus.status, content_type: xlsxStatus.contentType, content_length: xlsxStatus.contentLength });
  if (!xlsxStatus.ok) throw new Error(`Public XLSX download failed: ${JSON.stringify(xlsxStatus)}`);

  console.log(JSON.stringify({
    ok: true,
    run_id: run.id,
    report_id: report.id,
    token: report.token,
    report_url: `${baseUrl}/share/report/${report.token}`,
    xlsx_url: `${baseUrl}/share/report/${report.token}/download`,
    steps,
  }, null, 2));
} finally {
  await cleanupSession().catch((error) => {
    console.error(`Temporary session cleanup failed: ${error.message}`);
  });
}
