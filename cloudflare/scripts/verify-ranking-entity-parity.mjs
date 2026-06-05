import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const baseUrl = (process.env.OPOS_SMOKE_URL || "https://onpage.localblitz.io/").replace(/\/$/, "");
const localDashboardUrl = (process.env.OPOS_LOCAL_DASHBOARD_URL || "http://127.0.0.1:9191").replace(/\/$/, "");
const email = process.env.OPOS_RANKING_ENTITY_VERIFY_EMAIL || "codex-ranking-entity-verify@local.test";
const now = new Date().toISOString();
const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
const sessionToken = crypto.randomBytes(32).toString("hex");
const sessionHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
const marker = `codex-parity-${Date.now()}`;
const targetDomain = `${marker}.example.com`;
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
      created_by: "codex-ranking-entity-verifier",
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
    `INSERT INTO cloud_users (email, name, role, status, client_ids_json, created_at, updated_at) VALUES ('${sqlString(email)}', 'Codex Ranking Entity Verify', 'admin', 'active', NULL, '${sqlString(now)}', '${sqlString(now)}') ON CONFLICT(email) DO UPDATE SET role = 'admin', status = 'active', updated_at = '${sqlString(now)}'`,
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

async function ensureCloudProjectAndRun() {
  const mirror = await cloudFetch("/api/dashboard/mirror");
  const run = (mirror.runs || []).find((item) => Number(item.project_id || 0) > 0);
  if (run) return { projectId: Number(run.project_id), runId: Number(run.id), projectName: run.project_name || "" };
  const client = (mirror.clients || [])[0];
  if (client?.id) return { projectId: Number(client.id), runId: null, projectName: client.name || "" };
  const created = await createCommand("create_project", {
    execution_mode: "cloud",
    name: `Codex Parity Client ${Date.now()}`,
    site_domain: "https://example.com",
    notes: "Temporary client created by ranking/entity parity verification.",
  });
  const project = created.command?.result?.project || {};
  if (!project.id) throw new Error(`Could not create fallback cloud client: ${JSON.stringify(created)}`);
  return { projectId: Number(project.id), runId: null, projectName: project.name || "" };
}

async function seedCloudRows(projectId) {
  const overview = {
    target: targetDomain,
    locationCode: 2840,
    languageCode: "en",
    organicKeywords: 3,
    organicTraffic: 145,
    organicTrafficCost: 320,
    rankingDistribution: { top1: 0, top3: 1, top10: 2, top20: 3, top100: 3 },
    dataSource: "DataForSEO Labs",
    dataFreshnessNote: "Verification snapshot seeded without API spend.",
  };
  const entities = [
    { term: "station alerting", relevance_score: 96 },
    { term: "dispatch automation", relevance_score: 88 },
  ];
  const lsi = [
    { term: "firehouse paging", relevance_score: 84 },
    { term: "emergency notification", relevance_score: 82 },
  ];
  const related = [{ term: "first responder alerting", relevance_score: 91 }];
  const questions = [{ question: "How does fire station alerting work?", relevance_score: 79 }];
  const topics = [{ name: "Emergency response workflows", relevance_score: 86 }];
  const sql = `
    INSERT INTO ranking_snapshots
      (project_id, target, location_code, language_code, limit_value, include_subdomains, overview_json, errors_json, source, freshness, created_at)
      VALUES (${Number(projectId)}, '${sqlString(targetDomain)}', 2840, 'en', 100, 0, '${sqlString(JSON.stringify(overview))}', '{}', 'DataForSEO Labs', 'weekly', '${sqlString(now)}');
    INSERT INTO ranking_snapshot_keywords
      (snapshot_id, keyword, ranking_url, position, previous_position, search_volume, cpc, competition, competition_level, keyword_difficulty, estimated_traffic, traffic_cost, serp_features_json, ai_overview_present, ai_overview_reference, intent, last_updated, created_at)
      SELECT id, '${sqlString(marker)} ranking keyword', 'https://${sqlString(targetDomain)}/ranking-page', 7, 9, 1200, 4.25, 0.42, 'medium', 38, 92, 391, '["featured_snippet","ai_overview"]', 1, 0, 'commercial', '${sqlString(now)}', '${sqlString(now)}'
      FROM ranking_snapshots WHERE target = '${sqlString(targetDomain)}' ORDER BY id DESC LIMIT 1;
    INSERT INTO ranking_snapshot_pages
      (snapshot_id, url, organic_keywords, organic_traffic, organic_traffic_cost, top1, top3, top10, top20, top100, paid_keywords, paid_traffic, created_at)
      SELECT id, 'https://${sqlString(targetDomain)}/ranking-page', 11, 145, 320, 0, 1, 2, 3, 11, 0, 0, '${sqlString(now)}'
      FROM ranking_snapshots WHERE target = '${sqlString(targetDomain)}' ORDER BY id DESC LIMIT 1;
    INSERT INTO entity_lsi_batches
      (project_id, seed_keyword, depth, target_count, completed_count, failed_count, status, created_at, updated_at)
      VALUES (${Number(projectId)}, '${sqlString(marker)} entity seed', 3, 2, 2, 0, 'complete', '${sqlString(now)}', '${sqlString(now)}');
    INSERT INTO entity_lsi_runs
      (project_id, batch_id, seed_keyword, depth, api_key_id, provider, model, status, summary, entities_json, lsi_keywords_json, related_keywords_json, questions_json, topics_json, raw_response, error, created_at, completed_at)
      SELECT ${Number(projectId)}, id, '${sqlString(marker)} entity seed', 3, NULL, 'OpenAI', 'verification-model-a', 'complete', 'Verification entity output A', '${sqlString(JSON.stringify(entities))}', '${sqlString(JSON.stringify(lsi))}', '${sqlString(JSON.stringify(related))}', '${sqlString(JSON.stringify(questions))}', '${sqlString(JSON.stringify(topics))}', '{}', NULL, '${sqlString(now)}', '${sqlString(now)}'
      FROM entity_lsi_batches WHERE seed_keyword = '${sqlString(marker)} entity seed' ORDER BY id DESC LIMIT 1;
    INSERT INTO entity_lsi_runs
      (project_id, batch_id, seed_keyword, depth, api_key_id, provider, model, status, summary, entities_json, lsi_keywords_json, related_keywords_json, questions_json, topics_json, raw_response, error, created_at, completed_at)
      SELECT ${Number(projectId)}, id, '${sqlString(marker)} entity seed', 3, NULL, 'Anthropic', 'verification-model-b', 'complete', 'Verification entity output B', '${sqlString(JSON.stringify(entities))}', '${sqlString(JSON.stringify(lsi))}', '${sqlString(JSON.stringify(related))}', '${sqlString(JSON.stringify(questions))}', '${sqlString(JSON.stringify(topics))}', '{}', NULL, '${sqlString(now)}', '${sqlString(now)}'
      FROM entity_lsi_batches WHERE seed_keyword = '${sqlString(marker)} entity seed' ORDER BY id DESC LIMIT 1;
  `;
  await d1(sql);
}

async function findSeededCloudRows() {
  const mirror = await cloudFetch("/api/dashboard/mirror");
  const snapshot = (mirror.snapshots || []).find((item) => item.target === targetDomain);
  const batch = (mirror.entity_batches || []).find((item) => item.seed_keyword === `${marker} entity seed`);
  if (!snapshot?.id || !batch?.id) {
    throw new Error(`Seeded cloud rows were not visible in mirror: snapshot=${snapshot?.id || ""}, batch=${batch?.id || ""}`);
  }
  return { snapshot, batch };
}

async function localHas(pathname, matcher, label) {
  const data = await localFetch(pathname);
  if (!matcher(data)) throw new Error(`${label} was not visible locally at ${pathname}: ${JSON.stringify(data).slice(0, 1000)}`);
  return data;
}

const steps = [];

try {
  await setupSession();
  steps.push({ step: "temporary admin session", ok: true });

  const bridge = await localFetch("/api/cloudflare/bridge");
  if (!bridge.configured || !bridge.enabled) throw new Error(`Local bridge is not ready for sync: ${JSON.stringify(bridge)}`);
  steps.push({ step: "local bridge ready", ok: true, bridge_id: bridge.bridge_id || "" });

  const anchor = await ensureCloudProjectAndRun();
  if (!anchor.projectId) throw new Error("No cloud client is available for parity verification.");
  steps.push({ step: "selected cloud client", ok: true, project_id: anchor.projectId, run_id: anchor.runId, project_name: anchor.projectName });

  await seedCloudRows(anchor.projectId);
  const { snapshot, batch } = await findSeededCloudRows();
  steps.push({ step: "seeded cloud ranking snapshot and entity batch", ok: true, snapshot_id: snapshot.id, batch_id: batch.id });

  const targetSave = await cloudFetch("/api/optimization-targets", {
    method: "POST",
    body: JSON.stringify({
      snapshot_id: Number(snapshot.id),
      project_id: anchor.projectId,
      status: "selected",
      targets: [{
        url: `https://${targetDomain}/ranking-page`,
        keyword: `${marker} ranking keyword`,
        bestPosition: 7,
        rankingKeywords: 11,
        opportunityCount: 3,
        totalSearchVolume: 1200,
        estimatedTraffic: 92,
        pageOrganicTraffic: 145,
        pageOrganicKeywords: 11,
        top10: 2,
        priorityType: "striking_distance",
        opportunityScore: 88,
        recommendedAction: "Improve on-page optimization and internal links to push this page into the top 3.",
        topKeywords: [{ keyword: `${marker} ranking keyword`, position: 7 }],
        notes: "Verification optimization target.",
      }],
    }),
  });
  const targetIds = targetSave.saved_ids || (targetSave.targets || []).map((item) => item.id).filter(Boolean);
  if (!targetIds.length) throw new Error(`Optimization target was not saved: ${JSON.stringify(targetSave)}`);
  steps.push({ step: "cloud optimization target saved", ok: true, target_ids: targetIds });

  const batchDetail = await cloudFetch(`/api/entity-batches/${encodeURIComponent(batch.id)}/detail`);
  const terms = (batchDetail.crossover || []).slice(0, 4);
  if (!terms.length) throw new Error(`No crossover terms available for seeded batch ${batch.id}`);
  const entitySetSave = await cloudFetch("/api/entity-sets", {
    method: "POST",
    body: JSON.stringify({
      project_id: anchor.projectId,
      source_batch_id: Number(batch.id),
      name: `Codex parity entity set ${marker}`,
      notes: "Verification entity set saved from crossover terms.",
      terms,
    }),
  });
  const entitySetId = entitySetSave.set?.id;
  if (!entitySetId) throw new Error(`Entity set was not saved: ${JSON.stringify(entitySetSave)}`);
  steps.push({ step: "cloud entity set saved from crossover", ok: true, entity_set_id: entitySetId, terms_saved: entitySetSave.terms_saved });

  let report = null;
  if (anchor.runId) {
    const reportResult = await createCommand("create_share_report", {
      execution_mode: "cloud",
      run_id: anchor.runId,
      level: "medium",
      title: `Codex parity report ${marker}`,
      notes: "Verification report with Ranking Snapshot, Optimization Targets, and Entity Set attachments.",
      ranking_snapshot_id: Number(snapshot.id),
      entity_set_id: Number(entitySetId),
      optimization_target_ids: targetIds.map(Number),
    });
    report = reportResult.command?.result?.report || null;
    if (!report?.id) throw new Error(`Attached report metadata was not created: ${JSON.stringify(reportResult)}`);
    steps.push({ step: "cloud report metadata created with attachments", ok: true, report_id: report.id, token: report.token });
  } else {
    steps.push({ step: "cloud report metadata skipped", ok: true, reason: "no synced cloud Cora run was available for same-client attachment validation" });
  }

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
  const syncResult = await queueAndProcess("sync_cloud_to_local", {
    execution_mode: "local",
    tables,
    dry_run: false,
    limit: 5000,
  });
  steps.push({
    step: "cloud-created ranking/entity/report rows pulled to local dashboard",
    ok: syncResult.pulled?.ok === true,
    processed: syncResult.pulled?.processed || 0,
    command_id: syncResult.queued?.id,
  });
  if (syncResult.pulled?.ok !== true) throw new Error(`Cloud-to-local sync failed: ${JSON.stringify(syncResult.pulled)}`);

  await localHas(`/api/seo/ranking-snapshots/${encodeURIComponent(snapshot.id)}`, (data) => data.snapshot?.target === targetDomain && (data.keywords || []).length && (data.pages || []).length, "Ranking snapshot detail");
  steps.push({ step: "local ranking snapshot detail has keywords and pages", ok: true, snapshot_id: snapshot.id });

  await localHas(`/api/seo/optimization-targets?snapshot_id=${encodeURIComponent(snapshot.id)}`, (data) => (data.targets || []).some((item) => targetIds.map(String).includes(String(item.id))), "Optimization target");
  steps.push({ step: "local optimization target is visible", ok: true, target_ids: targetIds });

  await localHas(`/api/entity-lsi/batches/${encodeURIComponent(batch.id)}`, (data) => data.batch?.seed_keyword === `${marker} entity seed` && (data.runs || []).length >= 2 && (data.crossover || []).length, "Entity batch crossover");
  steps.push({ step: "local entity batch has model runs and crossover terms", ok: true, batch_id: batch.id });

  await localHas(`/api/entity-sets/${encodeURIComponent(entitySetId)}`, (data) => data.set?.id && (data.terms || []).length >= 1, "Entity set");
  steps.push({ step: "local entity set is visible with terms", ok: true, entity_set_id: entitySetId });

  if (report?.id) {
    const reports = await localFetch(`/api/share-reports?project_id=${encodeURIComponent(anchor.projectId)}`);
    const localReport = (reports.reports || []).find((item) => Number(item.id) === Number(report.id));
    if (!localReport) throw new Error(`Attached report metadata was not visible locally: ${JSON.stringify(reports).slice(0, 1000)}`);
    if (Number(localReport.ranking_snapshot_id || 0) !== Number(snapshot.id) || Number(localReport.entity_set_id || 0) !== Number(entitySetId)) {
      throw new Error(`Local report attachment IDs do not match: ${JSON.stringify(localReport)}`);
    }
    steps.push({ step: "local report metadata retained ranking/entity attachments", ok: true, report_id: report.id });
  }

  console.log(JSON.stringify({
    ok: true,
    marker,
    project_id: anchor.projectId,
    run_id: anchor.runId,
    snapshot_id: snapshot.id,
    target_ids: targetIds,
    entity_batch_id: batch.id,
    entity_set_id: entitySetId,
    report_id: report?.id || null,
    steps,
  }, null, 2));
} finally {
  await cleanupSession().catch((error) => {
    console.error(`Temporary session cleanup failed: ${error.message}`);
  });
}
