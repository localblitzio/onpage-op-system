import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const baseUrl = (process.env.OPOS_SMOKE_URL || "https://onpage.localblitz.io/").replace(/\/$/, "");
const localDashboardUrl = (process.env.OPOS_LOCAL_DASHBOARD_URL || "http://127.0.0.1:9191").replace(/\/$/, "");
const email = process.env.OPOS_LIVE_VERIFY_EMAIL || "codex-live-paid-verify@local.test";
const now = new Date().toISOString();
const expires = new Date(Date.now() + 45 * 60 * 1000).toISOString();
const sessionToken = crypto.randomBytes(32).toString("hex");
const sessionHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
const marker = `live-paid-${Date.now()}`;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");

const rankingLimit = Number(process.env.OPOS_LIVE_RANKING_LIMIT || 25);
const requestedProjectId = Number(process.env.OPOS_LIVE_PROJECT_ID || 2);
const requestedTarget = process.env.OPOS_LIVE_TARGET || "radiomobile.com";
const requestedSeed = process.env.OPOS_LIVE_ENTITY_SEED || "fire station alerting system";
const requestedEntityTarget = process.env.OPOS_LIVE_ENTITY_TARGET || "xai:grok-4.3";

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

async function d1(command) {
  return await run(process.execPath, [wranglerBin, "d1", "execute", "OPOS_DB", "--remote", "--command", command], { stdio: "pipe" });
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

async function createCommand(commandType, payload) {
  return await cloudFetch("/api/commands", {
    method: "POST",
    body: JSON.stringify({
      command_type: commandType,
      payload,
      created_by: "codex-live-paid-verifier",
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
    `INSERT INTO cloud_users (email, name, role, status, client_ids_json, created_at, updated_at) VALUES ('${sqlString(email)}', 'Codex Live Paid Verify', 'admin', 'active', NULL, '${sqlString(now)}', '${sqlString(now)}') ON CONFLICT(email) DO UPDATE SET role = 'admin', status = 'active', updated_at = '${sqlString(now)}'`,
    `INSERT OR REPLACE INTO cloud_sessions (user_id, session_hash, expires_at, created_at, last_seen_at) SELECT id, '${sessionHash}', '${sqlString(expires)}', '${sqlString(now)}', NULL FROM cloud_users WHERE email = '${sqlString(email)}'`,
  ].join("; ");
  await d1(setupSql);
}

async function cleanupSession() {
  const cleanupSql = [
    `DELETE FROM cloud_sessions WHERE session_hash = '${sessionHash}'`,
    `DELETE FROM cloud_users WHERE email = '${sqlString(email)}'`,
  ].join("; ");
  await d1(cleanupSql);
}

function parseEntityTarget(value) {
  const raw = String(value || "").trim();
  const parts = raw.split(":");
  const provider = parts.shift()?.trim();
  const model = parts.join(":").trim();
  if (!provider || !model) throw new Error(`Invalid entity target "${raw}". Use provider:model.`);
  return { provider, model };
}

async function selectProjectAndRun() {
  const mirror = await cloudFetch("/api/dashboard/mirror");
  const project = (mirror.clients || []).find((item) => Number(item.id) === requestedProjectId) || (mirror.clients || [])[0];
  if (!project?.id) throw new Error("No cloud client is available for live paid verification.");
  const run = (mirror.runs || []).find((item) => Number(item.project_id || 0) === Number(project.id)) || (mirror.runs || []).find((item) => Number(item.project_id || 0) > 0);
  return { project, run };
}

async function publicText(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  const text = await response.text().catch(() => "");
  if (!response.ok) throw new Error(`${pathname} HTTP ${response.status}: ${text.slice(0, 500)}`);
  return { text, status: response.status, contentType: response.headers.get("content-type") || "" };
}

async function publicHead(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { method: "HEAD" });
  if (!response.ok) throw new Error(`${pathname} HEAD HTTP ${response.status}`);
  return { status: response.status, contentType: response.headers.get("content-type") || "" };
}

async function syncCloudRowsToLocal() {
  const tables = [
    "projects",
    "sites",
    "runs",
    "ranking_snapshots",
    "ranking_snapshot_keywords",
    "ranking_snapshot_pages",
    "ranking_optimization_targets",
    "entity_lsi_batches",
    "entity_lsi_runs",
    "entity_sets",
    "entity_set_terms",
    "share_reports",
  ];
  const result = await queueAndProcess("sync_cloud_to_local", {
    execution_mode: "local",
    tables,
    dry_run: false,
    limit: 5000,
  });
  if (result.pulled?.ok !== true) throw new Error(`Cloud-to-local sync failed: ${JSON.stringify(result.pulled)}`);
  return result;
}

const steps = [];

try {
  await setupSession();
  steps.push({ step: "temporary admin session", ok: true });

  const dashboard = await cloudFetch("/api/dashboard/data");
  const secrets = dashboard.admin?.secret_status || {};
  if (!secrets.dataforseo) throw new Error("Cloud DataForSEO secret is not configured.");
  const entityTarget = parseEntityTarget(requestedEntityTarget);
  const secretKey = entityTarget.provider.toLowerCase().replace("xai", "xai");
  if (!secrets[secretKey]) throw new Error(`Cloud ${entityTarget.provider} secret is not configured.`);
  steps.push({ step: "cloud paid/API secrets configured", ok: true, dataforseo: true, entity_provider: entityTarget.provider, entity_model: entityTarget.model });

  const bridge = await localFetch("/api/cloudflare/bridge");
  if (!bridge.configured || !bridge.enabled) throw new Error(`Local bridge is not ready for sync: ${JSON.stringify(bridge)}`);
  steps.push({ step: "local bridge ready", ok: true, bridge_id: bridge.bridge_id || "" });

  const { project, run } = await selectProjectAndRun();
  steps.push({ step: "selected live verification client", ok: true, project_id: project.id, project_name: project.name || "", run_id: run?.id || null });

  const rankingResult = await createCommand("create_ranking_snapshot", {
    execution_mode: "cloud",
    project_id: Number(project.id),
    target: requestedTarget,
    location_code: 2840,
    language_code: "en",
    limit: rankingLimit,
    include_subdomains: false,
    force_refresh: true,
    dry_run: false,
  });
  const snapshot = rankingResult.command?.result?.snapshot || {};
  const rankingMeta = rankingResult.command?.result?.meta || {};
  if (!snapshot.id) throw new Error(`Live Ranking Snapshot did not create a snapshot: ${JSON.stringify(rankingResult)}`);
  if (!Number(rankingMeta.keyword_count || 0) && !Number(rankingMeta.page_count || 0)) {
    throw new Error(`Live Ranking Snapshot returned no keyword/page data: ${JSON.stringify(rankingMeta)}`);
  }
  steps.push({ step: "live DataForSEO Ranking Snapshot completed", ok: true, snapshot_id: snapshot.id, keyword_count: rankingMeta.keyword_count || 0, page_count: rankingMeta.page_count || 0, errors: rankingMeta.errors || {} });

  const snapshotDetail = await cloudFetch(`/api/ranking-snapshots/${encodeURIComponent(snapshot.id)}/detail`);
  const selectedPage = (snapshotDetail.pages || [])[0];
  const selectedKeyword = (snapshotDetail.keywords || [])[0];
  if (selectedPage?.url) {
    const targetSave = await cloudFetch("/api/optimization-targets", {
      method: "POST",
      body: JSON.stringify({
        snapshot_id: Number(snapshot.id),
        project_id: Number(project.id),
        status: "selected",
        targets: [{
          url: selectedPage.url,
          keyword: selectedKeyword?.keyword || requestedSeed,
          bestPosition: selectedKeyword?.position || null,
          rankingKeywords: selectedPage.organic_keywords || selectedPage.organicKeywords || null,
          opportunityCount: 1,
          totalSearchVolume: selectedKeyword?.search_volume || selectedKeyword?.searchVolume || null,
          estimatedTraffic: selectedKeyword?.estimated_traffic || selectedKeyword?.estimatedTraffic || null,
          pageOrganicTraffic: selectedPage.organic_traffic || selectedPage.organicTraffic || null,
          pageOrganicKeywords: selectedPage.organic_keywords || selectedPage.organicKeywords || null,
          top10: selectedPage.top10 || null,
          priorityType: "live_paid_verification",
          opportunityScore: 50,
          recommendedAction: "Review this live ranking page for on-page optimization opportunities.",
          topKeywords: selectedKeyword ? [{ keyword: selectedKeyword.keyword, position: selectedKeyword.position }] : [],
          notes: `Live paid verification ${marker}.`,
        }],
      }),
    });
    const targetIds = targetSave.saved_ids || (targetSave.targets || []).map((item) => item.id).filter(Boolean);
    steps.push({ step: "live ranking optimization target saved", ok: Boolean(targetIds.length), target_ids: targetIds });
  } else {
    steps.push({ step: "live ranking optimization target skipped", ok: true, reason: "no relevant page row returned" });
  }

  const entityResult = await createCommand("run_entity_lsi", {
    execution_mode: "cloud",
    project_id: Number(project.id),
    seed_keyword: requestedSeed,
    depth: 1,
    targets: [entityTarget],
    run_async: false,
    dry_run: false,
  });
  const batch = entityResult.command?.result?.batch || {};
  const entityRuns = entityResult.command?.result?.runs || [];
  const completeRuns = entityRuns.filter((item) => item.status === "complete");
  if (!batch.id || !completeRuns.length) throw new Error(`Live Entity Explorer did not complete a model run: ${JSON.stringify(entityResult.command?.result || entityResult)}`);
  steps.push({ step: "live Entity Explorer model run completed", ok: true, batch_id: batch.id, completed: completeRuns.length, failed: entityRuns.filter((item) => item.status === "failed").length, provider: entityTarget.provider, model: entityTarget.model });

  const entityDetail = await cloudFetch(`/api/entity-batches/${encodeURIComponent(batch.id)}/detail`);
  const terms = (entityDetail.crossover || []).slice(0, 10);
  if (!terms.length) throw new Error(`Live Entity Explorer batch ${batch.id} returned no crossover terms.`);
  const entitySetSave = await cloudFetch("/api/entity-sets", {
    method: "POST",
    body: JSON.stringify({
      project_id: Number(project.id),
      source_batch_id: Number(batch.id),
      name: `Live paid entity set ${marker}`,
      notes: `Saved from live ${entityTarget.provider}:${entityTarget.model} verification.`,
      terms,
    }),
  });
  const entitySetId = entitySetSave.set?.id;
  if (!entitySetId) throw new Error(`Live Entity Set was not saved: ${JSON.stringify(entitySetSave)}`);
  steps.push({ step: "live Entity Set saved from crossover", ok: true, entity_set_id: entitySetId, terms_saved: entitySetSave.terms_saved });

  await syncCloudRowsToLocal();
  steps.push({ step: "live paid rows synced cloud to local", ok: true });

  await localFetch(`/api/seo/ranking-snapshots/${encodeURIComponent(snapshot.id)}`);
  await localFetch(`/api/entity-lsi/batches/${encodeURIComponent(batch.id)}`);
  await localFetch(`/api/entity-sets/${encodeURIComponent(entitySetId)}`);
  steps.push({ step: "local dashboard can open live ranking/entity results", ok: true });

  let report = null;
  let reportUrl = null;
  if (run?.id) {
    const targetIds = (await cloudFetch(`/api/ranking-snapshots/${encodeURIComponent(snapshot.id)}/detail`)).targets?.map((item) => item.id).filter(Boolean) || [];
    const reportResult = await createCommand("create_share_report", {
      execution_mode: "cloud",
      run_id: Number(run.id),
      level: "medium",
      title: `Live paid tools report ${marker}`,
      notes: "Live paid/API verification report with DataForSEO and Entity Explorer attachments.",
      ranking_snapshot_id: Number(snapshot.id),
      entity_set_id: Number(entitySetId),
      optimization_target_ids: targetIds.slice(0, 5).map(Number),
    });
    report = reportResult.command?.result?.report || null;
    if (!report?.id) throw new Error(`Live attached report metadata was not created: ${JSON.stringify(reportResult)}`);
    await syncCloudRowsToLocal();
    const artifactSync = await queueAndProcess("sync_report_artifacts", {
      execution_mode: "local",
      report_ids: [Number(report.id)],
      dry_run: false,
      force: true,
    });
    const artifactCommand = artifactSync.pulled?.commands?.find((item) => Number(item.command?.id ?? item.id) === Number(artifactSync.queued?.id)) || {};
    const artifacts = artifactCommand.result?.artifacts || {};
    if (artifactSync.pulled?.ok !== true || Number(artifacts.failed || 0) || Number(artifacts.uploaded || 0) + Number(artifacts.skipped || 0) < 2) {
      throw new Error(`Live report artifact sync failed: ${JSON.stringify(artifactSync.pulled)}`);
    }
    const publicReport = await publicText(`/share/report/${encodeURIComponent(report.token)}`);
    const snippets = ["Ranking Snapshot", requestedTarget, "Entity Set", requestedSeed];
    const missing = snippets.filter((snippet) => !publicReport.text.toLowerCase().includes(String(snippet).toLowerCase()));
    if (missing.length) throw new Error(`Live public report missing expected snippets: ${missing.join(", ")}`);
    const xlsx = await publicHead(`/share/report/${encodeURIComponent(report.token)}/download`);
    reportUrl = `${baseUrl}/share/report/${report.token}`;
    steps.push({ step: "live attached public report renders", ok: true, report_id: report.id, report_url: reportUrl, xlsx_type: xlsx.contentType });
  } else {
    steps.push({ step: "live attached report skipped", ok: true, reason: "no cloud Cora run available" });
  }

  console.log(JSON.stringify({
    ok: true,
    marker,
    project_id: Number(project.id),
    ranking_snapshot_id: Number(snapshot.id),
    ranking_keyword_count: Number(rankingMeta.keyword_count || 0),
    ranking_page_count: Number(rankingMeta.page_count || 0),
    entity_batch_id: Number(batch.id),
    entity_set_id: Number(entitySetId),
    report_id: report?.id || null,
    report_url: reportUrl,
    steps,
  }, null, 2));
} finally {
  await cleanupSession().catch((error) => {
    console.error(`Temporary session cleanup failed: ${error.message}`);
  });
}
