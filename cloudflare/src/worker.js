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

function requireSyncAuth(request, env) {
  const expected = env.SYNC_TOKEN || "";
  const header = request.headers.get("authorization") || "";
  if (!expected || header !== `Bearer ${expected}`) {
    return false;
  }
  return true;
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
  return json({ ok: true, ...result });
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
  const [profiles, projects, keywords, runs, reports, rankingSnapshots, targets, artifacts, sync] = await Promise.all([
    countTable(env, "profiles"),
    countTable(env, "projects"),
    countTable(env, "keywords"),
    countTable(env, "runs"),
    countTable(env, "share_reports"),
    countTable(env, "ranking_snapshots"),
    countTable(env, "ranking_optimization_targets"),
    artifactStatusData(env),
    syncStatusData(env)
  ]);
  const recentReports = await env.DB.prepare(
    `SELECT sr.id, sr.token, sr.level, sr.title, sr.created_at,
            r.keyword, r.target_url, r.target_domain, r.imported_at,
            p.name AS project_name,
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
     LIMIT 50`
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
    counts: { profiles, projects, keywords, runs, reports, ranking_snapshots: rankingSnapshots, ranking_optimization_targets: targets },
    artifacts,
    sync,
    reports: recentReports.results || [],
    clients: clientRows.results || []
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
  }
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/" && request.method === "GET") return html(cloudDashboardHtml());
      if (url.pathname === "/health") return json({ ok: true, app: env.APP_NAME || "OPOS" });
      if (url.pathname === "/api/dashboard/data" && request.method === "GET") return handleDashboardData(request, env);
      const shareDownload = url.pathname.match(/^\/share\/report\/([^/]+)\/download$/);
      if (shareDownload && ["GET", "HEAD"].includes(request.method)) return serveReportArtifact(request, env, decodeURIComponent(shareDownload[1]), "source_xlsx");
      const shareReport = url.pathname.match(/^\/share\/report\/([^/]+)$/);
      if (shareReport && ["GET", "HEAD"].includes(request.method)) return serveReportArtifact(request, env, decodeURIComponent(shareReport[1]), "report_html");
      if (url.pathname === "/api/sync/status" && request.method === "GET") return handleStatus(env);
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
