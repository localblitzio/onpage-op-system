const TABLE_COLUMNS = {
  profiles: ["id", "name", "client", "notes", "created_at", "updated_at"],
  projects: ["id", "profile_id", "name", "client", "site_domain", "notes", "created_at", "updated_at"],
  sites: ["id", "project_id", "domain", "name", "created_at"],
  pages: ["id", "site_id", "url", "title", "created_at"],
  keywords: ["id", "project_id", "site_id", "page_id", "keyword", "intent", "priority", "created_at"],
  runs: ["id", "project_id", "site_id", "page_id", "keyword_id", "keyword", "target_url", "target_domain", "report_date", "imported_at", "source_path", "archive_path", "file_name", "file_size", "sha256", "notes", "status"],
  serp_results: ["id", "run_id", "rank", "title", "url", "host", "is_target"],
  recommendations: ["id", "run_id", "factor_id", "factor", "recommendation", "status", "details", "percent", "pages", "max_value", "min_value", "average"],
  lsi_keywords: ["id", "run_id", "keyword", "spearman", "pearson", "best_of_both", "pages", "max_value", "average", "tracked_value", "deficit"],
  sheet_rows: ["id", "run_id", "sheet", "row_index", "row_json"],
  workbook_rows: ["id", "run_id", "sheet", "row_index", "row_json"],
  managed_jobs: ["id", "project_id", "keyword_id", "keyword", "target_url", "target_domain", "cora_profile", "tool", "status", "status_message", "report_path", "run_id", "started_at", "updated_at", "completed_at", "last_activity_at", "retry_count", "max_retries", "next_retry_at", "stall_detected_at"],
  content_plans: ["id", "project_id", "site_id", "page_id", "keyword_id", "title", "content_type", "intent", "priority", "status", "due_date", "notes", "created_at", "updated_at"],
  entity_lsi_batches: ["id", "project_id", "seed_keyword", "depth", "target_count", "completed_count", "failed_count", "status", "created_at", "updated_at"],
  entity_lsi_runs: ["id", "project_id", "batch_id", "seed_keyword", "depth", "api_key_id", "provider", "model", "status", "summary", "entities_json", "lsi_keywords_json", "related_keywords_json", "questions_json", "topics_json", "raw_response", "error", "created_at", "completed_at"],
  entity_sets: ["id", "project_id", "source_batch_id", "name", "notes", "created_at", "updated_at"],
  entity_set_terms: ["id", "set_id", "term", "normalized", "type", "source_count", "sources_json", "notes", "created_at"],
  share_reports: ["id", "token", "run_id", "level", "title", "notes", "ranking_snapshot_id", "entity_set_id", "optimization_target_ids_json", "created_at", "revoked_at"],
  ranking_snapshots: ["id", "project_id", "target", "location_code", "language_code", "limit_value", "include_subdomains", "overview_json", "errors_json", "source", "freshness", "created_at"],
  ranking_snapshot_keywords: ["id", "snapshot_id", "keyword", "ranking_url", "position", "previous_position", "search_volume", "cpc", "competition", "competition_level", "keyword_difficulty", "estimated_traffic", "traffic_cost", "serp_features_json", "ai_overview_present", "ai_overview_reference", "intent", "last_updated", "created_at"],
  ranking_snapshot_pages: ["id", "snapshot_id", "url", "organic_keywords", "organic_traffic", "organic_traffic_cost", "top1", "top3", "top10", "top20", "top100", "paid_keywords", "paid_traffic", "created_at"],
  ranking_optimization_targets: ["id", "snapshot_id", "project_id", "url", "keyword", "best_position", "ranking_keywords", "opportunity_count", "total_search_volume", "estimated_traffic", "page_organic_traffic", "page_organic_keywords", "top10", "priority_type", "opportunity_score", "recommended_action", "top_keywords_json", "status", "notes", "created_at", "updated_at"]
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0"
    }
  });
}

function text(data, status = 200) {
  return new Response(data, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function requireSyncAuth(request, env) {
  const expected = env.SYNC_TOKEN || "";
  const header = request.headers.get("authorization") || "";
  if (!expected || header !== `Bearer ${expected}`) {
    return false;
  }
  return true;
}

function requireAdminAuth(request, env) {
  const expected = env.ADMIN_TOKEN || env.SYNC_TOKEN || "";
  const header = request.headers.get("authorization") || "";
  return Boolean(expected && header === `Bearer ${expected}`);
}

function requireReadAuth(request, env) {
  const header = request.headers.get("authorization") || "";
  const tokens = [env.READ_TOKEN, env.ADMIN_TOKEN, env.SYNC_TOKEN].filter(Boolean);
  return tokens.some((token) => header === `Bearer ${token}`);
}

const COMMAND_TYPES = new Set(["create_project", "add_keyword", "create_content_plan", "create_share_report", "run_cora"]);

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function decodeBase64(value) {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function cleanArtifactPath(value) {
  const key = String(value || "").trim();
  if (!key || !key.startsWith("reports/") || key.includes("..") || key.includes("\\")) {
    throw new Error("Invalid artifact key");
  }
  return key;
}

function artifactPublicUrl(request, token, artifactType) {
  const url = new URL(request.url);
  const suffix = artifactType === "source_xlsx" ? "/download" : "";
  return `${url.origin}/share/report/${encodeURIComponent(token)}${suffix}`;
}

async function logAudit(request, env, action, objectType, objectId, metadata = {}, actor = "") {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_events
       (actor, action, object_type, object_id, metadata_json, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      actor || "",
      action,
      objectType || "",
      objectId == null ? "" : String(objectId),
      JSON.stringify(metadata || {}),
      request.headers.get("cf-connecting-ip") || "",
      (request.headers.get("user-agent") || "").slice(0, 500),
      new Date().toISOString()
    ).run();
  } catch (_err) {
    // Audit logging must not break report sharing, sync, or command execution.
  }
}

function normalizeRows(table, rows) {
  const columns = TABLE_COLUMNS[table];
  if (!columns) throw new Error(`Unsupported table: ${table}`);
  return rows.map((row) => {
    const item = {};
    for (const column of columns) {
      if (Object.prototype.hasOwnProperty.call(row, column)) item[column] = row[column];
    }
    return item;
  }).filter((row) => row.id !== undefined && row.id !== null);
}

async function upsertRows(db, table, rows) {
  const columns = TABLE_COLUMNS[table];
  const normalized = normalizeRows(table, rows);
  if (!normalized.length) return { table, rows: 0 };
  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns.filter((column) => column !== "id").map((column) => `${column}=excluded.${column}`).join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates}`;
  const statements = normalized.map((row) => db.prepare(sql).bind(...columns.map((column) => row[column] ?? null)));
  await db.batch(statements);
  return { table, rows: normalized.length };
}

async function handleArtifactUpload(request, env) {
  if (!requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json();
  const token = String(payload.token || "").trim();
  const artifactType = String(payload.artifact_type || "").trim();
  const localId = String(payload.local_id || "").trim();
  if (!token || !localId || !["report_html", "source_xlsx"].includes(artifactType)) {
    return json({ ok: false, error: "Invalid artifact metadata" }, 400);
  }
  const r2Key = cleanArtifactPath(payload.r2_key);
  const contentType = String(payload.content_type || "application/octet-stream");
  const fileName = String(payload.file_name || r2Key.split("/").pop() || "artifact");
  const bytes = decodeBase64(payload.content_base64 || "");
  const uploadedAt = new Date().toISOString();
  const publicUrl = artifactPublicUrl(request, token, artifactType);
  await env.REPORTS.put(r2Key, bytes, {
    httpMetadata: { contentType },
    customMetadata: {
      local_id: localId,
      token,
      artifact_type: artifactType,
      sha256: String(payload.sha256 || "")
    }
  });
  await env.DB.prepare(
    `INSERT INTO report_artifacts
     (local_id, share_report_id, run_id, token, artifact_type, file_name, content_type, file_size, sha256, r2_key, public_url, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(local_id) DO UPDATE SET
       share_report_id=excluded.share_report_id,
       run_id=excluded.run_id,
       token=excluded.token,
       artifact_type=excluded.artifact_type,
       file_name=excluded.file_name,
       content_type=excluded.content_type,
       file_size=excluded.file_size,
       sha256=excluded.sha256,
       r2_key=excluded.r2_key,
       public_url=excluded.public_url,
       uploaded_at=excluded.uploaded_at`
  ).bind(
    localId,
    payload.share_report_id ?? null,
    payload.run_id ?? null,
    token,
    artifactType,
    fileName,
    contentType,
    Number(payload.file_size || bytes.byteLength || 0),
    String(payload.sha256 || ""),
    r2Key,
    publicUrl,
    uploadedAt
  ).run();
  await logAudit(request, env, "artifact_upload", "report_artifact", localId, {
    token,
    artifact_type: artifactType,
    file_name: fileName,
    file_size: Number(payload.file_size || bytes.byteLength || 0)
  }, "local-sync");
  return json({ ok: true, local_id: localId, artifact_type: artifactType, r2_key: r2Key, public_url: publicUrl, uploaded_at: uploadedAt });
}

async function artifactStatusData(env) {
  const rows = await env.DB.prepare(
    "SELECT artifact_type, COUNT(*) AS artifact_count, SUM(file_size) AS total_bytes, MAX(uploaded_at) AS last_uploaded_at FROM report_artifacts GROUP BY artifact_type ORDER BY artifact_type"
  ).all();
  return rows.results || [];
}

async function handleArtifactStatus(env) {
  return json({ ok: true, artifacts: await artifactStatusData(env) });
}

async function handleSyncPush(request, env) {
  if (!requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json();
  const table = String(payload.table || "");
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const result = await upsertRows(env.DB, table, rows);
  await env.DB.prepare(
    "INSERT INTO sync_batches (table_name, row_count, source, received_at) VALUES (?, ?, ?, ?)"
  ).bind(table, result.rows, String(payload.source || "local"), new Date().toISOString()).run();
  await logAudit(request, env, "sync_push", table, "", { rows: result.rows, source: String(payload.source || "local") }, "local-sync");
  return json({ ok: true, ...result });
}

async function createCommand(request, env) {
  if (!requireAdminAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json();
  const commandType = String(payload.command_type || "").trim();
  if (!COMMAND_TYPES.has(commandType)) return json({ ok: false, error: "Unsupported command type" }, 400);
  const commandPayload = payload.payload && typeof payload.payload === "object" ? payload.payload : {};
  const commandKeyPayload = { ...commandPayload };
  delete commandKeyPayload.reviewed_at;
  const commandKey = String(payload.command_key || "").trim() || await sha256Hex(`${commandType}:${stableStringify(commandKeyPayload)}`);
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT * FROM cloud_commands WHERE command_key = ?").bind(commandKey).first();
  if (existing && !payload.force_duplicate) {
    await logAudit(request, env, "command_duplicate", "cloud_command", existing.id, {
      command_type: commandType,
      status: existing.status
    }, String(payload.created_by || "cloud-dashboard"));
    return json({ ok: true, duplicate: true, command: normalizeCommand(existing) }, 200);
  }
  const result = await env.DB.prepare(
    "INSERT INTO cloud_commands (command_key, command_type, payload_json, status, created_by, created_at) VALUES (?, ?, ?, 'pending', ?, ?)"
  ).bind(commandKey, commandType, JSON.stringify(commandPayload), String(payload.created_by || "cloud-dashboard"), now).run();
  const command = await env.DB.prepare("SELECT * FROM cloud_commands WHERE id = ?").bind(result.meta.last_row_id).first();
  await logAudit(request, env, "command_created", "cloud_command", command?.id, {
    command_type: commandType,
    command_key: commandKey
  }, String(payload.created_by || "cloud-dashboard"));
  return json({ ok: true, command: normalizeCommand(command) }, 201);
}

function normalizeCommand(row) {
  if (!row) return null;
  let payload = {};
  let result = null;
  try { payload = JSON.parse(row.payload_json || "{}"); } catch (_err) { payload = {}; }
  try { result = row.result_json ? JSON.parse(row.result_json) : null; } catch (_err) { result = row.result_json; }
  return { ...row, payload, result, payload_json: undefined, result_json: undefined };
}

async function listCommands(request, env) {
  if (!requireReadAuth(request, env) && !requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const limit = Math.min(Number(url.searchParams.get("limit") || 100), 250);
  let rows;
  if (status) {
    rows = await env.DB.prepare("SELECT * FROM cloud_commands WHERE status = ? ORDER BY created_at ASC, id ASC LIMIT ?").bind(status, limit).all();
  } else {
    rows = await env.DB.prepare("SELECT * FROM cloud_commands ORDER BY created_at DESC, id DESC LIMIT ?").bind(limit).all();
  }
  return json({ ok: true, commands: (rows.results || []).map(normalizeCommand) });
}

async function updateCommand(request, env, id) {
  if (!requireSyncAuth(request, env) && !requireAdminAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json();
  const status = String(payload.status || "").trim();
  if (!["pending", "claimed", "complete", "failed"].includes(status)) return json({ ok: false, error: "Unsupported command status" }, 400);
  if (status === "pending" && !requireAdminAuth(request, env)) return json({ ok: false, error: "Admin token required to reset commands" }, 403);
  const now = new Date().toISOString();
  if (status === "claimed") {
    await env.DB.prepare("UPDATE cloud_commands SET status = 'claimed', claimed_at = COALESCE(claimed_at, ?) WHERE id = ?").bind(now, id).run();
  } else if (status === "pending") {
    await env.DB.prepare("UPDATE cloud_commands SET status = 'pending', claimed_at = NULL, completed_at = NULL, result_json = NULL, error = NULL WHERE id = ?").bind(id).run();
  } else if (status === "complete" || status === "failed") {
    await env.DB.prepare(
      "UPDATE cloud_commands SET status = ?, result_json = ?, error = ?, completed_at = ? WHERE id = ?"
    ).bind(status, payload.result ? JSON.stringify(payload.result) : null, payload.error ? String(payload.error).slice(0, 2000) : null, now, id).run();
  }
  const row = await env.DB.prepare("SELECT * FROM cloud_commands WHERE id = ?").bind(id).first();
  await logAudit(request, env, `command_${status}`, "cloud_command", id, {
    command_type: row?.command_type,
    error: row?.error || ""
  }, requireSyncAuth(request, env) ? "local-bridge" : "cloud-dashboard");
  return json({ ok: true, command: normalizeCommand(row) });
}

async function bridgeHeartbeat(request, env) {
  if (!requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const payload = await request.json();
  const bridgeId = String(payload.bridge_id || "local-dashboard").trim();
  const now = new Date().toISOString();
  const existing = await env.DB.prepare("SELECT * FROM bridge_heartbeats WHERE bridge_id = ?").bind(bridgeId).first();
  await env.DB.prepare(
    `INSERT INTO bridge_heartbeats
     (bridge_id, status, version, allow_cora, poll_interval, last_poll_at, last_result_json, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(bridge_id) DO UPDATE SET
       status=excluded.status,
       version=excluded.version,
       allow_cora=excluded.allow_cora,
       poll_interval=excluded.poll_interval,
       last_poll_at=excluded.last_poll_at,
       last_result_json=excluded.last_result_json,
       last_seen_at=excluded.last_seen_at`
  ).bind(
    bridgeId,
    String(payload.status || "online"),
    String(payload.version || ""),
    payload.allow_cora ? 1 : 0,
    Number(payload.poll_interval || 0),
    payload.last_poll_at || now,
    payload.last_result ? JSON.stringify(payload.last_result) : null,
    now
  ).run();
  const row = await env.DB.prepare("SELECT * FROM bridge_heartbeats WHERE bridge_id = ?").bind(bridgeId).first();
  if (!existing || String(existing.status || "") !== String(payload.status || "online") || Boolean(existing.allow_cora) !== Boolean(payload.allow_cora)) {
    await logAudit(request, env, "bridge_status", "bridge", bridgeId, {
      status: String(payload.status || "online"),
      allow_cora: Boolean(payload.allow_cora),
      poll_interval: Number(payload.poll_interval || 0)
    }, "local-bridge");
  }
  return json({ ok: true, bridge: normalizeBridge(row) });
}

function normalizeBridge(row) {
  if (!row) return null;
  let lastResult = null;
  try { lastResult = row.last_result_json ? JSON.parse(row.last_result_json) : null; } catch (_err) { lastResult = row.last_result_json; }
  return { ...row, allow_cora: Boolean(row.allow_cora), online: Date.now() - Date.parse(row.last_seen_at || 0) < 120000, last_result: lastResult, last_result_json: undefined };
}

async function bridgeStatus(env) {
  const rows = await env.DB.prepare("SELECT * FROM bridge_heartbeats ORDER BY last_seen_at DESC LIMIT 20").all();
  return (rows.results || []).map(normalizeBridge);
}

function normalizeAuditEvent(row) {
  if (!row) return null;
  let metadata = {};
  try { metadata = row.metadata_json ? JSON.parse(row.metadata_json) : {}; } catch (_err) { metadata = {}; }
  return { ...row, metadata, metadata_json: undefined };
}

async function recentAuditEvents(env, limit = 100) {
  const rows = await env.DB.prepare(
    "SELECT * FROM audit_events ORDER BY created_at DESC, id DESC LIMIT ?"
  ).bind(Math.min(Number(limit || 100), 250)).all();
  return (rows.results || []).map(normalizeAuditEvent);
}

async function syncStatusData(env) {
  const rows = await env.DB.prepare(
    "SELECT table_name, SUM(row_count) AS rows_received, MAX(received_at) AS last_received_at FROM sync_batches GROUP BY table_name ORDER BY table_name"
  ).all();
  return { tables: rows.results || [], artifacts: await artifactStatusData(env) };
}

async function handleStatus(env) {
  return json({ ok: true, ...(await syncStatusData(env)) });
}

async function countTable(env, table) {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first();
  return Number(row?.count || 0);
}

async function handleDashboardData(request, env) {
  if (!requireReadAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const [profiles, projects, keywords, runs, reports, rankingSnapshots, targets, pendingCommands, bridges, artifacts, sync] = await Promise.all([
    countTable(env, "profiles"),
    countTable(env, "projects"),
    countTable(env, "keywords"),
    countTable(env, "runs"),
    countTable(env, "share_reports"),
    countTable(env, "ranking_snapshots"),
    countTable(env, "ranking_optimization_targets"),
    env.DB.prepare("SELECT COUNT(*) AS count FROM cloud_commands WHERE status IN ('pending', 'claimed')").first().then((row) => Number(row?.count || 0)),
    bridgeStatus(env),
    artifactStatusData(env),
    syncStatusData(env)
  ]);
  const recentReports = await env.DB.prepare(
    `SELECT sr.id, sr.token, sr.run_id, sr.level, sr.title, sr.notes, sr.created_at,
            r.keyword, r.target_url, r.target_domain, r.imported_at, r.file_name,
            p.id AS project_id, p.name AS project_name, p.client AS client_name, p.site_domain,
            a.artifact_count, a.total_bytes, a.last_uploaded_at, a.cloud_url
     FROM share_reports sr
     LEFT JOIN runs r ON r.id = sr.run_id
     LEFT JOIN projects p ON p.id = r.project_id
     LEFT JOIN (
       SELECT token,
              COUNT(*) AS artifact_count,
              SUM(file_size) AS total_bytes,
              MAX(uploaded_at) AS last_uploaded_at,
              MAX(CASE WHEN artifact_type = 'report_html' THEN public_url END) AS cloud_url
       FROM report_artifacts
       GROUP BY token
     ) a ON a.token = sr.token
     WHERE sr.revoked_at IS NULL
     ORDER BY sr.created_at DESC, sr.id DESC
     LIMIT 150`
  ).all();
  const clientRows = await env.DB.prepare(
    `SELECT p.id, p.name, p.client, p.site_domain,
            (SELECT COUNT(*) FROM keywords k WHERE k.project_id = p.id) AS keyword_count,
            (SELECT COUNT(*) FROM runs r WHERE r.project_id = p.id) AS run_count,
            (SELECT COUNT(*) FROM ranking_snapshots rs WHERE rs.project_id = p.id) AS snapshot_count,
            (SELECT COUNT(*) FROM ranking_optimization_targets rot WHERE rot.project_id = p.id) AS target_count
     FROM projects p
     ORDER BY p.updated_at DESC, p.id DESC
     LIMIT 50`
  ).all();
  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    worker_url: new URL(request.url).origin,
    counts: { profiles, projects, keywords, runs, reports, ranking_snapshots: rankingSnapshots, ranking_optimization_targets: targets, pending_commands: pendingCommands },
    artifacts,
    sync,
    bridges,
    reports: recentReports.results || [],
    clients: clientRows.results || []
  });
}

async function handleDashboardMirrorData(request, env) {
  if (!requireReadAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
  const overview = await handleDashboardData(request, env).then((response) => response.json());
  const [runs, jobs, snapshots, targets, entityBatches, entityRuns, entitySets, contentPlans, commands, audits] = await Promise.all([
    env.DB.prepare(
      `SELECT r.id, r.keyword, r.target_url, r.target_domain, r.imported_at, r.file_name, r.status,
              p.name AS project_name,
              (SELECT COUNT(*) FROM recommendations rec WHERE rec.run_id = r.id) AS recommendation_count,
              (SELECT COUNT(*) FROM lsi_keywords lsi WHERE lsi.run_id = r.id) AS lsi_count,
              (SELECT COUNT(*) FROM serp_results sr WHERE sr.run_id = r.id) AS serp_count
       FROM runs r
       LEFT JOIN projects p ON p.id = r.project_id
       ORDER BY r.imported_at DESC, r.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT j.id, j.keyword, j.target_url, j.target_domain, j.cora_profile, j.tool, j.status,
              j.status_message, j.started_at, j.updated_at, j.completed_at, j.last_activity_at,
              p.name AS project_name
       FROM managed_jobs j
       LEFT JOIN projects p ON p.id = j.project_id
       ORDER BY j.started_at DESC, j.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT rs.id, rs.project_id, rs.target, rs.location_code, rs.language_code, rs.limit_value,
              rs.include_subdomains, rs.source, rs.freshness, rs.created_at,
              p.name AS project_name,
              (SELECT COUNT(*) FROM ranking_snapshot_keywords rsk WHERE rsk.snapshot_id = rs.id) AS keyword_count,
              (SELECT COUNT(*) FROM ranking_snapshot_pages rsp WHERE rsp.snapshot_id = rs.id) AS page_count,
              (SELECT COUNT(*) FROM ranking_optimization_targets rot WHERE rot.snapshot_id = rs.id) AS target_count
       FROM ranking_snapshots rs
       LEFT JOIN projects p ON p.id = rs.project_id
       ORDER BY rs.created_at DESC, rs.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT rot.id, rot.snapshot_id, rot.project_id, rot.url, rot.keyword, rot.best_position,
              rot.ranking_keywords, rot.opportunity_count, rot.total_search_volume, rot.estimated_traffic,
              rot.priority_type, rot.opportunity_score, rot.recommended_action, rot.status, rot.updated_at,
              p.name AS project_name
       FROM ranking_optimization_targets rot
       LEFT JOIN projects p ON p.id = rot.project_id
       ORDER BY rot.opportunity_score DESC, rot.updated_at DESC, rot.id DESC
       LIMIT 150`
    ).all(),
    env.DB.prepare(
      `SELECT b.id, b.project_id, b.seed_keyword, b.depth, b.target_count, b.completed_count,
              b.failed_count, b.status, b.created_at, b.updated_at, p.name AS project_name
       FROM entity_lsi_batches b
       LEFT JOIN projects p ON p.id = b.project_id
       ORDER BY b.created_at DESC, b.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT r.id, r.project_id, r.batch_id, r.seed_keyword, r.depth, r.provider, r.model,
              r.status, r.summary, r.error, r.created_at, r.completed_at, p.name AS project_name
       FROM entity_lsi_runs r
       LEFT JOIN projects p ON p.id = r.project_id
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 150`
    ).all(),
    env.DB.prepare(
      `SELECT es.id, es.project_id, es.source_batch_id, es.name, es.notes, es.created_at, es.updated_at,
              p.name AS project_name,
              (SELECT COUNT(*) FROM entity_set_terms est WHERE est.set_id = es.id) AS term_count
       FROM entity_sets es
       LEFT JOIN projects p ON p.id = es.project_id
       ORDER BY es.updated_at DESC, es.id DESC
       LIMIT 100`
    ).all(),
    env.DB.prepare(
      `SELECT cp.id, cp.project_id, cp.title, cp.content_type, cp.intent, cp.priority, cp.status,
              cp.due_date, cp.notes, cp.created_at, cp.updated_at, p.name AS project_name, k.keyword
       FROM content_plans cp
       LEFT JOIN projects p ON p.id = cp.project_id
       LEFT JOIN keywords k ON k.id = cp.keyword_id
       ORDER BY cp.updated_at DESC, cp.id DESC
       LIMIT 150`
    ).all(),
    env.DB.prepare("SELECT * FROM cloud_commands ORDER BY created_at DESC, id DESC LIMIT 100").all(),
    recentAuditEvents(env, 120)
  ]);
  return json({
    ...overview,
    runs: runs.results || [],
    jobs: jobs.results || [],
    snapshots: snapshots.results || [],
    targets: targets.results || [],
    entity_batches: entityBatches.results || [],
    entity_runs: entityRuns.results || [],
    entity_sets: entitySets.results || [],
    content_plans: contentPlans.results || [],
    commands: (commands.results || []).map(normalizeCommand),
    audit_events: audits
  });
}

function cloudDashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>On Page Optimization System</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0d1117;
      --panel: #151b23;
      --panel-soft: #1d2630;
      --line: #303b47;
      --text: #edf2f7;
      --muted: #9aa8b8;
      --accent: #4db6ac;
      --accent-strong: #6ee7dc;
      --danger: #ff7b72;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.45 Inter, Segoe UI, Arial, sans-serif; }
    header { border-bottom: 1px solid var(--line); background: #111821; padding: 18px 22px; }
    header h1 { margin: 0; font-size: 22px; letter-spacing: 0; }
    header p { margin: 4px 0 0; color: var(--muted); }
    main { padding: 18px 22px 32px; max-width: 1400px; margin: 0 auto; }
    .grid { display: grid; gap: 12px; }
    .cards { grid-template-columns: repeat(4, minmax(140px, 1fr)); margin-bottom: 16px; }
    .card, section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; }
    .card { padding: 14px; }
    .card strong { display: block; font-size: 26px; }
    .card span, .muted { color: var(--muted); }
    .sections { grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr); align-items: start; }
    section { overflow: hidden; }
    .section-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 14px 14px 10px; border-bottom: 1px solid var(--line); }
    h2 { font-size: 16px; margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { color: var(--muted); font-size: 12px; font-weight: 600; background: var(--panel-soft); }
    td a { color: var(--accent-strong); text-decoration: none; }
    td a:hover { text-decoration: underline; }
    .pill { display: inline-block; border: 1px solid var(--line); border-radius: 999px; padding: 2px 7px; color: var(--muted); font-size: 12px; }
    .ok { color: var(--accent-strong); }
    .warn { color: var(--danger); }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; }
    button { background: var(--accent); border: 0; border-radius: 6px; color: #061312; cursor: pointer; font-weight: 700; padding: 8px 10px; }
    button.secondary { background: var(--panel-soft); color: var(--accent-strong); border: 1px solid var(--line); }
    .status-list { padding: 12px; display: grid; gap: 8px; }
    .status-row { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
    .status-row:last-child { border-bottom: 0; padding-bottom: 0; }
    .empty { padding: 18px; color: var(--muted); }
    @media (max-width: 900px) { .cards, .sections { grid-template-columns: 1fr; } th:nth-child(3), td:nth-child(3) { display: none; } }
  </style>
</head>
<body>
  <header>
    <h1>On Page Optimization System</h1>
    <p>Cloud dashboard backed by Cloudflare D1 and R2. Cora desktop automation still runs on the local Windows machine.</p>
  </header>
  <main>
    <div id="app"><div class="empty">Loading cloud dashboard...</div></div>
  </main>
  <script>
    const fmtNum = (value) => Number(value || 0).toLocaleString();
    const fmtDate = (value) => value ? new Date(value).toLocaleString() : "";
    const fmtBytes = (value) => {
      let size = Number(value || 0);
      const units = ["B", "KB", "MB", "GB"];
      let i = 0;
      while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; }
      return size.toLocaleString(undefined, { maximumFractionDigits: i ? 1 : 0 }) + " " + units[i];
    };
    const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const reportUrl = (token) => "/share/report/" + encodeURIComponent(token);
    const downloadUrl = (token) => reportUrl(token) + "/download";
    function render(data) {
      const counts = data.counts || {};
      const artifactBytes = (data.artifacts || []).reduce((sum, row) => sum + Number(row.total_bytes || 0), 0);
      const artifactFiles = (data.artifacts || []).reduce((sum, row) => sum + Number(row.artifact_count || 0), 0);
      const lastSync = (data.sync?.tables || []).map((row) => row.last_received_at).filter(Boolean).sort().pop();
      const cards = [
        ["Clients", counts.projects],
        ["Keywords", counts.keywords],
        ["Cora Runs", counts.runs],
        ["Reports", counts.reports],
        ["Ranking Snapshots", counts.ranking_snapshots],
      ["Optimization Targets", counts.ranking_optimization_targets],
        ["Pending Commands", counts.pending_commands],
        ["Cloud Files", artifactFiles],
        ["R2 Storage", fmtBytes(artifactBytes)]
      ].map(([label, value]) => '<div class="card"><strong>' + esc(typeof value === "number" ? fmtNum(value) : value) + '</strong><span>' + esc(label) + '</span></div>').join("");
      const reports = (data.reports || []).map((report) => '<tr>'
        + '<td><strong>' + esc(report.title || report.keyword || "Cora Report") + '</strong><br><span class="muted">' + esc(report.project_name || "") + '</span></td>'
        + '<td>' + esc(report.level || "") + '</td>'
        + '<td>' + esc(fmtDate(report.created_at)) + '</td>'
        + '<td><span class="pill">' + esc(fmtNum(report.artifact_count || 0)) + ' files</span><br><span class="muted">' + esc(fmtBytes(report.total_bytes || 0)) + '</span></td>'
        + '<td><a href="' + reportUrl(report.token) + '" target="_blank" rel="noopener">Open</a><br><a href="' + downloadUrl(report.token) + '">XLSX</a></td>'
        + '</tr>').join("");
      const clients = (data.clients || []).map((client) => '<tr>'
        + '<td><strong>' + esc(client.name || "") + '</strong><br><span class="muted">' + esc(client.site_domain || client.client || "") + '</span></td>'
        + '<td>' + esc(fmtNum(client.keyword_count)) + '</td>'
        + '<td>' + esc(fmtNum(client.run_count)) + '</td>'
        + '<td>' + esc(fmtNum(client.snapshot_count)) + '</td>'
        + '<td>' + esc(fmtNum(client.target_count)) + '</td>'
        + '</tr>').join("");
      const syncRows = (data.sync?.tables || []).slice(-12).map((row) => '<div class="status-row"><span>' + esc(row.table_name) + '</span><strong>' + esc(fmtNum(row.rows_received)) + '</strong></div>').join("");
      const artifactRows = (data.artifacts || []).map((row) => '<div class="status-row"><span>' + esc(row.artifact_type) + '</span><strong>' + esc(fmtNum(row.artifact_count)) + ' / ' + esc(fmtBytes(row.total_bytes)) + '</strong></div>').join("");
      document.getElementById("app").innerHTML = '<div class="grid cards">' + cards + '</div>'
        + '<div class="grid sections">'
        + '<section><div class="section-head"><div><h2>Cloud Cora Reports</h2><div class="muted">Synced customer report pages and source XLSX files.</div></div><div class="toolbar"><button onclick="location.reload()">Refresh</button></div></div>'
        + (reports ? '<table><thead><tr><th>Report</th><th>Level</th><th>Created</th><th>Files</th><th></th></tr></thead><tbody>' + reports + '</tbody></table>' : '<div class="empty">No cloud reports synced yet.</div>') + '</section>'
        + '<section><div class="section-head"><div><h2>Production Status</h2><div class="muted">Last data sync: ' + esc(fmtDate(lastSync) || "Never") + '</div></div><span class="pill ok">Live</span></div>'
        + '<div class="status-list">' + (artifactRows || '<div class="muted">No artifacts yet.</div>') + '</div>'
        + '<div class="section-head"><h2>Recent Sync Tables</h2></div><div class="status-list">' + (syncRows || '<div class="muted">No sync batches yet.</div>') + '</div></section>'
        + '<section><div class="section-head"><h2>Clients</h2></div>'
        + (clients ? '<table><thead><tr><th>Client</th><th>Keywords</th><th>Runs</th><th>Snapshots</th><th>Targets</th></tr></thead><tbody>' + clients + '</tbody></table>' : '<div class="empty">No clients synced yet.</div>') + '</section>'
        + '</div>';
    }
    fetch("/api/dashboard/data").then((r) => r.json()).then(render).catch((error) => {
      document.getElementById("app").innerHTML = '<div class="empty warn">Failed to load cloud dashboard: ' + esc(error.message || error) + '</div>';
    });
  </script>
</body>
</html>`;
}

function cloudMirrorHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>On Page Optimization System Dashboard</title>
  <style>
    :root { color-scheme: dark; --bg:#0d1117; --panel:#151b23; --soft:#1d2630; --line:#303b47; --text:#edf2f7; --muted:#9aa8b8; --accent:#4db6ac; --accent2:#6ee7dc; --danger:#ff7b72; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.45 Inter, Segoe UI, Arial, sans-serif; }
    .shell { display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: 100vh; }
    aside { border-right: 1px solid var(--line); background: #111821; padding: 16px 12px; }
    .brand { padding: 4px 8px 16px; border-bottom: 1px solid var(--line); margin-bottom: 12px; }
    .brand h1 { font-size: 18px; margin: 0; line-height: 1.15; }
    .brand p { color: var(--muted); margin: 5px 0 0; font-size: 12px; }
    nav { display: grid; gap: 4px; }
    nav button { width: 100%; text-align: left; background: transparent; color: var(--text); border: 0; border-radius: 6px; padding: 9px 10px; cursor: pointer; }
    nav button.active, nav button:hover { background: var(--soft); color: var(--accent2); }
    main { min-width: 0; padding: 18px 20px 36px; }
    .topbar { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; }
    .topbar h2 { margin:0; font-size:22px; }
    .muted { color: var(--muted); }
    .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; color:var(--muted); padding:2px 7px; font-size:12px; }
    .ok { color: var(--accent2); }
    .warn { color: var(--danger); }
    .cards { display:grid; grid-template-columns: repeat(4, minmax(140px, 1fr)); gap:10px; margin-bottom:14px; }
    .card, section { background:var(--panel); border:1px solid var(--line); border-radius:8px; }
    .card { padding:13px; }
    .card strong { display:block; font-size:24px; }
    .card span { color:var(--muted); font-size:12px; }
    .grid2 { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr); gap:14px; align-items:start; }
    section { overflow:hidden; margin-bottom:14px; }
    .head { padding:13px 14px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:10px; align-items:center; }
    .head h3 { margin:0; font-size:16px; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:9px 11px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { background:var(--soft); color:var(--muted); font-size:12px; }
    a { color:var(--accent2); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .empty { padding:18px; color:var(--muted); }
    .status-list { padding:12px; display:grid; gap:8px; }
    .status-row { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid var(--line); padding-bottom:8px; }
    .status-row:last-child { border-bottom:0; padding-bottom:0; }
    .toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .toolbar button { background:var(--accent); color:#061312; border:0; border-radius:6px; font-weight:700; padding:8px 10px; cursor:pointer; }
    .toolbar button.secondary, button.secondary { background:var(--soft); color:var(--accent2); border:1px solid var(--line); }
    input, select { background:var(--soft); border:1px solid var(--line); border-radius:6px; color:var(--text); padding:8px 10px; min-width:240px; }
    .access { display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:flex-end; margin-bottom:14px; }
    .review { background:rgba(77,182,172,.08); border:1px solid rgba(110,231,220,.35); border-radius:8px; margin:12px; padding:12px; }
    .review pre { white-space:pre-wrap; word-break:break-word; color:var(--muted); }
    .filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; padding:12px; border-bottom:1px solid var(--line); background:rgba(29,38,48,.55); }
    .filters select { min-width:180px; }
    .actions { display:flex; gap:6px; flex-wrap:wrap; }
    .action-link, .copy-btn { background:var(--soft); color:var(--accent2); border:1px solid var(--line); border-radius:6px; padding:6px 8px; display:inline-block; font-size:12px; cursor:pointer; text-decoration:none; }
    .copy-btn { font:inherit; font-size:12px; }
    .copy-btn:hover, .action-link:hover { border-color:var(--accent2); text-decoration:none; }
    @media (max-width: 920px) { .shell { grid-template-columns:1fr; } aside { position:static; } .cards,.grid2 { grid-template-columns:1fr; } th:nth-child(4), td:nth-child(4) { display:none; } }
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <div class="brand"><h1>On Page Optimization System</h1><p>Cloud mirror. Local Cora automation stays on Windows.</p></div>
      <nav id="nav"></nav>
    </aside>
    <main>
      <div class="topbar">
        <div><h2 id="page-title">Overview</h2><div id="page-note" class="muted">Loading synced production data...</div></div>
        <div class="toolbar"><input id="search" placeholder="Filter current page"><button id="refresh">Refresh</button></div>
      </div>
      <div class="access">
        <span class="muted">Dashboard access</span>
        <input id="read-token" type="password" placeholder="Read/admin token">
        <button id="save-read-token">Unlock</button>
        <button id="lock-dashboard" class="secondary">Lock</button>
      </div>
      <div id="app"><div class="empty">Loading cloud mirror...</div></div>
    </main>
  </div>
  <script>
    let state = { data: null, page: "overview", q: "", pendingWrite: null, reportClient: "all", reportLevel: "all" };
    const pages = [
      ["overview", "Overview"],
      ["clients", "Clients"],
      ["reports", "Cora Reports"],
      ["runs", "Cora Runs"],
      ["jobs", "Cora Jobs"],
      ["ranking", "Ranking Snapshots"],
      ["targets", "Optimization Targets"],
      ["entities", "Entity Explorer"],
      ["plans", "Content Plans"],
      ["audit", "Audit Trail"],
      ["commands", "Cloud Commands"]
    ];
    const fmtNum = (v) => Number(v || 0).toLocaleString();
    const fmtDate = (v) => v ? new Date(v).toLocaleString() : "";
    const fmtBytes = (v) => { let n = Number(v || 0), u = ["B","KB","MB","GB"], i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return n.toLocaleString(undefined, { maximumFractionDigits: i ? 1 : 0 }) + " " + u[i]; };
    const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
    const reportUrl = (token) => "/share/report/" + encodeURIComponent(token);
    const downloadUrl = (token) => reportUrl(token) + "/download";
    const readToken = () => localStorage.getItem("opos_read_token") || localStorage.getItem("opos_admin_token") || "";
    const adminToken = () => localStorage.getItem("opos_admin_token") || "";
    const authHeaders = (token) => token ? { "authorization": "Bearer " + token } : {};
    const absoluteUrl = (path) => new URL(path, location.origin).href;
    function rows(items, predicate) {
      const q = state.q.toLowerCase();
      return (items || []).filter((item) => !q || JSON.stringify(item).toLowerCase().includes(q)).filter(predicate || (() => true));
    }
    function table(headers, body, empty) {
      return body.length ? '<table><thead><tr>' + headers.map((h) => '<th>' + esc(h) + '</th>').join("") + '</tr></thead><tbody>' + body.join("") + '</tbody></table>' : '<div class="empty">' + esc(empty || "No synced data found.") + '</div>';
    }
    function setPage(page) {
      state.page = page;
      document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
      render();
    }
    function renderNav() {
      document.getElementById("nav").innerHTML = pages.map(([id, label]) => '<button data-page="' + id + '">' + esc(label) + '</button>').join("");
      document.querySelectorAll("nav button").forEach((b) => b.onclick = () => setPage(b.dataset.page));
    }
    function cards(items) {
      return '<div class="cards">' + items.map(([label, value]) => '<div class="card"><strong>' + esc(typeof value === "number" ? fmtNum(value) : value) + '</strong><span>' + esc(label) + '</span></div>').join("") + '</div>';
    }
    function overview(data) {
      const counts = data.counts || {};
      const artifactBytes = (data.artifacts || []).reduce((s, r) => s + Number(r.total_bytes || 0), 0);
      const artifactFiles = (data.artifacts || []).reduce((s, r) => s + Number(r.artifact_count || 0), 0);
      const lastSync = (data.sync?.tables || []).map((r) => r.last_received_at).filter(Boolean).sort().pop();
      const syncRows = (data.sync?.tables || []).slice(-14).map((r) => '<div class="status-row"><span>' + esc(r.table_name) + '</span><strong>' + esc(fmtNum(r.rows_received)) + '</strong></div>').join("");
      const artifactRows = (data.artifacts || []).map((r) => '<div class="status-row"><span>' + esc(r.artifact_type) + '</span><strong>' + esc(fmtNum(r.artifact_count)) + ' / ' + esc(fmtBytes(r.total_bytes)) + '</strong></div>').join("");
      const bridgeRows = (data.bridges || []).map((b) => '<div class="status-row"><span>' + esc(b.bridge_id) + '<br><small class="muted">' + esc(fmtDate(b.last_seen_at)) + '</small></span><strong class="' + (b.online ? 'ok' : 'warn') + '">' + esc(b.online ? 'Online' : 'Offline') + '</strong></div>').join("");
      return cards([["Clients", counts.projects],["Keywords", counts.keywords],["Cora Runs", counts.runs],["Reports", counts.reports],["Ranking Snapshots", counts.ranking_snapshots],["Optimization Targets", counts.ranking_optimization_targets],["Pending Commands", counts.pending_commands],["Cloud Files", artifactFiles],["R2 Storage", fmtBytes(artifactBytes)]])
        + '<div class="grid2"><section><div class="head"><h3>Recent Reports</h3><span class="pill ok">Live</span></div>' + reportTable(data.reports || []) + '</section>'
        + '<section><div class="head"><h3>Bridge Status</h3><span class="muted">' + esc(fmtDate(lastSync) || "Never") + '</span></div><div class="status-list">' + (bridgeRows || '<div class="muted">No local bridge heartbeat yet.</div>') + '</div><div class="head"><h3>Cloud Files</h3></div><div class="status-list">' + (artifactRows || '<div class="muted">No files.</div>') + '</div><div class="head"><h3>Tables</h3></div><div class="status-list">' + (syncRows || '<div class="muted">No sync batches.</div>') + '</div></section></div>';
    }
    function reportTable(items) {
      return table(["Report", "Client", "Keyword / URL", "Level", "Created", "Files", "Actions"], rows(items).map((r) => '<tr><td><strong>' + esc(r.title || r.keyword || "Report") + '</strong><br><span class="muted">Run #' + esc(r.run_id || "") + '</span></td><td>' + esc(r.project_name || r.client_name || "") + '<br><span class="muted">' + esc(r.site_domain || "") + '</span></td><td><strong>' + esc(r.keyword || "") + '</strong><br><span class="muted">' + esc(r.target_domain || r.target_url || "") + '</span></td><td><span class="pill">' + esc(r.level || "") + '</span></td><td>' + esc(fmtDate(r.created_at)) + '<br><span class="muted">Uploaded ' + esc(fmtDate(r.last_uploaded_at)) + '</span></td><td><span class="pill">' + esc(fmtNum(r.artifact_count || 0)) + ' files</span><br><span class="muted">' + esc(fmtBytes(r.total_bytes || 0)) + '</span></td><td><div class="actions"><a class="action-link" href="' + reportUrl(r.token) + '" target="_blank">Open</a><a class="action-link" href="' + downloadUrl(r.token) + '">XLSX</a><button class="copy-btn" data-copy="' + esc(absoluteUrl(reportUrl(r.token))) + '">Copy report</button><button class="copy-btn" data-copy="' + esc(absoluteUrl(downloadUrl(r.token))) + '">Copy XLSX</button></div></td></tr>'), "No cloud reports synced yet.");
    }
    function reportPortal(data) {
      const allReports = data.reports || [];
      const clients = [...new Map(allReports.map((r) => [String(r.project_id || r.project_name || ""), r.project_name || r.client_name || "Unassigned"]).filter(([id]) => id)).entries()];
      const levels = ["basic", "medium", "comprehensive"];
      const filtered = allReports.filter((r) => (state.reportClient === "all" || String(r.project_id || r.project_name || "") === state.reportClient) && (state.reportLevel === "all" || String(r.level || "").toLowerCase() === state.reportLevel));
      const latest = filtered.map((r) => r.created_at).filter(Boolean).sort().pop();
      const files = filtered.reduce((sum, r) => sum + Number(r.artifact_count || 0), 0);
      const bytes = filtered.reduce((sum, r) => sum + Number(r.total_bytes || 0), 0);
      const filters = '<div class="filters"><select id="report-client-filter"><option value="all">All clients</option>' + clients.map(([id, name]) => '<option value="' + esc(id) + '"' + (state.reportClient === id ? ' selected' : '') + '>' + esc(name) + '</option>').join("") + '</select><select id="report-level-filter"><option value="all">All report levels</option>' + levels.map((level) => '<option value="' + level + '"' + (state.reportLevel === level ? ' selected' : '') + '>' + esc(level[0].toUpperCase() + level.slice(1)) + '</option>').join("") + '</select><span class="muted">Use the search box above for keyword, URL, or report title.</span></div>';
      setTimeout(bindReportControls, 0);
      return cards([["Visible Reports", filtered.length],["Report Files", files],["Report Storage", fmtBytes(bytes)],["Latest Report", fmtDate(latest) || "None"]])
        + '<section><div class="head"><h3>Cora Reports</h3><span class="pill ok">Share-ready</span></div>' + filters + reportTable(filtered) + '</section>';
    }
    function clientsTable(items) {
      return table(["Client", "Site", "Keywords", "Runs", "Snapshots", "Targets"], rows(items).map((c) => '<tr><td><strong>' + esc(c.name || "") + '</strong><br><span class="muted">' + esc(c.client || "") + '</span></td><td>' + esc(c.site_domain || "") + '</td><td>' + esc(fmtNum(c.keyword_count)) + '</td><td>' + esc(fmtNum(c.run_count)) + '</td><td>' + esc(fmtNum(c.snapshot_count)) + '</td><td>' + esc(fmtNum(c.target_count)) + '</td></tr>'));
    }
    function runsTable(items) {
      return table(["Keyword", "Client", "Target", "Imported", "Data"], rows(items).map((r) => '<tr><td><strong>' + esc(r.keyword || "") + '</strong><br><span class="muted">' + esc(r.file_name || "") + '</span></td><td>' + esc(r.project_name || "") + '</td><td>' + esc(r.target_domain || r.target_url || "") + '</td><td>' + esc(fmtDate(r.imported_at)) + '</td><td>' + esc(fmtNum(r.serp_count)) + ' SERP<br>' + esc(fmtNum(r.recommendation_count)) + ' recs<br>' + esc(fmtNum(r.lsi_count)) + ' LSI</td></tr>'));
    }
    function jobsTable(items) {
      return table(["Keyword", "Client", "Tool/Profile", "Status", "Updated"], rows(items).map((j) => '<tr><td><strong>' + esc(j.keyword || "") + '</strong><br><span class="muted">' + esc(j.target_domain || "") + '</span></td><td>' + esc(j.project_name || "") + '</td><td>' + esc(j.tool || "cora") + '<br><span class="muted">' + esc(j.cora_profile || "") + '</span></td><td><span class="pill">' + esc(j.status || "") + '</span><br><span class="muted">' + esc(j.status_message || "") + '</span></td><td>' + esc(fmtDate(j.updated_at || j.last_activity_at || j.started_at)) + '</td></tr>'));
    }
    function snapshotsTable(items) {
      return table(["Target", "Client", "Locale", "Keywords", "Pages", "Created"], rows(items).map((s) => '<tr><td><strong>' + esc(s.target || "") + '</strong><br><span class="muted">' + esc(s.source || "") + ' / ' + esc(s.freshness || "") + '</span></td><td>' + esc(s.project_name || "") + '</td><td>' + esc(s.location_code || "") + ' / ' + esc(s.language_code || "") + '</td><td>' + esc(fmtNum(s.keyword_count)) + '</td><td>' + esc(fmtNum(s.page_count)) + '</td><td>' + esc(fmtDate(s.created_at)) + '</td></tr>'));
    }
    function targetsTable(items) {
      return table(["URL", "Client", "Keyword", "Position", "Score", "Status"], rows(items).map((t) => '<tr><td><strong>' + esc(t.url || "") + '</strong><br><span class="muted">' + esc(t.recommended_action || "") + '</span></td><td>' + esc(t.project_name || "") + '</td><td>' + esc(t.keyword || "") + '</td><td>' + esc(fmtNum(t.best_position)) + '</td><td>' + esc(fmtNum(t.opportunity_score)) + '</td><td><span class="pill">' + esc(t.status || "") + '</span></td></tr>'));
    }
    function entitiesView(data) {
      const batches = table(["Seed", "Client", "Depth", "Progress", "Status"], rows(data.entity_batches || []).map((b) => '<tr><td><strong>' + esc(b.seed_keyword || "") + '</strong></td><td>' + esc(b.project_name || "") + '</td><td>' + esc(b.depth || "") + '</td><td>' + esc(fmtNum(b.completed_count)) + ' / ' + esc(fmtNum(b.target_count)) + '</td><td><span class="pill">' + esc(b.status || "") + '</span></td></tr>'));
      const runs = table(["Seed", "Provider", "Model", "Status", "Completed"], rows(data.entity_runs || []).map((r) => '<tr><td>' + esc(r.seed_keyword || "") + '</td><td>' + esc(r.provider || "") + '</td><td>' + esc(r.model || "") + '</td><td><span class="pill">' + esc(r.status || "") + '</span><br><span class="muted">' + esc(r.error || r.summary || "") + '</span></td><td>' + esc(fmtDate(r.completed_at || r.created_at)) + '</td></tr>'));
      const sets = table(["Set", "Client", "Terms", "Updated"], rows(data.entity_sets || []).map((s) => '<tr><td><strong>' + esc(s.name || "") + '</strong><br><span class="muted">' + esc(s.notes || "") + '</span></td><td>' + esc(s.project_name || "") + '</td><td>' + esc(fmtNum(s.term_count)) + '</td><td>' + esc(fmtDate(s.updated_at)) + '</td></tr>'));
      return '<div class="grid2"><section><div class="head"><h3>Entity Batches</h3></div>' + batches + '</section><section><div class="head"><h3>Entity Sets</h3></div>' + sets + '</section></div><section><div class="head"><h3>Model Runs</h3></div>' + runs + '</section>';
    }
    function plansTable(items) {
      return table(["Title", "Client", "Keyword", "Type", "Status", "Due"], rows(items).map((p) => '<tr><td><strong>' + esc(p.title || "") + '</strong><br><span class="muted">' + esc(p.notes || "") + '</span></td><td>' + esc(p.project_name || "") + '</td><td>' + esc(p.keyword || "") + '</td><td>' + esc(p.content_type || "") + '</td><td><span class="pill">' + esc(p.status || "") + '</span><br><span class="muted">' + esc(p.priority || "") + '</span></td><td>' + esc(p.due_date || "") + '</td></tr>'));
    }
    function projectOptions() {
      return (state.data?.clients || []).map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name || ("Client " + p.id)) + '</option>').join("");
    }
    function runOptions() {
      return (state.data?.runs || []).map((r) => '<option value="' + esc(r.id) + '">' + esc((r.keyword || "Run") + " | " + (r.project_name || "")) + '</option>').join("");
    }
    function commandsTable(items) {
      return table(["Command", "Status", "Queued By", "Timeline", "Result", ""], rows(items).map((c) => '<tr><td><strong>' + esc(c.command_type || "") + '</strong><br><span class="muted">' + esc(JSON.stringify(c.payload || {})) + '</span></td><td><span class="pill">' + esc(c.status || "") + '</span><br><span class="muted">' + esc(c.error || "") + '</span></td><td>' + esc(c.created_by || "") + '</td><td><span class="muted">Queued ' + esc(fmtDate(c.created_at)) + '<br>Claimed ' + esc(fmtDate(c.claimed_at)) + '<br>Done ' + esc(fmtDate(c.completed_at)) + '</span></td><td><span class="muted">' + esc(c.result ? JSON.stringify(c.result) : "") + '</span></td><td>' + (c.status === "failed" ? '<button class="retry-command" data-command-id="' + esc(c.id) + '">Retry</button>' : '') + (c.status === "claimed" ? '<button class="retry-command" data-command-id="' + esc(c.id) + '">Reset</button>' : '') + '</td></tr>'), "No cloud commands yet.");
    }
    function auditTable(items) {
      return table(["When", "Actor", "Action", "Object", "Metadata"], rows(items).map((event) => '<tr><td>' + esc(fmtDate(event.created_at)) + '</td><td>' + esc(event.actor || "") + '<br><span class="muted">' + esc(event.ip_address || "") + '</span></td><td><span class="pill">' + esc(event.action || "") + '</span></td><td>' + esc(event.object_type || "") + '<br><span class="muted">' + esc(event.object_id || "") + '</span></td><td><span class="muted">' + esc(JSON.stringify(event.metadata || {})) + '</span></td></tr>'), "No audit events yet.");
    }
    function commandSummary(command_type, payload) {
      if (command_type === "create_project") return 'Create or reuse client "' + (payload.name || "") + '" for ' + (payload.site_domain || "no domain");
      if (command_type === "add_keyword") return 'Add or reuse keyword "' + (payload.keyword || "") + '" on client ID ' + (payload.project_id || "");
      if (command_type === "create_content_plan") return 'Create or reuse content plan "' + (payload.title || "") + '" on client ID ' + (payload.project_id || "");
      if (command_type === "create_share_report") return 'Create or reuse ' + (payload.level || "medium") + ' report for run ID ' + (payload.run_id || "");
      if (command_type === "run_cora") return 'Queue Cora locally for "' + (payload.keyword || "") + '" against ' + (payload.target_url || "") + '. Local bridge must allow Cora execution.';
      return command_type;
    }
    function setPendingCommand(command_type, payload) {
      state.pendingWrite = { command_type, payload, summary: commandSummary(command_type, payload) };
      render();
    }
    async function sendPendingCommand() {
      const pending = state.pendingWrite;
      if (!pending) return;
      const token = adminToken();
      if (!token) throw new Error("Unlock cloud writes first.");
      const operator = localStorage.getItem("opos_operator_name") || "cloud-dashboard";
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": "Bearer " + token },
        body: JSON.stringify({ command_type: pending.command_type, payload: { ...pending.payload, reviewed_at: new Date().toISOString() }, created_by: operator })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Command failed");
      state.pendingWrite = null;
      await load();
      if (data.duplicate) alert("Matching command already exists; not queued again.");
    }
    async function retryCommand(id) {
      const token = adminToken();
      if (!token) throw new Error("Unlock cloud writes first.");
      const response = await fetch("/api/commands/" + encodeURIComponent(id), {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": "Bearer " + token },
        body: JSON.stringify({ status: "pending" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Retry failed");
      await load();
    }
    function commandsView(data) {
      const pending = state.pendingWrite;
      const review = pending ? '<section><div class="head"><h3>Review Command</h3><span class="pill warn">Not queued yet</span></div><div class="review"><strong>' + esc(pending.summary) + '</strong><pre>' + esc(JSON.stringify(pending.payload, null, 2)) + '</pre><div class="toolbar"><button id="confirm-command">Queue Reviewed Command</button><button id="cancel-command" class="secondary">Cancel</button></div></div></section>' : '';
      const forms = '<div class="grid2">'
        + '<section><div class="head"><h3>Unlock Writes</h3><span class="pill warn">Commands run locally</span></div><div class="status-list"><div class="muted">Writes require the admin/sync token. Dashboard read access is separate and can use READ_TOKEN when configured.</div><input id="admin-token" type="password" placeholder="Admin token" value="' + esc(adminToken()) + '"><input id="operator-name" placeholder="Operator name" value="' + esc(localStorage.getItem("opos_operator_name") || "") + '"><div class="toolbar"><button id="save-token">Save Write Access</button><button id="clear-token" class="secondary">Clear</button></div></div></section>'
        + '<section><div class="head"><h3>Create Client</h3></div><div class="status-list"><input id="cmd-client-name" placeholder="Client name"><input id="cmd-client-site" placeholder="Main URL or domain"><input id="cmd-client-notes" placeholder="Notes"><button id="cmd-create-client">Review Create Client</button></div></section>'
        + '<section><div class="head"><h3>Add Keyword</h3></div><div class="status-list"><select id="cmd-keyword-project">' + projectOptions() + '</select><input id="cmd-keyword" placeholder="Keyword"><button id="cmd-add-keyword">Review Keyword</button></div></section>'
        + '<section><div class="head"><h3>Content Plan</h3></div><div class="status-list"><select id="cmd-plan-project">' + projectOptions() + '</select><input id="cmd-plan-title" placeholder="Plan title"><input id="cmd-plan-keyword" placeholder="Optional keyword id"><input id="cmd-plan-notes" placeholder="Notes"><button id="cmd-content-plan">Review Content Plan</button></div></section>'
        + '<section><div class="head"><h3>Customer Report</h3></div><div class="status-list"><select id="cmd-report-run">' + runOptions() + '</select><select id="cmd-report-level"><option value="medium">Medium</option><option value="basic">Basic</option><option value="comprehensive">Comprehensive</option></select><input id="cmd-report-title" placeholder="Optional title"><button id="cmd-share-report">Review Report</button></div></section>'
        + '<section><div class="head"><h3>Run Cora</h3></div><div class="status-list"><div class="muted">This only queues work. The local bridge must have Cora execution explicitly enabled.</div><select id="cmd-cora-project">' + projectOptions() + '</select><input id="cmd-cora-keyword" placeholder="Keyword"><input id="cmd-cora-url" placeholder="Target URL"><input id="cmd-cora-profile" placeholder="Optional Cora profile"><button id="cmd-run-cora">Review Cora Run</button></div></section>'
        + '</div>' + review + '<section><div class="head"><h3>Command History</h3><span class="muted">Queued, claimed, completed, and local result are tracked here.</span></div>' + commandsTable(data.commands || []) + '</section>';
      setTimeout(bindCommandForms, 0);
      return forms;
    }
    function bindCommandForms() {
      const byId = (id) => document.getElementById(id);
      byId("save-token")?.addEventListener("click", () => { localStorage.setItem("opos_admin_token", byId("admin-token").value || ""); localStorage.setItem("opos_operator_name", byId("operator-name").value || "cloud-dashboard"); alert("Write access saved."); });
      byId("clear-token")?.addEventListener("click", () => { localStorage.removeItem("opos_admin_token"); byId("admin-token").value = ""; });
      byId("cmd-create-client")?.addEventListener("click", () => setPendingCommand("create_project", { name: byId("cmd-client-name").value, site_domain: byId("cmd-client-site").value, notes: byId("cmd-client-notes").value }));
      byId("cmd-add-keyword")?.addEventListener("click", () => setPendingCommand("add_keyword", { project_id: Number(byId("cmd-keyword-project").value), keyword: byId("cmd-keyword").value }));
      byId("cmd-content-plan")?.addEventListener("click", () => setPendingCommand("create_content_plan", { project_id: Number(byId("cmd-plan-project").value), title: byId("cmd-plan-title").value, keyword_id: Number(byId("cmd-plan-keyword").value || 0) || null, notes: byId("cmd-plan-notes").value }));
      byId("cmd-share-report")?.addEventListener("click", () => setPendingCommand("create_share_report", { run_id: Number(byId("cmd-report-run").value), level: byId("cmd-report-level").value, title: byId("cmd-report-title").value }));
      byId("cmd-run-cora")?.addEventListener("click", () => setPendingCommand("run_cora", { project_id: Number(byId("cmd-cora-project").value), keyword: byId("cmd-cora-keyword").value, target_url: byId("cmd-cora-url").value, cora_profile: byId("cmd-cora-profile").value }));
      byId("confirm-command")?.addEventListener("click", () => sendPendingCommand().catch((e) => alert(e.message)));
      byId("cancel-command")?.addEventListener("click", () => { state.pendingWrite = null; render(); });
      document.querySelectorAll(".retry-command").forEach((button) => button.addEventListener("click", () => retryCommand(button.dataset.commandId).catch((e) => alert(e.message))));
    }
    function bindReportControls() {
      const client = document.getElementById("report-client-filter");
      const level = document.getElementById("report-level-filter");
      if (client) client.onchange = (event) => { state.reportClient = event.target.value || "all"; render(); };
      if (level) level.onchange = (event) => { state.reportLevel = event.target.value || "all"; render(); };
      document.querySelectorAll(".copy-btn").forEach((button) => {
        button.onclick = async () => {
          const value = button.dataset.copy || "";
          try {
            await navigator.clipboard.writeText(value);
            button.textContent = "Copied";
            setTimeout(() => { button.textContent = button.dataset.copy?.includes("/download") ? "Copy XLSX" : "Copy report"; }, 1200);
          } catch (_err) {
            prompt("Copy URL", value);
          }
        };
      });
    }
    function render() {
      const data = state.data;
      if (!data) return;
      const names = Object.fromEntries(pages);
      document.getElementById("page-title").textContent = names[state.page] || "Overview";
      document.getElementById("page-note").textContent = "Synced from local dashboard at " + fmtDate(data.generated_at);
      const content = {
        overview: () => overview(data),
        clients: () => '<section><div class="head"><h3>Clients</h3></div>' + clientsTable(data.clients || []) + '</section>',
        reports: () => reportPortal(data),
        runs: () => '<section><div class="head"><h3>Cora Runs</h3></div>' + runsTable(data.runs || []) + '</section>',
        jobs: () => '<section><div class="head"><h3>Cora Jobs</h3><span class="pill warn">Read only</span></div>' + jobsTable(data.jobs || []) + '</section>',
        ranking: () => '<section><div class="head"><h3>Ranking Snapshots</h3></div>' + snapshotsTable(data.snapshots || []) + '</section>',
        targets: () => '<section><div class="head"><h3>Optimization Targets</h3></div>' + targetsTable(data.targets || []) + '</section>',
        entities: () => entitiesView(data),
        plans: () => '<section><div class="head"><h3>Content Plans</h3></div>' + plansTable(data.content_plans || []) + '</section>',
        audit: () => '<section><div class="head"><h3>Audit Trail</h3><span class="muted">Recent report, sync, bridge, and command events.</span></div>' + auditTable(data.audit_events || []) + '</section>',
        commands: () => commandsView(data)
      }[state.page] || (() => overview(data));
      document.getElementById("app").innerHTML = content();
      setTimeout(bindReportControls, 0);
    }
    function lockedView(message) {
      document.getElementById("page-title").textContent = "Locked";
      document.getElementById("page-note").textContent = "Enter a read/admin token to view cloud dashboard data.";
      document.getElementById("app").innerHTML = '<section><div class="head"><h3>Dashboard Locked</h3><span class="pill warn">Auth required</span></div><div class="empty">' + esc(message || "Cloud dashboard data is protected. Public customer report links still work without this token.") + '</div></section>';
    }
    async function load() {
      const token = readToken();
      if (!token) {
        state.data = null;
        lockedView();
        return;
      }
      const response = await fetch("/api/dashboard/mirror", { headers: authHeaders(token) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mirror load failed");
      state.data = data;
      render();
    }
    renderNav();
    document.getElementById("refresh").onclick = () => load().catch((error) => document.getElementById("app").innerHTML = '<div class="empty warn">' + esc(error.message || error) + '</div>');
    document.getElementById("search").oninput = (event) => { state.q = event.target.value || ""; render(); };
    document.getElementById("read-token").value = readToken();
    document.getElementById("save-read-token").onclick = () => { localStorage.setItem("opos_read_token", document.getElementById("read-token").value || ""); load().catch((error) => lockedView(error.message || error)); };
    document.getElementById("lock-dashboard").onclick = () => { localStorage.removeItem("opos_read_token"); localStorage.removeItem("opos_admin_token"); state.data = null; document.getElementById("read-token").value = ""; lockedView("Dashboard locked in this browser."); };
    load().catch((error) => lockedView(error.message || error));
    setPage("overview");
  </script>
</body>
</html>`;
}

async function serveReportArtifact(request, env, token, artifactType) {
  const row = await env.DB.prepare(
    "SELECT * FROM report_artifacts WHERE token = ? AND artifact_type = ? ORDER BY uploaded_at DESC LIMIT 1"
  ).bind(token, artifactType).first();
  if (!row) return json({ ok: false, error: "Report artifact not found" }, 404);
  const object = await env.REPORTS.get(row.r2_key);
  if (!object) return json({ ok: false, error: "Report file missing" }, 404);
  const headers = new Headers();
  headers.set("content-type", row.content_type || "application/octet-stream");
  headers.set("cache-control", artifactType === "report_html" ? "no-store, max-age=0" : "private, max-age=300");
  if (artifactType === "source_xlsx") {
    const fileName = String(row.file_name || "cora-report.xlsx").replace(/"/g, "");
    headers.set("content-disposition", `attachment; filename="${fileName}"`);
    if (request.method !== "HEAD") {
      await logAudit(request, env, "report_download", "share_report", token, {
        artifact_type: artifactType,
        file_name: fileName
      }, "public-report-viewer");
    }
    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  }
  if (request.method === "HEAD") return new Response(null, { headers });
  const sourceHtml = await object.text();
  const meta = await reportShareMetadata(env, token);
  await logAudit(request, env, "report_view", "share_report", token, {
    level: meta?.level || "",
    keyword: meta?.keyword || "",
    project_name: meta?.project_name || ""
  }, "public-report-viewer");
  return html(reportShareShell(request, meta, sourceHtml));
}

async function reportShareMetadata(env, token) {
  return await env.DB.prepare(
    `SELECT sr.id, sr.token, sr.level, sr.title, sr.notes, sr.created_at,
            r.keyword, r.target_url, r.target_domain, r.imported_at, r.file_name,
            p.name AS project_name, p.client AS client_name, p.site_domain,
            a.file_size, a.uploaded_at
     FROM share_reports sr
     LEFT JOIN runs r ON r.id = sr.run_id
     LEFT JOIN projects p ON p.id = r.project_id
     LEFT JOIN report_artifacts a ON a.token = sr.token AND a.artifact_type = 'report_html'
     WHERE sr.token = ? AND sr.revoked_at IS NULL
     ORDER BY a.uploaded_at DESC
     LIMIT 1`
  ).bind(token).first();
}

function reportShareShell(request, meta, sourceHtml) {
  const url = new URL(request.url);
  const title = meta?.title || meta?.keyword || "Cora Report";
  const client = meta?.project_name || meta?.client_name || "Client Report";
  const download = `${url.pathname.replace(/\/$/, "")}/download`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | On Page Optimization System</title>
  <style>
    :root { color-scheme: light; --bg:#f5f7fb; --panel:#ffffff; --line:#d9e1ea; --text:#16202c; --muted:#607083; --accent:#00796b; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.45 Inter, Segoe UI, Arial, sans-serif; }
    header { background:var(--panel); border-bottom:1px solid var(--line); padding:18px 22px; position:sticky; top:0; z-index:5; }
    .bar { max-width:1280px; margin:0 auto; display:flex; justify-content:space-between; gap:18px; align-items:center; }
    h1 { margin:0; font-size:20px; line-height:1.2; }
    .meta { color:var(--muted); margin-top:4px; display:flex; gap:10px; flex-wrap:wrap; }
    .actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
    a, button { color:var(--accent); }
    .button { border:1px solid var(--line); background:var(--panel); border-radius:7px; padding:8px 10px; text-decoration:none; cursor:pointer; font-weight:700; }
    .primary { background:var(--accent); color:white; border-color:var(--accent); }
    main { max-width:1280px; margin:14px auto 28px; padding:0 14px; }
    .frame { background:white; border:1px solid var(--line); border-radius:8px; overflow:hidden; min-height:78vh; }
    iframe { display:block; border:0; width:100%; height:78vh; background:white; }
    @media (max-width:760px) { .bar { align-items:flex-start; flex-direction:column; } .actions { justify-content:flex-start; } iframe { height:75vh; } }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">
          <span>${escapeHtml(client)}</span>
          <span>${escapeHtml(meta?.keyword || "")}</span>
          <span>${escapeHtml(meta?.target_domain || meta?.target_url || "")}</span>
          <span>${escapeHtml((meta?.level || "").toUpperCase())}</span>
          <span>Created ${escapeHtml(meta?.created_at ? new Date(meta.created_at).toLocaleDateString() : "")}</span>
        </div>
      </div>
      <div class="actions">
        <a class="button primary" href="${escapeHtml(download)}">Download XLSX</a>
        <button class="button" id="copy-link">Copy report link</button>
      </div>
    </div>
  </header>
  <main>
    <div class="frame"><iframe title="Cora report" sandbox="allow-same-origin allow-popups allow-forms" srcdoc="${escapeHtml(sourceHtml)}"></iframe></div>
  </main>
  <script>
    document.getElementById("copy-link").onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        document.getElementById("copy-link").textContent = "Copied";
      } catch (_err) {
        prompt("Copy report link", location.href);
      }
    };
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/" && request.method === "GET") return html(cloudMirrorHtml());
      if (url.pathname === "/health") return json({ ok: true, app: env.APP_NAME || "OPOS" });
      if (url.pathname === "/api/dashboard/data" && request.method === "GET") return handleDashboardData(request, env);
      if (url.pathname === "/api/dashboard/mirror" && request.method === "GET") return handleDashboardMirrorData(request, env);
      if (url.pathname === "/api/commands" && request.method === "GET") return listCommands(request, env);
      if (url.pathname === "/api/commands" && request.method === "POST") return createCommand(request, env);
      const commandRoute = url.pathname.match(/^\/api\/commands\/(\d+)$/);
      if (commandRoute && request.method === "POST") return updateCommand(request, env, Number(commandRoute[1]));
      if (url.pathname === "/api/bridge/heartbeat" && request.method === "POST") return bridgeHeartbeat(request, env);
      const shareDownload = url.pathname.match(/^\/share\/report\/([^/]+)\/download$/);
      if (shareDownload && ["GET", "HEAD"].includes(request.method)) return serveReportArtifact(request, env, decodeURIComponent(shareDownload[1]), "source_xlsx");
      const shareReport = url.pathname.match(/^\/share\/report\/([^/]+)$/);
      if (shareReport && ["GET", "HEAD"].includes(request.method)) return serveReportArtifact(request, env, decodeURIComponent(shareReport[1]), "report_html");
      if (url.pathname === "/api/sync/status" && request.method === "GET") {
        if (!requireReadAuth(request, env) && !requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
        return handleStatus(env);
      }
      if (url.pathname === "/api/sync/push" && request.method === "POST") return handleSyncPush(request, env);
      if (url.pathname === "/api/artifacts/status" && request.method === "GET") {
        if (!requireSyncAuth(request, env)) return json({ ok: false, error: "Unauthorized" }, 401);
        return handleArtifactStatus(env);
      }
      if (url.pathname === "/api/artifacts/upload" && request.method === "POST") return handleArtifactUpload(request, env);
      return json({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      return json({ ok: false, error: error.message || String(error) }, 500);
    }
  }
};
