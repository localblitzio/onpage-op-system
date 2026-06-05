import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const baseUrl = (process.env.OPOS_SMOKE_URL || "https://onpage.localblitz.io/").replace(/\/$/, "");
const localDashboardUrl = (process.env.OPOS_LOCAL_DASHBOARD_URL || "http://127.0.0.1:9191").replace(/\/$/, "");
const coraApiUrl = (process.env.OPOS_CORA_API_URL || "http://127.0.0.1:9090").replace(/\/$/, "");
const email = process.env.OPOS_CORA_RUN_VERIFY_EMAIL || "codex-cora-run-verify@local.test";
const now = new Date().toISOString();
const expires = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
const sessionToken = crypto.randomBytes(32).toString("hex");
const sessionHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");
const timeoutMs = Number(process.env.OPOS_CORA_RUN_TIMEOUT_MS || 45 * 60 * 1000);
const pollMs = Number(process.env.OPOS_CORA_RUN_POLL_MS || 15 * 1000);

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
  return await localFetch(pathname);
}

async function coraStatus() {
  const response = await fetch(`${coraApiUrl}/api/status`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Cora /api/status HTTP ${response.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

async function publicStatus(pathname, method = "GET") {
  const response = await fetch(`${baseUrl}${pathname}`, { method });
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    ok: response.ok,
  };
}

async function createCommand(commandType, payload) {
  return await cloudFetch("/api/commands", {
    method: "POST",
    body: JSON.stringify({
      command_type: commandType,
      payload,
      created_by: "codex-cora-run-verifier",
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

async function setupSession() {
  const setupSql = [
    `INSERT INTO cloud_users (email, name, role, status, client_ids_json, created_at, updated_at) VALUES ('${sqlString(email)}', 'Codex Cora Run Verify', 'admin', 'active', NULL, '${sqlString(now)}', '${sqlString(now)}') ON CONFLICT(email) DO UPDATE SET role = 'admin', status = 'active', updated_at = '${sqlString(now)}'`,
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chooseProject(projects) {
  const requestedId = Number(process.env.OPOS_CORA_RUN_PROJECT_ID || 0);
  if (requestedId) return projects.find((project) => Number(project.id) === requestedId);
  return projects.find((project) => /radio mobile/i.test(project.name || "")) || projects.find((project) => project.profile_name && Number(project.keyword_count || 0) > 0) || projects[0];
}

async function projectKeywords(projectId) {
  const detail = await localGet(`/api/projects/${encodeURIComponent(projectId)}`);
  return detail.keywords || detail.project?.keywords || [];
}

async function selectRunPayload() {
  const projectsData = await localGet("/api/projects");
  const project = chooseProject(projectsData.projects || []);
  if (!project?.id) throw new Error("No local client/project is available for Cora run verification.");
  const keywords = await projectKeywords(project.id).catch(() => []);
  const requestedKeyword = process.env.OPOS_CORA_RUN_KEYWORD || "";
  const keywordRow = requestedKeyword
    ? keywords.find((item) => String(item.keyword || "").toLowerCase() === requestedKeyword.toLowerCase())
    : keywords.find((item) => /fire station alerting system/i.test(item.keyword || "")) || keywords[0];
  const keyword = requestedKeyword || keywordRow?.keyword || "fire station alerting system";
  const requestedTarget = process.env.OPOS_CORA_RUN_TARGET_URL || "";
  const targetUrl = requestedTarget || keywordRow?.page_url || keywordRow?.site_domain || project.site_domain || (project.name === "Radio Mobile" ? "https://radiomobile.com" : "");
  const normalizedTarget = /^https?:\/\//i.test(targetUrl) ? targetUrl : `https://${targetUrl}`;
  return {
    project_id: Number(project.id),
    keyword_id: keywordRow?.id ? Number(keywordRow.id) : undefined,
    keyword,
    target_url: normalizedTarget,
    cora_profile: process.env.OPOS_CORA_RUN_PROFILE || project.profile_name || "",
    project_name: project.name || "",
  };
}

async function waitForJob(jobId) {
  const started = Date.now();
  let lastStatus = "";
  while (Date.now() - started < timeoutMs) {
    const detail = await localGet(`/api/jobs/${encodeURIComponent(jobId)}`);
    const job = detail.job || {};
    const status = String(job.status || "");
    const message = String(job.status_message || "");
    if (`${status}:${message}` !== lastStatus) {
      console.log(JSON.stringify({ event: "job_status", job_id: jobId, status, message, progress: job.progress ?? null, action: job.cora_action || "" }));
      lastStatus = `${status}:${message}`;
    }
    if (status === "imported" && job.imported_run_id) return job;
    if (["error", "timeout", "stopped"].includes(status)) {
      throw new Error(`Cora job ${jobId} ended as ${status}: ${message || job.error || "no message"}`);
    }
    await sleep(pollMs);
  }
  throw new Error(`Timed out waiting ${Math.round(timeoutMs / 1000)}s for Cora job ${jobId}.`);
}

async function waitForCloudMirrorRun(runId, jobId) {
  const started = Date.now();
  while (Date.now() - started < 5 * 60 * 1000) {
    const mirror = await cloudFetch("/api/dashboard/mirror");
    const run = (mirror.runs || []).find((item) => Number(item.id) === Number(runId));
    const job = (mirror.jobs || mirror.managed_jobs || []).find((item) => Number(item.id) === Number(jobId));
    const report = (mirror.reports || []).find((item) => Number(item.run_id) === Number(runId));
    if (run && job && report) return { run, job, report };
    await sleep(10 * 1000);
  }
  throw new Error(`Cloud mirror did not show run ${runId}, job ${jobId}, and report within 5 minutes.`);
}

const steps = [];

try {
  await setupSession();
  steps.push({ step: "temporary admin session", ok: true });

  const bridge = await localGet("/api/cloudflare/bridge");
  if (!bridge.configured || !bridge.enabled || !bridge.allow_cora) {
    throw new Error(`Local bridge is not ready for Cora: ${JSON.stringify(bridge)}`);
  }
  steps.push({ step: "local bridge ready", ok: true, bridge_id: bridge.bridge_id || "" });

  const status = await coraStatus();
  if (status.running || status.searchRunning) {
    throw new Error(`Native Cora is already busy: ${JSON.stringify(status)}`);
  }
  steps.push({ step: "native Cora idle", ok: true, checkin: status.checkinStatus || "" });

  await localFetch("/api/jobs/queue", {
    method: "POST",
    body: JSON.stringify({ paused: false, auto_resume: true, stop_after_current: false, reason: "Cloud Cora run verification" }),
  });
  steps.push({ step: "local queue unpaused", ok: true });

  const runPayload = await selectRunPayload();
  if (!runPayload.project_id || !runPayload.keyword || !runPayload.target_url) {
    throw new Error(`Incomplete Cora run payload: ${JSON.stringify(runPayload)}`);
  }
  steps.push({ step: "selected Cora run payload", ok: true, ...runPayload });

  const queued = await createCommand("run_cora", {
    execution_mode: "local",
    project_id: runPayload.project_id,
    keyword_id: runPayload.keyword_id || undefined,
    keyword: runPayload.keyword,
    target_url: runPayload.target_url,
    cora_profile: runPayload.cora_profile,
  });
  const command = queued.command || {};
  steps.push({ step: "cloud Cora command queued", ok: true, command_id: command.id || null });

  const pulled = await pullLocalCommands();
  const localCommand = (pulled.commands || []).find((item) => item.command?.id === command.id) || (pulled.commands || []).at(-1);
  const job = localCommand?.result?.job || {};
  if (!pulled.ok || !job.id) throw new Error(`Local bridge did not create a managed job: ${JSON.stringify(pulled)}`);
  steps.push({ step: "local bridge created managed Cora job", ok: true, command_id: command.id, job_id: job.id });

  const importedJob = await waitForJob(job.id);
  steps.push({ step: "local Cora job imported report", ok: true, job_id: importedJob.id, run_id: importedJob.imported_run_id, report_path: importedJob.report_path || "" });

  const cloud = await waitForCloudMirrorRun(importedJob.imported_run_id, importedJob.id);
  steps.push({ step: "cloud mirror shows completed job/run/report", ok: true, run_id: cloud.run.id, job_id: cloud.job.id, report_id: cloud.report.id });

  const reportUrl = `/share/report/${encodeURIComponent(cloud.report.token)}`;
  const htmlStatus = await publicStatus(reportUrl);
  const xlsxStatus = await publicStatus(`${reportUrl}/download`, "HEAD");
  steps.push({ step: "public cloud report opens", ok: htmlStatus.ok, status: htmlStatus.status, content_type: htmlStatus.contentType });
  if (!htmlStatus.ok) throw new Error(`Public cloud report failed: ${JSON.stringify(htmlStatus)}`);
  steps.push({ step: "public cloud XLSX opens", ok: xlsxStatus.ok, status: xlsxStatus.status, content_type: xlsxStatus.contentType });
  if (!xlsxStatus.ok) throw new Error(`Public cloud XLSX failed: ${JSON.stringify(xlsxStatus)}`);

  console.log(JSON.stringify({
    ok: true,
    command_id: command.id,
    job_id: importedJob.id,
    run_id: importedJob.imported_run_id,
    report_id: cloud.report.id,
    report_url: `${baseUrl}${reportUrl}`,
    xlsx_url: `${baseUrl}${reportUrl}/download`,
    steps,
  }, null, 2));
} finally {
  await cleanupSession().catch((error) => {
    console.error(`Temporary session cleanup failed: ${error.message}`);
  });
}
